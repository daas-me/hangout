import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import {
  Search, Calendar, MapPin, Users, PhilippinePeso,
  Eye, Edit, Trash2, QrCode, Download, Heart, Tent, CalendarOff, Star
} from 'lucide-react';
import { getHostingEvents, deleteEvent } from '../api/home';
import s from '../styles/MyHangOutsPage.module.css';

export default function MyHangoutsPage({ user, onLogout, onNavigate, hostedEvents = [], onEditEvent, onViewEvent }) {
  const [tab,        setTab]        = useState('hosting');
  const [search,     setSearch]     = useState('');
  const [ticket,     setTicket]     = useState(null);
  const [apiHosting, setApiHosting] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    getHostingEvents()
      .then(data => setApiHosting(data))
      .catch(() => setApiHosting([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this HangOut?')) return;
    try {
      await deleteEvent(id);
      setApiHosting(prev => prev.filter(e => e.id !== id));
    } catch {
      alert('Failed to delete. Please try again.');
    }
  };

  const apiIds     = new Set(apiHosting.map(e => e.id));
  const newLocal   = hostedEvents.filter(e => !apiIds.has(e.id));
  const allHosting = [...newLocal, ...apiHosting];

  const tabs = [
    { key: 'hosting',   label: `Hosting (${allHosting.length})`  },
    { key: 'attending', label: `Attending (0)`                    },
    { key: 'favorites', label: `Favorites (0)`                    },
  ];

  const q = search.toLowerCase();
  const filteredHosting   = allHosting.filter(e => e.title?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q));
  const filteredAttending = [];
  const filteredFavorites = [];

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
                  onView={() => onViewEvent?.(event)}
                />
              ))
            )}
          </div>
        )}

        {tab === 'attending' && (
          <div className={s.list}>
            {filteredAttending.length === 0
              ? <EmptyState tab="attending" onNavigate={onNavigate} />
              : filteredAttending.map(event => (
                <AttendingCard key={event.id} event={event}
                  showTicket={ticket === event.id}
                  onToggleTicket={() => setTicket(ticket === event.id ? null : event.id)} />
              ))
            }
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

function HostingCard({ event, onDelete, onEdit, onView }) {
  const attendeeCurrent = event.attendees?.current ?? event.attendeeCount ?? 0;
  const attendeeMax     = event.attendees?.max ?? event.capacity ?? '∞';
  const time            = event.time ?? event.startTime ?? '—';
  const isDraft         = event.isDraft === true;

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
          <InfoItem icon={Calendar}       label="Date & Time" value={`${event.date} • ${time}`} />
          <InfoItem icon={MapPin}         label="Location"    value={event.location?.length > 30 ? event.location.substring(0, 30) + '…' : event.location} />
          <InfoItem icon={Users}          label="Attendees"   value={`${attendeeCurrent}/${attendeeMax}`} />
          <InfoItem icon={PhilippinePeso} label="Price"       value={event.price === 0 ? 'FREE' : `₱${event.price}`} accent />
        </div>
        <div className={s.actions}>
          {!isDraft && (
            <button className={s.btnManage} onClick={onView}><Eye size={18} /> Manage HangOut</button>
          )}
          <button className={s.btnEdit} onClick={onEdit}><Edit size={18} /> {isDraft ? 'Continue Editing' : 'Edit HangOut'}</button>
          <button className={s.btnDelete} onClick={() => onDelete(event.id)}><Trash2 size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function AttendingCard({ event, showTicket, onToggleTicket }) {
  return (
    <div className={s.cardGroup}>
      <div className={s.card}>
        <div className={s.imgWrap}>
          {event.imageUrl
            ? <img src={event.imageUrl} alt={event.title} className={s.img} />
            : <div className={s.imgDefault}><span className={s.imgDefaultText}>{event.title}</span></div>
          }
          <span className={s.confirmedBadge}>Confirmed</span>
        </div>
        <div className={s.details}>
          <h3 className={s.cardTitle}>{event.title}</h3>
          <div className={s.infoGrid}>
            <InfoItem icon={Calendar} label="Date & Time" value={`${event.date} • ${event.time}`} />
            <InfoItem icon={MapPin}   label="Location"    value={event.location} />
            <div className={s.ticketBox}><p className={s.ticketLabel}>Your Seat</p><p className={s.ticketSeat}>{event.seat}</p></div>
            <div className={s.ticketBox}><p className={s.ticketLabel}>Ticket #</p><p className={s.ticketNum}>{event.ticketNumber}</p></div>
          </div>
          <div className={s.actions}>
            <button className={s.btnManage} onClick={onToggleTicket}>
              <QrCode size={18} />{showTicket ? 'Hide E-Ticket' : 'View E-Ticket'}
            </button>
            <button className={s.btnIcon}><Download size={18} /></button>
          </div>
        </div>
      </div>
      {showTicket && (
        <div className={s.eticket}>
          <div className={s.eticketInner}>
            <div className={s.qrWrap}>
              <div className={s.qrBox}><QrCode style={{ width: '100%', height: '100%', color: '#1a1a2e' }} /></div>
              <p className={s.qrHint}>Scan this at the entrance</p>
            </div>
            <div className={s.eticketInfo}>
              <h4 className={s.eticketTitle}>{event.title}</h4>
              <p className={s.eticketSub}>Your electronic ticket</p>
              <div className={s.eticketGrid}>
                <div><p className={s.etLabel}>Ticket Number</p><p className={s.etValue}>{event.ticketNumber}</p></div>
                <div><p className={s.etLabel}>Seat</p><p className={s.etValue}>{event.seat}</p></div>
                <div><p className={s.etLabel}>Date</p><p className={s.etValue}>{event.date}</p></div>
                <div><p className={s.etLabel}>Time</p><p className={s.etValue}>{event.time}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
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
          <InfoItem icon={Calendar}       label="Date & Time" value={`${event.date} • ${event.time}`} />
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