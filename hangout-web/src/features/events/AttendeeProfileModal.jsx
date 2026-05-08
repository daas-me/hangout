// AttendeeProfileModal.jsx — used in HostEventDashboard
// Insert this above the main HostEventDashboard export, before the function definition

function AttendeeProfileModal({ attendee, onClose, onMessage }) {
  if (!attendee) return null;

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  const getStatusColor = (status) => {
    return status === 'confirmed' 
      ? { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Confirmed' }
      : { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pending' };
  };

  const statusInfo = getStatusColor(attendee.paymentStatus);

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
          background: '#0f0f1a', borderRadius: 24, padding: '0',
          border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 420,
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 8, zIndex: 10 }}
          onMouseEnter={e => e.target.style.color = '#f0eeff'}
          onMouseLeave={e => e.target.style.color = '#9ca3af'}
        >
          <X size={20} />
        </button>

        {/* Header Background */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          padding: '32px 24px 24px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Avatar */}
          <div style={{ marginBottom: 16 }}>
            <ProfileAvatar person={attendee} name={attendee.name} size={80} />
          </div>

          {/* Name */}
          <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 24, margin: '0 0 8px 0' }}>
            {attendee.name}
          </h2>

          {/* Email */}
          <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
            {attendee.email}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Payment Status Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: statusInfo.bg, padding: '6px 12px', borderRadius: 8,
            marginBottom: 20,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: statusInfo.text,
            }} />
            <span style={{ color: statusInfo.text, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600 }}>
              {statusInfo.label}
            </span>
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Seat', value: attendee.seatNumber || '—', icon: '🪑' },
              { label: 'Registered', value: formatDate(attendee.registeredAt), icon: '📅' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <p style={{ color: '#6b7280', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>
                  {icon} {label}
                </p>
                <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, margin: 0 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Message Button */}
        <button
            onClick={() => { onMessage(attendee); }}
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
              padding: '12px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #A855F7, #EC4899)',
              color: 'white', fontFamily: 'DM Sans, sans-serif',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <MessageCircle size={16} /> Message
          </button>
        </div>
      </div>
    </div>
  );
}
