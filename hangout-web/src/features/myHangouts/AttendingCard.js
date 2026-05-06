import { useState } from 'react';
import {
  Calendar, Clock, MapPin, Download, Eye, QrCode,
  AlertCircle, Trash2, PhilippinePeso, CheckCircle,
  TicketCheck, RefreshCcw
} from 'lucide-react';
import { getTimeLabel } from '../../shared/utils/timeFormatter';
import { cancelRSVP, acknowledgeRefund } from '../events/eventsApi';
import { STATUS_CONFIG } from '../../shared/config/statusConfig';
import s from '../../styles/MyHangOutsPage.module.css';

const parseEventEndDate = (event) => {
  if (!event?.date) return null;
  if (event?.endTime) return new Date(`${event.date} ${event.endTime}`);
  if (event?.startTime) return new Date(`${event.date} ${event.startTime}`);
  return new Date(`${event.date} 23:59`);
};

const hasEventPassed = (event) => {
  const endDate = parseEventEndDate(event);
  return endDate ? endDate < new Date() : false;
};

/* ─── Small reusable info row ─────────────────────────────────────────────── */
function InfoItem({ icon: Icon, label, value, accent }) {
  return (
    <div className={s.infoItem}>
      <Icon size={16} style={{ color: accent ? '#e040fb' : '#6b7280', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p className={s.infoLabel}>{label}</p>
        <p className={accent ? s.infoValuePrice : s.infoValue}
           style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── Status badge ────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', borderRadius: 8,
      background: cfg.bgLight, color: cfg.textColor || cfg.color,
      fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
      whiteSpace: 'nowrap', flexShrink: 0,
      border: cfg.borderColor ? `1px solid ${cfg.borderColor}` : 'none',
    }}>
      <Icon size={14} />
      {cfg.label}
    </span>
  );
}

/* ─── Refund Acknowledgement Modal ──────────────────────────────────────── */
function RefundAckModal({ event, onCancel, onConfirm, acknowledging, ackError }) {
  const [acknowledgement, setAcknowledgement] = useState('received');
  const [rejectionReason, setRejectionReason] = useState('');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#13131f', borderRadius: 16, padding: '28px 32px',
          border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 480,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'rgba(16,185,129,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>
              Confirm Refund Receipt
            </h2>
            <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
              Please confirm if you received the refund for <strong style={{ color: '#e5e7eb' }}>{event.title}</strong>.
            </p>
          </div>
        </div>

        {/* Acknowledgement Options */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="radio"
                name="acknowledgement"
                value="received"
                checked={acknowledgement === 'received'}
                onChange={(e) => setAcknowledgement(e.target.value)}
                style={{ accentColor: '#10b981' }}
              />
              <span style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                I received the refund
              </span>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="radio"
                name="acknowledgement"
                value="rejected"
                checked={acknowledgement === 'rejected'}
                onChange={(e) => setAcknowledgement(e.target.value)}
                style={{ accentColor: '#ef4444' }}
              />
              <span style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                I did not receive the refund
              </span>
            </label>
          </div>
        </div>

        {/* Rejection Reason */}
        {acknowledgement === 'rejected' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Please explain why you did not receive the refund:
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
              style={{
                width: '100%', borderRadius: 10, padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif',
                fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {ackError && (
          <div style={{
            marginBottom: 20, padding: '10px 12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: '#f87171',
            fontSize: 12, fontFamily: 'DM Sans, sans-serif',
          }}>
            {ackError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={acknowledging}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#d1d5db',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              fontSize: 13, cursor: acknowledging ? 'not-allowed' : 'pointer',
              opacity: acknowledging ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(acknowledgement, rejectionReason)}
            disabled={acknowledging || (acknowledgement === 'rejected' && !rejectionReason.trim())}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: acknowledging ? 'rgba(16,185,129,0.4)' : '#10b981',
              color: 'white', fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600, fontSize: 13,
              cursor: acknowledging ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {acknowledging ? 'Confirming…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Cancel RSVP modal ───────────────────────────────────────────────────── */
function CancelModal({ event, isPaidEvent, hasNoRefundPolicy, onCancel, onConfirm, cancelling, cancelError }) {
  const [message, setMessage] = useState('');

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#13131f', borderRadius: 16, padding: '28px 32px',
          border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 480,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
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

        {/* Paid event reimbursement notice */}
        {isPaidEvent && !hasNoRefundPolicy && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', marginBottom: 18,
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 10,
          }}>
            <RefreshCcw size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ color: '#a5b4fc', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>
                Paid Event — Reimbursement Request
              </p>
              <p style={{ color: '#818cf8', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Cancelling a paid RSVP will initiate a reimbursement request. Please explain your reason below to help the host process it.
              </p>
            </div>
          </div>
        )}

        {/* No-refund policy notice */}
        {isPaidEvent && hasNoRefundPolicy && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', marginBottom: 18,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10,
          }}>
            <AlertCircle size={16} style={{ color: '#fca5a5', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>
                No Refunds Policy
              </p>
              <p style={{ color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                This event has a no-refund policy. Cancelling your RSVP cannot be reversed and no refund will be issued.
              </p>
            </div>
          </div>
        )}

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={
            (isPaidEvent && !hasNoRefundPolicy)
              ? 'Explain your reason for cancelling (required for reimbursement)…'
              : 'Tell us why you\'re cancelling (optional)…'
          }
          rows={3}
          style={{
            width: '100%', borderRadius: 10, padding: '12px 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif',
            fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />

        {cancelError && (
          <div style={{
            marginTop: 10, padding: '10px 12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: '#f87171',
            fontSize: 12, fontFamily: 'DM Sans, sans-serif',
          }}>
            {cancelError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={cancelling}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#d1d5db',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              fontSize: 13, cursor: cancelling ? 'not-allowed' : 'pointer',
              opacity: cancelling ? 0.5 : 1,
            }}
          >
            Keep RSVP
          </button>
          <button
            onClick={() => onConfirm(message)}
            disabled={cancelling}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: cancelling ? 'rgba(239,68,68,0.4)' : '#ef4444',
              color: 'white', fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600, fontSize: 13,
              cursor: cancelling ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {cancelling ? 'Cancelling…' : (isPaidEvent && !hasNoRefundPolicy) ? 'Cancel & Request Refund' : 'Cancel RSVP'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Refund Acknowledgement Modal ──────────────────────────────────────── */

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function AttendingCard({ event, onViewDetails, onOpenEvent, onEventCancelled }) {
  const [showTicket,      setShowTicket]      = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling,      setCancelling]      = useState(false);
  const [cancelError,     setCancelError]     = useState('');
  const [showRefundAckModal, setShowRefundAckModal] = useState(false);
  const [refundAcknowledging, setRefundAcknowledging] = useState(false);
  const [refundAckError, setRefundAckError] = useState('');

  /* Derive state ─────────────────────────────────────────────────────────── */
  const isPaidEvent   = event.price != null && event.price > 0;
  const hasNoRefundPolicy = event.noRefundPolicy === true;
  const rsvpStatus    = event.status      || 'confirmed';
  const paymentStatus = event.paymentStatus || null;
  const eventStatus   = event.eventStatus || 'active';
  const eventStatusReason = event.eventStatusReason || '';

  const isCancelledRsvp = rsvpStatus === 'cancelled';
  const isRejected  = rsvpStatus === 'rejected' || paymentStatus === 'rejected' || event.attendeeStatus === 'rejected';
  const isPending   = !isRejected && isPaidEvent && (rsvpStatus === 'registered' || paymentStatus === 'pending');
  const isConfirmed = !isPending && !isRejected && !isCancelledRsvp &&
                      (rsvpStatus === 'confirmed' || paymentStatus === 'confirmed');
  const isEventCancelledOrDeleted = eventStatus === 'cancelled' || eventStatus === 'deleted';
  const isCompleted = !isEventCancelledOrDeleted && !isCancelledRsvp && !isRejected && !isPending &&
                      (eventStatus === 'completed' || hasEventPassed(event));

  const rejectionNote  = event.attendeeRejectionReason || event.rejectionNote || event.attendeeRejectionNote || '';
  const refundStatus   = event.refundStatus;
  
  // Determine status key - prioritize event cancellation state, then refund state, then RSVP state
  let statusKey = 'confirmed';
  if (isEventCancelledOrDeleted) statusKey = eventStatus;
  else if (refundStatus === 'pending' || refundStatus === 'waiting_acknowledgement') statusKey = 'pending_refund';
  else if (isCancelledRsvp) statusKey = 'rsvp-cancelled';
  else if (isRejected) statusKey = 'rejected';
  else if (isPending) statusKey = 'pending';
  else if (isCompleted) statusKey = 'completed';
  
  const truncLoc       = (loc) => loc?.length > 32 ? loc.substring(0, 32) + '…' : loc;

  /* Handlers ─────────────────────────────────────────────────────────────── */
  const handleRefundAckConfirm = async (acknowledgement, rejectionReason) => {
    setRefundAckError('');
    setRefundAcknowledging(true);
    try {
      await acknowledgeRefund(event.id, acknowledgement, rejectionReason);
      setShowRefundAckModal(false);
      onEventCancelled?.(event.id); // Refresh the list
    } catch (err) {
      setRefundAckError(err.message || 'Failed to acknowledge refund. Please try again.');
    } finally {
      setRefundAcknowledging(false);
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

  const handleCancelConfirm = async (message) => {
    setCancelError('');
    setCancelling(true);
    try {
      await cancelRSVP(event.id, message);
      setShowCancelModal(false);
      onEventCancelled?.(event.id); // Refresh the list
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel RSVP. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  /* Left accent color per state */
  const getAccentColor = () => {
    if (isEventCancelledOrDeleted) return '#6b7280';
    if (isCancelledRsvp) return '#ec4899';
    if (isRejected) return '#ef4444';
    if (isPending) return '#fbbf24';
    if (isCompleted) return '#a855f7';
    return '#10b981';
  };
  const accentColor = getAccentColor();
  const cardOpacity = isEventCancelledOrDeleted ? 0.6 : 1;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <>
      <div className={s.cardGroup}>
        <div
          className={s.card}
          style={{ 
            borderLeft: `3px solid ${accentColor}`,
            opacity: cardOpacity,
            filter: isEventCancelledOrDeleted ? 'grayscale(50%)' : 'none'
          }}
        >
          {/* Image */}
          <div className={s.imgWrap}>
            {event.imageUrl
              ? <img src={event.imageUrl} alt={event.title} className={s.img} />
              : <div className={s.imgDefault}><span className={s.imgDefaultText}>{event.title}</span></div>
            }
          </div>

          {/* Details */}
          <div className={s.details}>

            {/* Title + badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                className={s.cardTitleLink}
                onClick={() => onOpenEvent?.(event)}
                style={{ margin: 0, padding: 0, background: 'none', border: 'none', textAlign: 'left' }}
              >
                <span className={s.cardTitle} style={{ margin: 0, display: 'inline-block' }}>{event.title}</span>
              </button>
              <StatusBadge status={statusKey} />
            </div>

            {/* Info grid */}
            <div className={s.infoGrid}>
              <InfoItem icon={Calendar} label="Date"     value={event.date} />
              <InfoItem icon={Clock}    label="Time"     value={getTimeLabel(event)} />
              <InfoItem icon={MapPin}   label="Location" value={truncLoc(event.location)} />
              {isPaidEvent && (
                <InfoItem icon={PhilippinePeso} label="Amount" value={`₱${event.price}`} accent />
              )}
            </div>

            {/* ── EVENT CANCELLED/DELETED: Status notice ── */}
            {isEventCancelledOrDeleted && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: eventStatus === 'cancelled' 
                  ? 'rgba(107,114,128,0.08)' 
                  : 'rgba(139,92,246,0.08)',
                borderLeft: `3px solid ${eventStatus === 'cancelled' ? '#6b7280' : '#8b5cf6'}`,
                borderRadius: 8,
              }}>
                <p style={{ 
                  color: eventStatus === 'cancelled' ? '#9ca3af' : '#8b5cf6', 
                  fontFamily: 'DM Sans, sans-serif', 
                  fontSize: 11, 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px', 
                  margin: '0 0 6px' 
                }}>
                  {eventStatus === 'cancelled' ? 'HangOut Cancelled' : 'HangOut Deleted'}
                </p>
                <p style={{ color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {eventStatusReason}
                </p>
              </div>
            )}

            {/* ── PENDING: awaiting approval notice ── */}
            {isPending && !isEventCancelledOrDeleted && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <AlertCircle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>
                    Awaiting Host Approval
                  </p>
                  <p style={{ color: '#fde68a', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0 }}>
                    Your payment proof is under review. Ticket details will be available once approved.
                  </p>
                </div>
              </div>
            )}

            {/* ── CANCELLED RSVP: notice box ── */}
            {isCancelledRsvp && !isEventCancelledOrDeleted && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(236,72,153,0.08)',
                borderLeft: '3px solid #ec4899',
                borderRadius: 8,
              }}>
                <p style={{
                  color: '#ec4899', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px'
                }}>
                  RSVP Cancelled
                </p>
                <p style={{ color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  You have cancelled your reservation for this HangOut. If you want to rejoin, RSVP again from the event page.
                </p>
              </div>
            )}

            {/* ── REJECTED: reason box ── */}
            {isRejected && rejectionNote && !isEventCancelledOrDeleted && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(239,68,68,0.08)',
                borderLeft: '3px solid #ef4444',
                borderRadius: 8,
              }}>
                <p style={{ color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>
                  Rejection Reason
                </p>
                <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {rejectionNote}
                </p>
              </div>
            )}

            {/* ── REFUND WAITING ACKNOWLEDGEMENT ── */}
            {refundStatus === 'waiting_acknowledgement' && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <RefreshCcw size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                  <p style={{ color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: 0 }}>
                    Refund Processed - Awaiting Your Confirmation
                  </p>
                </div>
                <p style={{ color: '#fde68a', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  The host has processed your refund. Please view the dashboard to confirm receipt.
                </p>
              </div>
            )}

            {/* ── REFUND REJECTED ── */}
            {refundStatus === 'rejected' && event.refundRejectionReason && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(239,68,68,0.08)',
                borderLeft: '3px solid #ef4444',
                borderRadius: 8,
              }}>
                <p style={{ color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>
                  Refund Rejected
                </p>
                <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {event.refundRejectionReason}
                </p>
              </div>
            )}

            {/* ── REFUND COMPLETED ── */}
            {refundStatus === 'completed' && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(16,185,129,0.08)',
                borderLeft: '3px solid #10b981',
                borderRadius: 8,
              }}>
                <p style={{ color: '#10b981', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>
                  Refund Completed
                </p>
                <p style={{ color: '#d1fae5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  Your refund has been processed successfully.
                </p>
              </div>
            )}



            {/* ── CONFIRMED: ticket snippet ── */}
            {isConfirmed && (event.ticketNumber || event.seatNumber) && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <TicketCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                {event.ticketNumber && (
                  <div>
                    <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif' }}>Ticket #</p>
                    <p style={{ color: '#d1fae5', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{event.ticketNumber}</p>
                  </div>
                )}
                {event.seatNumber && (
                  <div>
                    <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif' }}>Seat</p>
                    <p style={{ color: '#d1fae5', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{event.seatNumber}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Actions ── */}
            <div className={s.actions} style={{ marginTop: 16 }}>
              {/* View details — not shown for cancelled or rejected tickets, but allowed for pending refund */}
              {!isEventCancelledOrDeleted && !isCancelledRsvp && !isRejected && (
                <button className={s.btnManage} onClick={() => onViewDetails?.(event)}>
                  <Eye size={16} /> {refundStatus === 'pending' ? 'View Refund Proof' : 'View Details'}
                </button>
              )}

              {/* E-ticket toggle — confirmed only */}
              {isConfirmed && !isEventCancelledOrDeleted && (
                <button className={s.btnEdit} onClick={() => setShowTicket(v => !v)}>
                  <QrCode size={16} /> {showTicket ? 'Hide Ticket' : 'E-Ticket'}
                </button>
              )}

              {/* Download — confirmed only */}
              {isConfirmed && !isEventCancelledOrDeleted && (
                <button className={s.btnIcon} onClick={handleDownloadTicket} title="Download Ticket">
                  <Download size={16} />
                </button>
              )}

              {/* Cancel RSVP — only for active RSVPs, not rejected or cancelled, but not during pending refund */}
              {!isRejected && !isCancelledRsvp && !isEventCancelledOrDeleted && !hasEventPassed(event) && refundStatus !== 'pending' && refundStatus !== 'waiting_acknowledgement' && (
                <button
                  className={s.btnIcon}
                  onClick={() => setShowCancelModal(true)}
                  title={(isPaidEvent && !hasNoRefundPolicy) ? 'Cancel & Request Refund' : 'Cancel RSVP'}
                  style={{ color: '#f87171' }}
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* Pending Refund status button — show during refund process */}
              {refundStatus === 'pending' && !isEventCancelledOrDeleted && (
                <button
                  className={s.btnEdit}
                  disabled
                  title="Refund awaiting acknowledgement"
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: 'rgba(251,191,36,0.2)', color: '#fcd34d',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12,
                    cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <RefreshCcw size={14} /> Pending Refund
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── E-Ticket panel (confirmed only) ── */}
        {showTicket && isConfirmed && (
          <div className={s.eticket}>
            <div className={s.eticketInner}>
              <div className={s.qrWrap}>
                <div className={s.qrBox}>
                  <QrCode style={{ width: '100%', height: '100%', color: '#1a1a2e' }} />
                </div>
                <p className={s.qrHint}>Scan at the entrance</p>
              </div>
              <div className={s.eticketInfo}>
                <h4 className={s.eticketTitle}>{event.title}</h4>
                <p className={s.eticketSub}>Electronic ticket</p>
                <div className={s.eticketGrid}>
                  <div>
                    <p className={s.etLabel}>Ticket #</p>
                    <p className={s.etValue}>{event.ticketNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className={s.etLabel}>Seat</p>
                    <p className={s.etValue}>{event.seatNumber || 'N/A'}</p>
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

      {/* ── Cancel modal ── */}
      {showCancelModal && (
        <CancelModal
          event={event}
          isPaidEvent={isPaidEvent}
          hasNoRefundPolicy={hasNoRefundPolicy}
          cancelling={cancelling}
          cancelError={cancelError}
          onCancel={() => { setShowCancelModal(false); setCancelError(''); }}
          onConfirm={handleCancelConfirm}
        />
      )}

      {/* ── Refund Acknowledgement modal ── */}
      {showRefundAckModal && (
        <RefundAckModal
          event={event}
          acknowledging={refundAcknowledging}
          ackError={refundAckError}
          onCancel={() => { setShowRefundAckModal(false); setRefundAckError(''); }}
          onConfirm={handleRefundAckConfirm}
        />
      )}
    </>
  );
}