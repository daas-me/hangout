import { X } from 'lucide-react';
import s from '../../styles/Modal.module.css';

export function Modal({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false, onConfirm, onCancel, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <h2 className={s.title}>{title}</h2>
          <button className={s.closeBtn} onClick={onCancel} disabled={isLoading}>
            <X size={24} />
          </button>
        </div>

        <p className={s.message}>{message}</p>

        <div className={s.footer}>
          <button className={s.btnCancel} onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </button>
          <button
            className={isDanger ? s.btnDanger : s.btnConfirm}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
