import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Share2, Download,
  QrCode, AlertCircle, Ban, TicketCheck, CheckCircle,
  RefreshCcw, Trash2, AlertTriangle, ImageOff
} from 'lucide-react';
import s from '../../styles/HostEventDashboard.module.css';
import { NotificationModal } from '../../shared/components/NotificationModal';
import { getTimeLabel } from '../../shared/utils/timeFormatter';
import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';
import { cancelRSVP, checkRSVPStatus, acknowledgeRefund } from '../events/eventsApi';

export default function AttendingEventDashboard({ event, onBack, currentUser }) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMessage,   setCancelMessage]   = useState('');
  const [cancelling,      setCancelling]      = useState(false);
  const [cancelError,     setCancelError]     = useState('');
  const [showRefundAckModal, setShowRefundAckModal] = useState(false);
  const [refundAcknowledging, setRefundAcknowledging] = useState(false);
  const [refundAckError, setRefundAckError] = useState('');
  const [refundAckChoice, setRefundAckChoice] = useState('received');
  const [refundRejectionReason, setRefundRejectionReason] = useState('');
  const [notification, setNotification] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  /* ── Derive state ───────────────────────────────────────────────────────── */
  const isPaidEvent   = event.price != null && event.price > 0;
  const hasNoRefundPolicy = event.noRefundPolicy === true;
  const rsvpStatus    = event.status        || 'confirmed';
  const paymentStatus = event.paymentStatus  || null;
  const eventStatus   = event.eventStatus   || 'active';
  const eventStatusReason = event.eventStatusReason || '';

  const refundStatus = event.refundStatus || null;
  const isRefundPending = refundStatus === 'pending';
  const isWaitingAcknowledgement = refundStatus === 'waiting_acknowledgement';
  const isRefundRejected = refundStatus === 'rejected';
  const isRefundCompleted = refundStatus === 'completed';

  const isCancelledRsvp = rsvpStatus === 'cancelled';
  const isRejected  = rsvpStatus === 'rejected' || paymentStatus === 'rejected' || event.attendeeStatus === 'rejected';
  const isPending   = !isRejected && isPaidEvent && (rsvpStatus === 'registered' || paymentStatus === 'pending');
  const isConfirmed = !isPending && !isRejected && !isCancelledRsvp &&
                      (rsvpStatus === 'confirmed' || paymentStatus === 'confirmed');
  const isEventCancelledOrDeleted = eventStatus === 'cancelled' || eventStatus === 'deleted';
  const isCancelledPopupVisible = isCancelledRsvp && !isEventCancelledOrDeleted;

  // Support both old field name (rejectionNote) and new field names (attendeeRejectionReason, attendeeRejectionType)
  const rejectionReason = event.attendeeRejectionReason || event.rejectionNote || event.attendeeRejectionNote || '';
  const rejectionType = event.attendeeRejectionType || null;

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const resolveUploadUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    const base = API_BASE.replace(/\/$/, '');
    const clean = url.replace(/^\//, '');
    const path = clean.startsWith('api/') ? clean.slice(4) : clean;
    const normalized = path.includes('/') ? path : `events/uploads/${path}`;
    const separator = normalized.includes('?') ? '&' : '?';
    const cacheParam = normalized.includes('/uploads/') ? `${separator}cacheBust=${Date.now()}` : '';
    return `${base}/${normalized}${cacheParam}`;
  };

  function AuthImage({ src, alt, style, className, onClick }) {
    const [blobSrc, setBlobSrc] = useState(null);
    const [failed, setFailed] = useState(false);
    const [triedBlob, setTriedBlob] = useState(false);
    const resolvedSrc = resolveUploadUrl(src);

    const fetchAsBlob = useCallback(async () => {
      if (!resolvedSrc) return;
      try {
        const res = await fetch(resolvedSrc, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        setBlobSrc(URL.createObjectURL(blob));
      } catch (err) {
        console.error('[AuthImage] blob fetch failed:', err);
        setFailed(true);
      }
    }, [resolvedSrc]);

    useEffect(() => {
      return () => {
        if (blobSrc) URL.revokeObjectURL(blobSrc);
      };
    }, [blobSrc]);

    if (!resolvedSrc) {
      return (
        <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} className={className}>
          <ImageOff size={22} style={{ opacity: 0.5 }} />
        </div>
      );
    }

    if (failed) {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            color: '#6b7280',
            gap: 6,
            fontSize: 11,
            fontFamily: 'DM Sans, sans-serif',
            cursor: onClick ? 'pointer' : 'default',
          }}
          onClick={onClick}
          className={className}
        >
          <ImageOff size={22} style={{ opacity: 0.5 }} />
          <span>Preview unavailable</span>
        </div>
      );
    }

    return (
      <img
        src={blobSrc || resolvedSrc}
        alt={alt}
        style={style}
        className={className}
        onClick={onClick}
        onError={() => {
          if (blobSrc) {
            setFailed(true);
          } else if (!triedBlob) {
            setTriedBlob(true);
            fetchAsBlob();
          } else {
            setFailed(true);
          }
        }}
      />
    );
  }

  const parseEventEndDate = () => {
    if (!event?.date) return null;
    if (event?.endTime) return new Date(`${event.date} ${event.endTime}`);
    if (event?.startTime) return new Date(`${event.date} ${event.startTime}`);
    return new Date(`${event.date} 23:59`);
  };

  const hasEventPassed = () => {
    const endDate = parseEventEndDate();
    return endDate ? endDate < new Date() : false;
  };

  const isCompleted = !isEventCancelledOrDeleted && (eventStatus === 'completed' || hasEventPassed());

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event.title, text: `Check out ${event.title}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownloadTicket = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 400, 600);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial';
    ctx.fillText(event.title, 20, 50);
    ctx.font = '14px Arial';
    ctx.fillText(`Ticket #: ${event.ticketNumber || 'N/A'}`, 20, 100);
    ctx.fillText(`Seat: ${event.seatNumber || 'N/A'}`, 20, 130);
    ctx.fillText(`Date: ${event.date}`, 20, 160);
    ctx.fillText(`Time: ${getTimeLabel(event)}`, 20, 190);
    ctx.fillText(`Location: ${event.location}`, 20, 220);
    canvas.toBlob(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${event.title}-ticket.png`; a.click();
      window.URL.revokeObjectURL(url);
    });
  };

 const handleCancelRSVP = async () => {
  setCancelError('');
  setCancelling(true);
  try {
    await cancelRSVP(event.id, cancelMessage ? { message: cancelMessage } : {});
    setShowCancelModal(false);
    setNotification({ message: 'Your RSVP has been cancelled.', type: 'success' });
  } catch (err) {
    // The backend may have succeeded but returned a bad response.
    // Verify the actual RSVP status before showing an error.
    try {
      const status = await checkRSVPStatus(event.id);
      if (!status?.rsvped) {
        // Cancellation went through despite the error response
        setShowCancelModal(false);
        setNotification({ message: 'Your RSVP has been cancelled.', type: 'success' });
        return;
      }
    } catch (_) {
      // Status check also failed — fall through to show error
    }
    setCancelError(err.message || 'Failed to cancel RSVP. Please try again.');
  } finally {
    setCancelling(false);
  }
};

  if (!event) return null;

  /* ── Status badge config ───────────────────────────────────────────────── */
  const statusBadge = isEventCancelledOrDeleted
    ? { label: eventStatus === 'cancelled' ? '⚠ HangOut Cancelled' : '⚠ HangOut Deleted', bg: 'rgba(107,114,128,0.2)', color: '#9ca3af', border: 'rgba(107,114,128,0.4)' }
    : isRefundCompleted
    ? { label: 'Refund Completed', bg: 'rgba(16,185,129,0.18)', color: '#a7f3d0', border: 'rgba(16,185,129,0.4)' }
    : isWaitingAcknowledgement
    ? { label: 'Pending Refund', bg: 'rgba(251,191,36,0.2)', color: '#fcd34d', border: 'rgba(251,191,36,0.4)' }
    : isRefundPending
    ? { label: 'Refund Requested', bg: 'rgba(251,191,36,0.2)', color: '#fcd34d', border: 'rgba(251,191,36,0.4)' }
    : isCancelledRsvp
    ? { label: '✕ RSVP Cancelled',    bg: 'rgba(107,114,128,0.18)', color: '#9ca3af', border: 'rgba(107,114,128,0.4)' }
    : isRejected
    ? { label: '✕ RSVP Rejected',      bg: 'rgba(239,68,68,0.2)',   color: '#f87171',  border: 'rgba(239,68,68,0.4)'  }
    : isPending
    ? { label: 'Awaiting Approval',  bg: 'rgba(251,191,36,0.2)',  color: '#fcd34d',  border: 'rgba(251,191,36,0.4)' }
    : isCompleted
    ? { label: 'HangOut Completed',   bg: 'rgba(14,165,233,0.18)', color: '#bae6fd', border: 'rgba(56,189,248,0.4)' }
    : { label: 'RSVP Confirmed',      bg: 'rgba(16,185,129,0.2)', color: '#86efac',  border: 'rgba(16,185,129,0.4)' };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className={s.page}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className={s.hero}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.heroImg} />
          : <div className={s.heroBlank} />
        }
        <div className={s.heroOverlay} />

        <div className={s.heroActions}>
          <button className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className={s.heroRightActions}>
            <button className={s.iconBtn} onClick={handleShare} title="Share Event">
              <Share2 size={20} />
            </button>
            {isConfirmed && (
              <button className={s.iconBtn} onClick={handleDownloadTicket} title="Download Ticket">
                <Download size={20} />
              </button>
            )}
          </div>
        </div>

        <div className={s.heroContent}>
          <div
            className={s.hostingBadge}
            style={{ background: statusBadge.bg, color: statusBadge.color, borderColor: statusBadge.border }}
          >
            {statusBadge.label}
          </div>
          <h1 className={s.heroTitle}>{event.title}</h1>
          <div className={s.heroMeta}>
            <div className={s.heroMetaItem}><Calendar size={16} className={s.heroMetaIcon} /><span>{formatDate(event.date)}</span></div>
            <div className={s.heroMetaItem}><Clock    size={16} className={s.heroMetaIcon} /><span>{getTimeLabel(event)}</span></div>
            <div className={s.heroMetaItem}><MapPin   size={16} className={s.heroMetaIcon} /><span>{event.location}</span></div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className={s.body}>
        <div className={s.main}>

          {/* ── Status alert banner ─────────────────────────────────────── */}
          {isEventCancelledOrDeleted && (
            <div style={{
              padding: '16px 20px', marginBottom: 24,
              background: eventStatus === 'cancelled' 
                ? 'rgba(107,114,128,0.08)' 
                : 'rgba(239,68,68,0.08)',
              border: `1px solid ${eventStatus === 'cancelled' 
                ? 'rgba(107,114,128,0.25)' 
                : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 12, display: 'flex', gap: 14,
            }}>
              <AlertTriangle size={20} style={{ color: eventStatus === 'cancelled' ? '#9ca3af' : '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: eventStatus === 'cancelled' ? '#9ca3af' : '#f87171', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                  {eventStatus === 'cancelled' ? 'HangOut Cancelled' : 'HangOut Deleted'}
                </p>
                <p style={{ color: eventStatus === 'cancelled' ? '#d1d5db' : '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  {eventStatusReason}
                </p>
              </div>
            </div>
          )}

          {isPending && !isEventCancelledOrDeleted && (
            <div style={{
              padding: '16px 20px', marginBottom: 24,
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 12, display: 'flex', gap: 14,
            }}>
              <AlertCircle size={20} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: '#fcd34d', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                  Awaiting Host Approval
                </p>
                <p style={{ color: '#fde68a', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Your payment proof has been submitted and is currently under review. Ticket and seat details will be available once your payment is approved by the host.
                </p>
              </div>
            </div>
          )}

          {isCancelledPopupVisible && (
            <div style={{
              padding: '16px 20px', marginBottom: 24,
              background: 'rgba(107,114,128,0.08)',
              border: '1px solid rgba(107,114,128,0.25)',
              borderRadius: 12,
              display: 'flex', gap: 14,
            }}>
              <AlertTriangle size={20} style={{ color: '#9ca3af', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: '#9ca3af', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                  RSVP Cancelled
                </p>
                <p style={{ color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Your reservation has been cancelled. The HangOut is still visible in your attending history, but ticket actions are disabled.
                </p>
              </div>
            </div>
          )}

          {isRejected && !isEventCancelledOrDeleted && (
            <div style={{
              padding: '16px 20px', marginBottom: 24,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: rejectionReason ? 14 : 0 }}>
                <Ban size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ color: '#f87171', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                    RSVP Rejected
                  </p>
                  <p style={{ color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    {rejectionType === 'payment' 
                      ? 'Your payment proof was rejected by the host.'
                      : 'Your RSVP was rejected by the host. If you believe this is a mistake, please contact them directly.'}
                  </p>
                </div>
              </div>

              {/* Rejection reason */}
              {rejectionReason && (
                <div style={{
                  marginTop: 12, padding: '12px 14px',
                  background: 'rgba(0,0,0,0.2)',
                  borderLeft: '3px solid #ef4444',
                  borderRadius: 8,
                }}>
                  <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>
                    {rejectionType === 'payment' ? 'Reason' : "Host's Message"}
                  </p>
                  <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {(isRefundPending || isWaitingAcknowledgement || isRefundRejected || isRefundCompleted) && (
            <div style={{
              padding: '16px 20px', marginBottom: 24,
              background: isRefundCompleted ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
              border: isRefundCompleted ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(251,191,36,0.25)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                <RefreshCcw size={20} style={{ color: isRefundCompleted ? '#10b981' : '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ color: isRefundCompleted ? '#10b981' : '#fcd34d', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                    {isRefundCompleted ? 'Refund Completed' : isWaitingAcknowledgement ? 'Refund Processed - Awaiting Your Confirmation' : 'Refund Request Submitted'}
                  </p>
                  <p style={{ color: isRefundCompleted ? '#d1fae5' : '#fde68a', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    {isRefundCompleted
                      ? 'Your refund has been processed successfully.'
                      : isWaitingAcknowledgement
                      ? 'The host has processed your refund request. Please confirm receipt of the refund before the RSVP cancellation is finalized.'
                      : 'Your refund request is currently pending. Please wait for host approval before the RSVP cancellation is finalized.'}
                  </p>
                </div>
              </div>

              {event.refundProofUrl && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>
                    Refund Proof
                  </p>
                  <div style={{ width: '100%', maxWidth: 360, maxHeight: 260, overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => setSelectedImage(event.refundProofUrl)}>
                    <AuthImage
                      src={event.refundProofUrl}
                      alt="Refund Proof"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 11, margin: '8px 0 0', fontStyle: 'italic' }}>
                    Click to view full size
                  </p>
                </div>
              )}

              {isWaitingAcknowledgement && (
                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowRefundAckModal(true)}
                    disabled={refundAcknowledging}
                    style={{
                      padding: '10px 18px', borderRadius: 10, border: 'none',
                      background: refundAcknowledging ? 'rgba(16,185,129,0.45)' : '#10b981',
                      color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                      fontSize: 13, cursor: refundAcknowledging ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {refundAcknowledging ? 'Processing…' : 'Acknowledge Refund'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Quick Actions ────────────────────────────────────────────── */}
          <div className={s.cardFlat} style={{ marginBottom: 24 }}>
            <p className={s.sectionTitle} style={{ marginBottom: 16 }}>Quick Actions</p>
            <div className={s.quickActionsGrid}>
              {isConfirmed && !isEventCancelledOrDeleted && (
                <button className={s.actionCard} onClick={handleDownloadTicket}>
                  <div className={s.actionCardIcon}>
                    <QrCode size={22} style={{ color: '#a78bfa' }} />
                  </div>
                  <h3 className={s.actionCardTitle}>Download E-Ticket</h3>
                  <p className={s.actionCardDesc}>Save your ticket to device</p>
                </button>
              )}
              {!isEventCancelledOrDeleted && (
                <button className={`${s.actionCard} ${s.actionCardGreen}`} onClick={handleShare}>
                  <div className={`${s.actionCardIcon} ${s.actionCardIconGreen}`}>
                    <Share2 size={22} />
                  </div>
                  <h3 className={s.actionCardTitle}>Share HangOut</h3>
                  <p className={s.actionCardDesc}>Invite friends to attend</p>
                </button>
              )}
              {!isRejected && !isCancelledRsvp && !isEventCancelledOrDeleted && !hasEventPassed() && refundStatus !== 'pending' && refundStatus !== 'waiting_acknowledgement' && (
                <button
                  className={s.actionCard}
                  onClick={() => setShowCancelModal(true)}
                  style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                >
                  <div className={s.actionCardIcon} style={{ background: 'rgba(239,68,68,0.1)' }}>
                    {isPaidEvent && !hasNoRefundPolicy
                      ? <RefreshCcw size={22} style={{ color: '#f87171' }} />
                      : <Trash2     size={22} style={{ color: '#f87171' }} />
                    }
                  </div>
                  <h3 className={s.actionCardTitle} style={{ color: '#fca5a5' }}>
                    {isPaidEvent && hasNoRefundPolicy 
                      ? 'Cancel RSVP' 
                      : isPaidEvent 
                      ? 'Cancel & Request Refund' 
                      : 'Cancel RSVP'}
                  </h3>
                  <p className={s.actionCardDesc}>
                    {isPaidEvent && hasNoRefundPolicy 
                      ? 'No refund available (non-refundable)' 
                      : isPaidEvent 
                      ? 'Initiate a reimbursement request' 
                      : 'Remove your spot'}
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* ── Ticket Information (confirmed only) ─────────────────────── */}
          {isConfirmed && (
            <div className={s.cardFlat}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <TicketCheck size={20} style={{ color: '#10b981' }} />
                <p className={s.sectionTitle} style={{ margin: 0 }}>Your Ticket</p>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 11,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  background: 'rgba(34,197,94,0.15)', color: '#86efac',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>
                  ✓ Confirmed
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {[
                  { label: 'Ticket Number', value: event.ticketNumber || 'N/A' },
                  { label: 'Your Seat',     value: event.seatNumber   || 'N/A' },
                  { label: 'Date',          value: formatDate(event.date)       },
                  { label: 'Time',          value: getTimeLabel(event)          },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px', fontFamily: 'DM Sans, sans-serif' }}>
                      {label}
                    </p>
                    <p style={{ color: '#e5e7eb', fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, margin: 0 }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* QR placeholder */}
              <div style={{
                marginTop: 20, padding: '20px', textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: 12,
              }}>
                <QrCode size={64} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />
                <p style={{ color: '#4b5563', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0 }}>
                  QR code will be available when scanning is enabled
                </p>
              </div>
            </div>
          )}

          {/* ── Pending: no ticket yet notice ───────────────────────────── */}
          {isPending && (
            <div className={s.cardFlat} style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(251,191,36,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertCircle size={28} style={{ color: '#fbbf24' }} />
              </div>
              <p style={{ color: '#e5e7eb', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Ticket Not Yet Available
              </p>
              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Your ticket number and seat will be assigned once the host approves your payment.
              </p>
            </div>
          )}

          {/* ── Rejected: no ticket ──────────────────────────────────────── */}
          {isRejected && (
            <div className={s.cardFlat} style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Ban size={28} style={{ color: '#ef4444' }} />
              </div>
              <p style={{ color: '#e5e7eb', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                No Ticket Issued
              </p>
              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Your RSVP was not approved. No ticket has been assigned for this event.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── Cancel RSVP modal ──────────────────────────────────────────────── */}
      {showCancelModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            style={{ background: '#13131f', borderRadius: 16, padding: '28px 32px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 480 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>
                  Cancel RSVP
                </h2>
                <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
                  You're about to cancel your spot for <strong style={{ color: '#e5e7eb' }}>{event.title}</strong>.
                </p>
              </div>
            </div>

            {isPaidEvent && !hasNoRefundPolicy && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginBottom: 16, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10 }}>
                <RefreshCcw size={15} style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ color: '#a5b4fc', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>Reimbursement Request</p>
                  <p style={{ color: '#818cf8', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    Cancelling will initiate a reimbursement request. Explain your reason below to help the host process it.
                  </p>
                </div>
              </div>
            )}

            {isPaidEvent && hasNoRefundPolicy && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
                <AlertTriangle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>Non-Refundable Event</p>
                  <p style={{ color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    You acknowledged this event has a non-refundable policy. Cancelling will simply remove your RSVP with no refund.
                  </p>
                </div>
              </div>
            )}

            <textarea
              value={cancelMessage}
              onChange={e => setCancelMessage(e.target.value)}
              placeholder={
                isPaidEvent && hasNoRefundPolicy 
                  ? 'Tell us why you\'re cancelling (optional)…' 
                  : isPaidEvent 
                  ? 'Explain your reason (required for reimbursement)…' 
                  : 'Tell us why you\'re cancelling (optional)…'
              }
              rows={3}
              style={{ width: '100%', borderRadius: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />

            {cancelError && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                {cancelError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setShowCancelModal(false); setCancelError(''); }}
                disabled={cancelling}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.5 : 1 }}
              >
                Keep RSVP
              </button>
              <button
                onClick={handleCancelRSVP}
                disabled={cancelling}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: cancelling ? 'rgba(239,68,68,0.4)' : '#ef4444', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: cancelling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {cancelling 
                  ? 'Cancelling…' 
                  : isPaidEvent && hasNoRefundPolicy
                  ? 'Cancel RSVP'
                  : isPaidEvent 
                  ? 'Cancel & Request Refund' 
                  : 'Cancel RSVP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundAckModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setShowRefundAckModal(false); setRefundAckError(''); setRefundAckChoice('received'); setRefundRejectionReason(''); }}
        >
          <div
            style={{ background: '#13131f', borderRadius: 16, padding: '28px 32px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 520 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>
                  Confirm Refund Receipt
                </h2>
                <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
                  Please confirm whether you received the refund for <strong style={{ color: '#e5e7eb' }}>{event.title}</strong>.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                <input
                  type="radio"
                  name="refundAcknowledgement"
                  value="received"
                  checked={refundAckChoice === 'received'}
                  onChange={(e) => { setRefundAckChoice(e.target.value); setRefundAckError(''); }}
                  style={{ accentColor: '#10b981' }}
                />
                <span style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                  I received the refund
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="refundAcknowledgement"
                  value="rejected"
                  checked={refundAckChoice === 'rejected'}
                  onChange={(e) => { setRefundAckChoice(e.target.value); setRefundAckError(''); }}
                  style={{ accentColor: '#ef4444' }}
                />
                <span style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                  I did not receive the refund
                </span>
              </label>
            </div>

            {refundAckChoice === 'rejected' && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                  Please describe why you did not receive the refund:
                </label>
                <textarea
                  value={refundRejectionReason}
                  onChange={(e) => setRefundRejectionReason(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  style={{ width: '100%', borderRadius: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {refundAckError && (
              <div style={{ marginBottom: 20, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                {refundAckError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => { setShowRefundAckModal(false); setRefundAckError(''); setRefundAckChoice('received'); setRefundRejectionReason(''); }}
                disabled={refundAcknowledging}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: refundAcknowledging ? 'not-allowed' : 'pointer', opacity: refundAcknowledging ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRefundAckError('');
                  setRefundAcknowledging(true);
                  try {
                    await acknowledgeRefund(event.id, refundAckChoice, refundAckChoice === 'rejected' ? refundRejectionReason : null);
                    setShowRefundAckModal(false);
                    setNotification({ message: 'Refund acknowledgement saved.', type: 'success' });
                    setTimeout(() => onBack?.(), 1100);
                  } catch (err) {
                    setRefundAckError(err.message || 'Failed to acknowledge refund. Please try again.');
                  } finally {
                    setRefundAcknowledging(false);
                  }
                }}
                disabled={refundAcknowledging || (refundAckChoice === 'rejected' && !refundRejectionReason.trim())}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: refundAcknowledging ? 'rgba(16,185,129,0.4)' : '#10b981', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: refundAcknowledging ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {refundAcknowledging ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
      <NotificationModal
        isOpen={true}
        message={notification.message}
        type={notification.type}
        duration={2000}
        onClose={() => { 
          setNotification(null); 
          onBack?.();
         }}
      />
    )}

      {/* Image preview modal */}
      {selectedImage && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: 'white', cursor: 'pointer', zIndex: 10, fontSize: 28, padding: 0, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
          <AuthImage
            src={selectedImage}
            alt="Refund Proof Preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }}
          />
        </div>
      )}
    </div>
  );
}