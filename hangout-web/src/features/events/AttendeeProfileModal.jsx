// AttendeeProfileModal.jsx — User profile widget for hosts
// Shows contact & personal information
import { calculateAge } from '../../shared/utils/ageCalculator';
import { X, MessageCircle } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   ProfileAvatar — Render user avatar with gradient fallback for missing photos
───────────────────────────────────────────────────────────────────────────── */
function ProfileAvatar({ person, name, size = 40, gradient = 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }) {
  const photoUrl = person?.photoUrl || person?.photo;
  if (!photoUrl) {
    const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: size / 2.5, fontWeight: 700,
      }}>
        {initials}
      </div>
    );
  }
  return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
}

function AttendeeProfileModal({ attendee, onClose, onMessage }) {
  if (!attendee) return null;

  // Build address string
  const addressParts = [attendee.city, attendee.state, attendee.country, attendee.zipcode].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(30, 32, 60, 0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.1)',
          width: '100%',
          maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
            color: '#9ca3af', cursor: 'pointer', padding: 8, zIndex: 10,
          }}
          onMouseEnter={e => e.target.style.color = '#f0eeff'}
          onMouseLeave={e => e.target.style.color = '#9ca3af'}
        >
          <X size={20} />
        </button>

        {/* Header with gradient background */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          padding: '40px 24px 28px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Avatar */}
          <div style={{ marginBottom: 18 }}>
            <ProfileAvatar person={attendee} name={attendee.name} size={88} />
          </div>

          {/* Name */}
          <h2 style={{
            color: '#f0eeff',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '1.5rem',
            margin: '0 0 8px 0',
          }}>
            {attendee.name}
          </h2>

          {/* Email */}
          <a 
            href={`mailto:${attendee.email}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `mailto:${attendee.email}`;
            }}
            style={{
              color: '#a855f7',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.9rem',
              margin: 0,
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              display: 'inline-block',
            }}
            onMouseEnter={e => e.target.style.color = '#d946ef'}
            onMouseLeave={e => e.target.style.color = '#a855f7'}
          >
            {attendee.email}
          </a>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Personal Information Section */}
          {(attendee.gender || attendee.phone || attendee.birthdate) && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.75rem',
                color: '#a855f7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0 0 12px 0',
                opacity: 0.8,
              }}>
                Personal Information
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {calculateAge(attendee.birthdate) && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{
                      color: '#9ca3af',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}>Age</span>
                    <span style={{
                      color: '#e5e7eb',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}>{calculateAge(attendee.birthdate)} years</span>
                  </div>
                )}
                {attendee.gender && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{
                      color: '#9ca3af',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}>Gender</span>
                    <span style={{
                      color: '#e5e7eb',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}>{attendee.gender}</span>
                  </div>
                )}
                {attendee.phone && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{
                      color: '#9ca3af',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}>Phone</span>
                    <span style={{
                      color: '#e5e7eb',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}>{attendee.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address Section */}
          {address && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.75rem',
                color: '#a855f7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0 0 12px 0',
                opacity: 0.8,
              }}>
                Location
              </h4>
              <div style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <p style={{
                  color: '#e5e7eb',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  margin: 0,
                  lineHeight: 1.5,
                }}>{address}</p>
              </div>
            </div>
          )}

          {/* Bio Section */}
          {attendee.bio && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.75rem',
                color: '#a855f7',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: '0 0 12px 0',
                opacity: 0.8,
              }}>
                About
              </h4>
              <div style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <p style={{
                  color: '#d1d5db',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem',
                  margin: 0,
                  lineHeight: 1.6,
                }}>{attendee.bio}</p>
              </div>
            </div>
          )}

          {/* Message button */}
          <button
            onClick={() => { onMessage(attendee); onClose(); }}
            onMouseEnter={e => {
              e.target.style.opacity = '0.9';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.target.style.opacity = '1';
              e.target.style.transform = 'translateY(0)';
            }}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #A855F7, #EC4899)',
              color: 'white',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <MessageCircle size={16} /> Message {attendee.name.split(' ')[0]}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendeeProfileModal;
