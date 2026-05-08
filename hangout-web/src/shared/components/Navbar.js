import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Plus } from 'lucide-react';
import styles from '../../styles/Navbar.module.css';
import NotificationWidget from '../../features/notifications/NotificationWidget';
import { getUnreadNotificationCount } from '../../features/notifications/notificationApi';

export function Navbar({ user, onLogout, onNavigate, activePage }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const initials = user?.firstname?.[0]?.toUpperCase() ?? '?';
  const fullName = user?.firstname ?? '';

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
            onClick={() => onNavigate?.('create')}
          >
            <Plus className={styles.createIcon} />
            Create HangOut
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
    </>
  );
}