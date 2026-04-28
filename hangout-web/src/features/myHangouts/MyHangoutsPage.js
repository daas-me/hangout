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
import HostEventDashboard from '../events/HostEventDashboard';
import AttendingEventDashboard from '../events/AttendingEventDashboard';
import AttendingCard from './AttendingCard';
import s from '../../styles/MyHangOutsPage.module.css';

export default function MyHangoutsPage({ user, onLogout, onNavigate, hostedEvents = [], onEditEvent, onViewEvent }) {
  const [tab,             setTab]             = useState('hosting');
  const [search,          setSearch]          = useState('');
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
      await Promise.all([fetchHostingEvents(), fetchAttendingEvents()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

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

  const tabs = [
    { key: 'hosting',   label: `Hosting (${allHosting.length})`    },
    { key: 'attending', label: `Attending (${apiAttending.length})` },
    { key: 'favorites', label: `Favorites (0)`                      },
  ];

  const q = search.toLowerCase();
  const filteredHosting   = allHosting.filter(e => e.title?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
  const filteredAttending = apiAttending.filter(e => e.title?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
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
        onBack={() => setViewingAttendingEvent(null)}
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

function HostingCard({ event, onDelete, onEdit, onView, onPublish, onRefresh }) {
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

  return (
    <div className={`${s.card} ${isDraft ? s.cardDraft : ''}`}>
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
          <h3 className={s.cardTitle}>{event.title}</h3>
          {isDraft && (
            <span className={s.draftBadge}>
              <span className={s.draftDot} />
              Draft
            </span>
          )}
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

        <Modal
          isOpen={showPublishModal}
          title="Publish Event"
          message="Are you ready to publish this event? It will become visible to everyone and they'll be able to see and RSVP."
          confirmText="Publish"
          cancelText="Cancel"
          isDanger={false}
          isLoading={publishing}
          onConfirm={handlePublish}
          onCancel={() => setShowPublishModal(false)}
        />

        <Modal
          isOpen={showDeleteModal}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone and all associated data will be permanently removed."
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