import React, { useEffect } from 'react';
import type { DocumentResponse } from '@sandrocket/contracts';
import {
  documentPreviewKind,
  openDocumentDownload,
  openDocumentView
} from './documentLinks';

interface DocumentPreviewOverlayProps {
  baseUrl: string;
  document: DocumentResponse;
  onClose: () => void;
}

export function DocumentPreviewOverlay({
  baseUrl,
  document: doc,
  onClose
}: DocumentPreviewOverlayProps) {
  const kind = documentPreviewKind(doc);
  const viewUrl = `${baseUrl}/documents/${doc.id}/view`;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="doc-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${doc.originalFilename}`}
      onClick={onClose}
    >
      <div className="doc-lightbox-content doc-preview-content" onClick={(e) => e.stopPropagation()}>
        <div className="doc-lightbox-header">
          <span className="doc-lightbox-filename" title={doc.originalFilename}>
            {doc.originalFilename}
          </span>
          <div className="doc-lightbox-header-actions">
            <button
              type="button"
              className="doc-lightbox-btn"
              title="Download"
              onClick={() => openDocumentDownload(baseUrl, doc.id)}
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v9M3.5 7.5 7 11l3.5-3.5M2 13h10" />
              </svg>
            </button>
            <button
              type="button"
              className="doc-lightbox-btn"
              title="Open in new tab"
              onClick={() => openDocumentView(baseUrl, doc.id)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V10" />
                <path d="M8 8l6-6M10 2h4v4" />
              </svg>
            </button>
            <button
              type="button"
              className="doc-lightbox-btn doc-lightbox-close"
              title="Close"
              onClick={onClose}
            >
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>
        </div>
        <div className="doc-lightbox-body doc-preview-body">
          {kind === 'pdf' && (
            <iframe
              className="doc-preview-frame"
              title={doc.originalFilename}
              src={viewUrl}
            />
          )}
          {kind === 'image' && (
            <img className="doc-lightbox-image" src={viewUrl} alt={doc.originalFilename} />
          )}
          {kind === 'word' && (
            <div className="doc-preview-fallback">
              <p>Word files can’t be previewed in the browser.</p>
              <button
                type="button"
                className="doc-preview-fallback-btn"
                onClick={() => openDocumentDownload(baseUrl, doc.id)}
              >
                Download {doc.originalFilename}
              </button>
            </div>
          )}
          {kind === 'other' && (
            <div className="doc-preview-fallback">
              <p>No in-browser preview for this file type.</p>
              <button
                type="button"
                className="doc-preview-fallback-btn"
                onClick={() => openDocumentDownload(baseUrl, doc.id)}
              >
                Download {doc.originalFilename}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
