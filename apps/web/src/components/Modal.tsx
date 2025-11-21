import React from 'react';

interface ModalProps {
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal(props: ModalProps) {
  if (!props.isOpen) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={props.title ?? 'Dialog'}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{props.title}</div>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{props.children}</div>
        {props.footer ? <div className="modal-footer">{props.footer}</div> : null}
      </div>
    </div>
  );
}


