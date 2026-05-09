import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Plus } from 'lucide-react';
import styles from '../../styles/Navbar.module.css';
import NotificationWidget from '../../features/notifications/NotificationWidget';
import { getUnreadNotificationCount } from '../../features/notifications/notificationApi';

export function Navbar({ user, onLogout, onNavigate, activePage }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const pollRef = useRef(null);

  const initials = user?.firstname?.[0]?.toUpperCase() ?? '?';
  const fullName = user?.firstname ?? '';

  const handleCreateClick = () => {
    if (!user?.profileComplete) {
      setShowUnlockModal(true);
    } else {
      onNavigate?.('create');
    }
  };

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.unreadCount || 0);
    } catch (_) {
      // ignore polling errors
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 10000);
    return () => clearInterval(pollRef.current);
  }, [fetchUnread]);

  const handleToggle = () => {
    setShowNotifications((current) => !current);
  };

  const handleClose = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const handleUnreadChange = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>

        {/* Logo — left */}
        <button className={styles.logo} onClick={() => onNavigate?.('home')}>
          HangOut
        </button>

        {/* Nav links — center */}
        <nav className={styles.nav}>
          <button className={`${styles.navLink} ${activePage === 'home' ? styles.navLinkActive : ''}`} onClick={() => onNavigate?.('home')}>
            Home
          </button>
          <button className={`${styles.navLink} ${activePage === 'discover' ? styles.navLinkActive : ''}`} onClick={() => onNavigate?.('discover')}>
            Discover
          </button>
          <button className={`${styles.navLink} ${activePage === 'my-hangouts' ? styles.navLinkActive : ''}`} onClick={() => onNavigate?.('my-hangouts')}>
            My HangOuts
          </button>
        </nav>

        {/* Right side */}
        <div className={styles.actions}>

          {/* Create Event */}
          <button
            className={styles.createBtn}
            onClick={handleCreateClick}
            style={!user?.profileComplete ? {
              opacity: 0.6,
              cursor: 'pointer',
              background: '#6b7280',
              pointerEvents: 'auto'
            } : {}}
            title={!user?.profileComplete ? 'Complete your profile to create events' : 'Create a new HangOut'}
          >
            <Plus className={styles.createIcon} />
            {!user?.profileComplete ? 'Unlock Hosting' : 'Create HangOut'}
          </button>

          {/* Bell */}
          <div className={styles.bellWrap} style={{ position: 'relative' }}>
            <button
              className={styles.bellBtn}
              onClick={handleToggle}
              style={{ position: 'relative' }}
            >
              <Bell className={styles.bellIcon} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, #A855F7, #EC4899)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid #0a0a12',
                  pointerEvents: 'none',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile chip */}
          <button className={styles.profileChip} onClick={() => onNavigate?.('profile')}>
            <div className={styles.avatar} style={
              user?.photoUrl || user?.photo ? {
                backgroundImage: `url(${user.photoUrl || user.photo})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                fontSize: 0,
              } : {}
            }>{(user?.photoUrl || user?.photo) ? '' : initials}</div>
            <span className={styles.username}>{fullName}</span>
          </button>

        </div>
      </div>  
    </header>

      <NotificationWidget
        isOpen={showNotifications}
        onClose={handleClose}
        onUnreadCountChange={handleUnreadChange}
      />

      {/* Unlock Hosting Modal */}
      {showUnlockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="custom-scrollbar" style={{ background: 'rgba(30, 32, 60, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 32, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowUnlockModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', padding: '6px', display: 'flex', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'white', margin: '0 0 16px' }}>Unlock Hosting</h3>
            <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', lineHeight: 1.6, margin: '0 0 24px' }}>
              Complete your profile to start creating HangOuts. Fill in your phone number, city, and bio.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowUnlockModal(false); onNavigate?.('profile'); }} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Complete Profile
              </button>
              <button onClick={() => setShowUnlockModal(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}