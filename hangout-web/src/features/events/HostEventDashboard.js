import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, CheckCircle, X,
  Clock3, Edit, Share2, MoreVertical, BarChart3, TrendingUp,
  AlertCircle, Download, Trash2, EyeOff, ImageOff, Image, MessageCircle
} from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import s from '../../styles/HostEventDashboard.module.css';
import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';
import {
  getEventAttendees, approvePayment, rejectPayment, rejectAttendee,
  unpublishEvent, deleteEvent as deleteEventApi
} from '../events/eventsApi';

/* ─────────────────────────────────────────────────────────────────────────────
   resolveUrl — turns a relative path from the API into a full URL.
   If it already starts with http/https it is returned unchanged.
   Handles both new format (events/uploads/filename) and old format (/api/uploads/filename).
   Also handles legacy format where the filename was stored directly (/api/filename).
───────────────────────────────────────────────────────────────────────────── */
function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const clean = url.replace(/^\//, '');
  const base = API_BASE.replace(/\/$/, '');
  const path = clean.startsWith('api/') ? clean.slice(4) : clean;

  // Legacy: bare filename with no directory → treat as events/uploads/
  const normalized = path.includes('/') ? path : `events/uploads/${path}`;

  return `${base}/${normalized}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   AuthImage — renders an <img> whose src is resolved and, if that fails,
   retries the same URL with the current auth token attached via a blob
   object-URL (handles auth-gated image endpoints).
───────────────────────────────────────────────────────────────────────────── */
function AuthImage({ src, alt, style, className, onClick }) {
  const [blobSrc, setBlobSrc]   = useState(null);
  const [failed, setFailed]     = useState(false);
  const resolvedSrc             = resolveUrl(src);

  const fetchAsBlob = useCallback(async () => {
  console.log('[AuthImage] Attempting blob fetch for:', resolvedSrc);
  const headers = getAuthHeaders();
  console.log('[AuthImage] Auth headers:', headers);
  try {
    const res = await fetch(resolvedSrc, { headers });
    console.log('[AuthImage] Response status:', res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    setBlobSrc(URL.createObjectURL(blob));
  } catch (err) {
    console.error('[AuthImage] Blob fetch failed:', err);
    setFailed(true);
  }
}, [resolvedSrc]);

  // Clean up object URLs on unmount / src change
  useEffect(() => {
    return () => {
      if (blobSrc) URL.revokeObjectURL(blobSrc);
    };
  }, [blobSrc]);

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
      onError={(e) => {
        if (blobSrc) {
          console.error('[AuthImage] Blob src failed too:', blobSrc);
          setFailed(true);
        } else {
          console.warn('[AuthImage] Direct src failed, retrying with auth headers:', resolvedSrc);
          e.currentTarget.style.display = 'none';
          fetchAsBlob();
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
  const [rejectionNote, setRejectionNote]       = useState('');
  const [selectedAttendeeForReject, setSelectedAttendeeForReject] = useState(null);
  const [rejecting, setRejecting]               = useState(false);
  const [showRejectionNoteView, setShowRejectionNoteView] = useState(false);
  const [selectedRejectionNote, setSelectedRejectionNote] = useState(null);
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
  const confirmedAttendees = attendees.filter(a => a.status === 'confirmed' || a.paymentStatus === 'confirmed');

  const handleApprove = async (attendeeId) => {
    try {
      await approvePayment(event.id, attendeeId);
      setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, paymentStatus: 'confirmed', status: 'confirmed' } : a));
    } catch (err) { setError('Failed to approve payment'); }
  };

  const handleReject = async (attendeeId) => {
    try {
      await rejectPayment(event.id, attendeeId);
      setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, paymentStatus: 'rejected' } : a));
    } catch (err) { setError('Failed to reject payment'); }
  };

  const openRejectModal = (attendee) => {
    setSelectedAttendeeForReject(attendee);
    setRejectionNote('');
    setShowRejectModal(true);
  };

  const confirmRejectAttendee = async () => {
    if (!selectedAttendeeForReject || !rejectionNote.trim()) {
      setError('Please provide a rejection note');
      return;
    }

    setRejecting(true);
    try {
      await rejectAttendee(event.id, selectedAttendeeForReject.id, rejectionNote);
      setAttendees(prev => prev.map(a =>
        a.id === selectedAttendeeForReject.id
          ? { ...a, attendeeStatus: 'rejected', rejectionNote: rejectionNote }
          : a
      ));
      setShowRejectModal(false);
      setSelectedAttendeeForReject(null);
      setRejectionNote('');
      setError(null);
    } catch (err) {
      setError('Failed to reject attendee');
      console.error(err);
    } finally {
      setRejecting(false);
    }
  };

  const handleViewRejectionNote = (note) => {
    setSelectedRejectionNote(note);
    setShowRejectionNoteView(true);
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
  const hasEventPassed = () => {
    if (!event?.date || !event?.endTime) return false;
    return new Date(`${event.date} ${event.endTime}`) < new Date();
  };

  const stats = {
    totalAttendees: attendees.length,
    pendingReviews: pendingPayments.length,
    totalRevenue:   confirmedAttendees.length * (event.price || 0),
    capacity:       event.capacity || 100,
  };

  if (!event) return null;

  /* ── Tab definitions ── */
  const tabs = [
    { key: 'overview',   label: 'Overview' },
    { key: 'pending',    label: 'Pending Reviews' },
    { key: 'attendees',  label: 'Attendees' },
    { key: 'analytics',  label: 'Analytics' },
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
                  <button className={s.menuItem} onClick={handleUnpublish}><EyeOff size={16} /> Unpublish Event</button>
                  <button className={`${s.menuItem} ${s.menuItemDanger}`} onClick={handleDelete}><Trash2 size={16} /> Delete Event</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={s.heroContent}>
          {isUserHost() && !hasEventPassed() && (
            <div className={s.hostingBadge}>You're hosting this event</div>
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
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px',
                    background: '#fbbf24', color: '#000',
                    fontSize: '12px', fontWeight: 700, lineHeight: 1.4,
                  }}>
                    {stats.pendingReviews}
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
                          <div className={s.actionCardIcon}>
                            <Edit size={24} style={{ color: '#a78bfa' }} />
                          </div>
                          <h3 className={s.actionCardTitle}>Edit Event</h3>
                          <p className={s.actionCardDesc}>Update details, date, or location</p>
                        </button>

                        <button className={`${s.actionCard} ${s.actionCardGreen}`} onClick={handleExportAttendees}>
                          <div className={`${s.actionCardIcon} ${s.actionCardIconGreen}`}>
                            <Download size={24} />
                          </div>
                          <h3 className={s.actionCardTitle}>Export Attendees</h3>
                          <p className={s.actionCardDesc}>Download as CSV or Excel</p>
                        </button>

                        <button className={`${s.actionCard} ${s.actionCardBlue}`} onClick={handleShare}>
                          <div className={`${s.actionCardIcon} ${s.actionCardIconBlue}`}>
                            <Share2 size={24} />
                          </div>
                          <h3 className={s.actionCardTitle}>Share Event</h3>
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
                              <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                                {attendees[attendees.length - 1]?.name} registered for the event
                              </p>
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
                              <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                                {stats.pendingReviews} payment{stats.pendingReviews !== 1 ? 's' : ''} awaiting your review
                              </p>
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
                            <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                              Your event is {Math.round((stats.totalAttendees / stats.capacity) * 100)}% filled
                            </p>
                          </div>
                          <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>{stats.totalAttendees}/{stats.capacity}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 0' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={20} style={{ color: '#10b981' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: 14, fontFamily: 'DM Sans, sans-serif', margin: '0 0 3px' }}>Revenue</p>
                            <p style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                              ₱{stats.totalRevenue.toLocaleString()} collected from confirmed attendees
                            </p>
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
                        {/* Yellow warning banner */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 20px', borderRadius: 12,
                          background: 'rgba(245,158,11,0.1)',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}>
                          <AlertCircle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                          <p style={{ color: '#fcd34d', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>
                            {pendingPayments.length} payment proof(s) awaiting your review
                          </p>
                        </div>

                        {/* Payment rows */}
                        {pendingPayments.map((payment) => (
                          <div key={payment.id} style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '20px 24px', borderRadius: 14,
                            background: '#13131f', border: '1px solid rgba(255,255,255,0.07)',
                            transition: 'border-color 0.2s',
                          }}>

                            {/* Avatar */}
                            <div style={{
                              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontWeight: 700, fontSize: 15,
                              fontFamily: 'Syne, sans-serif',
                            }}>
                              {payment.name?.split(' ').map(n => n[0]).join('')}
                            </div>

                            {/* Name + amount */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
                                {payment.name}
                              </p>
                              <p style={{ color: '#a78bfa', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, margin: 0 }}>
                                ₱{event.price || 0}
                              </p>
                            </div>

                            {/* ── Payment proof icon (clickable) ── */}
                            {payment.paymentProofUrl && (
                              <button
                                onClick={() => setSelectedImage(payment.paymentProofUrl)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '10px 14px', borderRadius: 8,
                                  background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)',
                                  color: '#a78bfa', cursor: 'pointer',
                                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                                }}
                              >
                                <Image size={18} />
                                <span>View Proof</span>
                              </button>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                              <button
                                onClick={() => handleApprove(payment.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '10px 20px', borderRadius: 10, border: 'none',
                                  background: '#10b981', color: 'white',
                                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14,
                                  cursor: 'pointer', transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                <CheckCircle size={16} /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(payment.id)}
                                style={{
                                  background: 'none', border: 'none',
                                  color: '#f87171', fontFamily: 'DM Sans, sans-serif',
                                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                  padding: '10px 4px', transition: 'color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
                                onMouseLeave={e => e.currentTarget.style.color = '#f87171'}
                              >
                                Reject
                              </button>
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

                        {/* Table header row */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '20px 24px',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                        }}>
                          <p style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, margin: 0 }}>
                            Confirmed Attendees
                          </p>
                          <button
                            onClick={handleExportAttendees}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '9px 18px', borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.15)',
                              background: 'transparent', color: '#d1d5db',
                              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
                              cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#d1d5db'; }}
                          >
                            <Download size={15} /> Export List
                          </button>
                        </div>

                        {/* Column headers */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 2fr 80px 120px 130px 140px',
                          padding: '12px 24px',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(0,0,0,0.2)',
                        }}>
                          {['Attendee', 'Email', 'Seat', 'Registered', 'Status', 'Action'].map((h) => (
                            <span key={h} style={{ color: '#9ca3af', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{h}</span>
                          ))}
                        </div>

                        {/* Rows */}
                        {attendees.map((a, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 2fr 80px 120px 130px 140px',
                              padding: '16px 24px',
                              alignItems: 'center',
                              borderBottom: i !== attendees.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 12,
                                fontFamily: 'Syne, sans-serif',
                              }}>
                                {a.name?.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span style={{ color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14 }}>
                                {a.name}
                              </span>
                            </div>
                            <span style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>{a.email}</span>
                            <span style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>{a.seatNumber || '—'}</span>
                            <span style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>{formatDate(a.registeredAt)}</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '4px 12px', borderRadius: 9999, fontSize: 12,
                              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                              background:
                                a.attendeeStatus === 'rejected' ? 'rgba(239,68,68,0.2)' :
                                a.paymentStatus === 'confirmed' ? 'rgba(34,197,94,0.2)' :
                                a.paymentStatus === 'rejected' ? 'rgba(239,68,68,0.2)' :
                                'rgba(168,85,247,0.2)',
                              color:
                                a.attendeeStatus === 'rejected' ? '#fca5a5' :
                                a.paymentStatus === 'confirmed' ? '#86efac' :
                                a.paymentStatus === 'rejected' ? '#fca5a5' :
                                '#d8b4fe',
                            }}>
                              {a.attendeeStatus === 'rejected' ? 'Rejected' : a.paymentStatus === 'confirmed' ? 'Confirmed' : a.paymentStatus === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8 }}>
                                {a.attendeeStatus === 'rejected' ? (
                                  <>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      color: '#4b5563', fontSize: 12, fontStyle: 'italic',
                                    }}>
                                      <AlertCircle size={13} style={{ color: '#4b5563' }} />
                                      Rejected
                                    </span>
                                    {a.rejectionNote && (
                                      <button
                                        onClick={() => handleViewRejectionNote(a.rejectionNote)}
                                        title="View rejection note"
                                        style={{
                                          width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                          border: '1px solid rgba(99,102,241,0.3)',
                                          background: 'rgba(99,102,241,0.08)', color: '#a5b4fc',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                                      >
                                        <MessageCircle size={14} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    onClick={() => openRejectModal(a)}
                                    title="Reject attendee"
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 6,
                                      padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                                      border: '1px solid rgba(239,68,68,0.3)',
                                      background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                                      fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                                      whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                  >
                                    <X size={13} /> Reject
                                  </button>
                                )}
                              </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ ANALYTICS ══ */}
                {activeTab === 'analytics' && (
                  <div className={s.cardFlat} style={{ textAlign: 'center', padding: '64px 48px' }}>
                    <BarChart3 size={52} style={{ margin: '0 auto 16px', opacity: 0.35, color: '#9ca3af' }} />
                    <p style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Analytics Coming Soon</p>
                    <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>Detailed insights about your event will appear here</p>
                  </div>
                )}

              </>
            )}
          </div>

        </div>
      </div>

      {/* ── Image preview modal (fixed) ── */}
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
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Reject attendee modal ── */}
      {showRejectModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              background: '#13131f', borderRadius: 16, padding: '32px',
              border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 480,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
              Reject Attendee
            </h2>
            <p style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 24 }}>
              Please provide a reason for rejecting <strong style={{ color: '#e5e7eb' }}>{selectedAttendeeForReject?.name}</strong>.
              They will be notified with this message.
            </p>
            <textarea
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder="e.g. Payment proof was invalid or unclear..."
              rows={4}
              style={{
                width: '100%', borderRadius: 10, padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectionNote(''); }}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: '#d1d5db',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectAttendee}
                disabled={rejecting || !rejectionNote.trim()}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: rejecting || !rejectionNote.trim() ? 'rgba(239,68,68,0.4)' : '#ef4444',
                  color: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14,
                  cursor: rejecting || !rejectionNote.trim() ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
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
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowRejectionNoteView(false)}
        >
          <div
            style={{
              background: '#13131f', borderRadius: 16, padding: '32px',
              border: '1px solid rgba(239,68,68,0.2)', width: '100%', maxWidth: 440,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#fca5a5', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, margin: 0 }}>
                Rejection Reason
              </h2>
              <button
                onClick={() => setShowRejectionNoteView(false)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{
              color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.6,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 10, padding: '14px 16px', margin: 0,
            }}>
              {selectedRejectionNote}
            </p>
            <button
              onClick={() => setShowRejectionNoteView(false)}
              style={{
                marginTop: 20, width: '100%', padding: '11px',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: '#d1d5db',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      <Modal
        isOpen={showDeleteModal}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        isDanger={true} isLoading={deleting}
        onConfirm={confirmDelete} onCancel={() => setShowDeleteModal(false)}
      />

      {/* ── Unpublish modal ── */}
      <Modal
        isOpen={showUnpublishModal}
        title="Unpublish Event"
        message="Are you sure you want to unpublish this event? It will become a draft and won't be visible to others."
        confirmText="Unpublish" cancelText="Cancel"
        isDanger={true} isLoading={unpublishing}
        onConfirm={confirmUnpublish} onCancel={() => setShowUnpublishModal(false)}
      />
    </div>
  );
}