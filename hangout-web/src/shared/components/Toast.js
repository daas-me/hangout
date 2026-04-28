import { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import s from '../../styles/Toast.module.css';

export function Toast({ message, type = 'error', duration = 5000, onClose }) {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      default:
        return <AlertCircle size={20} />;
    }
  };

  return (
    <div className={`${s.toast} ${s[`toast_${type}`]}`}>
      <div className={s.toastContent}>
        <div className={s.toastIcon}>{getIcon()}</div>
        <p className={s.toastMessage}>{message}</p>
      </div>
      <button className={s.toastClose} onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}
