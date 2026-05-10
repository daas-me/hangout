import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Ticket,
  Tag, Armchair, CreditCard, Heart, Share2,
  CheckCircle2, ExternalLink, Edit, Trash2, Upload, Eye,
  Lock, X, BarChart3, RefreshCcw, AlertTriangle, MessageCircle
} from 'lucide-react';
import s from '../../styles/EventDetail.module.css';
import { Modal } from '../../shared/components/Modal';
import { Toast } from '../../shared/components/Toast';
import { NotificationModal } from '../../shared/components/NotificationModal';
import { PaymentVerificationModal } from '../../shared/components/PaymentVerificationModal';
import { publishEvent, unpublishEvent, deleteEvent as deleteEventApi, getEventDetails, rsvpEvent, cancelRSVP, checkRSVPStatus, submitPaymentProof, acknowledgeRefund } from './eventsApi';
import { addFavorite, removeFavorite, checkIsFavorite } from './favoriteApi';
import { getTimeLabel } from '../../shared/utils/timeFormatter';
import { getPublicUserProfile, getUserHostingCount } from '../profile/profileApi';
import { calculateAge } from '../../shared/utils/ageCalculator';
import HostEventDashboard from './HostEventDashboard';
import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

/* ─────────────────────────────────────────────────────────────────────────────
   ProfileAvatar — renders user avatar with initials fallback
───────────────────────────────────────────────────────────────────────────── */
function getProfilePhoto(person) {
  if (!person) return null;
  return person.photoUrl || person.photo || person.avatarUrl || person.userPhoto || person.profilePhoto || null;
}

function ProfileAvatar({ person, name, size = 40, gradient = 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' }) {
  const src = getProfilePhoto(person);
  const initials = (name ? name.split(' ').map(part => part[0]).join('') : '').toUpperCase() || 'NA';
  return src ? (
    <img
      src={src}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: Math.max(12, Math.floor(size / 2.2)),
        fontFamily: 'Syne, sans-serif',
      }}
    >
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HostProfileModal — Host profile widget showing contact & detailed info
───────────────────────────────────────────────────────────────────────────── */
function HostProfileModal({ host, onClose, onMessage }) {
  if (!host) return null;

  // Build address string
  const addressParts = [host.city, host.state, host.country, host.zipcode].filter(Boolean);
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
            <ProfileAvatar person={host} name={host.name} size={88} />
          </div>

          {/* Name */}
          <h2 style={{
            color: '#f0eeff',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '1.5rem',
            margin: '0 0 8px 0',
          }}>
            {host.name}
          </h2>

          {/* Verified Badge */}
          <p style={{
            color: '#10b981',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.85rem',
            margin: '0 0 8px 0',
            fontWeight: 600,
          }}>
            ✓ HangOut Organizer
          </p>

          {/* Email */}
          <a 
            href={`mailto:${host.email}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = `mailto:${host.email}`;
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
            {host.email}
          </a>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Hosting Stats Section */}
          {(host.hostedCount !== undefined || host.birthDate) && (
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
                Hosting Stats
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {host.hostedCount !== undefined && (
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
                    }}>HangOuts Organized</span>
                    <span style={{
                      color: '#e5e7eb',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}>{host.hostedCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Personal Information Section */}
          {(host.gender || host.phone || host.birthDate) && (
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
                {calculateAge(host.birthDate) && (
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
                    }}>{calculateAge(host.birthDate)} years</span>
                  </div>
                )}
                {host.gender && (
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
                    }}>{host.gender}</span>
                  </div>
                )}
                {host.phone && (
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
                    }}>{host.phone}</span>
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
          {host.bio && (
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
                }}>{host.bio}</p>
              </div>
            </div>
          )}

          {/* Message button */}
          <button
            onClick={() => { onMessage(host); onClose(); }}
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
            <MessageCircle size={16} /> Message {host.name.split(' ')[0]}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundAckModal({ event, isOpen, onCancel, onConfirm, ackChoice, setAckChoice, rejectionReason, setRejectionReason, acknowledging, ackError }) {
  if (!isOpen || !event) return null;

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
          border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 500,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'rgba(16,185,129,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={20} style={{ color: '#10b981' }} />
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

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="radio"
                name="acknowledgement"
                value="received"
                checked={ackChoice === 'received'}
                onChange={(e) => setAckChoice(e.target.value)}
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
                checked={ackChoice === 'rejected'}
                onChange={(e) => setAckChoice(e.target.value)}
                style={{ accentColor: '#ef4444' }}
              />
              <span style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                I did not receive the refund
              </span>
            </label>
          </div>
        </div>

        {ackChoice === 'rejected' && (
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
            onClick={() => onConfirm(ackChoice, rejectionReason)}
            disabled={acknowledging || (ackChoice === 'rejected' && !rejectionReason.trim())}
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

export default function EventDetailPage({ event, onBack, currentUser, onEditEvent, onMessageUser }) {
  const [liked,       setLiked]       = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState(null);
  const [showLimitExceededModal, setShowLimitExceededModal] = useState(false);
  const [rsvped,      setRsvped]      = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'pending', 'confirmed', or null
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,       setToast]       = useState(null);
  const [freshEvent,  setFreshEvent]  = useState(event);
  const [detailsError, setDetailsError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [showCancelRsvpModal, setShowCancelRsvpModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [rsvpNotification, setRsvpNotification] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedRefundImage, setSelectedRefundImage] = useState(null);
  const [showRefundAckModal, setShowRefundAckModal] = useState(false);
  const [refundAckChoice, setRefundAckChoice] = useState('received');
  const [refundRejectionReason, setRefundRejectionReason] = useState('');
  const [refundAcknowledging, setRefundAcknowledging] = useState(false);
  const [refundAckError, setRefundAckError] = useState('');
  const [showingManageDashboard, setShowingManageDashboard] = useState(false);
  
  // Host Profile Modal state
  const [showHostProfileModal, setShowHostProfileModal] = useState(false);
  const [hostData, setHostData] = useState(null);

  // Optimistically adjust the local attendee count when the network refresh
  // is unavailable (e.g. token expired). Keeps the UI in sync after RSVP / cancel.
  const bumpAttendeeCount = (delta) => {
    setFreshEvent(prev => {
      if (!prev) return prev;
      const current = prev.attendees?.current ?? prev.attendeeCount ?? 0;
      const next = Math.max(0, current + delta);
      // Support both response shapes: { attendees: { current } } and { attendeeCount }
      if (prev.attendees) {
        return { ...prev, attendees: { ...prev.attendees, current: next } };
      }
      return { ...prev, attendeeCount: next };
    });
  };

  // Fetch host profile data when opening modal
  const handleOpenHostProfileModal = async () => {
    const hostId = freshEvent?.hostId ?? freshEvent?.host?.id;
    console.log('[EventDetailPage] Host modal clicked. freshEvent:', freshEvent);
    console.log('[EventDetailPage] hostId:', hostId);
    
    if (!hostId) {
      console.warn('[EventDetailPage] No hostId found. freshEvent fields:', Object.keys(freshEvent || {}));
      return;
    }
    
    setShowHostProfileModal(true);
    
    try {
      // Fetch host profile and hosting count in parallel
      console.log('[EventDetailPage] Fetching host data for ID:', hostId);
      const [profileData, hostCount] = await Promise.all([
        getPublicUserProfile(hostId),
        getUserHostingCount(hostId)
      ]);
      
      console.log('[EventDetailPage] Profile data received:', profileData);
      console.log('[EventDetailPage] Host count received:', hostCount);
      
      setHostData({
        ...profileData,
        hostedCount: hostCount || 0
      });
    } catch (err) {
      console.error('[EventDetailPage] Error fetching host data:', err);
      setToast({ message: 'Could not load host profile. Please try again.', type: 'error' });
      setShowHostProfileModal(false);
    }
  };

  const handleRefundAckConfirm = async (acknowledgement, rejectionReason) => {
    setRefundAckError('');
    setRefundAcknowledging(true);
    try {
      await acknowledgeRefund(event.id, acknowledgement, rejectionReason);
      setShowRefundAckModal(false);
      setToast({ message: 'Refund acknowledgement submitted.', type: 'success' });
      try {
        const refreshed = await getEventDetails(event.id, true);
        setFreshEvent(refreshed);
      } catch (refreshErr) {
        console.warn('[EventDetailPage] Could not refresh event after refund acknowledgement:', refreshErr.message || refreshErr);
      }
    } catch (err) {
      console.error('[EventDetailPage] Refund acknowledgement error:', err);
      setRefundAckError(err.message || 'Failed to process refund acknowledgement. Please try again.');
    } finally {
      setRefundAcknowledging(false);
    }
  };

  // Fetch fresh event data to ensure we have hostId and other complete info.
  // GET /api/events/:id does NOT require auth, so a 401 here should never
  // happen — but if it does, log it and move on rather than redirecting.
  useEffect(() => {
    if (!event?.id) return;

    console.log(`[EventDetailPage] Fetching fresh event data for event ${event.id}`);
    setDetailsError(null);

    const useAuth = !!currentUser?.id;
    getEventDetails(event.id, useAuth)
      .then(data => {
        console.log(`[EventDetailPage] Successfully fetched fresh event data`);
        setFreshEvent(data);
        setDetailsError(null); // Clear any previous errors
      })
      .catch(async err => {
        console.error('[EventDetailPage] Failed to fetch event details:', err);
        const message = err.message || 'Failed to fetch event details';

        if (!useAuth && message.includes('401')) {
          console.warn('[EventDetailPage] Unexpected 401 on public endpoint — attempting authenticated retry.');
          try {
            const authData = await getEventDetails(event.id, true);
            console.log('[EventDetailPage] Auth retry succeeded for event details');
            setFreshEvent(authData);
            setDetailsError(null); // Clear error when retry succeeds
            return;
          } catch (authErr) {
            console.error('[EventDetailPage] Auth retry failed:', authErr);
          }
        }

        // GET /api/events/:id is public — a 401 would be unexpected.
        // Log it but don't redirect; the user may still view the page.
        if (message.includes('401')) {
          console.warn('[EventDetailPage] Unexpected 401 on public endpoint — ignoring.');
          return;
        }

        if (message.includes('403')) {
          if (message.includes('draft')) {
            setDetailsError('This is a draft HangOut. Only the HangOut organizer can view draft HangOuts.');
          } else {
            setDetailsError('You do not have permission to view this HangOut. This HangOut may have been deleted or you may not have access.');
          }
        } else if (message.includes('404')) {
          setDetailsError('HangOut not found. This HangOut may have been deleted.');
        } else {
          setDetailsError(message);
        }
      });
  }, [event?.id, currentUser?.id]);

  // Check RSVP status when event loads.
  // This endpoint requires auth — if the token is expired, swallow the error
  // silently rather than redirecting. The user can still view the event page,
  // they'll just be treated as not RSVP'd.
  useEffect(() => {
    if (!event?.id || !currentUser?.id) return;

    checkRSVPStatus(event.id)
      .then(data => {
        if (data.rsvped) {
          setRsvped(true);
          setPaymentStatus(data.paymentStatus || null);
          console.log('[EventDetailPage] User has RSVP\'d to this event. Payment status:', data.paymentStatus);
        }
      })
      .catch(err => {
        // 401 here means the token is expired — don't redirect, just skip RSVP state.
        console.warn('[EventDetailPage] Could not check RSVP status (token may be expired):', err.message);
      });
  }, [event?.id, currentUser?.id]);

  // Check favorite status when event loads.
  // This endpoint requires auth — if the token is expired, swallow the error
  // silently rather than redirecting. The user can still view the event page.
  useEffect(() => {
    if (!event?.id || !currentUser?.id) return;

    checkIsFavorite(event.id)
      .then(data => {
        setLiked(data.isFavorite || false);
        console.log('[EventDetailPage] Favorite status checked. Is favorite:', data.isFavorite);
      })
      .catch(err => {
        console.warn('[EventDetailPage] Could not check favorite status:', err.message);
      });
  }, [event?.id, currentUser?.id]);

  // Auto-refresh event data every 3 seconds to update attendance count.
  // GET /api/events/:id is public — but if 401 is encountered during RSVP actions,
  // it means the auth token has expired. Log it but continue gracefully.
  useEffect(() => {
    if (!event?.id) return;

    const refreshInterval = setInterval(async () => {
      try {
        const useAuth = !!currentUser?.id;
        const data = await getEventDetails(event.id, useAuth);
        setFreshEvent(data);
        setDetailsError(null); // Clear any errors when refresh succeeds
      } catch (err) {
        const message = err.message || '';
        // If we hit a 401 while using public headers, retry with auth.
        if (!currentUser?.id && message.includes('401')) {
          console.warn('[EventDetailPage] Auto-refresh: Token may have expired. Attempting authenticated retry.');
          try {
            const authData = await getEventDetails(event.id, true);
            setFreshEvent(authData);
            setDetailsError(null); // Clear error when auth retry succeeds
            return;
          } catch (authErr) {
            console.warn('[EventDetailPage] Auto-refresh auth retry failed:', authErr.message || authErr);
            return;
          }
        }
        // For other errors, log silently (network errors, temporary issues, etc.)
        console.warn('[EventDetailPage] Auto-refresh failed (will retry):', message);
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [event?.id, currentUser?.id]);

  // Use freshEvent if available, otherwise fall back to passed event
  const displayEvent = freshEvent || event;

  if (!displayEvent) return null;

  // Handle favorite button click
  const handleFavoriteToggle = async () => {
    if (!currentUser?.id) {
      setToast({ message: 'Please log in to favorite events.', type: 'error' });
      return;
    }

    setFavoriteLoading(true);
    setFavoriteError(null);
    try {
      if (liked) {
        // Remove favorite
        await removeFavorite(displayEvent.id);
        setLiked(false);
        setToast({ message: 'Removed from favorites.', type: 'success' });
      } else {
        // Add favorite
        await addFavorite(displayEvent.id);
        setLiked(true);
        setToast({ message: 'Added to favorites!', type: 'success' });
      }
    } catch (err) {
      const message = err.message || 'An error occurred';
      console.error('[EventDetailPage] Favorite toggle error:', err);
      
      // Check for limit exceeded error (409 Conflict)
      if (message.includes('limit') || message.includes('10') || message.includes('favorite')) {
        setShowLimitExceededModal(true);
        setFavoriteError(message);
      } else {
        setToast({ message, type: 'error' });
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: displayEvent.title, text: `Check out ${displayEvent.title}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Show error if details failed to fetch AND we have no data to display
  if (detailsError && !displayEvent) {
    return (
      <div className={s.page}>
        <div className={s.hero}>
          <div className={s.heroBlank} />
          <div className={s.heroOverlay} />
          <div className={s.heroActions}>
            <button className={s.backBtn} onClick={onBack}>
              <ArrowLeft size={18} /> Back
            </button>
          </div>
        </div>
        <div className={s.body}>
          <div className={s.alertError} style={{ 
            padding: '16px', 
            marginBottom: '16px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderRadius: '8px'
          }}>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Error Loading Event</p>
              <p>{detailsError}</p>
            </div>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#fecaca',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '16px',
              }}
              onClick={() => setDetailsError(null)}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
          <p><strong>Debug Info:</strong> Event ID: {event?.id}</p>
          <p>Current User: {currentUser?.email}</p>
        </div>
      </div>
    );
  }

  const attendeeCurrent = displayEvent.attendees?.current ?? displayEvent.attendeeCount ?? 0;
  const attendeeMax     = displayEvent.capacity ?? displayEvent.attendees?.max ?? 100;
  const capPct          = Math.min(100, Math.round((attendeeCurrent / attendeeMax) * 100));
  const seatsLeft       = attendeeMax - attendeeCurrent;

  const hostFirst = displayEvent.hostFirstName ?? displayEvent.host?.firstname ?? '';
  const hostLast  = displayEvent.hostLastName  ?? displayEvent.host?.lastname  ?? '';
  const hostEmail = displayEvent.hostEmail     ?? displayEvent.host?.email     ?? 'host@example.com';
  const hostPhoto = displayEvent.hostPhoto ?? displayEvent.host?.photoUrl ?? null;
  const hostName  = [hostFirst, hostLast].filter(Boolean).join(' ') || 'HangOut Organizer';
  const initials  = hostName.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase() || 'HO';

  const formatLabel = displayEvent.format ?? 'In-Person';
  const isPaid      = (displayEvent.price ?? 0) > 0;
  const hasNoRefundPolicy = displayEvent.noRefundPolicy === true; 
  const isDraft     = displayEvent.isDraft === true;
  const eventStatus = displayEvent.eventStatus || 'active';
  const isCompleted = eventStatus === 'completed' || (!isDraft && hasEventPassed(displayEvent));
  const isEventStarted = !isDraft && hasEventStarted(displayEvent);
  const isEventCancelledOrDeleted = eventStatus === 'cancelled' || eventStatus === 'deleted';
  const eventStatusReason = displayEvent.eventStatusReason || '';

  const eventHostId = displayEvent.hostId ?? displayEvent.host?.id;
  const currentUserId = currentUser?.id;
  const isHost = !!(currentUserId && eventHostId && currentUserId === eventHostId);

  const refundStatus = displayEvent.refundStatus || null;
  const refundProofUrl = displayEvent.refundProofUrl || null;
  const refundRejectionNote = displayEvent.refundRejectionReason || '';
  const isRefundWaitingAcknowledgement = refundStatus === 'waiting_acknowledgement';
  const isRefundPending = refundStatus === 'pending';
  const isRefundRejected = refundStatus === 'rejected';
  const isRefundCompleted = refundStatus === 'completed';
  const isRefundInProgress = isRefundPending || isRefundWaitingAcknowledgement;

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
          <span>Preview unavailable</span>
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

  if (isHost) {
    console.log('[EventDetailPage] User is event host. Current User ID:', currentUserId, 'Event Host ID:', eventHostId);
  }

  const fmtDate = (d) => {
    if (!d) return 'Date TBD';
    // Handle "MMM dd, yyyy" format from API
    if (d.match(/^[A-Za-z]{3} \d{2}, \d{4}$/)) {
      const date = new Date(d);
      if (!isNaN(date)) {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    // Fallback for other formats
    const parsed = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
    if (isNaN(parsed)) return d;
    return parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  function hasEventPassed(eventData) {
    if (!eventData?.date) return false;
    // Construct end datetime: use endTime if available, otherwise use startTime, otherwise 23:59
    let endDateTime;
    if (eventData.endTime) {
      endDateTime = new Date(`${eventData.date} ${eventData.endTime}`);
    } else if (eventData.startTime) {
      endDateTime = new Date(`${eventData.date} ${eventData.startTime}`);
    } else {
      endDateTime = new Date(`${eventData.date} 23:59`);
    }
    
    // Check if the end datetime is before now
    return endDateTime < new Date();
  }

  function hasEventStarted(eventData) {
    if (!eventData?.date) return false;
    // Construct start datetime using startTime if available, otherwise use date at 00:00
    let startDateTime;
    if (eventData.startTime) {
      startDateTime = new Date(`${eventData.date} ${eventData.startTime}`);
    } else {
      startDateTime = new Date(`${eventData.date} 00:00`);
    }
    
    // Check if the start datetime is in the past (event has started)
    return startDateTime <= new Date();
  }

  const timeLabel = getTimeLabel(displayEvent);

  const paymentLabel =
    displayEvent.paymentMethod === 'gcash'   ? 'GCash'
  : displayEvent.paymentMethod === 'paymaya' ? 'PayMaya'
  : displayEvent.paymentMethod === 'bank'    ? 'Bank Transfer'
  : displayEvent.paymentMethod
    ? displayEvent.paymentMethod.charAt(0).toUpperCase() + displayEvent.paymentMethod.slice(1)
    : 'GCash';

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      await publishEvent(event.id);
      setShowPublishModal(false);
      setToast({ message: 'Event published successfully!', type: 'success' });
      setTimeout(() => onBack?.(), 1500);
    } catch (err) {
      setToast({ message: 'Failed to publish HangOut. Please try again.', type: 'error' });
      console.error(err);
      setShowPublishModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setActionLoading(true);
    try {
      await unpublishEvent(event.id);
      setShowUnpublishModal(false);
      setToast({ message: 'HangOut unpublished successfully!', type: 'success' });
      setTimeout(() => onBack?.(), 1500);
    } catch (err) {
      setToast({ message: 'Failed to unpublish HangOut. Please try again.', type: 'error' });
      console.error(err);
      setShowUnpublishModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteEventApi(event.id);
      setShowDeleteModal(false);
      setToast({ message: 'HangOut deleted successfully!', type: 'success' });
      setTimeout(() => onBack?.(), 1500);
    } catch (err) {
      setToast({ message: 'Failed to delete HangOut. Please try again.', type: 'error' });
      console.error(err);
      setShowDeleteModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (showingManageDashboard) {
    return (
      <HostEventDashboard
        event={displayEvent}
        onBack={() => setShowingManageDashboard(false)}
        onEditEvent={onEditEvent}
        currentUser={currentUser}
        onMessageUser={onMessageUser}
      />
    );
  }

  return (
    <div className={s.page}>

      {/* ── Hero ── */}
      <div className={s.hero}>
        {displayEvent.imageUrl
          ? <img src={displayEvent.imageUrl} alt={displayEvent.title} className={s.heroImg} />
          : <div className={s.heroBlank} />
        }
        <div className={s.heroOverlay} />

        <div className={s.heroActions}>
          <button className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className={s.heroRightActions}>
            <button
              className={`${s.iconBtn} ${liked ? s.iconBtnLiked : ''}`}
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
              title={liked ? 'Unlike' : 'Like'}
            >
              <Heart size={20} fill={liked ? '#ec4899' : 'none'} />
            </button>
            <button className={s.iconBtn} onClick={handleShare} title="Share">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className={s.heroContent}>
          <div className={s.heroTitleTop}>
            <div className={s.formatBadge}>{formatLabel}</div>
            {isDraft && (
              <div className={s.draftBadgeHero}>
                <Lock size={14} /> Draft
              </div>
            )}
          </div>
          <h1 className={s.heroTitle}>{displayEvent.title ?? 'Untitled Event'}</h1>
        </div>
      </div>

      {isEventCancelledOrDeleted && (
        <div style={{
          maxWidth: 960,
          margin: '0 auto 24px',
          padding: '16px 20px',
          background: eventStatus === 'cancelled' ? 'rgba(107,114,128,0.08)' : 'rgba(254,202,202,0.12)',
          border: `1px solid ${eventStatus === 'cancelled' ? 'rgba(107,114,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 12,
        }}>
          <p style={{ margin: 0, color: eventStatus === 'cancelled' ? '#9ca3af' : '#991b1b', fontWeight: 700 }}>
            {eventStatus === 'cancelled' ? 'HangOut Cancelled' : 'HangOut Deleted'}
          </p>
          <p style={{ margin: '8px 0 0', color: '#d1d5db', lineHeight: 1.5 }}>
            {eventStatusReason || 'This HangOut is no longer available.'}
          </p>
        </div>
      )}

      {isCompleted && !isEventCancelledOrDeleted && (
        <div className={s.completedBanner}>
          <div className={s.completedBadgeIcon}><CheckCircle2 size={18} /></div>
          <div>
            <p className={s.completedTitle}>HangOut Completed</p>
            <p className={s.completedSubtitle}>
              This HangOut has finished. RSVP is closed, but you can still review the event details and feed.
            </p>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className={s.body}>
        <div className={s.grid}>

          {/* Left main column */}
          <div className={s.main}>

            {/* Date + Time */}
            <div className={s.row2}>
              <div className={s.card}>
                <Calendar size={18} className={s.cardIcon} />
                <div>
                  <p className={s.cardLabel}>Date</p>
                  <p className={s.cardValue}>{fmtDate(displayEvent.date ?? displayEvent._rawDate)}</p>
                </div>
              </div>
              <div className={s.card}>
                <Clock size={18} className={s.cardIcon} />
                <div>
                  <p className={s.cardLabel}>Time</p>
                  <p className={s.cardValue}>{timeLabel}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            {displayEvent.location && formatLabel !== 'Virtual' && (
              <div className={s.card}>
                <MapPin size={18} className={s.cardIcon} />
                <div>
                  <p className={s.cardLabel}>Location</p>
                 <p className={s.cardValue}>{displayEvent.location}</p>
                  <a href={displayEvent.placeUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayEvent.location)}`} target="_blank" rel="noreferrer" className={s.mapLink}>
                    <ExternalLink size={14} /> Open in Maps
                  </a>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className={s.stats}>
              {[
                { icon: Ticket, label: 'Price',     value: isPaid ? `₱${event.price}` : 'Free' },
                { icon: Users,  label: 'Attending',  value: String(attendeeCurrent) },
                { icon: Tag,    label: 'Format',     value: formatLabel },
                { icon: Users,  label: 'Capacity',   value: String(attendeeMax) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className={s.statCard}>
                  <Icon size={20} className={s.cardIcon} />
                  <p className={s.statValue}>{value}</p>
                  <p className={s.cardLabel}>{label}</p>
                </div>
              ))}
            </div>

            {/* Availability */}
            <div className={s.cardFlat}>
              <p className={s.sectionTitle} style={{ marginBottom: 6 }}>Availability</p>
              <div className={s.capBarWrap}>
                <div className={s.capBarLabel}>
                  <span>{attendeeCurrent} attending</span>
                  <span>{seatsLeft} spots left</span>
                </div>
                <div className={s.capBarTrack}>
                  <div className={s.capBarFill} style={{ width: `${capPct}%` }} />
                </div>
              </div>
            </div>

            {/* About */}
            <div className={s.cardFlat}>
              <p className={s.sectionTitle}>About This HangOut</p>
              <p className={s.aboutText}>{displayEvent.description || 'No description provided.'}</p>
            </div>

            {/* Seating */}
            <div className={s.card}>
              <Armchair size={18} className={s.cardIcon} />
              <div>
                <p className={s.cardLabel}>Seating</p>
                <p className={s.cardValue}>
                  {displayEvent.seatingType === 'reserved' ? 'Assigned Seats' : 'Open Seating'}
                </p>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className={s.sidebar}>

            {/* Hosted By */}
            <div className={s.cardFlat}>
              <p className={s.sectionTitle}>Hosted By</p>
              <div className={s.hostRow}>
                <div 
                  className={s.avatar} 
                  style={{
                    backgroundImage: hostPhoto ? `url(${hostPhoto})` : undefined, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={handleOpenHostProfileModal}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {!hostPhoto && initials.toUpperCase()}
                </div>
                <div>
                  <div className={s.hostNameRow}>
                    <p 
                      className={s.cardValue}
                      style={{
                        cursor: 'pointer',
                        transition: 'color 0.2s ease'
                      }}
                      onClick={handleOpenHostProfileModal}
                      onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
                      onMouseLeave={e => e.currentTarget.style.color = '#e5e7eb'}
                    >
                      {hostName}
                    </p>
                    <div className={s.verified}>✓</div>
                  </div>
                  <p className={s.cardLabel}>HangOut Organizer</p>
                </div>
              </div>
              <p className={s.email}>{hostEmail}</p>
              <button 
                className={s.msgBtn}
                onClick={() => onMessageUser?.({
                  id:        eventHostId,
                  firstname: hostFirst,
                  lastname:  hostLast,
                  email:     hostEmail,
                  photo:     hostPhoto,
                })}
              >
                Message Host
              </button>
            </div>

            {/* Payment Details */}
            {isPaid && (
              <div className={s.paymentCard}>
                <div className={s.paymentTitle}>
                  <CreditCard size={16} className={s.cardIcon} style={{ flexShrink: 0 }} />
                  <p className={s.sectionTitle} style={{ margin: 0 }}>Payment Details</p>
                </div>
                <div className={s.paymentRow}>
                  <p className={s.cardLabel}>Payment Method</p>
                  <p className={s.cardValue}>{paymentLabel}</p>
                </div>
                <div className={s.paymentRow}>
                  <p className={s.cardLabel}>Account Number</p>
                  <p className={s.cardValue} style={{ fontFamily: "'DM Mono', 'Courier New', monospace", letterSpacing: '0.05em' }}>
                    {displayEvent.accountNumber || '—'}
                  </p>
                </div>
                <div className={s.paymentRow}>
                  <p className={s.cardLabel}>Refund Policy</p>
                  <p className={s.cardValue}>{displayEvent.noRefundPolicy ? 'No refunds' : 'Refunds available'}</p>
                </div>
                <p className={s.paymentNote}>
                  After payment, you'll be asked to upload proof of payment for host approval.
                </p>
              </div>
            )}

            {refundStatus && refundStatus !== 'completed' && (
              <div className={s.cardFlat} style={{ marginTop: 20 }}>
                <p className={s.sectionTitle}>Refund Details</p>
                <div className={s.paymentRow}>
                  <p className={s.cardLabel}>Refund Status</p>
                  <p className={s.cardValue}>
                    {isRefundCompleted ? 'Completed'
                      : isRefundWaitingAcknowledgement ? 'Waiting for your confirmation'
                      : isRefundPending ? 'Requested'
                      : isRefundRejected ? 'Rejected'
                      : 'N/A'}
                  </p>
                </div>

                {refundRejectionNote && (
                  <div className={s.paymentRow} style={{ marginTop: 10 }}>
                    <p className={s.cardLabel}>Reason</p>
                    <p className={s.cardValue}>{refundRejectionNote}</p>
                  </div>
                )}

                {refundProofUrl && (
                  <div style={{ marginTop: 16 }}>
                    <p className={s.cardLabel}>Refund Proof</p>
                    <AuthImage
                      src={refundProofUrl}
                      alt="Refund Proof"
                      style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(148,163,184,0.25)', cursor: 'pointer', objectFit: 'cover', minHeight: 160 }}
                      onClick={() => setSelectedRefundImage(refundProofUrl)}
                    />
                    <p className={s.cardNote} style={{ marginTop: 8 }}>
                      Click image to view full size.
                    </p>
                  </div>
                )}

                {isRefundWaitingAcknowledgement && !isHost && (
                  <button
                    className={s.rsvpBtn}
                    onClick={() => setShowRefundAckModal(true)}
                    disabled={refundAcknowledging}
                    style={{ width: '100%', marginTop: 18 }}
                  >
                    {refundAcknowledging ? 'Processing…' : 'Acknowledge Refund'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky RSVP Bar / Manage Bar ── */}
      {isDraft && isHost ? (
        <div className={s.manageBar}>
          <div>
            <p className={s.manageDraftLabel}>Draft HangOut</p>
            <p className={s.manageDraftSub}>Visible only to you</p>
          </div>
          <div className={s.manageActions}>
            <button
              className={s.manageBtn}
              onClick={() => onEditEvent?.(event)}
              disabled={actionLoading}
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              className={s.manageBtn}
              onClick={() => setShowPublishModal(true)}
              disabled={actionLoading}
              title="Publish"
            >
              <Upload size={18} />
            </button>
            <button
              className={`${s.manageBtn} ${s.manageBtnDanger}`}
              onClick={() => setShowDeleteModal(true)}
              disabled={actionLoading}
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ) : isHost ? (
        <div className={`${s.manageBar} ${isCompleted ? s.manageBarCompleted : ''}`}>
          <div>
            <p className={s.manageDraftLabel}>{isCompleted ? 'Completed HangOut' : 'Your HangOut'}</p>
            <p className={s.manageDraftSub}>
              {isCompleted ? 'This HangOut has already taken place. Edit it to reschedule for another date.' : 'Published and visible to everyone'}
            </p>
          </div>
          <div className={s.manageActions}>
            <button
              className={s.manageBtn}
              onClick={() => setShowingManageDashboard(true)}
              disabled={actionLoading}
              title="Manage Attendees"
            >
              <BarChart3 size={18} />
            </button>
            <button
              className={s.manageBtn}
              onClick={() => onEditEvent?.(event)}
              disabled={actionLoading}
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              className={s.manageBtn}
              onClick={() => setShowUnpublishModal(true)}
              disabled={actionLoading || isCompleted}
              title={isCompleted ? 'Unpublish not available for completed HangOuts' : 'Unpublish'}
            >
              <Eye size={18} style={{ opacity: isCompleted ? 0.35 : 0.5 }} />
            </button>
            <button
              className={`${s.manageBtn} ${s.manageBtnDanger}`}
              onClick={() => setShowDeleteModal(true)}
              disabled={actionLoading}
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ) : isCompleted ? (
        <div className={s.rsvpBarCompleted}>
          <div className={s.rsvpInfo}>
            <div>
              <p className={s.rsvpPrice}>Completed</p>
              <p className={s.rsvpSeats}>
                This HangOut has already taken place. RSVP is closed and no further bookings are accepted.
              </p>
            </div>
          </div>
          <button
            className={`${s.rsvpBtn} ${s.rsvpBtnCompleted}`}
            disabled
            style={{ cursor: 'not-allowed' }}
          >
            <CheckCircle2 size={20} /> HangOut Completed
          </button>
        </div>
      ) : isEventStarted && !rsvped ? (
        <div className={s.rsvpBar}>
          <div className={s.rsvpInfo}>
            <div>
              <p className={s.rsvpPrice}>{isPaid ? `₱${event.price}` : 'Free'}</p>
              <p className={s.rsvpSeats}>
                This HangOut has already started. RSVPs are no longer being accepted.
              </p>
            </div>
          </div>
          <button
            className={`${s.rsvpBtn} ${s.rsvpBtnCompleted}`}
            disabled
            style={{ cursor: 'not-allowed' }}
          >
            <Clock size={20} /> HangOut In Progress
          </button>
        </div>
      ) : isEventCancelledOrDeleted ? (
        <div className={s.rsvpBar}>
          <div className={s.rsvpInfo}>
            <div>
              <p className={s.rsvpPrice}>{eventStatus === 'cancelled' ? 'Cancelled' : 'Deleted'}</p>
              <p className={s.rsvpSeats}>
                {eventStatus === 'cancelled'
                  ? 'This HangOut has been cancelled. RSVP actions are disabled.'
                  : 'This HangOut is no longer available.'}
              </p>
            </div>
          </div>
          <button
            className={s.rsvpBtn}
            disabled
            style={{ opacity: 0.55, cursor: 'not-allowed' }}
          >
            <Lock size={20} /> {eventStatus === 'cancelled' ? 'HangOut Cancelled' : 'HangOut Deleted'}
          </button>
        </div>
      ) : (
        <div className={s.rsvpBar}>
          <div className={s.rsvpInfo}>
            <div>
              <p className={s.rsvpPrice}>{isPaid ? `₱${event.price}` : 'Free'}</p>
              <p className={s.rsvpSeats}>
                {isRefundInProgress
                  ? 'Refund request in progress. RSVP actions are temporarily disabled.'
                  : seatsLeft > 0
                  ? `${seatsLeft} spots remaining`
                  : 'Fully booked'}
              </p>
            </div>
          </div>
          <button
            className={`${s.rsvpBtn} ${isRefundInProgress ? s.rsvpBtnPending : paymentStatus === 'pending' ? s.rsvpBtnPending : paymentStatus === 'rejected' ? s.rsvpBtnRejected : rsvped ? s.rsvpBtnRsvped : ''}`}
            onClick={async () => {
              if (isRefundInProgress) {
                return;
              }

              if (paymentStatus === 'rejected') {
                setShowPaymentModal(true);
                return;
              }

              if (rsvped) {
                setShowCancelRsvpModal(true);
                return;
              }

              const isPaid = (event.price ?? 0) > 0;
              if (isPaid) {
                setShowPaymentModal(true);
                return;
              }

              setRsvpLoading(true);
              try {
                await rsvpEvent(event.id);
                setRsvped(true);
                // Optimistically show +1 immediately so the user sees feedback
                // even if the background refresh is unavailable.
                bumpAttendeeCount(+1);
                setRsvpNotification({ message: 'RSVP confirmed! You\'re attending this HangOut.', type: 'success' });

                // Try to get the authoritative count from the server.
                try {
                  const updatedEvent = await getEventDetails(event.id);
                  setFreshEvent(updatedEvent);
                } catch (err) {
                  console.warn('[EventDetailPage] Could not refresh count after RSVP — using optimistic value:', err.message);
                }
              } catch (err) {
                console.error('[EventDetailPage] RSVP error:', err);
                setRsvped(false);
                bumpAttendeeCount(-1); // roll back the optimistic bump
                setRsvpNotification({ message: err.message || 'Failed to process RSVP', type: 'error' });
              } finally {
                setRsvpLoading(false);
              }
            }}
            disabled={rsvpLoading || isRefundInProgress || (seatsLeft === 0 && !rsvped) || paymentStatus === 'pending' || (isEventStarted && !rsvped)}
          >
            {isRefundInProgress
              ? <><RefreshCcw size={20} /> Refund In Progress</>
              : paymentStatus === 'pending'
              ? <><Clock size={20} /> Pending Approval</>
              : paymentStatus === 'rejected'
              ? <><Upload size={20} /> Resubmit Payment Proof</>
              : rsvped
              ? <><CheckCircle2 size={20} /> RSVP'd!</>
              : <><Ticket size={20} /> RSVP Now</>
            }
          </button>
        </div>
      )}

      {/* ── Payment Verification Modal ── */}
      <PaymentVerificationModal
        isOpen={showPaymentModal}
        event={displayEvent}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={async (file, acknowledged) => {
          setPaymentLoading(true);
          try {
            if (!rsvped) {
              await rsvpEvent(event.id);
            }

            await submitPaymentProof(event.id, file, acknowledged);
            try {
              const refreshed = await getEventDetails(event.id);
              setFreshEvent(refreshed);
            } catch (refreshErr) {
              console.warn('[EventDetailPage] Could not refresh event after payment submission:', refreshErr.message);
            }

            setShowPaymentModal(false);
            setRsvped(true);
            setPaymentStatus('pending');
            setRsvpNotification({
              message: 'Payment proof submitted! Waiting for host approval.',
              type: 'success',
            });
          } catch (err) {
            console.error('[EventDetailPage] Payment submission error:', err);
            setShowPaymentModal(false);
            setRsvpNotification({
              message: err.message || 'Failed to submit payment proof',
              type: 'error',
            });
          } finally {
            setPaymentLoading(false);
          }
        }}
        isLoading={paymentLoading}
      />

      <RefundAckModal
        event={displayEvent}
        isOpen={showRefundAckModal}
        onCancel={() => {
          setShowRefundAckModal(false);
          setRefundAckChoice('received');
          setRefundRejectionReason('');
          setRefundAckError('');
        }}
        onConfirm={handleRefundAckConfirm}
        ackChoice={refundAckChoice}
        setAckChoice={setRefundAckChoice}
        rejectionReason={refundRejectionReason}
        setRejectionReason={setRefundRejectionReason}
        acknowledging={refundAcknowledging}
        ackError={refundAckError}
      />

      {/* Host Profile Modal */}
      {showHostProfileModal && (
        <>
          {hostData ? (
            <HostProfileModal
              host={hostData}
              onClose={() => {
                setShowHostProfileModal(false);
                setHostData(null);
              }}
              onMessage={(host) => {
                onMessageUser?.({
                  id: host.id,
                  firstname: host.name?.split(' ')[0] || '',
                  lastname: host.name?.split(' ').slice(1).join(' ') || '',
                  email: host.email,
                  photo: host.photoUrl || host.photo,
                });
              }}
            />
          ) : (
            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 70,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, background: 'rgba(0,0,0,0.85)',
              }}
              onClick={() => {
                setShowHostProfileModal(false);
                setHostData(null);
              }}
            >
              <div
                style={{
                  background: 'rgba(30, 32, 60, 0.5)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 24,
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 16,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '3px solid rgba(168, 85, 247, 0.3)',
                    borderTopColor: '#a855f7',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p style={{ color: '#9ca3af', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', margin: 0 }}>
                  Loading profile...
                </p>
              </div>
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}
        </>
      )}

      {selectedRefundImage && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(0, 0, 0, 0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedRefundImage(null)}
        >
          <img
            src={resolveUploadUrl(selectedRefundImage)}
            alt="Refund Proof Full Size"
            style={{
              maxWidth: '100%', maxHeight: '100%', borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
            }}
          />
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Custom Modals ── */}
      <Modal
        isOpen={showPublishModal}
        title="Publish HangOut"
        message="Are you ready to publish this HangOut? It will become visible to everyone and they'll be able to see and RSVP."
        confirmText="Publish"
        cancelText="Cancel"
        isDanger={false}
        isLoading={actionLoading}
        onConfirm={handlePublish}
        onCancel={() => setShowPublishModal(false)}
      />

      <Modal
        isOpen={showUnpublishModal}
        title="Unpublish HangOut"
        message="Are you sure you want to unpublish this HangOut? It will no longer be visible to others, but RSVPs and data will be preserved."
        confirmText="Unpublish"
        cancelText="Cancel"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishModal(false)}
      />

      <Modal
        isOpen={showDeleteModal}
        title="Delete HangOut"
        message="Are you sure you want to delete this HangOut? This action cannot be undone and all associated data will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* ── Favorite Limit Exceeded Modal ── */}
      <Modal
        isOpen={showLimitExceededModal}
        title="Favorite Limit Reached"
        message={favoriteError || "You have reached your maximum of 10 favorites. Please remove a favorite from your list to add another event."}
        confirmText="OK"
        cancelText={null}
        isDanger={false}
        isLoading={false}
        onConfirm={() => setShowLimitExceededModal(false)}
        onCancel={() => setShowLimitExceededModal(false)}
      />

      {/* ── Cancel RSVP Confirmation Modal ── */}
      {showCancelRsvpModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(0,0,0,0.85)',
          }}
          onClick={() => setShowCancelRsvpModal(false)}
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
                  You're about to cancel your spot for <strong style={{ color: '#e5e7eb' }}>{displayEvent.title}</strong>.
                </p>
              </div>
            </div>
            {/* Paid event - refundable */}
              {isPaid && !hasNoRefundPolicy && (
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

              {/* Paid event - non-refundable */}
              {isPaid && hasNoRefundPolicy && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px', marginBottom: 18,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10,
                }}>
                  <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 12, margin: '0 0 2px' }}>
                      Non-Refundable Event
                    </p>
                    <p style={{ color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      You acknowledged this event has a no-refund policy. Cancelling will remove your RSVP with no refund issued.
                    </p>
                  </div>
                </div>
              )}

            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder={
                isPaid
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
                onClick={() => {
                  setShowCancelRsvpModal(false);
                  setCancelReason('');
                  setCancelError('');
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)', color: '#e5e7eb',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
                disabled={rsvpLoading}
              >
                Keep RSVP
              </button>
              <button
                onClick={async () => {
                  setCancelError('');
                  setRsvpLoading(true);
                  try {
                    await cancelRSVP(event.id, cancelReason ? { message: cancelReason } : {});
                    setRsvped(false);
                    setPaymentStatus(null);
                    bumpAttendeeCount(-1);
                    setShowCancelRsvpModal(false);
                    setCancelReason('');
                    setRsvpNotification({ message: 'RSVP cancelled', type: 'success' });

                    try {
                      const updatedEvent = await getEventDetails(event.id);
                      setFreshEvent(updatedEvent);
                    } catch (err) {
                      console.warn('[EventDetailPage] Could not refresh count after cancel:', err.message);
                    }

                    try {
                      const status = await checkRSVPStatus(event.id);
                      setRsvped(!!status?.rsvped);
                      setPaymentStatus(status?.paymentStatus || null);
                    } catch (err) {
                      console.warn('[EventDetailPage] Could not refresh RSVP status after cancel:', err.message);
                    }
                  } catch (err) {
                    console.error('[EventDetailPage] Cancel RSVP error:', err);
                    if (err.message?.includes('401')) {
                      setCancelError('Your session may have expired. Please refresh the page or log in again.');
                    } else {
                      setCancelError(err.message || 'Failed to cancel RSVP. Please try again.');
                    }
                    setRsvped(true);
                    bumpAttendeeCount(+1);
                  } finally {
                    setRsvpLoading(false);
                  }
                }}
                style={{
                  background: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
                disabled={rsvpLoading}
              >
                {rsvpLoading
                  ? '⟳ Cancelling…'
                  : isPaid && !hasNoRefundPolicy
                  ? 'Cancel & Request Refund'
                  : 'Cancel RSVP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RSVP Notification Modal ── */}
      {rsvpNotification && (
        <NotificationModal
          isOpen={true}
          message={rsvpNotification.message}
          type={rsvpNotification.type}
          duration={rsvpNotification.type === 'success' ? 2000 : 4000}
          onClose={() => setRsvpNotification(null)}
        />
      )}
    </div>
  );
}