import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../../shared/components/Navbar';
import { Modal } from '../../shared/components/Modal';
import {
  Search, Calendar, MapPin, Users, PhilippinePeso,
  Eye, Edit, Trash2, Heart, Tent, CalendarOff, Star,
  Upload, Clock
} from 'lucide-react';
import { getHostingEvents, deleteEvent, getAttendingEvents } from '../home/homeApi';
import { publishEvent } from '../events/eventsApi';
import { getTimeLabel } from '../../shared/utils/timeFormatter';
import { STATUS_CONFIG } from '../../shared/config/statusConfig';
import HostEventDashboard from '../events/HostEventDashboard';
import AttendingEventDashboard from '../events/AttendingEventDashboard';
import AttendingCard from './AttendingCard';
import s from '../../styles/MyHangOutsPage.module.css';

export default function MyHangoutsPage({ user, onLogout, onNavigate, hostedEvents = [], onEditEvent, onViewEvent }) {
  const [tab,             setTab]             = useState('hosting');
  const [search,          setSearch]          = useState('');
  const [hostingFilter,   setHostingFilter]   = useState('published');
  const [attendingFilter, setAttendingFilter] = useState('confirmed');
  const [apiHosting,      setApiHosting]      = useState([]);
  const [apiAttending,    setApiAttending]    = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [managingEvent,   setManagingEvent]   = useState(null);
  const [viewingAttendingEvent, setViewingAttendingEvent] = useState(null);

  const fetchHostingEvents = async () => {
    try {
      const data = await getHostingEvents(true);
      setApiHosting(data);
    } catch (err) {
      console.error('Failed to fetch hosting events:', err);
      setApiHosting([]);
    }
  };

  const fetchAttendingEvents = async () => {
    try {
      const data = await getAttendingEvents(true);
      setApiAttending(data);
    } catch (err) {
      console.error('Failed to fetch attending events:', err);
      setApiAttending([]);
    }
  };

  const fetchAllEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Use cache on initial load (refresh=false), only force refresh on manual actions
      await Promise.all([fetchHostingEvents(), fetchAttendingEvents()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  // Auto-refresh every 30 seconds with cache (NOT forcing refresh)
  // Only refresh if data is stale, don't spam the backend
  useEffect(() => {
    let refreshInterval;
    let failureCount = 0;
    const maxFailures = 3;

    const performRefresh = () => {
      Promise.all([
        (async () => {
          try {
            // Don't force refresh - use cache if available
            const data = await getHostingEvents(false);
            setApiHosting(data);
          } catch (err) {
            console.warn('[MyHangoutsPage] Failed to refresh hosting:', err);
            throw err;
          }
        })(),
        (async () => {
          try {
            // Don't force refresh - use cache if available
            const data = await getAttendingEvents(false);
            setApiAttending(data);
          } catch (err) {
            console.warn('[MyHangoutsPage] Failed to refresh attending:', err);
            throw err;
          }
        })(),
      ])
        .then(() => {
          failureCount = 0; // Reset on success
        })
        .catch(err => {
          failureCount++;
          // Stop immediately on auth errors
          if (err.message?.includes('401') || err.message?.includes('Authentication')) {
            console.warn('[MyHangoutsPage] Auth error - stopping auto-refresh');
            clearInterval(refreshInterval);
            return;
          }
          if (failureCount >= maxFailures) {
            console.warn('[MyHangoutsPage] Stopping auto-refresh after repeated failures');
            clearInterval(refreshInterval);
          }
        });
    };

    // Start refresh after 30 seconds, then every 30 seconds
    refreshInterval = setInterval(performRefresh, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteEvent(id);
      await fetchHostingEvents();
    } catch (err) {
      console.error('Failed to delete:', err);
      throw err;
    }
  };

  const handlePublish = async (eventId) => {
    try {
      await publishEvent(eventId);
      await fetchHostingEvents();
    } catch (err) {
      console.error('Failed to refetch after publish:', err);
    }
  };

  const apiIds     = new Set(apiHosting.map(e => e.id));
  const newLocal   = hostedEvents.filter(e => !apiIds.has(e.id));
  const allHosting = [...newLocal, ...apiHosting];

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

  const isEventCompleted = (event) => {
    return event?.eventStatus === 'completed' || hasEventPassed(event);
  };

  const getAttendingStatus = (event) => {
    const rsvpStatus    = event.status || 'confirmed';
    const paymentStatus = event.paymentStatus || null;
    const isCancelledRsvp = rsvpStatus === 'cancelled';
    const isRejected  = rsvpStatus === 'rejected' || paymentStatus === 'rejected' || event.attendeeStatus === 'rejected';
    const isPending   = !isRejected && event.price != null && event.price > 0 && (rsvpStatus === 'registered' || paymentStatus === 'pending');
    const isConfirmed = !isPending && !isRejected && !isCancelledRsvp &&
                        (rsvpStatus === 'confirmed' || paymentStatus === 'confirmed');
    const eventPassed = hasEventPassed(event);

    if (isCancelledRsvp) return 'cancelled';
    if (isRejected) return 'rejected';
    if (isPending) return 'pending';
    if (eventPassed) return 'completed';
    if (isConfirmed) return 'confirmed';
    return 'unknown';
  };

  const hostingFilters = [
    { key: 'published', label: 'Published' },
    { key: 'draft',     label: 'Draft' },
    { key: 'completed', label: 'Completed' },
  ];

  const attendingFilters = [
    { key: 'all',       label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending',   label: 'Pending' },
    { key: 'rejected',  label: 'Rejected' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'completed', label: 'Completed' },
  ];

  const filterHostingEvent = (event) => {
    if (hostingFilter === 'published') return event.isDraft !== true && !isEventCompleted(event);
    if (hostingFilter === 'draft') return event.isDraft === true;
    if (hostingFilter === 'completed') return event.isDraft !== true && isEventCompleted(event);
    return false;
  };

  const filterAttendingEvent = (event) => {
    if (attendingFilter === 'all') return true;
    return getAttendingStatus(event) === attendingFilter;
  };

  const tabs = [
    { key: 'hosting',   label: `Hosting (${allHosting.length})`    },
    { key: 'attending', label: `Attending (${apiAttending.length})` },
    { key: 'favorites', label: `Favorites (0)`                      },
  ];

  const q = search.toLowerCase();
  const filteredHosting   = allHosting
    .filter(e => e.title?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q))
    .filter(filterHostingEvent);
  const filteredAttending = apiAttending
    .filter(e => e.title?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q))
    .filter(filterAttendingEvent);
  const filteredFavorites = [];

  if (managingEvent) {
    return (
      <HostEventDashboard
        event={managingEvent}
        onBack={() => setManagingEvent(null)}
        onEditEvent={onEditEvent}
        currentUser={user}
      />
    );
  }

  if (viewingAttendingEvent) {
    return (
      <AttendingEventDashboard
        event={viewingAttendingEvent}
        onBack={() => {
          setViewingAttendingEvent(null);
          fetchAttendingEvents(); // Refresh in case of status changes
        }}
        currentUser={user}
      />
    );
  }

  return (
    <div className={s.page}>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} activePage="my-hangouts" />

      <main className={s.main}>
        <h1 className={s.pageTitle}>My HangOuts</h1>

        <div className={s.searchWrap}>
          <Search className={s.searchIcon} />
          <input
            className={s.searchInput}
            type="text"
            placeholder="Search HangOuts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={s.tabs}>
          {tabs.map(t => (
            <button key={t.key} className={tab === t.key ? s.tabActive : s.tab} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'hosting' && (
          <div className={s.filterBar}>
            {hostingFilters.map(filter => (
              <button
                key={filter.key}
                type="button"
                className={hostingFilter === filter.key ? s.filterBtnActive : s.filterBtn}
                onClick={() => setHostingFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'attending' && (
          <div className={s.filterBar}>
            {attendingFilters.map(filter => (
              <button
                key={filter.key}
                type="button"
                className={attendingFilter === filter.key ? s.filterBtnActive : s.filterBtn}
                onClick={() => setAttendingFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {tab === 'hosting' && (
          <div className={s.list}>
            {loading ? (
              <><CardSkeleton /><CardSkeleton /></>
            ) : filteredHosting.length === 0 ? (
              <EmptyState tab="hosting" onNavigate={onNavigate} />
            ) : (
              filteredHosting.map(event => (
                <HostingCard
                  key={event.id}
                  event={event}
                  onDelete={handleDelete}
                  onEdit={() => onEditEvent?.(event)}
                  onView={() => setManagingEvent(event)}
                  onOpenEvent={() => onViewEvent(event)}
                  onPublish={handlePublish}
                  onRefresh={fetchHostingEvents}
                />
              ))
            )}
          </div>
        )}

        {tab === 'attending' && (
          <div className={s.list}>
            {loading ? (
              <><CardSkeleton /><CardSkeleton /></>
            ) : filteredAttending.length === 0 ? (
              <EmptyState tab="attending" onNavigate={onNavigate} />
            ) : (
              filteredAttending.map(event => (
                <AttendingCard 
                  key={event.id} 
                  event={event}
                  onViewDetails={() => setViewingAttendingEvent(event)}
                  onOpenEvent={() => onViewEvent(event)}
                  onEventCancelled={() => fetchAttendingEvents()}
                />
              ))
            )}
          </div>
        )}

        {tab === 'favorites' && (
          <div className={s.list}>
            {filteredFavorites.length === 0
              ? <EmptyState tab="favorites" onNavigate={onNavigate} />
              : filteredFavorites.map(event => <FavoriteCard key={event.id} event={event} />)
            }
          </div>
        )}
      </main>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className={s.skeletonCard}>
      <div className={s.skeletonImg} />
      <div className={s.skeletonDetails}>
        <div className={s.skeletonLine} style={{ width: '55%', height: 28 }} />
        <div className={s.skeletonGrid}>
          <div className={s.skeletonItem} /><div className={s.skeletonItem} />
          <div className={s.skeletonItem} /><div className={s.skeletonItem} />
        </div>
        <div className={s.skeletonActions}>
          <div className={s.skeletonBtn} style={{ flex: 1 }} />
          <div className={s.skeletonBtn} style={{ flex: 1 }} />
          <div className={s.skeletonBtnSm} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, accent }) {
  return (
    <div className={s.infoItem}>
      <div className={s.infoIconBox} style={accent ? { background: 'rgba(224,64,251,0.1)' } : {}}>
        <Icon className={s.infoIcon} style={accent ? { color: '#e040fb' } : {}} />
      </div>
      <div>
        <p className={s.infoLabel}>{label}</p>
        <p className={accent ? s.infoValuePrice : s.infoValue}>{value}</p>
      </div>
    </div>
  );
}

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

function HostingCard({ event, onDelete, onEdit, onView, onOpenEvent, onPublish, onRefresh }) {
  const attendeeCurrent = event.attendees?.current ?? event.attendeeCount ?? 0;
  const attendeeMax     = event.attendees?.max ?? event.capacity ?? '∞';
  const isDraft         = event.isDraft === true;
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await publishEvent(event.id);
      setShowPublishModal(false);
      onPublish?.(event.id);
      await onRefresh?.();
    } catch (err) {
      setPublishError('Failed to publish. Please try again.');
      console.error(err);
      setShowPublishModal(false);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(event.id);
      setShowDeleteModal(false);
      await onRefresh?.();
    } catch (err) {
      console.error(err);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

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

  const eventStatus = event.eventStatus || 'active';
  const isCompleted = !isDraft && (eventStatus === 'completed' || hasEventPassed(event));

  return (
    <div className={`${s.card} ${isDraft ? s.cardDraft : ''} ${isCompleted ? s.cardCompleted : ''}`}>
      <div className={s.imgWrap}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.img} />
          : <div className={s.imgDefault}><span className={s.imgDefaultText}>{event.title}</span></div>
        }
        <span className={s.formatBadge}>{event.format}</span>
        {isDraft && <div className={s.draftImgOverlay} />}
      </div>

      <div className={s.details}>
        <div className={s.cardTitleRow}>
          <button
            type="button"
            className={s.cardTitleLink}
            onClick={onOpenEvent}
            style={{ margin: 0, padding: 0, background: 'none', border: 'none', textAlign: 'left' }}
          >
            <span className={s.cardTitle} style={{ display: 'inline-block' }}>{event.title}</span>
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isDraft && (
              <span className={s.draftBadge}>
                <span className={s.draftDot} />
                Draft
              </span>
            )}
            {!isDraft && (
              <StatusBadge status={isCompleted ? 'completed' : 'published'} />
            )}
          </div>
        </div>
        <div className={s.infoGrid}>
          <InfoItem icon={Calendar}       label="Date" value={event.date} />
          <InfoItem icon={Clock}          label="Time" value={getTimeLabel(event)} />
          <InfoItem icon={MapPin}         label="Location"    value={event.location?.length > 30 ? event.location.substring(0, 30) + '…' : event.location} />
          <InfoItem icon={Users}          label="Attendees"   value={`${attendeeCurrent}/${attendeeMax}`} />
          <InfoItem icon={PhilippinePeso} label="Price"       value={event.price === 0 ? 'FREE' : `₱${event.price}`} accent />
        </div>
        <div className={s.actions}>
          {isDraft ? (
            <>
              <button className={s.btnEdit} onClick={onEdit} disabled={publishing || deleting}>
                <Edit size={18} /> Continue Editing
              </button>
              <button className={s.btnPublish} onClick={() => setShowPublishModal(true)} disabled={publishing || deleting}>
                <Upload size={18} /> {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </>
          ) : (
            <>
              <button className={s.btnManage} onClick={onView}><Eye size={18} /> Manage HangOut</button>
              <button className={s.btnEdit} onClick={onEdit}><Edit size={18} /> Edit HangOut</button>
            </>
          )}
          <button className={s.btnDelete} onClick={() => setShowDeleteModal(true)} disabled={publishing || deleting}><Trash2 size={18} /></button>
        </div>
        {publishError && <p className={s.errorMsg}>{publishError}</p>}

        {isCompleted && (
          <p className={s.completedNote}>
            This HangOut is completed. You can still edit it to reschedule for a future date.
          </p>
        )}

        <Modal
          isOpen={showPublishModal}
          title="Publish HangOut"
          message="Are you ready to publish this HangOut? It will become visible to everyone and they'll be able to see and RSVP."
          confirmText="Publish"
          cancelText="Cancel"
          isDanger={false}
          isLoading={publishing}
          onConfirm={handlePublish}
          onCancel={() => setShowPublishModal(false)}
        />

        <Modal
          isOpen={showDeleteModal}
          title="Delete HangOut"
          message="Are you sure you want to delete this HangOut? This action cannot be undone and all associated data will be permanently removed."
          confirmText="Delete"
          cancelText="Cancel"
          isDanger={true}
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      </div>
    </div>
  );
}

function FavoriteCard({ event }) {
  return (
    <div className={s.card}>
      <div className={s.imgWrap}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.img} />
          : <div className={s.imgDefault}><span className={s.imgDefaultText}>{event.title}</span></div>
        }
        <span className={s.formatBadge}>{event.format}</span>
      </div>
      <div className={s.details}>
        <h3 className={s.cardTitle}>{event.title}</h3>
        <div className={s.infoGrid}>
          <InfoItem icon={Calendar}       label="Date & Time" value={`${event.date} • ${getTimeLabel(event)}`} />
          <InfoItem icon={MapPin}         label="Location"    value={event.location} />
          <InfoItem icon={Users}          label="Attendees"   value={event.attendees} />
          <InfoItem icon={PhilippinePeso} label="Price"       value={event.price === 0 ? 'FREE' : `₱${event.price}`} accent />
        </div>
        <div className={s.actions}>
          <button className={s.btnEdit}><Eye size={18} /> View Details</button>
          <button className={s.btnFav}><Heart size={18} style={{ fill: '#ec4899', color: '#ec4899' }} /> Remove</button>
          <button className={s.btnManage}>RSVP Now</button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab, onNavigate }) {
  const config = {
    hosting:   { icon: Tent,        label: "No HangOuts yet",           sub: "You haven't created any HangOuts yet.",         btn: "Create HangOut",    nav: "create"   },
    attending: { icon: CalendarOff, label: "Not attending anything yet", sub: "You haven't RSVP'd to any HangOuts yet.",       btn: "Discover HangOuts", nav: "discover" },
    favorites: { icon: Star,        label: "No favorites yet",           sub: "Save events you love and they'll appear here.", btn: "Discover HangOuts", nav: "discover" },
  };
  const { icon: Icon, label, sub, btn, nav } = config[tab] ?? config.hosting;
  return (
    <div className={s.emptyState}>
      <div className={s.emptyIcon}><Icon style={{ width: 32, height: 32, color: '#a855f7' }} /></div>
      <h3 className={s.emptyTitle}>{label}</h3>
      <p className={s.emptySub}>{sub}</p>
      <button className={s.emptyBtn} onClick={() => onNavigate?.(nav)}>{btn}</button>
    </div>
  );
}