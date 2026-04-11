import { useState, useRef, useEffect } from 'react';
import { Navbar } from '../../shared/components/Navbar';
import {
  Camera, Calendar, Users, TrendingUp, ChevronRight,
  User, Bell, Mail, Settings, LogOut, HelpCircle,
  Phone, MapPin, CheckCircle2, CreditCard, IdCard,
  Lock, Save, CheckCircle, AlertCircle, X, Trash2, Upload
} from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

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
      <div style={{ ...cardStyle, width: '100%', maxWidth: 500, padding: 32, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
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
  const [profile, setProfile]   = useState({ firstname: user?.firstname || '', lastname: user?.lastname || '', email: user?.email || '' });
  const [photo, setPhoto]       = useState(null);
  const [stats, setStats]       = useState({ hostingCount: 0, attendingCount: 0, totalAttendees: 0 });

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm]               = useState({ firstname: '', lastname: '' });
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

  const fileRef = useRef();
  const token = () => localStorage.getItem('hangout_token');
  const initials = ((profile.firstname?.[0] || '') + (profile.lastname?.[0] || '')).toUpperCase() || 'YO';
  const fullName = `${profile.firstname} ${profile.lastname}`.trim();

  useEffect(() => {
    const t = token();
    fetch(`${API_BASE}/user/profile`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => {
        setProfile({ firstname: d.firstname || '', lastname: d.lastname || '', email: d.email || '' });
        setEditForm({ firstname: d.firstname || '', lastname: d.lastname || '' });
      }).catch(() => {});
    fetch(`${API_BASE}/user/photo`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.photo) setPhoto(d.photo); }).catch(() => {});
    fetch(`${API_BASE}/user/stats`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => setStats(d)).catch(() => {});
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
    setEditForm({ firstname: profile.firstname, lastname: profile.lastname });
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
      // 1. Save name
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ firstname: editForm.firstname, lastname: editForm.lastname }),
      });
      const text = await res.text(); const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.message || 'Failed to update');

      // 2. Handle photo changes
      if (photoAction === 'upload' && photoFile) {
        const fd = new FormData(); fd.append('photo', photoFile);
        await fetch(`${API_BASE}/user/photo`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
        setPhoto(editPhoto);
        onUserUpdated?.({ ...user, firstname: editForm.firstname, lastname: editForm.lastname, photoUrl: editPhoto });
      } else if (photoAction === 'remove') {
        await fetch(`${API_BASE}/user/photo`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
        setPhoto(null);
        onUserUpdated?.({ ...user, firstname: editForm.firstname, lastname: editForm.lastname, photoUrl: null });
      } else {
        onUserUpdated?.({ ...user, firstname: editForm.firstname, lastname: editForm.lastname });
      }

      setProfile(p => ({ ...p, firstname: editForm.firstname, lastname: editForm.lastname }));
      setProfileMsg({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => { setShowEditProfile(false); setProfileMsg(null); }, 1200);
    } catch (err) { setProfileMsg({ type: 'error', text: err.message }); }
    finally { setSavingProfile(false); }
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
      const res = await fetch(`${API_BASE}/user/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ oldPassword: passwords.old, newPassword: passwords.newPass }),
      });
      const text = await res.text(); const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      setPasswordMsg({ type: 'success', text: 'Password changed!' });
      setTimeout(() => { setShowChangePw(false); setPasswordMsg(null); }, 1200);
    } catch (err) { setPasswordMsg({ type: 'error', text: err.message }); }
    finally { setSavingPw(false); }
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
                  { icon: Calendar,   label: 'Events Hosting',   value: stats.hostingCount,   bg: 'rgba(168,85,247,0.1)',  iconColor: '#a855f7' },
                  { icon: Users,      label: 'Events Attending', value: stats.attendingCount, bg: 'rgba(168,85,247,0.1)',  iconColor: '#a855f7' },
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
                  { icon: User,   label: 'Full Name',     value: fullName      },
                  { icon: Mail,   label: 'Email Address', value: profile.email },
                  { icon: Phone,  label: 'Phone Number',  value: '—'           },
                  { icon: MapPin, label: 'Location',      value: '—'           },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>{label}</p>
                    <div style={infoBox}><Icon size={18} color="#a855f7" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{value}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Verification */}
            <div style={{ ...cardStyle, padding: 32, background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={22} color="#60a5fa" />
                  <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 600, margin: 0, color: 'white' }}>Host Verification</h3>
                </div>
                <span style={{ padding: '6px 16px', borderRadius: 999, background: 'rgba(34,197,94,0.2)', color: '#22c55e', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: '0.85rem' }}>Verified</span>
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#d1d5db', lineHeight: 1.6, margin: '0 0 24px' }}>
                Verified hosts can receive payments and create paid events. Complete your verification to build trust with attendees.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {[{ icon: IdCard, label: 'Legal Full Name', value: fullName || '—' }, { icon: Calendar, label: 'Date of Birth', value: '—' }].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>{label}</p>
                    <div style={infoBox}><Icon size={18} color="#60a5fa" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{value}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Full Address</p>
                <div style={infoBox}><MapPin size={18} color="#60a5fa" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>—</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {[{ icon: IdCard, label: 'Valid ID Type', value: '—' }, { icon: IdCard, label: 'ID Number', value: '—' }].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>{label}</p>
                    <div style={infoBox}><Icon size={18} color="#60a5fa" /><span style={{ fontFamily: "'DM Sans',sans-serif", color: 'white' }}>{value}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>ID Document Upload</p>
                <div style={{ padding: 24, borderRadius: 12, border: '2px dashed rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)', textAlign: 'center' }}>
                  <CheckCircle2 size={28} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: 'white', margin: '0 0 4px' }}>ID Verified</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#9ca3af', margin: 0 }}>Your identification has been verified</p>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 8px' }}>Payment Account Information</p>
                <div style={{ ...infoBox, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CreditCard size={18} color="#60a5fa" />
                    <div>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, color: 'white', margin: 0, fontSize: '0.9rem' }}>GCash: —</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", color: '#9ca3af', margin: 0, fontSize: '0.78rem' }}>Not set up yet</p>
                    </div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6b7280' }} />
                </div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', color: '#93c5fd', margin: 0, lineHeight: 1.6 }}>
                  ✓ Verification ensures that the person hosting events and receiving payments is properly identified, building trust and security for all attendees.
                </p>
              </div>
            </div>

            {/* Account Settings */}
            <div style={{ ...cardStyle, padding: 32 }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.4rem', fontWeight: 600, margin: '0 0 20px', color: 'white' }}>Account Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <SettingsBtn icon={User} label="Personal Information" sub="Update your details"       onClick={openEditProfile} />
                <SettingsBtn icon={Bell} label="Notifications"        sub="Manage your alerts" />
                <SettingsBtn icon={Lock} label="Privacy & Security"   sub="Change password & privacy" onClick={openChangePw} />
                <SettingsBtn icon={Mail} label="Email Preferences"    sub="Communication settings" />
              </div>
            </div>

            {/* App Settings + Danger Zone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ ...cardStyle, padding: 24 }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.15rem', fontWeight: 600, margin: '0 0 16px', color: 'white' }}>App Settings</h3>
                <SettingsBtn icon={Settings} label="Preferences" sub="Customize your experience" />
              </div>
              <div style={{ ...cardStyle, padding: 24, background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.3)' }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.15rem', fontWeight: 600, margin: '0 0 16px', color: '#f87171' }}>Danger Zone</h3>
                <button onClick={onLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer' }}
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
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Help Button */}
      <button style={{ position: 'fixed', bottom: 32, right: 32, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(168,85,247,0.5)' }}>
        <HelpCircle size={24} />
      </button>

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
        <div style={{ marginBottom: 24 }}>
          <Field label="Email Address" value={profile.email} onChange={() => {}} type="email" disabled />
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>Email cannot be changed</p>
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
    </div>
  );
}