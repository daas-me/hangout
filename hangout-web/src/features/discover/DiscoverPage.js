import { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../../shared/components/Navbar';
import { Search, Calendar, MapPin, Users, Filter, Binoculars } from 'lucide-react';
import { getDiscoverEvents } from './discoverApi';
import s from '../../styles/DiscoverPage.module.css';

const FILTERS = [
  { key: 'all',        label: 'All'        },
  { key: 'free',       label: 'Free'       },
  { key: 'paid',       label: 'Paid'       },
  { key: 'today',      label: 'Today'      },
  { key: 'this_week',  label: 'This Week'  },
  { key: 'this_month', label: 'This Month' },
];

export default function DiscoverPage({ user, onLogout, onNavigate, onViewEvent }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setError(null);
    getDiscoverEvents({ search, filter })
      .then(setEvents)
      .catch(() => setError('Could not load events. Please try again.'))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(fetchEvents, 300);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  return (
    <div className={s.page}>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} activePage="discover" />

      <main className={s.main}>

        <h1 className={s.pageTitle}>Discover</h1>

        <div className={s.searchRow}>
          <div className={s.searchWrap}>
            <Search className={s.searchIcon} />
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search Events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className={s.filterBtn}>
              <Filter className={s.filterIcon} />
            </button>
          </div>
        </div>

        <div className={s.pills}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={filter === f.key ? s.pillActive : s.pill}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={s.skeleton} />
            ))}
          </div>
        ) : error ? (
          <div className={s.errorState}>{error}</div>
        ) : events.length === 0 ? (
          <EmptyDiscover search={search} filter={filter} />
        ) : (
          <div className={s.grid}>
            {events.map(event => (
              <EventCard key={event.id} event={event} onClick={() => onViewEvent(event)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyDiscover({ search, filter }) {
  const hasQuery = search.trim().length > 0 || filter !== 'all';
  return (
    <div className={s.emptyState}>
      <div className={s.emptyIconWrap}>
        <Binoculars style={{ width: 32, height: 32, color: '#a855f7' }} />
      </div>
      <p className={s.emptyTitle}>
        {hasQuery ? 'No results found' : 'No events yet'}
      </p>
      <p className={s.emptySub}>
        {hasQuery
          ? 'Try adjusting your search or filter to find something.'
          : 'Check back soon — events will appear here once they are created.'}
      </p>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, onClick }) {
  return (
    <div className={s.card} onClick={onClick}>
      <div className={s.cardImgWrap}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.cardImg} />
          : <div className={s.cardImgDefault}>
              <span className={s.cardImgDefaultText}>{event.title}</span>
            </div>
        }
        <span className={s.formatBadge}>{event.format}</span>
      </div>

      <div className={s.cardBody}>
        <h3 className={s.cardTitle}>{event.title}</h3>
        <div className={s.cardMeta}>
          <div className={s.metaRow}>
            <Calendar className={s.metaIcon} />
            <span>{event.date}</span>
          </div>
          <div className={s.metaRow}>
            <MapPin className={s.metaIcon} />
            <span>{event.location}</span>
          </div>
          <div className={s.metaRow}>
            <Users className={s.metaIcon} />
            <span>{event.attendeeCount}/{event.capacity} attending</span>
          </div>
        </div>
      </div>

      <div className={s.cardFooter}>
        {event.price === 0
          ? <span className={s.priceFree}>FREE</span>
          : <span className={s.pricePaid}>₱{event.price}</span>
        }
          <button className={s.viewBtn} onClick={e => { e.stopPropagation(); onClick?.(); }}>View →</button>
        </div>      
    </div>
  );
}