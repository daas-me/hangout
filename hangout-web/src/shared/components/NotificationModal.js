import { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import s from '../../styles/NotificationModal.module.css';

export function NotificationModal({ isOpen, message, type = 'success', duration = 3000, onClose }) {
  useEffect(() => {
    if (isOpen && duration && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={48} />;
      case 'error':
        return <AlertCircle size={48} />;
      case 'warning':
        return <AlertCircle size={48} />;
      default:
        return <AlertCircle size={48} />;
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={`${s.modal} ${s[`modal_${type}`]}`} onClick={e => e.stopPropagation()}>
        <button className={s.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className={s.iconContainer}>
          {getIcon()}
        </div>
        
        <p className={s.message}>{message}</p>
      </div>
    </div>
  );
}
