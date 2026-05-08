import { X, Clock } from 'lucide-react';
import { meta, timeAgo } from '../../features/notifications/notificationUtils';

export default function NotifDetailModal({ notif, onClose }) {
  if (!notif) return null;
  const { icon: Icon, accent } = meta(notif.type);

  const typeLabel = notif.type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());

  const formattedDate = new Date(notif.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className="notif-detail-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,0.72)',
        animation: 'notifFadeIn 0.18s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes notifFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes notifSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-close-btn:hover { background: rgba(255,255,255,0.1) !important; color: #e5e7eb !important; }
      `}</style>

      <div
        style={{
          width: '100%', maxWidth: 420,
          background: '#0e0e1a',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          animation: 'notifSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'relative',
          padding: '28px 24px 22px',
          background: `linear-gradient(160deg, ${accent}22 0%, transparent 65%)`,
          borderBottom: `1px solid ${accent}22`,
        }}>
          <button
            className="notif-close-btn"
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#6b7280', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <X size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: `${accent}18`, border: `1px solid ${accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={21} style={{ color: accent }} />
            </div>
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              color: accent,
              background: `${accent}14`,
              border: `1px solid ${accent}28`,
              padding: '3px 10px', borderRadius: 999,
            }}>
              {typeLabel}
            </span>
          </div>

          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: 17, color: '#f5f3ff',
            margin: '0 0 9px', lineHeight: 1.3,
          }}>
            {notif.title}
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: '#6b7280', fontFamily: 'DM Sans, sans-serif', fontSize: 12,
          }}>
            <Clock size={12} />
            {timeAgo(notif.createdAt)} · {formattedDate}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 26px' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 14,
            color: '#c4c4d4', lineHeight: 1.72, margin: 0,
          }}>
            {notif.body}
          </p>
        </div>
      </div>
    </div>
  );
}