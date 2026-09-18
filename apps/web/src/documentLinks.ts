import type { DocumentResponse } from '@sandrocket/contracts';

function normalizeFilename(value: string): string {
  return value.trim().toLowerCase();
}

function basename(value: string): string {
  const trimmed = value.trim();
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] ?? trimmed;
}

/** Match fichier retenu text to a project document by original filename. */
export function findDocumentByFilename(
  documents: DocumentResponse[],
  fichierRetenu: string
): DocumentResponse | null {
  const key = normalizeFilename(fichierRetenu);
  if (!key) return null;

  const exact = documents.find((d) => normalizeFilename(d.originalFilename) === key);
  if (exact) return exact;

  const baseKey = normalizeFilename(basename(fichierRetenu));
  if (!baseKey || baseKey === key) return null;

  return (
    documents.find((d) => normalizeFilename(d.originalFilename) === baseKey) ??
    documents.find((d) => normalizeFilename(basename(d.originalFilename)) === baseKey) ??
    null
  );
}

export type DocumentPreviewKind = 'pdf' | 'word' | 'image' | 'other';

export function documentPreviewKind(
  doc: Pick<DocumentResponse, 'mimeType' | 'originalFilename'>
): DocumentPreviewKind {
  const mime = doc.mimeType.toLowerCase();
  const name = doc.originalFilename.toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    mime.includes('word') ||
    mime.includes('msword') ||
    mime.includes('officedocument.wordprocessingml') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'word';
  }
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

/** Open a document in a new tab (inline view; cookies apply on same-site navigation). */
export function openDocumentView(baseUrl: string, documentId: number): void {
  window.open(`${baseUrl}/documents/${documentId}/view`, '_blank', 'noopener,noreferrer');
}

export function openDocumentDownload(baseUrl: string, documentId: number): void {
  window.open(`${baseUrl}/documents/${documentId}/download`, '_blank', 'noopener,noreferrer');
}
