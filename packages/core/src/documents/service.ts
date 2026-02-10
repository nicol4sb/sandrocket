import { DocumentActivityRepository, DocumentRepository } from './ports.js';
import { DocumentActivity, ProjectDocument } from './types.js';
import { mkdir, unlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface DocumentServiceConfig {
  uploadDir: string;
  maxFileSizeBytes: number;
  maxProjectStorageBytes: number;
}

export interface DocumentService {
  upload(projectId: number, userId: number, file: { originalname: string; mimetype: string; buffer: Buffer; size: number }): Promise<ProjectDocument>;
  list(projectId: number): Promise<{ documents: ProjectDocument[]; totalSizeBytes: number }>;
  getFile(documentId: number): Promise<{ document: ProjectDocument; filePath: string } | null>;
  deleteDocument(documentId: number, userId: number): Promise<boolean>;
  getActivity(projectId: number, limit?: number): Promise<DocumentActivity[]>;
  cleanupProjectFiles(projectId: number): Promise<void>;
}

export interface DocumentServiceDependencies {
  documents: DocumentRepository;
  activity: DocumentActivityRepository;
  config: DocumentServiceConfig;
}

class DocumentServiceImpl implements DocumentService {
  constructor(private readonly deps: DocumentServiceDependencies) {}

  private projectDir(projectId: number): string {
    return join(this.deps.config.uploadDir, String(projectId));
  }

  async upload(
    projectId: number,
    userId: number,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number }
  ): Promise<ProjectDocument> {
    if (file.size > this.deps.config.maxFileSizeBytes) {
      throw new Error(
        `File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the ${(this.deps.config.maxFileSizeBytes / (1024 * 1024)).toFixed(0)}MB limit`
      );
    }

    const currentTotal = await this.deps.documents.getTotalSizeForProject(projectId);
    if (currentTotal + file.size > this.deps.config.maxProjectStorageBytes) {
      const usedMB = (currentTotal / (1024 * 1024)).toFixed(1);
      const maxMB = (this.deps.config.maxProjectStorageBytes / (1024 * 1024)).toFixed(0);
      throw new Error(
        `Project storage limit reached (${usedMB}MB / ${maxMB}MB). Delete some files first.`
      );
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

  async list(projectId: number): Promise<{ documents: ProjectDocument[]; totalSizeBytes: number }> {
    const documents = await this.deps.documents.listByProject(projectId);
    const totalSizeBytes = await this.deps.documents.getTotalSizeForProject(projectId);
    return { documents, totalSizeBytes };
  }

  async getFile(documentId: number): Promise<{ document: ProjectDocument; filePath: string } | null> {
    const doc = await this.deps.documents.findById(documentId);
    if (!doc) return null;

    const filePath = join(this.projectDir(doc.projectId), doc.storedFilename);
    return { document: doc, filePath };
  }

  async deleteDocument(documentId: number, userId: number): Promise<boolean> {
    const doc = await this.deps.documents.findById(documentId);
    if (!doc) return false;

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
    } catch {
      // File may already be gone
    }

    return this.deps.documents.delete(documentId);
  }

  async getActivity(projectId: number, limit = 20): Promise<DocumentActivity[]> {
    return this.deps.activity.listByProject(projectId, limit);
  }

  async cleanupProjectFiles(projectId: number): Promise<void> {
    const dir = this.projectDir(projectId);
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
    await this.deps.documents.deleteByProject(projectId);
  }
}

export function createDocumentService(deps: DocumentServiceDependencies): DocumentService {
  return new DocumentServiceImpl(deps);
}
