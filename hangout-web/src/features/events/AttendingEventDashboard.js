import { useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Share2, Download, QrCode, X } from 'lucide-react';
import s from '../../styles/HostEventDashboard.module.css';
import { getTimeLabel } from '../../shared/utils/timeFormatter';

export default function AttendingEventDashboard({ event, onBack, currentUser }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasEventPassed = () => {
    if (!event?.date || !event?.endTime) return false;
    const eventDateTime = new Date(`${event.date} ${event.endTime}`);
    return eventDateTime < new Date();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Check out ${event.title}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownloadTicket = () => {
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

  if (!event) return null;

  return (
    <div className={s.page}>
      {/* Hero */}
      <div className={s.hero}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className={s.heroImg} />
        ) : (
          <div className={s.heroBlank} />
        )}
        <div className={s.heroOverlay} />

        <div className={s.heroActions}>
          <button className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className={s.heroRightActions}>
            <button className={s.iconBtn} onClick={handleShare} title="Share Event">
              <Share2 size={20} />
            </button>
            <button className={s.iconBtn} onClick={handleDownloadTicket} title="Download Ticket">
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className={s.heroContent}>
          {!hasEventPassed() && <div className={s.hostingBadge}>You're attending this event</div>}
          <h1 className={s.heroTitle}>{event.title}</h1>
          <div className={s.heroMeta}>
            <div className={s.heroMetaItem}>
              <Calendar size={18} className={s.heroMetaIcon} />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className={s.heroMetaItem}>
              <Clock size={18} className={s.heroMetaIcon} />
              <span>{getTimeLabel(event)}</span>
            </div>
            <div className={s.heroMetaItem}>
              <MapPin size={18} className={s.heroMetaIcon} />
              <span>{event.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={s.body}>
        <div className={s.main}>
          {/* Quick Actions */}
          <div className={s.quickActionsSection}>
            <h2 className={s.sectionTitle}>Quick Actions</h2>
            <div className={s.quickActionsGrid}>
              <button className={s.actionCard} onClick={handleDownloadTicket}>
                <div className={s.actionCardIcon}>
                  <QrCode size={24} style={{ color: '#a78bfa' }} />
                </div>
                <h3 className={s.actionCardTitle}>Download E-Ticket</h3>
                <p className={s.actionCardDesc}>Save your ticket to device</p>
              </button>
              <button className={`${s.actionCard} ${s.actionCardGreen}`} onClick={handleShare}>
                <div className={`${s.actionCardIcon} ${s.actionCardIconGreen}`}>
                  <Share2 size={24} />
                </div>
                <h3 className={s.actionCardTitle}>Share Event</h3>
                <p className={s.actionCardDesc}>Invite friends to attend</p>
              </button>
            </div>
          </div>

          {/* Ticket Information */}
          <div className={s.cardFlat}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <p className={s.sectionTitle}>Your Ticket Information</p>
              <span style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                background: 'rgba(34, 197, 94, 0.2)', color: '#86efac',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                Valid
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              <div>
                <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ticket Number
                </h3>
                <p style={{ color: '#e5e7eb', fontSize: '16px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                  {event.ticketNumber || 'N/A'}
                </p>
              </div>
              <div>
                <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Your Seat
                </h3>
                <p style={{ color: '#e5e7eb', fontSize: '16px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                  {event.seat || 'N/A'}
                </p>
              </div>
              <div>
                <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Date
                </h3>
                <p style={{ color: '#e5e7eb', fontSize: '16px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                  {formatDate(event.date)}
                </p>
              </div>
              <div>
                <h3 style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Time
                </h3>
                <p style={{ color: '#e5e7eb', fontSize: '16px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                  {getTimeLabel(event)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', background: 'rgba(0, 0, 0, 0.9)'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute', top: '24px', right: '24px',
              background: 'none', border: 'none', color: 'white',
              cursor: 'pointer', zIndex: 10, transition: 'color 0.2s'
            }}
          >
            <X size={32} />
          </button>
          <img
            src={selectedImage}
            alt="Event detail"
            className={s.paymentImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
