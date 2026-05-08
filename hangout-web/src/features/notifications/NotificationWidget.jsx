import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, CheckCheck, Trash2, Bell, BellOff, ChevronRight,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from './notificationApi';
import { meta, timeAgo } from './notificationUtils';
import NotifDetailModal from '../../shared/components/NotifDetailModal';


/* ── Single notification row ────────────────────────────────────────────── */
function NotifRow({ notif, onRead, onDelete, onOpenDetail }) {
  const { icon: Icon, accent } = meta(notif.type);
  const unread = !notif.isRead;
  const isLong = notif.body?.length > 80;

  const handleClick = () => {
    if (unread) onRead(notif.id);
    onOpenDetail(unread ? { ...notif, isRead: true } : notif);
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        background: unread ? 'rgba(168,85,247,0.06)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        position: 'relative',
      }}
      onClick={handleClick}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = unread ? 'rgba(168,85,247,0.06)' : 'transparent'}
    >
      {unread && (
        <span style={{
          position: 'absolute', top: 18, left: 5,
          width: 6, height: 6, borderRadius: '50%',
          background: accent, flexShrink: 0,
        }} />
      )}

      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${accent}22`, border: `1px solid ${accent}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: accent }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: unread ? '#f0eeff' : '#d1d5db',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: unread ? 700 : 500,
          fontSize: 13, margin: '0 0 3px', lineHeight: 1.3,
        }}>
          {notif.title}
        </p>
        <p style={{
          color: '#9ca3af', fontFamily: 'DM Sans, sans-serif',
          fontSize: 12, margin: '0 0 4px', lineHeight: 1.45,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {notif.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#6b7280', fontFamily: 'DM Sans, sans-serif', fontSize: 11 }}>
            {timeAgo(notif.createdAt)}
          </span>
          {isLong && (
            <span style={{
              color: accent, fontFamily: 'DM Sans, sans-serif',
              fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              Read more <ChevronRight size={11} />
            </span>
          )}
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
        style={{
          background: 'none', border: 'none', color: '#4b5563',
          cursor: 'pointer', padding: '2px', flexShrink: 0,
          borderRadius: 4, transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
        onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
        title="Remove"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────────────── */
export default function NotificationWidget({ isOpen, onClose, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailNotif, setDetailNotif] = useState(null);
  const panelRef = useRef(null);

  // ── Stable ref so fetchAll never changes identity ──────────────────────
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  // fetchAll has NO external deps — safe to use in effects without looping
  const fetchAll = useCallback(async () => {
    try {
      const data = await getNotifications();
      const list = data || [];
      setNotifications(list);
      onUnreadCountChangeRef.current?.(list.filter(n => !n.isRead).length);
    } catch (err) {
      console.warn('[NotificationWidget] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []); // ← empty deps, stable forever

  // Only re-fetch when the panel is actually opened
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchAll();
    }
  }, [isOpen, fetchAll]); 

  useEffect(() => {
    const handler = (e) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target)) return;
      if (e.target.closest('.notif-detail-modal')) return; // ← key fix
      onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Clear detail when widget closes
  useEffect(() => {
    if (!isOpen) setDetailNotif(null);
  }, [isOpen]);

  // ── Sync unread count outward whenever notifications change ─────────────
  // This replaces the inline onUnreadCountChange calls scattered in handlers,
  // making the count always accurate without any extra wiring.
  useEffect(() => {
    onUnreadCountChangeRef.current?.(
      notifications.filter(n => !n.isRead).length
    );
  }, [notifications]);

  const handleRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('[NotificationWidget] Failed to mark as read:', err);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    }
  };

  const handleDelete = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error('[NotificationWidget] Failed to delete:', err);
      await fetchAll();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('[NotificationWidget] Failed to mark all read:', err);
      await fetchAll();
    }
  };

  const handleDeleteAll = async () => {
    setNotifications([]);
    try {
      await deleteAllNotifications();
    } catch (err) {
      console.error('[NotificationWidget] Failed to delete all:', err);
      await fetchAll();
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <style>{`
        .notif-list::-webkit-scrollbar {
          width: 4px;
        }
        .notif-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .notif-list::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 999px;
        }
        .notif-list::-webkit-scrollbar-thumb:hover {
          background: #666;
        }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 997 }} onClick={onClose} />

      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 64, right: 20,
          width: 360, maxHeight: 520,
          background: '#13131f', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 998,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} style={{ color: '#a855f7' }} />
            <p style={{
              color: '#f0eeff', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: 15, margin: 0,
            }}>
              Notifications
            </p>
            {unreadCount > 0 && (
              <span style={{
                padding: '2px 7px', borderRadius: 999,
                background: 'linear-gradient(135deg, #A855F7, #EC4899)',
                color: 'white', fontSize: 11, fontWeight: 700,
              }}>
                {unreadCount}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 9px', borderRadius: 7, border: 'none',
                  background: 'rgba(168,85,247,0.12)', color: '#c084fc',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.12)'}
              >
                <CheckCheck size={13} /> Read all
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                title="Clear all notifications"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 9px', borderRadius: 7, border: 'none',
                  background: 'rgba(239,68,68,0.1)', color: '#f87171',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                <Trash2 size={13} /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="notif-list" style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div style={{
              padding: '48px 24px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <BellOff size={36} style={{ color: '#374151' }} />
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                You're all caught up!
              </p>
            </div>
          ) : (
            notifications.map(n => (
              <NotifRow
                key={n.id}
                notif={n}
                onRead={handleRead}
                onDelete={handleDelete}
                onOpenDetail={setDetailNotif}
              />
            ))
          )}
        </div>
      </div>

      {detailNotif && (
        <NotifDetailModal
          notif={detailNotif}
          onClose={() => setDetailNotif(null)}
        />
      )}
    </>
  );
}