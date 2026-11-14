import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, children, as: Tag = 'div', ...rest }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <Tag
        className="modal"
        onClick={(e) => e.stopPropagation()}
        {...rest}
      >
        {children}
      </Tag>
    </div>,
    document.body
  );
}
