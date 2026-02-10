import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentResponse, DocumentActivityResponse, ListDocumentsResponse } from '@sandrocket/contracts';

interface DocumentDropboxProps {
  projectId: number;
  baseUrl: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function isViewableInBrowser(mimeType: string): boolean {
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/')
  );
}

function fileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📎';
}

export function DocumentDropbox({ projectId, baseUrl }: DocumentDropboxProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [activity, setActivity] = useState<DocumentActivityResponse[]>([]);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);
  const [maxSizeBytes, setMaxSizeBytes] = useState(200 * 1024 * 1024);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentResponse | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/projects/${projectId}/documents`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = (await res.json()) as ListDocumentsResponse;
      setDocuments(data.documents);
      setActivity(data.activity);
      setTotalSizeBytes(data.totalSizeBytes);
      setMaxSizeBytes(data.maxSizeBytes);
    } catch {
      // Silently fail
    }
  }, [baseUrl, projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Close activity tooltip on outside click
  useEffect(() => {
    if (!showActivity) return;
    const handleClick = (e: MouseEvent) => {
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) {
        setShowActivity(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showActivity]);

  const uploadFile = (file: File) => {
    const maxFileSize = 50 * 1024 * 1024; // 50MB client-side check
    if (file.size > maxFileSize) {
      setError(`File "${file.name}" exceeds the 50MB limit (${formatBytes(file.size)})`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        fetchDocuments();
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.message || 'Upload failed');
        } catch {
          setError('Upload failed');
        }
      }
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName(null);
    });

    xhr.addEventListener('error', () => {
      setError('Upload failed');
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName(null);
    });

    xhr.open('POST', `${baseUrl}/projects/${projectId}/documents`);
    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      uploadFile(file);
    }
    // Reset input so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (docId: number) => {
    try {
      const res = await fetch(`${baseUrl}/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch {
      // Silently fail
    }
  };

  const handleView = async (doc: DocumentResponse) => {
    if (doc.mimeType.startsWith('image/')) {
      // Images: fetch as blob (to send cookies cross-origin) and show in lightbox
      setViewingDoc(doc);
      try {
        const res = await fetch(`${baseUrl}/documents/${doc.id}/view`, {
          credentials: 'include'
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setViewingImageUrl(url);
      } catch {
        // Fall back to direct URL
        setViewingImageUrl(`${baseUrl}/documents/${doc.id}/view`);
      }
    } else {
      // PDFs and others: open in new tab
      window.open(`${baseUrl}/documents/${doc.id}/view`, '_blank');
    }
  };

  const handleDownload = (docId: number, filename: string) => {
    // Create a temporary link to trigger download
    const a = document.createElement('a');
    a.href = `${baseUrl}/documents/${docId}/download`;
    a.download = filename;
    // Need to navigate with cookies, so use window.open for cross-origin or direct nav
    window.open(`${baseUrl}/documents/${docId}/download`, '_blank');
  };

  const handleExport = () => {
    window.open(`${baseUrl}/projects/${projectId}/export`, '_blank');
  };

  const usedPercent = maxSizeBytes > 0 ? Math.min((totalSizeBytes / maxSizeBytes) * 100, 100) : 0;

  return (
    <div className="doc-dropbox">
      <div className="doc-dropbox-header">
        <h3 className="doc-dropbox-title">Documents</h3>
        <div className="doc-dropbox-header-actions">
          <button
            type="button"
            className="doc-export-btn"
            onClick={handleExport}
            title="Download project backup (zip)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
              <path d="M8 2v8M4.5 7.5 8 11l3.5-3.5" />
            </svg>
            <span>Backup</span>
          </button>
          {activity.length > 0 && (
            <div className="doc-activity-container" ref={activityRef}>
              <button
                type="button"
                className="doc-activity-btn"
                onClick={() => setShowActivity(!showActivity)}
                title="Recent activity"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6.5" />
                  <polyline points="8,4 8,8 11,10" />
                </svg>
              </button>
              {showActivity && (
                <div className="doc-activity-tooltip">
                  <div className="doc-activity-tooltip-title">Recent Activity</div>
                  {activity.slice(0, 10).map((a) => (
                    <div key={a.id} className="doc-activity-item">
                      <span className="doc-activity-action">
                        {a.userDisplayName} {a.action} <strong>{a.filename}</strong>
                      </span>
                      <span className="doc-activity-time">{formatDate(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Storage bar */}
      <div className="doc-storage-bar">
        <div className="doc-storage-track">
          <div
            className="doc-storage-fill"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <span className="doc-storage-label">
          {formatBytes(totalSizeBytes)} / {formatBytes(maxSizeBytes)}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={`doc-dropzone ${isDragOver ? 'doc-dropzone-active' : ''} ${uploading ? 'doc-dropzone-uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <>
            <span className="doc-dropzone-text">
              Uploading {uploadFileName ? `"${uploadFileName}"` : ''}… {uploadProgress}%
            </span>
            <div className="doc-upload-progress-track">
              <div
                className="doc-upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <span className="doc-dropzone-text">
            Drop files here or click to browse
          </span>
        )}
        <span className="doc-dropzone-hint">Max 50MB per file</span>
      </div>

      {error && (
        <div className="doc-error">
          {error}
          <button type="button" className="doc-error-dismiss" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* File list */}
      {documents.length > 0 && (
        <div className="doc-file-list">
          {documents.map((doc) => (
            <div key={doc.id} className="doc-file-row">
              <span className="doc-file-icon">{fileIcon(doc.mimeType)}</span>
              <div className="doc-file-info">
                <span className="doc-file-name" title={doc.originalFilename}>
                  {doc.originalFilename}
                </span>
                <span className="doc-file-meta">
                  {formatBytes(doc.sizeBytes)} &middot; {doc.uploaderDisplayName} &middot; {formatDate(doc.createdAt)}
                </span>
              </div>
              <div className="doc-file-actions">
                {isViewableInBrowser(doc.mimeType) && (
                  <button
                    type="button"
                    className="doc-file-action-btn"
                    onClick={() => handleView(doc)}
                    title="View"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" />
                      <circle cx="7" cy="7" r="2" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className="doc-file-action-btn"
                  onClick={() => handleDownload(doc.id, doc.originalFilename)}
                  title="Download"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 1v9M3.5 7.5 7 11l3.5-3.5M2 13h10" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="doc-file-action-btn doc-file-delete-btn"
                  onClick={() => handleDelete(doc.id)}
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 8a1 1 0 001 .9h4.4a1 1 0 001-.9L11 4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image lightbox overlay */}
      {viewingDoc && (
        <div
          className="doc-lightbox-overlay"
          onClick={() => {
            if (viewingImageUrl) URL.revokeObjectURL(viewingImageUrl);
            setViewingDoc(null);
            setViewingImageUrl(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (viewingImageUrl) URL.revokeObjectURL(viewingImageUrl);
              setViewingDoc(null);
              setViewingImageUrl(null);
            }
          }}
        >
          <div className="doc-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="doc-lightbox-header">
              <span className="doc-lightbox-filename">{viewingDoc.originalFilename}</span>
              <div className="doc-lightbox-header-actions">
                <button
                  type="button"
                  className="doc-lightbox-btn"
                  onClick={() => handleDownload(viewingDoc.id, viewingDoc.originalFilename)}
                  title="Download"
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 1v9M3.5 7.5 7 11l3.5-3.5M2 13h10" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="doc-lightbox-btn doc-lightbox-close"
                  onClick={() => {
                    if (viewingImageUrl) URL.revokeObjectURL(viewingImageUrl);
                    setViewingDoc(null);
                    setViewingImageUrl(null);
                  }}
                  title="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="doc-lightbox-body">
              {viewingImageUrl ? (
                <img
                  src={viewingImageUrl}
                  alt={viewingDoc.originalFilename}
                  className="doc-lightbox-image"
                />
              ) : (
                <span className="doc-lightbox-loading">Loading...</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
