import { useState, useRef, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import {
  User, Mail, Lock, Camera, LogOut, Save,
  Eye, EyeOff, CheckCircle, AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

export default function ProfilePage({ user, onLogout, onNavigate, onUserUpdated }) {
  const [profile, setProfile] = useState({
    firstname: user?.firstname || '',
    lastname:  user?.lastname  || '',
    email:     user?.email     || '',
  });
  const [photo,         setPhoto]         = useState(null);
  const [passwords,     setPasswords]     = useState({ old: '', newPass: '', confirm: '' });
  const [showPw,        setShowPw]        = useState({ old: false, newPass: false, confirm: false });
  const [profileMsg,    setProfileMsg]    = useState(null);
  const [passwordMsg,   setPasswordMsg]   = useState(null);
  const [photoMsg,      setPhotoMsg]      = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw,      setSavingPw]      = useState(false);
  const [uploadingPhoto,setUploadingPhoto]= useState(false);
  const [editingInfo,   setEditingInfo]   = useState(false);
  const [editingPw,     setEditingPw]     = useState(false);
  const fileRef = useRef();

  const token = () => localStorage.getItem('hangout_token');

  // Load full profile on mount to get lastname etc.
  useEffect(() => {
    const t = token();
    fetch(`${API_BASE}/user/profile`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => {
        setProfile({
          firstname: data.firstname || '',
          lastname:  data.lastname  || '',
          email:     data.email     || '',
        });
      })
      .catch(() => {});
        // Load photo
    fetch(`${API_BASE}/user/photo`, {
        headers: { Authorization: `Bearer ${t}` }
    })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.photo) setPhoto(data.photo); })
        .catch(() => {});

  }, []);

  const initials = ((profile.firstname?.[0] || '') + (profile.lastname?.[0] || '')).toUpperCase() || 'YO';

  // ── Photo upload ──
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoMsg({ type: 'error', text: 'Photo must be under 2MB.' });
      return;
    }
    // Preview locally
    const reader = new FileReader();
    reader.onloadend = () => {
    setPhoto(reader.result);
    // store for upload callback
    fileRef._preview = reader.result;
};
    reader.readAsDataURL(file);

    // Upload to backend
    setUploadingPhoto(true);
    setPhotoMsg(null);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_BASE}/user/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setPhotoMsg({ type: 'success', text: 'Photo updated!' });
      onUserUpdated?.({ ...user, photoUrl: fileRef._preview });
      onUserUpdated?.({ ...user, photoUrl: reader.result });
    } catch (err) {
      setPhotoMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingPhoto(false);
    }
  };


  // ── Save profile ──
  const handleSaveProfile = async () => {
    if (!profile.firstname.trim()) {
      setProfileMsg({ type: 'error', text: 'First name is required.' });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ firstname: profile.firstname, lastname: profile.lastname }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setEditingInfo(false);
      onUserUpdated?.({ ...user, firstname: profile.firstname, lastname: profile.lastname });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Save password ──
  const handleSavePassword = async () => {
    setPasswordMsg(null);
    if (!passwords.old)              { setPasswordMsg({ type: 'error', text: 'Current password is required.' }); return; }
    if (passwords.newPass.length < 6){ setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' }); return; }
    if (passwords.newPass !== passwords.confirm) { setPasswordMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setSavingPw(true);
    try {
      const res = await fetch(`${API_BASE}/user/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ oldPassword: passwords.old, newPassword: passwords.newPass }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setPasswords({ old: '', newPass: '', confirm: '' });
      setEditingPw(false);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  // ── Shared styles ──
  const card = {
    background: '#13131f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
  };
  const fieldLabel = {
    fontFamily: "'Syne', sans-serif",
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#6b6888',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  };
  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '13px 16px',
    color: '#f0eeff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const sectionTitle = {
    fontFamily: "'Syne', sans-serif",
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#6b6888',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  };
  const saveBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 28px', borderRadius: 14,
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    border: 'none', color: 'white',
    fontFamily: "'Syne', sans-serif", fontSize: '0.85rem', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
  };
  const cancelBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '12px 20px', borderRadius: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', color: '#8882aa',
    fontFamily: "'Syne', sans-serif", fontSize: '0.85rem', fontWeight: 700,
    cursor: 'pointer',
  };
  const editBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 16px', borderRadius: 8, marginLeft: 'auto',
    background: 'rgba(124,58,237,0.12)',
    border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa',
    fontFamily: "'Syne', sans-serif", fontSize: '0.75rem', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
  };

  const Alert = ({ msg }) => !msg ? null : (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 12, marginBottom: 20,
      fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem',
      background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      color: msg.type === 'success' ? '#4ade80' : '#f87171',
    }}>
      {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg.text}
    </div>
  );

  const ReadField = ({ lbl, value, icon: Icon }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={fieldLabel}>{Icon && <Icon size={13} />}{lbl}</div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem', color: '#f0eeff', margin: 0 }}>
        {value || <span style={{ color: '#3d3a55' }}>—</span>}
      </p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#f0eeff' }}>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} activePage="profile" />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: '2.2rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #a855f7, #e040fb)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 6px',
          }}>My Profile</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#6b6888', fontSize: '0.95rem', margin: 0 }}>
            Manage your account details and security
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Avatar card ── */}
          <div style={{ position: 'sticky', top: 100 }}>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 0 }}>

              {/* Avatar */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                {photo
                  ? <img src={photo} alt="profile" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(168,85,247,0.4)' }} />
                  : <div style={{
                      width: 96, height: 96, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Syne', sans-serif", fontSize: '1.8rem', fontWeight: 800,
                      color: 'white', border: '3px solid rgba(168,85,247,0.4)',
                    }}>{initials}</div>
                }
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Change photo"
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 30, height: 30, borderRadius: '50%',
                    background: uploadingPhoto ? '#555' : '#7c3aed',
                    border: '2px solid #0a0a14', color: 'white',
                    cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Camera size={13} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </div>

              {photoMsg && (
                <p style={{ fontSize: '0.78rem', margin: '-10px 0 12px', color: photoMsg.type === 'success' ? '#4ade80' : '#f87171' }}>
                  {photoMsg.text}
                </p>
              )}

              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px', color: '#f0eeff' }}>
                {profile.firstname} {profile.lastname}
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#6b6888', margin: '0 0 8px' }}>
                {profile.email}
              </p>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem',
                color: '#a855f7', background: 'rgba(168,85,247,0.1)',
                padding: '3px 10px', borderRadius: 999,
              }}>HangOut Member</span>

              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', margin: '24px 0' }} />

              <button onClick={onLogout} style={{
                width: '100%', padding: 12, borderRadius: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontFamily: "'Syne', sans-serif",
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em',
              }}>
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>

          {/* ── Form cards ── */}
          <div>

            {/* Personal Information */}
            <div style={card}>
              <div style={sectionTitle}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                  <User size={16} />
                </div>
                Personal Information
                {!editingInfo && (
                  <button onClick={() => { setEditingInfo(true); setProfileMsg(null); }} style={editBtn}>
                    <Save size={12} /> Edit
                  </button>
                )}
              </div>

              <Alert msg={profileMsg} />

              {editingInfo ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={fieldLabel}>FIRST NAME</div>
                      <input style={inputStyle} type="text" placeholder="Juan" value={profile.firstname}
                        onChange={e => setProfile(p => ({ ...p, firstname: e.target.value }))} />
                    </div>
                    <div>
                      <div style={fieldLabel}>LAST NAME</div>
                      <input style={inputStyle} type="text" placeholder="Dela Cruz" value={profile.lastname}
                        onChange={e => setProfile(p => ({ ...p, lastname: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={fieldLabel}><Mail size={13} /> EMAIL ADDRESS</div>
                    <input style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} type="email"
                      value={profile.email} readOnly title="Email cannot be changed" />
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#6b6888', marginTop: 6 }}>
                      Email address cannot be changed
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button style={saveBtn} onClick={handleSaveProfile} disabled={savingProfile}>
                      <Save size={15} /> {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button style={cancelBtn} onClick={() => { setEditingInfo(false); setProfileMsg(null); }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <ReadField lbl="FIRST NAME" value={profile.firstname} />
                  <ReadField lbl="LAST NAME"  value={profile.lastname} />
                  <ReadField lbl="EMAIL ADDRESS" value={profile.email} icon={Mail} />
                </div>
              )}
            </div>

            {/* Password & Security */}
            <div style={card}>
              <div style={sectionTitle}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                  <Lock size={16} />
                </div>
                Password & Security
                {!editingPw && (
                  <button onClick={() => { setEditingPw(true); setPasswordMsg(null); }} style={editBtn}>
                    <Lock size={12} /> Change
                  </button>
                )}
              </div>

              <Alert msg={passwordMsg} />

              {editingPw ? (
                <>
                  {[
                    { key: 'old',     lbl: 'CURRENT PASSWORD'      },
                    { key: 'newPass', lbl: 'NEW PASSWORD'           },
                    { key: 'confirm', lbl: 'CONFIRM NEW PASSWORD'   },
                  ].map(({ key, lbl }) => (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <div style={fieldLabel}>{lbl}</div>
                      <div style={{ position: 'relative' }}>
                        <input
                          style={{ ...inputStyle, paddingRight: 46 }}
                          type={showPw[key] ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={passwords[key]}
                          onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                        />
                        <button type="button"
                          onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b6888', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button style={saveBtn} onClick={handleSavePassword} disabled={savingPw}>
                      <Lock size={15} /> {savingPw ? 'Updating...' : 'Update Password'}
                    </button>
                    <button style={cancelBtn} onClick={() => { setEditingPw(false); setPasswordMsg(null); setPasswords({ old: '', newPass: '', confirm: '' }); }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={fieldLabel}><Lock size={13} /> PASSWORD</div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.3rem', color: '#3d3a55', letterSpacing: '0.15em', margin: 0 }}>
                    ●●●●●●●●●●
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}