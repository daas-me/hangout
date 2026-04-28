import { useState } from 'react';
import { Calendar, Clock, MapPin, Download, Eye, QrCode } from 'lucide-react';
import { getTimeLabel } from '../../shared/utils/timeFormatter';
import s from '../../styles/MyHangOutsPage.module.css';

function InfoItem({ icon: Icon, label, value, accent }) {
  return (
    <div className={s.infoItem}>
      <Icon size={20} style={{ color: accent ? '#e040fb' : '#8882aa' }} />
      <div>
        <p className={s.infoLabel}>{label}</p>
        <p className={accent ? s.infoValuePrice : s.infoValue}>{value}</p>
      </div>
    </div>
  );
}

export default function AttendingCard({ event, onViewDetails }) {
  const [showTicket, setShowTicket] = useState(false);

  const handleDownloadTicket = () => {
    // Generate and download ticket as image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 400, 600);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(event.title, 20, 50);
    
    ctx.font = '14px Arial';
    ctx.fillText(`Ticket #: ${event.ticketNumber || 'N/A'}`, 20, 100);
    ctx.fillText(`Seat: ${event.seat || 'N/A'}`, 20, 130);
    ctx.fillText(`Date: ${event.date}`, 20, 160);
    ctx.fillText(`Time: ${getTimeLabel(event)}`, 20, 190);
    ctx.fillText(`Location: ${event.location}`, 20, 220);
    
    canvas.toBlob(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.title}-ticket.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  return (
    <div className={s.cardGroup}>
      <div className={s.card}>
        <div className={s.imgWrap}>
          {event.imageUrl
            ? <img src={event.imageUrl} alt={event.title} className={s.img} />
            : <div className={s.imgDefault}><span className={s.imgDefaultText}>{event.title}</span></div>
          }
          <span className={s.confirmedBadge}>Attending</span>
        </div>

        <div className={s.details}>
          <h3 className={s.cardTitle}>{event.title}</h3>
          <div className={s.infoGrid}>
            <InfoItem icon={Calendar}  label="Date" value={event.date} />
            <InfoItem icon={Clock}     label="Time" value={getTimeLabel(event)} />
            <InfoItem icon={MapPin}    label="Location" value={event.location?.length > 30 ? event.location.substring(0, 30) + '…' : event.location} />
            <div className={s.ticketBox}>
              <p className={s.ticketLabel}>Your Seat</p>
              <p className={s.ticketSeat}>{event.seat || 'N/A'}</p>
            </div>
            <div className={s.ticketBox}>
              <p className={s.ticketLabel}>Ticket #</p>
              <p className={s.ticketNum}>{event.ticketNumber || 'N/A'}</p>
            </div>
          </div>
          <div className={s.actions}>
            <button className={s.btnManage} onClick={() => onViewDetails?.(event)}>
              <Eye size={18} /> View Details
            </button>
            <button className={s.btnEdit} onClick={() => setShowTicket(!showTicket)}>
              <QrCode size={18} /> {showTicket ? 'Hide E-Ticket' : 'View E-Ticket'}
            </button>
            <button className={s.btnIcon} onClick={handleDownloadTicket} title="Download Ticket">
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* E-Ticket Preview */}
      {showTicket && (
        <div className={s.eticket}>
          <div className={s.eticketInner}>
            <div className={s.qrWrap}>
              <div className={s.qrBox}>
                <QrCode style={{ width: '100%', height: '100%', color: '#1a1a2e' }} />
              </div>
              <p className={s.qrHint}>Scan this at the entrance</p>
            </div>
            <div className={s.eticketInfo}>
              <h4 className={s.eticketTitle}>{event.title}</h4>
              <p className={s.eticketSub}>Your electronic ticket</p>
              <div className={s.eticketGrid}>
                <div>
                  <p className={s.etLabel}>Ticket Number</p>
                  <p className={s.etValue}>{event.ticketNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className={s.etLabel}>Seat</p>
                  <p className={s.etValue}>{event.seat || 'N/A'}</p>
                </div>
                <div>
                  <p className={s.etLabel}>Date</p>
                  <p className={s.etValue}>{event.date}</p>
                </div>
                <div>
                  <p className={s.etLabel}>Time</p>
                  <p className={s.etValue}>{getTimeLabel(event)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
