import { mkdir, unlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
class DocumentServiceImpl {
    constructor(deps) {
        this.deps = deps;
    }
    projectDir(projectId) {
        return join(this.deps.config.uploadDir, String(projectId));
    }
    async upload(projectId, userId, file) {
        if (file.size > this.deps.config.maxFileSizeBytes) {
            throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the ${(this.deps.config.maxFileSizeBytes / (1024 * 1024)).toFixed(0)}MB limit`);
        }
        const currentTotal = await this.deps.documents.getTotalSizeForProject(projectId);
        if (currentTotal + file.size > this.deps.config.maxProjectStorageBytes) {
            const usedMB = (currentTotal / (1024 * 1024)).toFixed(1);
            const maxMB = (this.deps.config.maxProjectStorageBytes / (1024 * 1024)).toFixed(0);
            throw new Error(`Project storage limit reached (${usedMB}MB / ${maxMB}MB). Delete some files first.`);
        }
        const dir = this.projectDir(projectId);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
        const ext = extname(file.originalname);
        const storedFilename = `${randomUUID()}${ext}`;
        const filePath = join(dir, storedFilename);
        const { writeFile } = await import('node:fs/promises');
        await writeFile(filePath, file.buffer);
        const doc = await this.deps.documents.create({
            projectId,
            uploaderUserId: userId,
            originalFilename: file.originalname,
            storedFilename,
            mimeType: file.mimetype,
            sizeBytes: file.size
        });
        await this.deps.activity.log({
            documentId: doc.id,
            projectId,
            userId,
            action: 'uploaded',
            filename: file.originalname
        });
        return doc;
    }
    async list(projectId) {
        const documents = await this.deps.documents.listByProject(projectId);
        const totalSizeBytes = await this.deps.documents.getTotalSizeForProject(projectId);
        return { documents, totalSizeBytes };
    }
    async getFile(documentId) {
        const doc = await this.deps.documents.findById(documentId);
        if (!doc)
            return null;
        const filePath = join(this.projectDir(doc.projectId), doc.storedFilename);
        return { document: doc, filePath };
    }
    async deleteDocument(documentId, userId) {
        const doc = await this.deps.documents.findById(documentId);
        if (!doc)
            return false;
        // Log activity before deleting (so we capture the filename)
        await this.deps.activity.log({
            documentId: null, // Will be orphaned after delete
            projectId: doc.projectId,
            userId,
            action: 'deleted',
            filename: doc.originalFilename
        });
        // Remove file from disk
        const filePath = join(this.projectDir(doc.projectId), doc.storedFilename);
        try {
            await unlink(filePath);
        }
        catch {
            // File may already be gone
        }
        return this.deps.documents.delete(documentId);
    }
    async getActivity(projectId, limit = 20) {
        return this.deps.activity.listByProject(projectId, limit);
    }
    async cleanupProjectFiles(projectId) {
        const dir = this.projectDir(projectId);
        try {
            await rm(dir, { recursive: true, force: true });
        }
        catch {
            // Directory may not exist
        }
        await this.deps.documents.deleteByProject(projectId);
    }
}
export function createDocumentService(deps) {
    return new DocumentServiceImpl(deps);
}
