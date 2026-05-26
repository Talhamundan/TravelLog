import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open = true, title, subtitle, className = '', children, footer, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop app-modal-layer" role="presentation" onMouseDown={onClose}>
      <section className={`modal app-modal ${className}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        {(title || subtitle || onClose) && (
          <header>
            <div>
              {subtitle && <p>{subtitle}</p>}
              {title && <h2>{title}</h2>}
            </div>
            {onClose && (
              <button className="icon-button" title="Kapat" type="button" onClick={onClose}>
                <X size={20} />
              </button>
            )}
          </header>
        )}
        <div className="app-modal-body">{children}</div>
        {footer && <footer className="modal-actions">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
