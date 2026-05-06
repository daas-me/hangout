import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, CheckCircle, X,
  Clock3, Edit, Share2, MoreVertical, BarChart3, TrendingUp,
  AlertCircle, AlertTriangle, Download, Trash2, Eye, EyeOff, ImageOff, Image, MessageCircle
} from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import s from '../../styles/HostEventDashboard.module.css';
import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';
import {
  getEventAttendees, approvePayment, rejectPayment, rejectAttendee,
  unpublishEvent, deleteEvent as deleteEventApi, approveRefund, rejectRefund
} from '../events/eventsApi';

/* ─────────────────────────────────────────────────────────────────────────────
   resolveUrl — turns a relative path from the API into a full URL.
   Handles:
     - Already absolute URLs (http/https) → returned as-is
     - "events/uploads/filename"           → http://localhost:8080/api/events/uploads/filename
     - "/api/uploads/filename"             → http://localhost:8080/api/uploads/filename
     - bare "filename.jpg"                 → http://localhost:8080/api/events/uploads/filename.jpg
───────────────────────────────────────────────────────────────────────────── */
function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const base = API_BASE.replace(/\/$/, ''); // e.g. "http://localhost:8080/api"
  const clean = url.replace(/^\//, '');     // strip leading slash

  // If it already starts with "api/", strip that prefix since API_BASE has it
  const path = clean.startsWith('api/') ? clean.slice(4) : clean;

  // Bare filename with no directory → treat as events/uploads/
  const normalized = path.includes('/') ? path : `events/uploads/${path}`;
  const separator = normalized.includes('?') ? '&' : '?';
  const cacheParam = normalized.includes('/uploads/') ? `${separator}cacheBust=${Date.now()}` : '';

  return `${base}/${normalized}${cacheParam}`;
}

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
   AuthImage — renders a payment proof image.

   Strategy:
   1. Try the URL WITHOUT auth headers first (endpoint is public via permitAll).
   2. If that fails (e.g. Spring Security rejects due to bad token in filter),
      retry WITH auth headers as a blob object-URL.
   3. If both fail, show a "Preview unavailable" fallback.

   This avoids the issue where an expired token in localStorage causes the
   JwtFilter to reject the request before Spring Security can apply permitAll.
───────────────────────────────────────────────────────────────────────────── */
function AuthImage({ src, alt, style, className, onClick }) {
  const [blobSrc, setBlobSrc]     = useState(null);
  const [failed, setFailed]       = useState(false);
  const [triedBlob, setTriedBlob] = useState(false);
  const resolvedSrc               = resolveUrl(src);

  const fetchAsBlob = useCallback(async () => {
    if (!resolvedSrc) return;
    console.log('[AuthImage] Retrying with auth headers (blob fetch):', resolvedSrc);
    try {
      const res = await fetch(resolvedSrc, { headers: getAuthHeaders() });
      console.log('[AuthImage] Blob fetch response status:', res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      setBlobSrc(URL.createObjectURL(blob));
    } catch (err) {
      console.error('[AuthImage] Blob fetch also failed:', err);
      setFailed(true);
    }
  }, [resolvedSrc]);

  // Clean up object URLs on unmount / src change
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
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(255,255,255,0.05)',
          color: '#6b7280', gap: 6, fontSize: 11, fontFamily: 'DM Sans, sans-serif',
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
          // Both direct and blob failed
          console.error('[AuthImage] Blob src also failed, giving up.');
          setFailed(true);
        } else if (!triedBlob) {
          // Direct URL failed — retry with auth headers
          console.warn('[AuthImage] Direct fetch failed, retrying with auth headers:', resolvedSrc);
          setTriedBlob(true);
          fetchAsBlob();
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

export default function HostEventDashboard({ event, onBack, onEditEvent, currentUser }) {
  const [activeTab, setActiveTab]               = useState('overview');
  const [selectedImage, setSelectedImage]       = useState(null);
  const [attendees, setAttendees]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);
  const [menuOpen, setMenuOpen]                 = useState(false);
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [deleting, setDeleting]                 = useState(false);
  const [unpublishing, setUnpublishing]         = useState(false);
  const [showRejectModal, setShowRejectModal]   = useState(false);
  const [showApprovePaymentModal, setShowApprovePaymentModal] = useState(false);
  const [showRejectPaymentModal, setShowRejectPaymentModal] = useState(false);
  const [selectedPaymentForApprove, setSelectedPaymentForApprove] = useState(null);
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState(null);
  const [approvingPayment, setApprovingPayment] = useState(false);
  const [rejectingPayment, setRejectingPayment] = useState(false);
  const [, setRejectionNote]                    = useState('');
  const [rejectionReasonType, setRejectionReasonType] = useState('predefined'); // 'predefined' or 'custom'
  const [selectedPredefinedReason, setSelectedPredefinedReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [selectedAttendeeForReject, setSelectedAttendeeForReject] = useState(null);
  const [rejecting, setRejecting]               = useState(false);
  const [showRejectionNoteView, setShowRejectionNoteView] = useState(false);
  const [selectedRejectionNote, setSelectedRejectionNote] = useState(null);
  const [rejectionNoteTitle, setRejectionNoteTitle] = useState('Rejection Reason');
  const [showRefundModal, setShowRefundModal]   = useState(false);
  const [selectedRefundRequest, setSelectedRefundRequest] = useState(null);
  const [refundAction, setRefundAction]         = useState(null); // 'approve' or 'reject'
  const [processingRefund, setProcessingRefund] = useState(false);
  const [refundProofFile, setRefundProofFile]   = useState(null);
  const [refundError, setRefundError]           = useState(null);
  const [rejectionReason, setRejectionReason]   = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    if (!event?.id) return;
    setLoading(true);
    setError(null);
    getEventAttendees(event.id)
      .then(data => setAttendees(data || []))
      .catch(err => {
        console.error('[HostEventDashboard] Failed to fetch attendees:', err);
        setError(err.message || 'Failed to load attendees');
        setAttendees([]);
      })
      .finally(() => setLoading(false));
  }, [event?.id]);

  useEffect(() => {
    function handleClickOutside(evt) {
      if (menuRef.current && !menuRef.current.contains(evt.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEdit = () => { setMenuOpen(false); if (onEditEvent) onEditEvent(event); };
  const handleDelete = () => { setMenuOpen(false); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteEventApi(event.id);
      setShowDeleteModal(false);
      if (onBack) onBack();
    } catch (err) {
      setError('Failed to delete event. Please try again.');
      setShowDeleteModal(false);
    } finally { setDeleting(false); }
  };

  const handleUnpublish = () => { setMenuOpen(false); setShowUnpublishModal(true); };

  const confirmUnpublish = async () => {
    setUnpublishing(true);
    try {
      await unpublishEvent(event.id);
      event.isDraft = true;
      setShowUnpublishModal(false);
      alert('Event unpublished successfully!');
    } catch (err) {
      setError('Failed to unpublish event. Please try again.');
      setShowUnpublishModal(false);
    } finally { setUnpublishing(false); }
  };

  const handleShare = () => {
    setMenuOpen(false);
    if (navigator.share) {
      navigator.share({ title: event.title, text: `Check out ${event.title}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleExportAttendees = () => {
    setMenuOpen(false);
    const headers = ['Name', 'Email', 'Seat Number', 'Registered Date', 'Payment Status'];
    const rows = attendees.map(a => [a.name, a.email, a.seatNumber, formatDate(a.registeredAt), a.paymentStatus || 'Pending']);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${event.title}-attendees.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const pendingPayments    = attendees.filter(a => a.paymentStatus === 'pending' && a.paymentProofUrl);
  const confirmedAttendees = attendees.filter(a => 
      (a.status === 'confirmed' || a.paymentStatus === 'confirmed') && 
      a.attendeeStatus !== 'rejected' && 
      a.status !== 'cancelled'
  );
  const openApprovePaymentModal = (attendee) => {
    setSelectedPaymentForApprove(attendee);
    setShowApprovePaymentModal(true);
  };

  const openRejectPaymentModal = (attendee) => {
    setSelectedPaymentForReject(attendee);
    setShowRejectPaymentModal(true);
  };

  const confirmApprovePayment = async () => {
    if (!selectedPaymentForApprove) return;
    setError('');
    setApprovingPayment(true);
    try {
      await approvePayment(event.id, selectedPaymentForApprove.id);
      setAttendees(prev => prev.map(a => a.id === selectedPaymentForApprove.id ? { ...a, paymentStatus: 'confirmed', status: 'confirmed' } : a));
      setShowApprovePaymentModal(false);
      setSelectedPaymentForApprove(null);
    } catch (err) {
      setError('Failed to approve payment');
      console.error(err);
    } finally {
      setApprovingPayment(false);
    }
  };

  const confirmRejectPayment = async () => {
    if (!selectedPaymentForReject) return;
    setError('');
    setRejectingPayment(true);
    try {
      await rejectPayment(event.id, selectedPaymentForReject.id);
      setAttendees(prev => prev.map(a => a.id === selectedPaymentForReject.id ? { ...a, paymentStatus: 'rejected' } : a));
      setShowRejectPaymentModal(false);
      setSelectedPaymentForReject(null);
    } catch (err) {
      setError('Failed to reject payment');
      console.error(err);
    } finally {
      setRejectingPayment(false);
    }
  };

  const openRejectModal = (attendee) => {
    setSelectedAttendeeForReject(attendee);
    setRejectionNote('');
    setRejectionReasonType('predefined');
    setSelectedPredefinedReason('');
    setCustomRejectionReason('');
    setShowRejectModal(true);
  };

  const predefinedReasons = [
    'Incomplete guest information',
    'Invalid payment proof',
    'Duplicate registration',
    'Guest did not meet HangOut requirements',
    'HangOut policy violation',
  ];

  const confirmRejectAttendee = async () => {
    let finalReason = '';
    
    if (rejectionReasonType === 'predefined' && !selectedPredefinedReason.trim()) {
      setError('Please select a predefined reason');
      return;
    }
    
    if (rejectionReasonType === 'custom' && !customRejectionReason.trim()) {
      setError('Please provide a custom reason');
      return;
    }
    
    if (rejectionReasonType === 'predefined') {
      finalReason = selectedPredefinedReason;
    } else {
      finalReason = customRejectionReason.substring(0, 500); // Limit to 500 chars
    }
    
    setRejecting(true);
    try {
      await rejectAttendee(event.id, selectedAttendeeForReject.id, finalReason);
      setAttendees(prev => prev.map(a =>
        a.id === selectedAttendeeForReject.id
          ? { ...a, attendeeStatus: 'rejected', attendeeRejectionReason: finalReason, attendeeRejectionType: 'attendee_tab' }
          : a
      ));
      setShowRejectModal(false);
      setSelectedAttendeeForReject(null);
      setRejectionNote('');
      setRejectionReasonType('predefined');
      setSelectedPredefinedReason('');
      setCustomRejectionReason('');
      setError(null);
    } catch (err) {
      setError('Failed to reject attendee');
      console.error(err);
    } finally {
      setRejecting(false);
    }
  };

  const handleViewRejectionNote = (note, title = 'Rejection Reason') => {
    setSelectedRejectionNote(note);
    setRejectionNoteTitle(title);
    setShowRejectionNoteView(true);
  };

  const confirmRefundAction = async () => {
    if (!selectedRefundRequest || !refundAction) return;
    
    setProcessingRefund(true);
    try {
      if (refundAction === 'approve') {
        if (!refundProofFile) {
          setRefundError('Please upload proof of refund before approving.');
          return;
        }
        await approveRefund(event.id, selectedRefundRequest.id, refundProofFile);
        setAttendees(prev => prev.map(a =>
          a.id === selectedRefundRequest.id
            ? { ...a, refundStatus: 'waiting_acknowledgement' }
            : a
        ));
      } else if (refundAction === 'reject') {
        if (!rejectionReason.trim()) {
          setRefundError('Please provide a rejection reason.');
          return;
        }
        await rejectRefund(event.id, selectedRefundRequest.id, rejectionReason);
        setAttendees(prev => prev.map(a =>
          a.id === selectedRefundRequest.id
            ? { ...a, refundStatus: 'rejected', refundRejectionReason: rejectionReason }
            : a
        ));
      }
      setShowRefundModal(false);
      setSelectedRefundRequest(null);
      setRefundAction(null);
      setRefundProofFile(null);
      setRejectionReason('');
      setRefundError(null);
    } catch (err) {
      setRefundError('Failed to process refund');
      console.error(err);
    } finally {
      setProcessingRefund(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime12Hour = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    let hour = parseInt(hours);
    const meridiem = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minutes} ${meridiem}`;
  };

  const isUserHost    = () => currentUser?.id === event?.hostId || currentUser?.id === event?.userId;
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

  const isEventCompleted = () => event?.eventStatus === 'completed' || hasEventPassed();

  const stats = {
    totalAttendees: attendees.filter(a => a.attendeeStatus !== 'rejected' && a.status !== 'cancelled').length,
    pendingReviews: pendingPayments.length,
    totalRevenue:   confirmedAttendees.length * (event.price || 0),
    capacity:       event.capacity || 100,
  };

  // Filter refund requests awaiting host approval or guest acknowledgement
  const refundRequests = attendees.filter(a => a.refundStatus === 'pending' || a.refundStatus === 'waiting_acknowledgement');

  if (!event) return null;

  const tabs = [
    { key: 'overview',  label: 'Overview' },
    { key: 'pending',   label: 'Pending Reviews' },
    { key: 'refunds',   label: 'Refund Requests' },
    { key: 'attendees', label: 'Attendees' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className={s.page}>

      {/* ── Hero ── */}
      <div className={s.hero}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.heroImg} />
          : <div className={s.heroBlank} />}
        <div className={s.heroOverlay} />

        <div className={s.heroActions}>
          <button className={s.backBtn} onClick={onBack}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className={s.heroRightActions}>
            <button className={s.iconBtn} onClick={handleShare} title="Share"><Share2 size={20} /></button>
            <button className={s.iconBtn} onClick={handleEdit}  title="Edit"><Edit size={20} /></button>
            <div className={s.menuContainer} ref={menuRef}>
              <button className={s.iconBtn} onClick={() => setMenuOpen(!menuOpen)} title="More">
                <MoreVertical size={20} />
              </button>
              {menuOpen && (
                <div className={s.menuDropdown}>
                  <button className={s.menuItem} onClick={handleExportAttendees}><Download size={16} /> Export Attendees</button>
                  <button className={s.menuItem} onClick={handleUnpublish}><EyeOff size={16} /> Unpublish HangOut</button>
                  <button className={`${s.menuItem} ${s.menuItemDanger}`} onClick={handleDelete}><Trash2 size={16} /> Delete HangOut</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={s.heroContent}>
          {isEventCompleted() ? (
            <div className={`${s.hostingBadge} ${s.completedHeroBadge}`}>Completed HangOut</div>
          ) : isUserHost() && (
            <div className={s.hostingBadge}>You're hosting this HangOut</div>
          )}
          <h1 className={s.heroTitle}>{event.title}</h1>
          <div className={s.heroMeta}>
            <div className={s.heroMetaItem}><Calendar size={18} className={s.heroMetaIcon} /><span>{formatDate(event.date)}</span></div>
            <div className={s.heroMetaItem}><Clock size={18} className={s.heroMetaIcon} /><span>{formatTime12Hour(event.startTime)} – {formatTime12Hour(event.endTime)}</span></div>
            <div className={s.heroMetaItem}><MapPin size={18} className={s.heroMetaIcon} /><span>{event.location}</span></div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={s.body}>
        <div className={s.main}>

          {/* ── Stats ── */}
          <div className={s.statsGrid}>
            {[
              { icon: Users,      label: 'Total Attendees', value: stats.totalAttendees, sub: `${stats.capacity - stats.totalAttendees} spots left` },
              { icon: Clock3,     label: 'Pending Reviews', value: stats.pendingReviews, sub: 'Needs attention', alert: stats.pendingReviews > 0 },
              { icon: Users,      label: 'Confirmed',       value: confirmedAttendees.length, sub: 'Fully registered' },
              { icon: TrendingUp, label: 'Total Revenue',   value: `₱${stats.totalRevenue.toLocaleString()}`, sub: 'From payments' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className={s.statCard}>
                  <div className={s.statCardHeader}>
                    <Icon size={32} className={stat.alert ? s.statIconAlert : s.statIcon} />
                    {stat.alert && <AlertCircle size={20} className={s.statIconAlert} />}
                  </div>
                  <p className={s.statValue}>{stat.value}</p>
                  <p className={s.statLabel}>{stat.label}</p>
                  {stat.sub && <p className={s.statSub}>{stat.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* ── Tabs ── */}
          <div className={s.tabsContainer}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`${s.tab} ${activeTab === t.key ? s.tabActive : ''}`}
                onClick={() => setActiveTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {t.label}
                {t.key === 'pending' && stats.pendingReviews > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '9999px', background: '#fbbf24', color: '#000', fontSize: '12px', fontWeight: 700, lineHeight: 1.4 }}>
                    {stats.pendingReviews}
                  </span>
                )}
                {t.key === 'refunds' && refundRequests.length > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '9999px', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 700, lineHeight: 1.4 }}>
                    {refundRequests.length}
                  </span>
                )}
                {t.key === 'attendees' && (
                  <span style={{ color: activeTab === 'attendees' ? 'rgba(255,255,255,0.8)' : '#6b7280', fontSize: '13px' }}>
                    ({attendees.length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div style={{ minHeight: '400px' }}>
            {loading ? (
              <div className={s.loading}><div className={s.spinner} /></div>
            ) : error ? (
              <div className={s.error}>{error}</div>
            ) : (
              <>
                {/* ══ OVERVIEW ══ */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={s.cardFlat}>
                      <p className={s.sectionTitle} style={{ marginBottom: '20px' }}>Quick Actions</p>
                      <div className={s.quickActionsGrid}>
                        <button className={s.actionCard} onClick={handleEdit}>
                          <div className={s.actionCardIcon}><Edit size={24} style={{ color: '#a78bfa' }} /></div>
                          <h3 className={s.actionCardTitle}>Edit HangOut</h3>
                          <p className={s.actionCardDesc}>Update details, date, or location</p>
                        </button>
                        <button className={`${s.actionCard} ${s.actionCardGreen}`} onClick={handleExportAttendees}>
                          <div className={`${s.actionCardIcon} ${s.actionCardIconGreen}`}><Download size={24} /></div>
                          <h3 className={s.actionCardTitle}>Export Attendees</h3>
                          <p className={s.actionCardDesc}>Download as CSV or Excel</p>
                        </button>
                        <button className={`${s.actionCard} ${s.actionCardBlue}`} onClick={handleShare}>
                          <div className={`${s.actionCardIcon} ${s.actionCardIconBlue}`}><Share2 size={24} /></div>
                          <h3 className={s.actionCardTitle}>Share HangOut</h3>
                          <p className={s.actionCardDesc}>Promote on social media</p>
                        </button>
                      </div>
                    </div>

                    <div className={s.cardFlat}>
                      <p className={s.sectionTitle} style={{ marginBottom: '4px' }}>Recent Activity</p>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {attendees.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle size={20} style={{ color: '#22c55e' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14, fontFamily: 'DM Sans, sans-serif', margin: '0 0 3px' }}>New Registration</p>
                              <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{attendees[attendees.length - 1]?.name} registered for the HangOut</p>
                            </div>
                            <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Recently</span>
                          </div>
                        )}
                        {stats.pendingReviews > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Clock3 size={20} style={{ color: '#fbbf24' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14, fontFamily: 'DM Sans, sans-serif', margin: '0 0 3px' }}>Payment Pending</p>
                              <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{stats.pendingReviews} payment{stats.pendingReviews !== 1 ? 's' : ''} awaiting your review</p>
                            </div>
                            <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Pending</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} style={{ color: '#818cf8' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14, fontFamily: 'DM Sans, sans-serif', margin: '0 0 3px' }}>Capacity Milestone</p>
                            <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>Your HangOut is {Math.round((stats.totalAttendees / stats.capacity) * 100)}% filled</p>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>{stats.totalAttendees}/{stats.capacity}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 0' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={20} style={{ color: '#10b981' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14, fontFamily: 'DM Sans, sans-serif', margin: '0 0 3px' }}>Revenue</p>
                            <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>₱{stats.totalRevenue.toLocaleString()} collected from confirmed attendees</p>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Total</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ PENDING REVIEWS ══ */}
                {activeTab === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingPayments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '64px 24px', color: '#9ca3af' }}>
                        <CheckCircle size={56} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#22c55e' }} />
                        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>All Caught Up!</p>
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>No pending payment verifications at the moment</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <AlertCircle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                          <p style={{ color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>
                            {pendingPayments.length} payment proof(s) awaiting your review
                          </p>
                        </div>

                        {pendingPayments.map((payment) => (
                          <div key={payment.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 14, background: '#13131f', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s' }}>

                            {/* Avatar */}
                            <ProfileAvatar person={payment} name={payment.name} size={48} gradient='linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' />

                            {/* Name + amount */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>{payment.name}</p>
                              <p style={{ color: '#a78bfa', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>₱{event.price || 0}</p>
                            </div>

                            {/* Payment proof thumbnail preview — click to enlarge */}
                            {payment.paymentProofUrl && (
                              <div
                                onClick={() => setSelectedImage(payment.paymentProofUrl)}
                                title="Click to view full payment proof"
                                style={{
                                  position: 'relative',
                                  width: 160,
                                  height: 90,
                                  borderRadius: 10,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border: '2px solid rgba(139, 92, 246, 0.4)',
                                  background: 'rgba(139, 92, 246, 0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.8)'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)'; const overlay = e.currentTarget.querySelector('[data-overlay]'); if (overlay) overlay.style.opacity = '1'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'; e.currentTarget.style.boxShadow = 'none'; const overlay = e.currentTarget.querySelector('[data-overlay]'); if (overlay) overlay.style.opacity = '0'; }}
                              >
                                <AuthImage
                                  src={payment.paymentProofUrl}
                                  alt="Payment proof thumbnail"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                  }}
                                />
                                {/* Hover overlay with "View" indicator */}
                                <div
                                  data-overlay="true"
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s ease',
                                    borderRadius: 8,
                                    gap: 6,
                                  }}
                                >
                                  <Image size={18} style={{ color: 'white' }} />
                                  <span style={{ color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>View</span>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                              <button onClick={() => openApprovePaymentModal(payment)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                <CheckCircle size={16} /> Approve
                              </button>
                              <button onClick={() => openRejectPaymentModal(payment)} style={{ background: 'none', border: 'none', color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '10px 4px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'} onMouseLeave={e => e.currentTarget.style.color = '#f87171'}>
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* ══ REFUND REQUESTS ══ */}
                {activeTab === 'refunds' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {refundRequests.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '64px 24px', color: '#9ca3af' }}>
                        <CheckCircle size={56} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#22c55e' }} />
                        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>No Pending Refunds</p>
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>All refund requests have been processed</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <AlertCircle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
                          <p style={{ color: '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>
                            {refundRequests.length} refund request{refundRequests.length !== 1 ? 's' : ''} awaiting your review or guest acknowledgement
                          </p>
                        </div>

                        {refundRequests.map((request) => (
                          <div key={request.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px', borderRadius: 14, background: '#13131f', border: '1px solid rgba(239,68,68,0.2)', transition: 'border-color 0.2s' }}>

                            {/* Avatar */}
                            <ProfileAvatar person={request} name={request.name} size={48} gradient='linear-gradient(135deg, #f87171 0%, #fca5a5 100%)' />

                            {/* Name + email + reason */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, margin: '0 0 3px' }}>{request.name}</p>
                              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: '0 0 12px' }}>{request.email}</p>
                              <p style={{ color: '#f87171', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 8px' }}>Refund Amount: ₱{event.price || 0}</p>
                              {request.cancellationReason && (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                                  <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: '0 0 4px', fontWeight: 600 }}>Cancellation Reason:</p>
                                  <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.4 }}>{request.cancellationReason}</p>
                                </div>
                              )}
                              {request.refundRejectionReason && (
                                <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                                  <p style={{ color: '#a16207', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: '0 0 4px', fontWeight: 600 }}>Guest message:</p>
                                  <p style={{ color: '#f3f4f6', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.4 }}>{request.refundRejectionReason}</p>
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <span style={{ color: request.refundStatus === 'waiting_acknowledgement' ? '#fbbf24' : '#fca5a5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600 }}>
                                  {request.refundStatus === 'waiting_acknowledgement' ? 'Awaiting guest acknowledgement' : 'Refund request pending host review'}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              {request.refundStatus === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => { setSelectedRefundRequest(request); setRefundAction('approve'); setRefundError(null); setRefundProofFile(null); setRejectionReason(''); setShowRefundModal(true); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '10px 16px', borderRadius: 10, border: 'none',
                                      background: '#10b981', color: 'white',
                                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
                                      cursor: 'pointer', transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                  >
                                    <CheckCircle size={14} /> Approve
                                  </button>
                                  <button
                                    onClick={() => { setSelectedRefundRequest(request); setRefundAction('reject'); setRefundError(null); setRefundProofFile(null); setRejectionReason(''); setShowRefundModal(true); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
                                      background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
                                      cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </>
                              ) : (
                                <>
                                  {request.refundProofUrl && (
                                    <button
                                      onClick={() => setSelectedImage(request.refundProofUrl)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)',
                                        background: 'rgba(148,163,184,0.08)', color: '#cbd5e1',
                                        fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <Eye size={14} /> View Proof
                                    </button>
                                  )}
                                  <span style={{ color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600 }}>
                                    Awaiting guest acknowledgement
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* ══ ATTENDEES ══ */}
                {activeTab === 'attendees' && (
                  <div>
                    {attendees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '64px 24px', color: '#9ca3af' }}>
                        <Users size={56} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>No attendees yet</p>
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>Attendees will appear here once they register</p>
                      </div>
                    ) : (
                      <div style={{ borderRadius: 14, background: '#13131f', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <p style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, margin: 0 }}>Attendee List ({attendees.length})</p>
                          <button onClick={handleExportAttendees} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            <Download size={15} /> Export List
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 100px 140px 140px 160px 120px', columnGap: '20px', padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                          {['Attendee', 'Email', 'Seat', 'Registered', 'Status', 'Action', ''].map(h => (
                            <span key={h || 'refund-col'} style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{h}</span>
                          ))}
                        </div>
                        {attendees.map((a, i) => {
                          const statusInfo = a.attendeeStatus === 'rejected' || a.paymentStatus === 'rejected' 
                            ? { label: 'Rejected', color: '#fca5a5', bg: 'rgba(239,68,68,0.2)' }
                            : a.status === 'cancelled' 
                            ? { label: 'Cancelled', color: '#9ca3af', bg: 'rgba(107,114,128,0.2)' }
                            : a.refundStatus === 'waiting_acknowledgement'
                            ? { label: 'Refund Pending', color: '#fcd34d', bg: 'rgba(251,191,36,0.2)' }
                            : a.refundStatus === 'pending'
                            ? { label: 'Refund Requested', color: '#fbbf24', bg: 'rgba(251,191,36,0.2)' }
                            : a.paymentStatus === 'confirmed'
                            ? { label: 'Confirmed', color: '#86efac', bg: 'rgba(34,197,94,0.2)' }
                            : { label: 'Pending', color: '#d8b4fe', bg: 'rgba(168,85,247,0.2)' };
                          
                          return (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 100px 140px 140px 160px 120px', columnGap: '20px', padding: '22px 28px', alignItems: 'center', borderBottom: i !== attendees.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {/* Attendee */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                <ProfileAvatar person={a} name={a.name} size={40} />
                                <span style={{ color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                              </div>
                              
                              {/* Email */}
                              <span style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</span>
                              
                              {/* Seat */}
                              <span style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{a.seatNumber || '—'}</span>
                              
                              {/* Registered Date */}
                              <span style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>{formatDate(a.registeredAt)}</span>
                              
                              {/* Status */}
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, background: statusInfo.bg, color: statusInfo.color, width: 'fit-content' }}>
                                {statusInfo.label}
                              </span>
                              
                              {/* Action */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
                                {a.status === 'cancelled' ? (
                                  <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4b5563', fontSize: 12, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      <AlertCircle size={13} style={{ color: '#4b5563', flexShrink: 0 }} /> Cancelled
                                    </span>
                                    {a.cancellationReason && (
                                      <button
                                        onClick={() => handleViewRejectionNote(a.cancellationReason, 'Cancellation Reason')}
                                        title="View cancellation reason"
                                        style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                                      >
                                        <MessageCircle size={16} />
                                      </button>
                                    )}
                                  </>
                                ) : a.attendeeStatus === 'rejected' || a.paymentStatus === 'rejected' ? (
                                  <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4b5563', fontSize: 12, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      <AlertCircle size={13} style={{ color: '#4b5563', flexShrink: 0 }} /> Rejected
                                    </span>
                                    {a.attendeeRejectionReason && (
                                      <button
                                        onClick={() => handleViewRejectionNote(a.attendeeRejectionReason)}
                                        title="View rejection reason"
                                        style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                                      >
                                        <MessageCircle size={16} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    onClick={a.refundStatus === 'pending' || a.refundStatus === 'waiting_acknowledgement' ? undefined : () => openRejectModal(a)}
                                    title={a.refundStatus === 'pending' || a.refundStatus === 'waiting_acknowledgement' ? 'Cannot reject while refund request is active' : 'Reject attendee'}
                                    disabled={a.refundStatus === 'pending' || a.refundStatus === 'waiting_acknowledgement'}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, cursor: a.refundStatus === 'pending' || a.refundStatus === 'waiting_acknowledgement' ? 'not-allowed' : 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontSize: 12, fontWeight: 600, opacity: a.refundStatus === 'pending' || a.refundStatus === 'waiting_acknowledgement' ? 0.55 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                )}
                              </div>
                              
                              {/* Refund Status Column */}
                              {a.refundStatus && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: a.refundStatus === 'completed' ? '#86efac' : a.refundStatus === 'waiting_acknowledgement' ? '#fbbf24' : '#9ca3af', gap: 4, whiteSpace: 'nowrap' }}>
                                  {a.refundStatus === 'completed' && (
                                    <>
                                      <CheckCircle size={11} /> Refunded
                                    </>
                                  )}
                                  {a.refundStatus === 'waiting_acknowledgement' && (
                                    <>
                                      <AlertCircle size={11} /> Approval Pending
                                    </>
                                  )}
                                  {a.refundStatus === 'pending' && (
                                    <>
                                      <Clock size={11} /> Refund Requested
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ ANALYTICS ══ */}
                {activeTab === 'analytics' && (
                  <div className={s.cardFlat} style={{ textAlign: 'center', padding: '64px 48px' }}>
                    <BarChart3 size={52} style={{ margin: '0 auto 16px', opacity: 0.35, color: '#9ca3af' }} />
                    <p style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Analytics Coming Soon</p>
                    <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>Detailed insights about your HangOut will appear here</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Image preview lightbox ── */}
      {selectedImage && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setSelectedImage(null)}
        >
          <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: 'white', cursor: 'pointer', zIndex: 10 }}>
            <X size={32} />
          </button>
          <AuthImage
            src={selectedImage}
            alt="Payment proof"
            className={s.paymentImage}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Reject attendee modal ── */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowRejectModal(false)}>
          <div style={{ background: '#13131f', borderRadius: 16, padding: '32px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Reject Attendee</h2>
            <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 24 }}>
              Rejecting <strong style={{ color: '#e5e7eb' }}>{selectedAttendeeForReject?.name}</strong>. Please select or provide a reason.
            </p>
            
            {/* Reason Type Selection */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Reason Type</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setRejectionReasonType('predefined')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: rejectionReasonType === 'predefined' ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)',
                    background: rejectionReasonType === 'predefined' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
                    color: rejectionReasonType === 'predefined' ? '#c4b5fd' : '#9ca3af',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  From List
                </button>
                <button
                  onClick={() => setRejectionReasonType('custom')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: rejectionReasonType === 'custom' ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)',
                    background: rejectionReasonType === 'custom' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
                    color: rejectionReasonType === 'custom' ? '#c4b5fd' : '#9ca3af',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Predefined Reasons */}
            {rejectionReasonType === 'predefined' && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Select a Reason</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {predefinedReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPredefinedReason(reason)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: selectedPredefinedReason === reason ? '2px solid #fca5a5' : '1px solid rgba(255,255,255,0.12)',
                        background: selectedPredefinedReason === reason ? 'rgba(239,68,68,0.15)' : 'transparent',
                        color: selectedPredefinedReason === reason ? '#fca5a5' : '#e5e7eb',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        hover: { background: 'rgba(255,255,255,0.05)' }
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Reason */}
            {rejectionReasonType === 'custom' && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Enter Reason</p>
                <textarea
                  value={customRejectionReason}
                  onChange={e => setCustomRejectionReason(e.target.value.substring(0, 500))}
                  placeholder="Explain why you're rejecting this attendee..."
                  rows={4}
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e5e7eb',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ color: '#6b7280', fontFamily: 'DM Sans, sans-serif', fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                  {customRejectionReason.length}/500 characters
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionNote('');
                  setRejectionReasonType('predefined');
                  setSelectedPredefinedReason('');
                  setCustomRejectionReason('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#d1d5db',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectAttendee}
                disabled={rejecting || (rejectionReasonType === 'predefined' && !selectedPredefinedReason) || (rejectionReasonType === 'custom' && !customRejectionReason.trim())}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: rejecting || (rejectionReasonType === 'predefined' && !selectedPredefinedReason) || (rejectionReasonType === 'custom' && !customRejectionReason.trim()) ? 'rgba(239,68,68,0.4)' : '#ef4444',
                  color: 'white',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: rejecting || (rejectionReasonType === 'predefined' && !selectedPredefinedReason) || (rejectionReasonType === 'custom' && !customRejectionReason.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {rejecting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection note view modal ── */}
      {showRejectionNoteView && selectedRejectionNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowRejectionNoteView(false)}>
          <div style={{ background: '#13131f', borderRadius: 16, padding: '32px', border: '1px solid rgba(239,68,68,0.2)', width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#fca5a5', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: 0 }}>{rejectionNoteTitle}</h2>
              <button onClick={() => setShowRejectionNoteView(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
            </div>
            <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.6, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '14px 16px', margin: 0 }}>{selectedRejectionNote}</p>
            <button onClick={() => setShowRejectionNoteView(false)} style={{ marginTop: 20, width: '100%', padding: '11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Refund action modal ── */}
      {showApprovePaymentModal && selectedPaymentForApprove && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }} onClick={() => { setShowApprovePaymentModal(false); setSelectedPaymentForApprove(null); }}>
          <div style={{ background: '#13131f', borderRadius: 16, padding: '28px 32px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>
                  Confirm Payment Approval
                </h2>
                <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
                  Approving this payment proof will confirm the attendee's RSVP and assign their ticket.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, margin: 0 }}>
                <strong>{selectedPaymentForApprove.name}</strong>
              </p>
              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, marginTop: 8 }}>
                {selectedPaymentForApprove.email}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowApprovePaymentModal(false); setSelectedPaymentForApprove(null); }} disabled={approvingPayment} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: approvingPayment ? 'not-allowed' : 'pointer', opacity: approvingPayment ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={confirmApprovePayment} disabled={approvingPayment} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: approvingPayment ? 'rgba(16,185,129,0.4)' : '#10b981', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: approvingPayment ? 'not-allowed' : 'pointer' }}>
                {approvingPayment ? 'Approving…' : 'Approve Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectPaymentModal && selectedPaymentForReject && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }} onClick={() => { setShowRejectPaymentModal(false); setSelectedPaymentForReject(null); }}>
          <div style={{ background: '#13131f', borderRadius: 16, padding: '28px 32px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#fb7185' }} />
              </div>
              <div>
                <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>
                  Confirm Payment Rejection
                </h2>
                <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
                  Rejecting this payment proof will mark the payment as rejected and allow the attendee to resubmit.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, margin: 0 }}>
                <strong>{selectedPaymentForReject.name}</strong>
              </p>
              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13, marginTop: 8 }}>
                {selectedPaymentForReject.email}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowRejectPaymentModal(false); setSelectedPaymentForReject(null); }} disabled={rejectingPayment} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: rejectingPayment ? 'not-allowed' : 'pointer', opacity: rejectingPayment ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={confirmRejectPayment} disabled={rejectingPayment} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: rejectingPayment ? 'rgba(239,68,68,0.4)' : '#ef4444', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: rejectingPayment ? 'not-allowed' : 'pointer' }}>
                {rejectingPayment ? 'Rejecting…' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedRefundRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowRefundModal(false)}>
          <div style={{ background: '#13131f', borderRadius: 16, padding: '32px', border: '1px solid rgba(239,68,68,0.2)', width: '100%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 8, margin: 0 }}>
              {refundAction === 'approve' ? 'Approve Refund' : 'Reject Refund'}
            </h2>
            <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 20 }}>
              Guest: <strong style={{ color: '#e5e7eb' }}>{selectedRefundRequest?.name}</strong>
            </p>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, margin: '0 0 8px' }}>Reason for Cancellation:</p>
              <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
                {selectedRefundRequest?.cancellationReason || 'No reason provided'}
              </p>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '16px', marginBottom: 24 }}>
              <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>Refund Amount:</p>
              <p style={{ color: '#10b981', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: 0 }}>₱{event.price || 0}</p>
            </div>
            {refundAction === 'approve' && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
                  Upload Refund Proof *
                </label>
                
                {/* Upload Drop Zone */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    border: '2px dashed rgba(168,85,247,0.4)',
                    background: 'rgba(168,85,247,0.05)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: refundProofFile ? 12 : 0
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'rgba(168,85,247,0.8)';
                    e.currentTarget.style.background = 'rgba(168,85,247,0.12)';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)';
                    e.currentTarget.style.background = 'rgba(168,85,247,0.05)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)';
                    e.currentTarget.style.background = 'rgba(168,85,247,0.05)';
                    const f = e.dataTransfer.files[0];
                    if (f) {
                      if (f.size > 5 * 1024 * 1024) {
                        setRefundError('Refund proof must be under 5MB. Please compress the image and try again.');
                        setRefundProofFile(null);
                        return;
                      }
                      if (!['image/jpeg', 'image/png', 'image/heic'].includes(f.type)) {
                        setRefundError('Only JPEG, PNG, and HEIC formats are accepted.');
                        setRefundProofFile(null);
                        return;
                      }
                      setRefundError(null);
                      setRefundProofFile(f);
                    }
                  }}
                  onClick={() => document.getElementById('refund-file-input').click()}
                >
                  {refundProofFile ? (
                    <div>
                      <div style={{ color: '#10b981', marginBottom: 8 }}>
                        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto' }}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <p style={{ color: '#10b981', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                        File Selected
                      </p>
                      <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0 }}>
                        {refundProofFile.name}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: '#a78bfa', marginBottom: 8 }}>
                        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <p style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                        Drag and drop your proof here
                      </p>
                      <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 12, margin: 0 }}>
                        or click to browse
                      </p>
                    </div>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  id="refund-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/heic"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) {
                      setRefundError('Refund proof must be under 5MB. Please compress the image and try again.');
                      e.target.value = '';
                      setRefundProofFile(null);
                      return;
                    }
                    if (!['image/jpeg', 'image/png', 'image/heic'].includes(f.type)) {
                      setRefundError('Only JPEG, PNG, and HEIC formats are accepted.');
                      e.target.value = '';
                      setRefundProofFile(null);
                      return;
                    }
                    setRefundError(null);
                    setRefundProofFile(f);
                  }}
                />

                {/* File Info */}
                {refundProofFile && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>File Size</p>
                      <p style={{ color: '#10b981', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, margin: 0 }}>
                        {(refundProofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Format</p>
                      <p style={{ color: '#a5b4fc', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, margin: 0 }}>
                        {refundProofFile.name.split('.').pop().toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {refundError && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style={{ color: '#f87171', fontSize: 12, lineHeight: 1.4, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                      {refundError}
                    </p>
                  </div>
                )}

                {/* Format Info */}
                {!refundError && (
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: '12px 0 0', fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' }}>
                    ✓ Accepted formats: JPEG, PNG, HEIC • Max file size: 5 MB
                  </p>
                )}
              </div>
            )}
            {refundAction === 'reject' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this refund request..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e5e7eb',
                    fontFamily: 'DM Sans, sans-serif',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowRefundModal(false); setSelectedRefundRequest(null); setRefundAction(null); setRefundProofFile(null); setRejectionReason(''); setRefundError(null); }} disabled={processingRefund} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#d1d5db', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: processingRefund ? 'not-allowed' : 'pointer' }}>Cancel</button>
              <button onClick={confirmRefundAction} disabled={processingRefund} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: refundAction === 'approve' ? '#10b981' : '#ef4444', color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: processingRefund ? 'not-allowed' : 'pointer', opacity: processingRefund ? 0.6 : 1 }}>
                {processingRefund ? 'Processing…' : (refundAction === 'approve' ? 'Approve Refund' : 'Reject Refund')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      <Modal isOpen={showDeleteModal} title="Delete HangOut" message="Are you sure you want to delete this HangOut? This action cannot be undone." confirmText="Delete" cancelText="Cancel" isDanger={true} isLoading={deleting} onConfirm={confirmDelete} onCancel={() => setShowDeleteModal(false)} />

      {/* ── Unpublish modal ── */}
      <Modal isOpen={showUnpublishModal} title="Unpublish HangOut" message="Are you sure you want to unpublish this HangOut? It will become a draft and won't be visible to others." confirmText="Unpublish" cancelText="Cancel" isDanger={true} isLoading={unpublishing} onConfirm={confirmUnpublish} onCancel={() => setShowUnpublishModal(false)} />
    </div>
  );
}