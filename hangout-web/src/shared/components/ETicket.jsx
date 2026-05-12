import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Calendar, Clock, MapPin, Ticket, User, Armchair, Download, Camera } from 'lucide-react';

const FRONTEND_BASE = process.env.REACT_APP_FRONTEND_BASE || window.location.origin;

export function ETicket({ event, rsvp, guestName, onClose }) {
  const ticketNumber = rsvp?.ticketNumber || `TKT-${rsvp?.rsvpId || rsvp?.id}`;
  const qrValue = `${FRONTEND_BASE}/verify/${event.id}/${ticketNumber}`;
  const qrCanvasId = `qr-dl-${event.id}`;

  const handleDownloadQR = () => {
    // Download just the QR code as a clean PNG — no html2canvas needed
    const canvas = document.getElementById(qrCanvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${event.title}-ticket-${ticketNumber}.png`;
    link.click();
  };

  return (
    <>
      {/* Screen modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480 }}>

          <TicketCard
            event={event}
            ticketNumber={ticketNumber}
            seatNumber={rsvp?.seatNumber}
            guestName={guestName}
            qrValue={qrValue}
          />

          {/* Hidden high-res QR canvas for download */}
          <div style={{ position: 'absolute', left: -9999, top: -9999 }}>
            <QRCodeCanvas
              id={qrCanvasId}
              value={qrValue}
              size={512}
              bgColor="#ffffff"
              fgColor="#111827"
              level="H"
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: '#d1d5db',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleDownloadQR}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: 'none', background: '#7c3aed',
                  color: 'white', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Download size={16} /> Download QR
              </button>
            </div>

            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', gap: 10,
            }}>
              <Camera size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: '#818cf8', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: '#a5b4fc' }}>Tip:</strong> Take a screenshot to save the full ticket, or download just the QR code above to show at the entrance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TicketCard({ event, ticketNumber, seatNumber, guestName, qrValue }) {
  const bg = '#13131f';
  const text = '#f0eeff';
  const subtext = '#9ca3af';
  const border = 'rgba(255,255,255,0.1)';
  const divider = 'rgba(255,255,255,0.08)';
  const accentBg = 'rgba(124,58,237,0.15)';

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'TBD';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const timeLabel = event.startTime && event.endTime
    ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
    : event.startTime ? formatTime(event.startTime) : 'TBD';

  return (
    <div style={{
      background: bg,
      borderRadius: 16,
      border: `1px solid ${border}`,
      overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      <div style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        padding: '20px 24px',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>
          E-Ticket · HangOut
        </p>
        <h2 style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, margin: 0, lineHeight: 1.3 }}>
          {event.title}
        </h2>
      </div>

      <div style={{ padding: '18px 24px', borderBottom: `1px dashed ${divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={18} style={{ color: '#a855f7' }} />
        </div>
        <div>
          <p style={{ color: subtext, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' }}>
            Guest
          </p>
          <p style={{ color: text, fontSize: 15, fontWeight: 600, margin: 0 }}>
            {guestName || 'Guest'}
          </p>
        </div>
      </div>

      <div style={{ padding: '18px 24px', borderBottom: `1px dashed ${divider}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { icon: Calendar, label: 'Date', value: formatDate(event.date) },
          { icon: Clock, label: 'Time', value: timeLabel },
          { icon: MapPin, label: 'Location', value: event.location || 'TBD' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Icon size={16} style={{ color: '#a855f7', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ color: subtext, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' }}>
                {label}
              </p>
              <p style={{ color: text, fontSize: 13, fontWeight: 500, margin: 0 }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '18px 24px', borderBottom: `1px dashed ${divider}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { icon: Ticket, label: 'Ticket No.', value: ticketNumber },
          { icon: Armchair, label: 'Seat', value: seatNumber || 'Open' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ padding: '12px 14px', background: accentBg, borderRadius: 10 }}>
            <Icon size={14} style={{ color: '#a855f7', marginBottom: 6 }} />
            <p style={{ color: subtext, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
              {label}
            </p>
            <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: 0 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: 16, background: 'white', borderRadius: 12, border: `1px solid ${border}` }}>
          <QRCodeSVG value={qrValue} size={160} bgColor="#ffffff" fgColor="#111827" level="H" includeMargin={false} />
        </div>
        <p style={{ color: subtext, fontSize: 11, textAlign: 'center', margin: 0 }}>
          Scan at the entrance to verify attendance
        </p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace', margin: 0 }}>
          {ticketNumber}
        </p>
      </div>
    </div>
  );
}