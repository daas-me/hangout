import { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../../shared/components/Navbar';
import { Search, Calendar, MapPin, Users, Filter, Binoculars, Clock, Heart } from 'lucide-react';
import { getDiscoverEvents } from './discoverApi';
import { addFavorite, removeFavorite, checkIsFavorite } from '../events/favoriteApi';
import { getTimeLabel } from '../../shared/utils/timeFormatter';
import { Modal } from '../../shared/components/Modal';
import { Toast } from '../../shared/components/Toast';
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
  const [favoriteStates, setFavoriteStates] = useState({}); // { eventId: liked }
  const [toasts, setToasts] = useState([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState('');

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const isEventCompleted = useCallback((event) => {
    if (event?.eventStatus === 'completed') return true;
    if (!event?.date) return false;
    if (event?.endTime) return new Date(`${event.date} ${event.endTime}`) < new Date();
    if (event?.startTime) return new Date(`${event.date} ${event.startTime}`) < new Date();
    return new Date(`${event.date} 23:59`) < new Date();
  }, []);

  const filterCompletedEvents = useCallback(
    (events) => events.filter(event => !isEventCompleted(event)),
    [isEventCompleted]
  );

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setError(null);
    getDiscoverEvents({ search, filter })
      .then(data => setEvents(filterCompletedEvents(data)))
      .catch(() => setError('Could not load HangOuts. Please try again.'))
      .finally(() => setLoading(false));
  }, [search, filter, filterCompletedEvents]);

  // Initial fetch on mount or when search/filter changes
  // Debounce search changes to avoid hammering the backend
  useEffect(() => {
    const t = setTimeout(fetchEvents, 500);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  // Auto-refresh every 60 seconds with smarter caching
  useEffect(() => {
    let refreshInterval;
    let failureCount = 0;
    const maxFailures = 3;

    const performRefresh = () => {
      // Don't refresh if user is typing in search
      getDiscoverEvents({ search, filter })
        .then(data => setEvents(filterCompletedEvents(data)))
        .then(() => {
          failureCount = 0; // Reset on success
        })
        .catch(err => {
          console.warn('[DiscoverPage] Auto-refresh failed:', err);
          failureCount++;
          if (failureCount >= maxFailures) {
            console.warn('[DiscoverPage] Stopping auto-refresh after repeated failures');
            clearInterval(refreshInterval);
          }
        });
    };

    // Only refresh after 60 seconds, not immediately
    const initialDelay = setTimeout(() => {
      refreshInterval = setInterval(performRefresh, 60000);
    }, 60000);
    
    return () => {
      clearTimeout(initialDelay);
      clearInterval(refreshInterval);
    };
  }, [search, filter, filterCompletedEvents]);

  // Check favorite status for all events when they load
  useEffect(() => {
    if (!user || events.length === 0) {
      setFavoriteStates({});
      return;
    }

    const checkFavorites = async () => {
      const states = {};
      try {
        for (const event of events) {
          try {
            const response = await checkIsFavorite(event.id);
            states[event.id] = response.isFavorite === true;
          } catch (err) {
            console.warn(`Failed to check favorite for event ${event.id}:`, err);
            states[event.id] = false;
          }
        }
        setFavoriteStates(states);
      } catch (err) {
        console.error('Failed to check favorites:', err);
      }
    };

    checkFavorites();
  }, [events, user]);

  const handleFavoriteToggle = async (event) => {
    if (!user) {
      addToast('Please log in to save favorites', 'warning');
      return;
    }

    const eventId = event.id;
    const isLiked = favoriteStates[eventId];
    const newState = !isLiked;

    // Optimistic update
    setFavoriteStates(prev => ({ ...prev, [eventId]: newState }));

    try {
      if (newState) {
        await addFavorite(eventId);
        addToast('Added to favorites', 'success');
      } else {
        await removeFavorite(eventId);
        addToast('Removed from favorites', 'success');
      }
    } catch (err) {
      // Revert on error
      setFavoriteStates(prev => ({ ...prev, [eventId]: isLiked }));

      if (err.status === 409 || err.message?.includes('409')) {
        const message = err.error?.message || 'You can only save up to 10 events';
        setLimitModalMessage(message);
        setShowLimitModal(true);
      } else {
        addToast(err.error?.message || 'Failed to update favorite', 'error');
      }
    }
  };

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
              placeholder="Search HangOuts..."
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
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={() => onViewEvent(event)}
                liked={favoriteStates[event.id]}
                onFavoriteToggle={() => handleFavoriteToggle(event)}
              />
            ))}
          </div>
        )}

        {/* Toast Notifications */}
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            />
          ))}
        </div>

        {/* Limit Exceeded Modal */}
        <Modal
          isOpen={showLimitModal}
          title="Favorites Limit Reached"
          message={limitModalMessage}
          confirmText="OK"
          cancelText=""
          onConfirm={() => setShowLimitModal(false)}
          onCancel={() => setShowLimitModal(false)}
        />
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
        {hasQuery ? 'No results found' : 'No HangOuts yet'}
      </p>
      <p className={s.emptySub}>
        {hasQuery
          ? 'Try adjusting your search or filter to find something.'
          : 'Check back soon — HangOuts will appear here once they are created.'}
      </p>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, onClick, liked, onFavoriteToggle }) {
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
        <button
          className={s.favoriteBtn}
          onClick={e => {
            e.stopPropagation();
            onFavoriteToggle?.();
          }}
          title={liked ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={20}
            style={{
              fill: liked ? '#ec4899' : 'none',
              color: liked ? '#ec4899' : '#fff',
              transition: 'all 0.2s'
            }}
          />
        </button>
      </div>

      <div className={s.cardBody}>
        <h3 className={s.cardTitle}>{event.title}</h3>
        <div className={s.cardMeta}>
          <div className={s.metaRow}>
            <Calendar className={s.metaIcon} />
            <span>{event.date}</span>
          </div>
          <div className={s.metaRow}>
            <Clock className={s.metaIcon} />
            <span>{getTimeLabel(event)}</span>
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