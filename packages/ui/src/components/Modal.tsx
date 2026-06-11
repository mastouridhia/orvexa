import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useEscapeKey, useFocusTrap } from '../hooks/useFocusTrap.js';

export type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ title, onClose, children, footer }: ModalProps) {
  const cardRef = useFocusTrap<HTMLDivElement>();
  useEscapeKey(onClose);
  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={cardRef} className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button
            type="button"
            className="close btn btn-ghost"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
