import { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import styles from '../../styles/Navbar.module.css';

export function Navbar({ user, onLogout, onNavigate, activePage }) {
  const [showNotifications, setShowNotifications] = useState(false);

  const initials = user?.firstname?.[0]?.toUpperCase() ?? '?';
  const fullName = user?.firstname ?? '';

  return (
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
          <div className={styles.bellWrap}>
            <button
              className={styles.bellBtn}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className={styles.bellIcon} />
              <span className={styles.bellDot} />
            </button>
            {/* NotificationsDropdown goes here once built */}
          </div>

          {/* Profile chip */}
          <button className={styles.profileChip} onClick={() => onNavigate?.('profile')}>
            <div className={styles.avatar} style={
              user?.photoUrl ? {
                backgroundImage: `url(${user.photoUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                fontSize: 0,
              } : {}
            }>{user?.photoUrl ? '' : initials}</div>
            <span className={styles.username}>{fullName}</span>
          </button>

        </div>
      </div>
    </header>
  );
}