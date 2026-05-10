import { useState, useRef, useEffect } from 'react';
import { Navbar } from '../../shared/components/Navbar';
import {
  Camera, Calendar, Users, TrendingUp, ChevronRight,
  User, Settings, LogOut,
  Phone, MapPin, CheckCircle2,
  Lock, Save, CheckCircle, AlertCircle, X, Trash2, Upload, Mail, Bell
} from 'lucide-react';
import { calculateAge } from '../../shared/utils/ageCalculator';
import {
  fetchUserProfile,
  fetchUserPhoto,
  fetchCalculatedActivityStats,
  updateUserProfile,
  uploadUserPhoto,
  deleteUserPhoto,
  changeUserPassword,
  deleteUserAccount,
} from './profileApi';

const cardStyle = {
  background: 'rgba(30, 32, 60, 0.5)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
};

const infoBox = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 16px', borderRadius: 12,
  background: 'rgba(0,0,0,0.2)',
};

function Modal({ show, onClose, title, children }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="custom-scrollbar" style={{ ...cardStyle, width: '100%', maxWidth: 500, padding: 32, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'white', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', padding: '6px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingsBtn({ icon: Icon, label, sub, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'transparent', border: 'none', cursor: onClick ? 'pointer' : 'default', transition: 'background 0.2s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ padding: 10, borderRadius: 12, background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color="white" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: 'white', margin: 0, fontSize: '0.95rem' }}>{label}</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#9ca3af', margin: 0, fontSize: '0.82rem' }}>{sub}</p>
        </div>
      </div>
      <ChevronRight size={18} color="#9ca3af" />
    </button>
  );
}

function Alert({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontFamily: "'DM Sans',sans-serif", fontSize: '0.85rem', background: msg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'success' ? '#4ade80' : '#f87171' }}>
      {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{msg.text}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, error, success, rightSlot, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', color: '#c4c0dd', fontWeight: 500 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            width: '100%',
            background: '#1a1a2e',
            border: `1.5px solid ${error ? '#f87171' : success ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10,
            padding: rightSlot ? '13px 46px 13px 16px' : '13px 16px',
            color: 'white',
            fontFamily: "'DM Sans',sans-serif",
            fontSize: '0.92rem',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
            boxShadow: error ? '0 0 0 3px rgba(248,113,113,0.12)' : success ? '0 0 0 3px rgba(74,222,128,0.12)' : 'none',
          }}
          onFocus={e => { if (!error && !success && !disabled) e.target.style.borderColor = 'rgba(168,85,247,0.6)'; }}
          onBlur={e => { if (!error && !success) e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
      {error && <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', color: '#f87171' }}>{error}</span>}
    </div>
  );
}

export default function ProfilePage({ user, onLogout, onNavigate, onUserUpdated }) {
  const [profile, setProfile]   = useState({ firstname: user?.firstname || '', lastname: user?.lastname || '', email: user?.email || '', phone: '', city: '', bio: '', street: '', state: '', country: '', zipcode: '', birthdate: '', gender: '' });
  const [photo, setPhoto]       = useState(null);
  const [stats, setStats]       = useState({ hostingCount: 0, attendingCount: 0, totalAttendees: 0 });
  const [completionPercent, setCompletionPercent] = useState(0);
  const [profileComplete, setProfileComplete]     = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm]               = useState({ firstname: '', lastname: '', phone: '', city: '', bio: '', street: '', state: '', country: '', zipcode: '', gender: '', birthdate: '' });
  const [editErrors, setEditErrors]           = useState({});
  const [profileMsg, setProfileMsg]           = useState(null);
  const [savingProfile, setSavingProfile]     = useState(false);

  // Photo state inside edit modal
  const [editPhoto, setEditPhoto]           = useState(null); // local preview in modal
  const [photoAction, setPhotoAction]       = useState(null); // 'upload' | 'remove' | null
  const [photoFile, setPhotoFile]           = useState(null);
  const [photoMsg, setPhotoMsg]             = useState(null);

  const [showChangePw, setShowChangePw]   = useState(false);
  const [passwords, setPasswords]         = useState({ old: '', newPass: '', confirm: '' });
  const [showPw, setShowPw]               = useState({ old: false, newPass: false, confirm: false });
  const [pwErrors, setPwErrors]           = useState({});
  const [passwordMsg, setPasswordMsg]     = useState(null);
  const [savingPw, setSavingPw]           = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState(1); // 1 or 2
  const [deleteHovered, setDeleteHovered] = useState(false); // hover state for delete button
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification preferences
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    notifNewRsvp: true,
    notifPaymentProof: true,
    notifRsvpCancelled: true,
    notifRefundRequest: true,
    notifRefundAcknowledged: true,
    notifPaymentApproved: true,
    notifPaymentRejected: true,
    notifRsvpRejected: true,
    notifRefundProcessed: true,
    notifRefundCompleted: true,
    notifEventCancelled: true,
    notifEventDeleted: true,
    notifSeatAssigned: true,
    notifEventReminder: true,
  });
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);
  const [notifPrefsMsg, setNotifPrefsMsg] = useState(null);

  const fileRef = useRef();
  const onUserUpdatedRef = useRef(onUserUpdated);
  const userRef = useRef(user);
  const initials = ((profile.firstname?.[0] || '') + (profile.lastname?.[0] || '')).toUpperCase() || 'YO';
  const fullName = `${profile.firstname} ${profile.lastname}`.trim();

  useEffect(() => {
    onUserUpdatedRef.current = onUserUpdated;
    userRef.current = user;
  }, [onUserUpdated, user]);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const data = await fetchUserProfile(false);
        setProfile({ 
          firstname: data.firstname || '', 
          lastname: data.lastname || '', 
          email: data.email || '', 
          phone: data.phone || '',
          city: data.city || '',
          bio: data.bio || '',
          street: data.street || '',
          state: data.state || '',
          country: data.country || '',
          zipcode: data.zipcode || '',
          birthdate: data.birthdate || '',
          gender: data.gender || ''
        });
        setEditForm({ 
          firstname: data.firstname || '', 
          lastname: data.lastname || '',
          phone: data.phone || '',
          city: data.city || '',
          bio: data.bio || '',
          street: data.street || '',
          state: data.state || '',
          country: data.country || '',
          zipcode: data.zipcode || '',
          gender: data.gender || ''
        });
        setCompletionPercent(data.completionPercent || 0);
        setProfileComplete(data.profileComplete || false);
        
        // Load notification preferences
        const notifPrefs = {
          notifNewRsvp: data.notifNewRsvp !== undefined ? data.notifNewRsvp : true,
          notifPaymentProof: data.notifPaymentProof !== undefined ? data.notifPaymentProof : true,
          notifRsvpCancelled: data.notifRsvpCancelled !== undefined ? data.notifRsvpCancelled : true,
          notifRefundRequest: data.notifRefundRequest !== undefined ? data.notifRefundRequest : true,
          notifRefundAcknowledged: data.notifRefundAcknowledged !== undefined ? data.notifRefundAcknowledged : true,
          notifPaymentApproved: data.notifPaymentApproved !== undefined ? data.notifPaymentApproved : true,
          notifPaymentRejected: data.notifPaymentRejected !== undefined ? data.notifPaymentRejected : true,
          notifRsvpRejected: data.notifRsvpRejected !== undefined ? data.notifRsvpRejected : true,
          notifRefundProcessed: data.notifRefundProcessed !== undefined ? data.notifRefundProcessed : true,
          notifRefundCompleted: data.notifRefundCompleted !== undefined ? data.notifRefundCompleted : true,
          notifEventCancelled: data.notifEventCancelled !== undefined ? data.notifEventCancelled : true,
          notifEventDeleted: data.notifEventDeleted !== undefined ? data.notifEventDeleted : true,
          notifSeatAssigned: data.notifSeatAssigned !== undefined ? data.notifSeatAssigned : true,
          notifEventReminder: data.notifEventReminder !== undefined ? data.notifEventReminder : true,
        };
        setNotificationPrefs(notifPrefs);
        
        onUserUpdatedRef.current?.({ ...userRef.current, firstname: data.firstname, lastname: data.lastname });
      } catch (err) {
        console.error('Profile load failed:', err);
      }

      try {
        const data = await fetchUserPhoto(false);
        if (data?.photo) {
          setPhoto(data.photo);
          onUserUpdatedRef.current?.({ ...userRef.current, photoUrl: data.photo });
        }
      } catch (err) {
        console.warn('Profile photo load failed:', err);
      }

      try {
        const data = await fetchCalculatedActivityStats(false);
        setStats(data);
      } catch (err) {
        console.warn('Stats load failed:', err);
      }
    };

    loadProfileData();
  }, []);

  const handlePhotoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setPhotoMsg({ type: 'error', text: 'Photo must be under 2MB.' }); return; }
    setPhotoMsg(null);
    setPhotoFile(file);
    setPhotoAction('upload');
    const reader = new FileReader();
    reader.onloadend = () => setEditPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const openEditProfile = () => {
    setEditForm({ firstname: profile.firstname, lastname: profile.lastname, phone: profile.phone, city: profile.city, bio: profile.bio, street: profile.street, state: profile.state, country: profile.country, zipcode: profile.zipcode, gender: profile.gender, birthdate: profile.birthdate });
    setEditErrors({});
    setProfileMsg(null);
    setPhotoMsg(null);
    setEditPhoto(photo); // start with current photo
    setPhotoAction(null);
    setPhotoFile(null);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    const e = {};
    if (!editForm.firstname.trim()) e.firstname = 'First name is required.';
    if (Object.keys(e).length) { setEditErrors(e); return; }
    setSavingProfile(true); setProfileMsg(null);
    try {
      await updateUserProfile({ firstname: editForm.firstname, lastname: editForm.lastname, phone: editForm.phone, city: editForm.city, bio: editForm.bio, street: editForm.street, state: editForm.state, country: editForm.country, zipcode: editForm.zipcode, gender: editForm.gender });

      if (photoAction === 'upload' && photoFile) {
        const fd = new FormData(); fd.append('photo', photoFile);
        const uploadResult = await uploadUserPhoto(fd);
        const photoUrl = uploadResult?.imageUrl || uploadResult?.photo || editPhoto;
        setPhoto(photoUrl);
      } else if (photoAction === 'remove') {
        await deleteUserPhoto();
        setPhoto(null);
      }

      // Reload profile data to get updated completionPercent and profileComplete
      const updatedProfile = await fetchUserProfile(false);
      setCompletionPercent(updatedProfile.completionPercent || 0);
      setProfileComplete(updatedProfile.profileComplete || false);
      setProfile({ 
        firstname: updatedProfile.firstname || '', 
        lastname: updatedProfile.lastname || '', 
        email: updatedProfile.email || '', 
        phone: updatedProfile.phone || '',
        city: updatedProfile.city || '',
        bio: updatedProfile.bio || '',
        street: updatedProfile.street || '',
        state: updatedProfile.state || '',
        country: updatedProfile.country || '',
        zipcode: updatedProfile.zipcode || '',
        birthdate: updatedProfile.birthdate || '',
        gender: updatedProfile.gender || ''
      });

      // Update parent component with new profile data including hosting eligibility
      const photoUrl = photoAction === 'remove' ? null : (photoAction === 'upload' ? (photo || updatedProfile.photoUrl) : updatedProfile.photoUrl);
      onUserUpdated?.({ 
        ...user, 
        firstname: updatedProfile.firstname, 
        lastname: updatedProfile.lastname, 
        phone: updatedProfile.phone, 
        city: updatedProfile.city, 
        bio: updatedProfile.bio,
        street: updatedProfile.street,
        state: updatedProfile.state,
        country: updatedProfile.country,
        zipcode: updatedProfile.zipcode,
        gender: updatedProfile.gender,
        profileComplete: updatedProfile.profileComplete,
        completionPercent: updatedProfile.completionPercent,
        photoUrl: photoUrl, 
        photo: photoUrl 
      });

      setProfileMsg({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => { setShowEditProfile(false); setProfileMsg(null); }, 1200);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const openChangePw = () => {
    setPasswords({ old: '', newPass: '', confirm: '' });
    setPwErrors({});
    setPasswordMsg(null);
    setShowChangePw(true);
  };

  const handleSavePassword = async () => {
    const e = {};
    if (!passwords.old)               e.old     = 'Current password is required.';
    if (passwords.newPass.length < 6) e.newPass = 'Minimum 6 characters.';
    if (passwords.newPass !== passwords.confirm) e.confirm = 'Passwords do not match.';
    if (Object.keys(e).length) { setPwErrors(e); return; }
    setSavingPw(true); setPasswordMsg(null);
    try {
      await changeUserPassword({ oldPassword: passwords.old, newPassword: passwords.newPass });
      setPasswordMsg({ type: 'success', text: 'Password changed!' });
      setTimeout(() => { setShowChangePw(false); setPasswordMsg(null); }, 1200);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteUserAccount();
      // Account deleted successfully, log out the user
      setShowDeleteAccountConfirm(false);
      setTimeout(() => onLogout(), 300);
    } catch (err) {
      console.error('Delete account failed:', err);
      alert('Error: ' + (err.message || 'Failed to delete account'));
      setDeletingAccount(false);
    }
  };

  const openNotificationPrefs = () => {
    setNotifPrefsMsg(null);
    setShowNotificationPrefs(true);
  };

  const handleSaveNotificationPrefs = async () => {
    setSavingNotifPrefs(true);
    setNotifPrefsMsg(null);
    try {
      await updateUserProfile(notificationPrefs);
      setNotifPrefsMsg({ type: 'success', text: 'Notification preferences updated!' });
      setTimeout(() => { setShowNotificationPrefs(false); setNotifPrefsMsg(null); }, 1200);
    } catch (err) {
      setNotifPrefsMsg({ type: 'error', text: err.message });
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  const PwEyeBtn = ({ k }) => (
    <button type="button" onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))}
      style={{ background: 'none', border: 'none', color: showPw[k] ? '#a855f7' : '#8882aa', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6 }}>
      {showPw[k]
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      }
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1b3d 0%, #0a0b1e 50%, #1a1b3d 100%)', color: 'white' }}>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} activePage="profile" />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 24px 100px' }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '3rem', fontWeight: 700, margin: '0 0 32px', color: 'white' }}>Profile</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28, alignItems: 'start' }}>

          {/* ── Left sticky sidebar ── */}
          <div style={{ position: 'sticky', top: 104, paddingTop: 8 }}>
            <div style={{ ...cardStyle, padding: 32 }}>

              {/* ── Avatar ── */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  {photo
                    ? <img src={photo} alt="profile" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(168,85,247,0.5)', display: 'block' }} />
                    : (
                      <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '3px solid rgba(168,85,247,0.3)' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(236,72,153,0.8), transparent 60%)' }} />
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '2.5rem', fontWeight: 700, color: 'white', position: 'relative', zIndex: 1 }}>{initials}</span>
                      </div>
                    )
                  }
                  {/* Camera overlay button */}
                  <button
                    onClick={openEditProfile}
                    title="Edit photo"
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  >
                    <Camera size={22} color="white" style={{ opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}
                      ref={el => {
                        if (el) {
                          const btn = el.closest('button');
                          if (btn) {
                            btn.onmouseenter = () => { el.style.opacity = 1; btn.style.background = 'rgba(0,0,0,0.45)'; };
                            btn.onmouseleave = () => { el.style.opacity = 0; btn.style.background = 'rgba(0,0,0,0)'; };
                          }
                        }
                      }}
                    />
                  </button>
                </div>

                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', margin: '0 0 4px', color: 'white' }}>{fullName || 'Your Name'}</h2>
                <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#a855f7', textAlign: 'center', margin: 0, fontSize: '0.88rem' }}>{profile.email}</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  { icon: Calendar,   label: 'HangOuts Hosting',   value: stats.hostingCount,   bg: 'rgba(168,85,247,0.1)',  iconColor: '#a855f7' },
                  { icon: Users,      label: 'HangOuts Attending', value: stats.attendingCount, bg: 'rgba(168,85,247,0.1)',  iconColor: '#a855f7' },
                  { icon: TrendingUp, label: 'Total Attendees',  value: stats.totalAttendees, bg: 'rgba(236,72,153,0.1)', iconColor: '#ec4899' },
                ].map(({ icon: Icon, label, value, bg, iconColor }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={16} color={iconColor} />
                      <span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white', fontSize: '0.88rem' }}>{label}</span>
                    </div>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Profile Completion Progress Bar */}
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#c4c0dd', fontWeight: 600 }}>Hosting Eligibility</label>
                  {profileComplete && <CheckCircle2 size={16} color="#22c55e" />}
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${completionPercent}%`, background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                    {completionPercent === 100 ? '✓ Complete - Unlocked' : `${Math.ceil(completionPercent / 11.11)} of 9 fields`}
                  </p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, margin: 0 }}>{completionPercent}%</p>
                </div>
                {completionPercent < 100 && (
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.73rem', color: '#9ca3af', margin: '8px 0 0', lineHeight: 1.4 }}>
                    Complete your profile with all required fields (name, gender, birthdate, phone, street/barangay, municipality/city, province, country, zip, bio) to unlock hosting
                  </p>
                )}
              </div>

              <button onClick={openEditProfile}
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.35)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <User size={17} /> Edit Profile
              </button>
            </div>
          </div>

          {/* ── Right content ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Personal Information */}
            <div style={{ ...cardStyle, padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 600, margin: 0, color: 'white' }}>Personal Information</h3>
                <button onClick={openEditProfile} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: 'none', color: '#a855f7', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, cursor: 'pointer' }}>Edit</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { icon: User,   label: 'Full Name',     value: fullName                },
                  { icon: Mail,   label: 'Email Address', value: profile.email           },
                  { icon: Phone,  label: 'Phone Number',  value: profile.phone || '—'    },
                  { icon: User,   label: 'Gender',        value: profile.gender || '—'   },
                  { icon: Calendar, label: 'Birthdate',   value: profile.birthdate ? new Date(profile.birthdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                  { icon: Calendar, label: 'Age',         value: profile.birthdate ? (calculateAge(profile.birthdate) || '—') : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>{label}</p>
                    <div style={infoBox}><Icon size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{value}</span></div>
                  </div>
                ))}
              </div>
              {/* Address Information */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', fontWeight: 600, color: '#c4c0dd', margin: '0 0 12px' }}>Address</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Street/Barangay</p>
                    <div style={infoBox}><MapPin size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{profile.street || '—'}</span></div>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Municipality/City</p>
                    <div style={infoBox}><MapPin size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{profile.city || '—'}</span></div>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>State/Province</p>
                    <div style={infoBox}><MapPin size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{profile.state || '—'}</span></div>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Country</p>
                    <div style={infoBox}><MapPin size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{profile.country || '—'}</span></div>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Zip Code</p>
                    <div style={infoBox}><MapPin size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{profile.zipcode || '—'}</span></div>
                  </div>
                </div>
              </div>
              {profile.bio && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Bio</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Host Verification */}
            {/* Removed - Not needed for MVP */}

            {/* Account Settings */}
            <div style={{ ...cardStyle, padding: 32 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 600, margin: '0 0 20px', color: 'white' }}>Account Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <SettingsBtn icon={User} label="Personal Information" sub="Update your details"       onClick={openEditProfile} />
                <SettingsBtn icon={Lock} label="Privacy & Security"   sub="Change password & privacy" onClick={openChangePw} />
                <SettingsBtn icon={Settings} label="Preferences" sub="Customize your experience" onClick={openNotificationPrefs} />
              </div>

              {/* Danger Actions */}
              <div style={{ marginTop: 28, paddingTop: 0 }}>
                {/* Sign Out */}
                <button onClick={() => setShowLogoutConfirm(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LogOut size={18} color="#f87171" />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: '#f87171', margin: 0, fontSize: '0.9rem' }}>Sign Out</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#9ca3af', margin: 0, fontSize: '0.78rem' }}>Log out of your account</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#f87171" />
                </button>

                {/* Delete Account */}
                <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: deleteHovered ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', transition: 'background 0.2s' }}
                  onMouseEnter={() => setDeleteHovered(true)}
                  onMouseLeave={() => setDeleteHovered(false)}
                >
                  <button onClick={() => setShowDeleteAccountConfirm(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, borderRadius: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Trash2 size={18} color="#f87171" />
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: '#f87171', margin: 0, fontSize: '0.9rem' }}>Delete Account</p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#9ca3af', margin: 0, fontSize: '0.78rem' }}>Remove your account permanently</p>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#f87171" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Edit Profile Modal ── */}
      <Modal show={showEditProfile} onClose={() => { setShowEditProfile(false); setProfileMsg(null); }} title="Edit Profile">
        <Alert msg={profileMsg} />

        {/* Photo section inside modal */}
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* Avatar with camera overlay */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
            {editPhoto && photoAction !== 'remove'
              ? <img src={editPhoto} alt="preview" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(168,85,247,0.5)', display: 'block' }} />
              : (
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '3px solid rgba(168,85,247,0.3)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(236,72,153,0.7), transparent 60%)' }} />
                  <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.8rem', fontWeight: 700, color: 'white', position: 'relative', zIndex: 1 }}>{initials}</span>
                </div>
              )
            }
            {/* Hover overlay */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <Camera size={20} color="white" />
            </div>
          </div>

          {/* Small pill action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              <Upload size={13} />{editPhoto && photoAction !== 'remove' ? 'Change' : 'Upload'}
            </button>

            {editPhoto && photoAction !== 'remove' && (
              <button onClick={() => { setPhotoAction('remove'); setEditPhoto(null); setPhotoMsg(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={13} /> Remove
              </button>
            )}

            {photoAction === 'remove' && (
              <button onClick={() => { setPhotoAction(null); setEditPhoto(photo); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                Undo
              </button>
            )}
          </div>

          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.74rem', color: '#6b7280', margin: 0 }}>JPG or PNG · Max 2MB</p>
          {photoMsg && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', color: '#f87171', margin: 0 }}>{photoMsg.text}</p>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoFileSelect} />
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

        {/* ── Personal Information Section ── */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px', opacity: 0.8 }}>Personal Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field
              label="First Name" placeholder="Juan"
              value={editForm.firstname}
              onChange={e => setEditForm(f => ({ ...f, firstname: e.target.value }))}
              error={editErrors.firstname}
              success={false}
            />
            <Field
              label="Last Name" placeholder="Dela Cruz"
              value={editForm.lastname}
              onChange={e => setEditForm(f => ({ ...f, lastname: e.target.value }))}
              success={false}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', color: '#c4c0dd', fontWeight: 500 }}>Gender <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={editForm.gender}
                onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                style={{
                  width: '100%',
                  background: '#1a1a2e',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '13px 16px',
                  color: editForm.gender ? 'white' : '#6b7280',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', color: '#c4c0dd', fontWeight: 500 }}>Birthdate <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                value={editForm.birthdate || ''}
                onChange={e => setEditForm(f => ({ ...f, birthdate: e.target.value }))}
                disabled
                style={{
                  opacity: 0.5,
                  cursor: 'not-allowed',
                  width: '100%',
                  background: '#1a1a2e',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '13px 16px',
                  color: 'white',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Set at registration, cannot be changed</p>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

        {/* ── Contact Information Section ── */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px', opacity: 0.8 }}>Contact Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field
              label="Phone" placeholder="09XX XXX XXXX"
              value={editForm.phone}
              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
              success={false}
            />
            <Field label="Email Address" value={profile.email} onChange={() => {}} type="email" disabled />
          </div>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#6b7280', margin: '6px 0 0' }}>Email cannot be changed</p>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

        {/* ── Address Information Section ── */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px', opacity: 0.8 }}>Address Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
            <Field
              label="Street/Barangay" placeholder="123 Main Street, Barangay Name"
              value={editForm.street}
              onChange={e => setEditForm(f => ({ ...f, street: e.target.value }))}
              success={false}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Field
              label="Municipality/City" placeholder="Manila"
              value={editForm.city}
              onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
              success={false}
            />
            <Field
              label="State/Province" placeholder="Metro Manila"
              value={editForm.state}
              onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}
              success={false}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field
              label="Country" placeholder="Philippines"
              value={editForm.country}
              onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
              success={false}
            />
            <Field
              label="Zip Code" placeholder="1000"
              value={editForm.zipcode}
              onChange={e => setEditForm(f => ({ ...f, zipcode: e.target.value }))}
              success={false}
            />
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

        {/* ── Bio Section ── */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px', opacity: 0.8 }}>About You</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.88rem', color: '#c4c0dd', fontWeight: 500 }}>Bio</label>
            <textarea
              placeholder="Tell us a bit about yourself..."
              value={editForm.bio}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              style={{
                width: '100%',
                background: '#1a1a2e',
                border: '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '13px 16px',
                color: 'white',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                minHeight: 90,
                resize: 'vertical',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSaveProfile} disabled={savingProfile}
            style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Save size={16} />{savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={() => { setShowEditProfile(false); setProfileMsg(null); }}
            style={{ padding: '13px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </Modal>

      {/* ── Change Password Modal ── */}
      <Modal show={showChangePw} onClose={() => { setShowChangePw(false); setPasswordMsg(null); }} title="Change Password">
        <Alert msg={passwordMsg} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 }}>
          <Field label="Current Password" placeholder="••••••••" type={showPw.old ? 'text' : 'password'}
            value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))}
            error={pwErrors.old} success={!pwErrors.old && passwords.old.length > 0}
            rightSlot={<PwEyeBtn k="old" />} />
          <Field label="New Password" placeholder="••••••••" type={showPw.newPass ? 'text' : 'password'}
            value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
            error={pwErrors.newPass} success={!pwErrors.newPass && passwords.newPass.length >= 6}
            rightSlot={<PwEyeBtn k="newPass" />} />
          <Field label="Confirm New Password" placeholder="••••••••" type={showPw.confirm ? 'text' : 'password'}
            value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
            error={pwErrors.confirm} success={!pwErrors.confirm && passwords.confirm.length > 0 && passwords.confirm === passwords.newPass}
            rightSlot={<PwEyeBtn k="confirm" />} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={handleSavePassword} disabled={savingPw}
            style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Lock size={16} />{savingPw ? 'Updating...' : 'Update Password'}
          </button>
          <button onClick={() => { setShowChangePw(false); setPasswordMsg(null); }}
            style={{ padding: '13px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </Modal>

      <Modal show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Sign Out">
        <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', lineHeight: 1.7 }}>Are you sure you want to sign out from this account?</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={() => { setLoggingOut(true); setTimeout(() => onLogout(), 500); }}
            disabled={loggingOut}
            style={{ flex: 1, padding: '13px', borderRadius: 12, background: loggingOut ? '#b91c1c' : '#ef4444', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: loggingOut ? 'not-allowed' : 'pointer' }}>
            {loggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
          <button onClick={() => setShowLogoutConfirm(false)}
            disabled={loggingOut}
            style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: loggingOut ? 'not-allowed' : 'pointer' }}>
            Cancel
          </button>
        </div>
      </Modal>

      <Modal show={showDeleteAccountConfirm} onClose={() => { setShowDeleteAccountConfirm(false); setDeleteAccountStep(1); setDeleteConfirmText(''); }} title="Delete Account">
        {deleteAccountStep === 1 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', lineHeight: 1.7, margin: '0 0 12px 0', fontWeight: 600 }}>
                  This action cannot be undone. The following will be permanently deleted:
                </p>
                <ul style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', lineHeight: 1.8, margin: 0, paddingLeft: 24 }}>
                  <li>Your account and profile</li>
                  <li>All HangOut events you hosted</li>
                  <li>All your RSVPs and attendance records</li>
                  <li>All messages you sent and received</li>
                  <li>All notifications</li>
                  <li>Your profile photo and uploads</li>
                </ul>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => { setDeleteAccountStep(2); setDeleteConfirmText(''); }}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#ef4444', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                I understand, continue
              </button>
              <button onClick={() => { setShowDeleteAccountConfirm(false); setDeleteAccountStep(1); setDeleteConfirmText(''); }}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', lineHeight: 1.7, marginBottom: 16 }}>
              To confirm account deletion, type <strong>DELETE</strong> in the field below:
            </p>
            <div style={{ marginBottom: 24 }}>
              <Field
                label="Confirmation"
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: deleteConfirmText === 'DELETE' ? '#dc2626' : '#991b1b', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: deleteConfirmText === 'DELETE' && !deletingAccount ? 'pointer' : 'not-allowed', opacity: deleteConfirmText === 'DELETE' ? 1 : 0.5 }}>
                {deletingAccount ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button onClick={() => { setDeleteAccountStep(1); setDeleteConfirmText(''); }}
                disabled={deletingAccount}
                style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Notification Preferences Modal ── */}
      <Modal show={showNotificationPrefs} onClose={() => { setShowNotificationPrefs(false); setNotifPrefsMsg(null); }} title="Notification Preferences">
        <Alert msg={notifPrefsMsg} />
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', color: '#d1d5db', marginBottom: 16 }}>Control which types of notifications you'd like to receive.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8, maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
          {/* RSVP & Attendance Category */}
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px', opacity: 0.8 }}>RSVP & Attendance</p>
            {[
              { key: 'notifNewRsvp', label: 'New RSVP', desc: 'When someone RSVPs to your event' },
              { key: 'notifRsvpCancelled', label: 'RSVP Cancelled', desc: 'When attendee cancels their RSVP' },
              { key: 'notifRsvpRejected', label: 'RSVP Rejected', desc: 'Your RSVP was rejected' },
              { key: 'notifSeatAssigned', label: 'Seat Assigned', desc: 'Host assigned you a seat' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>{item.label}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', color: '#9ca3af', margin: '4px 0 0' }}>{item.desc}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', width: 48, height: 24 }}>
                  <input type="checkbox" checked={notificationPrefs[item.key]} onChange={e => setNotificationPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))} style={{ display: 'none' }} />
                  <div style={{ width: '100%', height: '100%', borderRadius: 12, background: notificationPrefs[item.key] ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: notificationPrefs[item.key] ? 26 : 2, width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.3s' }} />
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Payments Category */}
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px', opacity: 0.8 }}>Payments</p>
            {[
              { key: 'notifPaymentProof', label: 'Payment Proof', desc: 'When attendee uploads payment' },
              { key: 'notifPaymentApproved', label: 'Payment Approved', desc: 'Your payment was approved' },
              { key: 'notifPaymentRejected', label: 'Payment Rejected', desc: 'Your payment was rejected' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>{item.label}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', color: '#9ca3af', margin: '4px 0 0' }}>{item.desc}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', width: 48, height: 24 }}>
                  <input type="checkbox" checked={notificationPrefs[item.key]} onChange={e => setNotificationPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))} style={{ display: 'none' }} />
                  <div style={{ width: '100%', height: '100%', borderRadius: 12, background: notificationPrefs[item.key] ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: notificationPrefs[item.key] ? 26 : 2, width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.3s' }} />
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Refunds Category */}
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px', opacity: 0.8 }}>Refunds</p>
            {[
              { key: 'notifRefundRequest', label: 'Refund Request', desc: 'When attendee requests refund' },
              { key: 'notifRefundAcknowledged', label: 'Refund Acknowledged', desc: 'When attendee confirms refund' },
              { key: 'notifRefundProcessed', label: 'Refund Processed', desc: 'Host processed your refund' },
              { key: 'notifRefundCompleted', label: 'Refund Completed', desc: 'Refund flow is complete' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>{item.label}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', color: '#9ca3af', margin: '4px 0 0' }}>{item.desc}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', width: 48, height: 24 }}>
                  <input type="checkbox" checked={notificationPrefs[item.key]} onChange={e => setNotificationPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))} style={{ display: 'none' }} />
                  <div style={{ width: '100%', height: '100%', borderRadius: 12, background: notificationPrefs[item.key] ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: notificationPrefs[item.key] ? 26 : 2, width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.3s' }} />
                  </div>
                </label>
              </div>
            ))}
          </div>

          {/* Events Category */}
          <div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px', opacity: 0.8 }}>Events</p>
            {[
              { key: 'notifEventReminder', label: 'Event Reminders', desc: 'Reminders before events you\'re attending' },
              { key: 'notifEventCancelled', label: 'Event Cancelled', desc: 'Event you RSVPd to cancelled' },
              { key: 'notifEventDeleted', label: 'Event Deleted', desc: 'Event you RSVPd to deleted' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', marginBottom: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>{item.label}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', color: '#9ca3af', margin: '4px 0 0' }}>{item.desc}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', width: 48, height: 24 }}>
                  <input type="checkbox" checked={notificationPrefs[item.key]} onChange={e => setNotificationPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))} style={{ display: 'none' }} />
                  <div style={{ width: '100%', height: '100%', borderRadius: 12, background: notificationPrefs[item.key] ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 2, left: notificationPrefs[item.key] ? 26 : 2, width: 20, height: 20, borderRadius: 10, background: 'white', transition: 'left 0.3s' }} />
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={handleSaveNotificationPrefs} disabled={savingNotifPrefs}
            style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: 'white', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Bell size={16} />{savingNotifPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
          <button onClick={() => { setShowNotificationPrefs(false); setNotifPrefsMsg(null); }}
            style={{ padding: '13px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}