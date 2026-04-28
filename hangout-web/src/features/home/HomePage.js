import { useEffect, useState } from 'react';
import { Navbar } from '../../shared/components/Navbar';
import { Calendar, MapPin, Users, Flame, TrendingUp, Plus, Search, LayoutGrid, Tent, SunMoon, Clock } from 'lucide-react';
import { getHostingEvents, getTodayEvents, getCalculatedActivityStats } from './homeApi';
import s from '../../styles/HomePage.module.css';

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d     = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth()    &&
    d.getDate()     === today.getDate()
  );
}

function formatTo12Hour(time24) {
  if (!time24 || time24 === '—') return '—';
  const [hours, minutes] = time24.split(':');
  if (!hours || !minutes) return time24;
  
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  
  if (isNaN(h) || isNaN(m)) return time24;
  
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12; // Convert 0 to 12, keep others
  
  return `${displayHours}:${String(m).padStart(2, '0')} ${ampm}`;
}

function normalise(event) {
  // Build time range: prefer start/end times, fallback to time, then default to '—'
  let timeDisplay = '—';
  if (event.startTime && event.endTime) {
    const startFormatted = formatTo12Hour(event.startTime);
    const endFormatted = formatTo12Hour(event.endTime);
    timeDisplay = `${startFormatted} – ${endFormatted}`;
  } else if (event.startTime) {
    timeDisplay = formatTo12Hour(event.startTime);
  } else if (event.time) {
    timeDisplay = formatTo12Hour(event.time);
  }
  
  return {
    id:           event.id,
    title:        event.title        || 'Untitled Event',
    date:         event.date         || '—',
    time:         timeDisplay,
    location:     event.location     || 'Location not set',
    format:       event.format       || '—',
    imageUrl:     event.imageUrl     || null,
    isTrending:   event.isTrending   || false,
    price:        event.price        ?? 0,
    attendeesLabel: (() => {
      if (typeof event.attendees === 'object' && event.attendees !== null)
        return `${event.attendees.current ?? 0} attending`;
      if (typeof event.attendees === 'number')
        return `${event.attendees} attending`;
      return '0 attending';
    })(),
    attendeeCount: (() => {
      if (typeof event.attendeeCount === 'number') return event.attendeeCount;
      if (typeof event.attendees === 'object') return event.attendees?.current ?? 0;
      if (typeof event.attendees === 'number') return event.attendees;
      return 0;
    })(),
    capacity: event.capacity ?? event.attendees?.max ?? 0,
  };
}

export default function HomePage({ user, onLogout, onNavigate, hostedEvents = [], onViewEvent }) {
  const [apiHostingEvent, setApiHostingEvent] = useState(null);
  const [apiTodayEvents,  setApiTodayEvents]  = useState([]);
  const [stats,           setStats]           = useState(null);

  const [loadingHosting, setLoadingHosting] = useState(true);
  const [loadingToday,   setLoadingToday]   = useState(true);
  const [loadingStats,   setLoadingStats]   = useState(true);

  useEffect(() => {
    getHostingEvents()
      .then(events => {
        // Filter to only show published (non-draft) events
        const publishedEvents = events.filter(e => e.isDraft !== true);
        setApiHostingEvent(publishedEvents[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingHosting(false));

    getTodayEvents()
      .then(setApiTodayEvents)
      .catch(() => {})
      .finally(() => setLoadingToday(false));

    getCalculatedActivityStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [hostedEvents]);

  // Only published (non-draft) local events for the "You're Hosting" card
  const publishedLocal = hostedEvents.filter(e => e.isDraft !== true);
  
  // Local published events happening today
  const localTodayEvents = publishedLocal.filter(e => {
    if (e._rawDate) return isToday(e._rawDate);
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    return e.date === todayStr;
  });

  // Merge today events — local published first, then API (deduplicated)
  const todayEvents = [
    ...localTodayEvents,
    ...apiTodayEvents.filter(e => !localTodayEvents.find(l => l.id === e.id)),
  ];

  // First published local event for the You're Hosting card
  const localHostingEvent = publishedLocal[0] ?? null;

  return (
    <div className={s.page}>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} activePage="home"/>

      <main className={s.main}>

        {/* Welcome Header */}
        <div className={s.welcomeBlock}>
          <h1 className={s.welcomeTitle}>
            Welcome back,{' '}
            <span className={s.welcomeName}>{user?.firstname ?? 'there'}</span>
          </h1>
          <p className={s.welcomeSub}>Here's what's happening in your network</p>
        </div>

        <div className={s.grid}>

          {/* Left Column */}
          <div className={s.leftCol}>

            {/* You're Hosting — only shows published events */}
            <div className={s.panel}>
              <div className={s.panelHeader}>
                <h3 className={s.panelTitle}>You're Hosting</h3>
                <button className={s.manageBtn} onClick={() => onNavigate?.('my-hangouts')}>Manage</button>
              </div>
              {localHostingEvent ? (
                <HostingCard event={normalise(localHostingEvent)} onClick={() => onViewEvent(localHostingEvent)} />
              ) : loadingHosting ? (
                <HostingSkeleton />
              ) : apiHostingEvent ? (
                <HostingCard event={normalise(apiHostingEvent)} onClick={() => onViewEvent(apiHostingEvent)} />
              ) : (
                <EmptyHosting onNavigate={onNavigate} />
              )}
            </div>

            {/* Happening Today */}
            <div className={s.panel}>
              <div className={s.todayHeader}>
                <Flame style={{ width: 24, height: 24, color: '#FF6900' }} />
                <h3 className={s.panelTitle}>Happening Today</h3>
              </div>

              {loadingToday && localTodayEvents.length === 0 ? (
                <div className={s.todaySkeletons}>
                  {[1, 2].map(n => <TodaySkeleton key={n} />)}
                </div>
              ) : todayEvents.length === 0 ? (
                <EmptyToday onNavigate={onNavigate} />
              ) : (
                <div className={s.todayList}>
                  {todayEvents.map((event, index) => (
                    <TodayCard key={event.id} event={normalise(event)} isFirst={index === 0} onClick={() => onViewEvent?.(event)} />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar */}
          <div className={s.rightCol}>

            {/* Your Activity */}
            <div className={s.panelSm}>
              <h3 className={s.panelTitleSm}>Your Activity</h3>
              <div className={s.statList}>
                <StatRow icon={Calendar}   label="Hosting"         value={publishedLocal.length || stats?.hostingCount}   loading={loadingStats && !publishedLocal.length} />
                <StatRow icon={Users}      label="Attending"       value={stats?.attendingCount} loading={loadingStats} />
                <StatRow icon={TrendingUp} label="Total Attendees" value={stats?.totalAttendees} loading={loadingStats} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className={s.panelSm}>
              <h3 className={s.panelTitleSm}>Quick Actions</h3>
              <div className={s.actionList}>
                <button className={s.actionBtnPrimary} onClick={() => onNavigate?.('create')}>
                  <Plus style={{ width: 16, height: 16 }} />
                  <span>Create New HangOut</span>
                </button>
                <button className={s.actionBtnSecondary} onClick={() => onNavigate?.('discover')}>
                  <Search style={{ width: 16, height: 16 }} />
                  <span>Discover HangOuts</span>
                </button>
                <button className={s.actionBtnSecondary} onClick={() => onNavigate?.('my-hangouts')}>
                  <LayoutGrid style={{ width: 16, height: 16 }} />
                  <span>My HangOuts</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function HostingSkeleton() {
  return (
    <div className={s.skeletonHosting}>
      <div className={s.skeletonImg} />
      <div className={s.skeletonContent}>
        <div className={s.skeletonLine} style={{ width: '60%', height: 22 }} />
        <div className={s.skeletonLine} style={{ width: '40%', height: 16 }} />
        <div className={s.skeletonLine} style={{ width: '50%', height: 16 }} />
        <div className={s.skeletonLine} style={{ width: '30%', height: 16 }} />
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className={s.skeletonToday}>
      <div className={s.skeletonImg} />
      <div className={s.skeletonContent}>
        <div className={s.skeletonLine} style={{ width: '55%', height: 20 }} />
        <div className={s.skeletonLine} style={{ width: '40%', height: 14 }} />
        <div className={s.skeletonLine} style={{ width: '35%', height: 14 }} />
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, loading }) {
  return (
    <div className={s.statRow}>
      <div className={s.statIcon}>
        <Icon style={{ width: 24, height: 24, color: 'white' }} />
      </div>
      <div>
        <p className={s.statLabel}>{label}</p>
        {loading
          ? <div className={s.statSkeleton} />
          : <p className={s.statValue}>{value ?? '0'}</p>
        }
      </div>
    </div>
  );
}

function HostingCard({ event, onClick }) {
  return (
    <div className={s.hostingCard} onClick={onClick}>
      <div className={s.hostingImgWrap}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.hostingImg} />
          : <div className={s.hostingImgFallback} />
        }
        <div className={s.hostingOverlay} />
      </div>
      <div className={s.hostingContent}>
        <h4 className={s.hostingTitle}>{event.title}</h4>
        <div className={s.hostingMeta}>
          <div className={s.hostingMetaRow}>
            <Calendar style={{ width: 16, height: 16 }} />
            <span className={s.hostingMetaText}>{event.date}</span>
          </div>
          <div className={s.hostingMetaRow}>
            <Clock style={{ width: 16, height: 16 }} />
            <span className={s.hostingMetaText}>{event.time}</span>
          </div>
          <div className={s.hostingMetaRow}>
            <MapPin style={{ width: 16, height: 16 }} />
            <span className={s.hostingMetaText}>{event.location}</span>
          </div>
          <div className={s.hostingMetaRow}>
            <Users style={{ width: 16, height: 16 }} />
            <span className={s.hostingMetaText}>{event.attendeeCount}/{event.capacity || '?'} attending</span>
          </div>
        </div>
        <div className={s.hostingFooter}>
          <span className={s.hostingPrice}>
            {!event.price || event.price === 0 ? 'FREE' : `₱${event.price}`}
          </span>
          <span className={s.hostingFormat}>{event.format}</span>
        </div>
      </div>
    </div>
  );
}

function TodayCard({ event, isFirst, onClick }) {
  return (
    <div className={s.todayCard} onClick={onClick}>
      <div className={s.todayImgWrap}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.todayImg} />
          : <div className={s.todayImgFallback} />
        }
        <div className={s.todayOverlay} />
        {event.isTrending && isFirst && (
          <div className={s.trendingBadge}>
            <Flame style={{ width: 16, height: 16, color: 'white' }} />
            <span className={s.trendingText}>TRENDING</span>
          </div>
        )}
      </div>
      <div className={s.todayContent}>
        <h4 className={s.todayTitle}>{event.title}</h4>
        <div className={s.todayMetaGrid}>
          <div className={s.todayMetaItem}>
            <Clock style={{ width: 14, height: 14 }} />
            <span className={s.todayMetaText}>{event.time}</span>
          </div>
          <div className={s.todayMetaItem}>
            <MapPin style={{ width: 14, height: 14 }} />
            <span className={s.todayMetaText}>{event.location}</span>
          </div>
        </div>
        <div className={s.todayFooter}>
          <div className={s.todayAttendees}>
            <Users style={{ width: 14, height: 14 }} />
            <span className={s.todayAttendeesText}>{event.attendeesLabel}</span>
          </div>
          <div className={s.todayPriceRow}>
            {!event.price || event.price === 0
              ? <span className={s.priceFree}>FREE</span>
              : <span className={s.pricePaid}>₱{event.price}</span>
            }
            <span className={s.formatBadge}>{event.format}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyHosting({ onNavigate }) {
  return (
    <div className={s.emptyState}>
      <div className={s.emptyIconWrap}>
        <Tent style={{ width: 32, height: 32, color: '#a855f7' }} />
      </div>
      <p className={s.emptyTitle}>No HangOuts Yet</p>
      <p className={s.emptySubtext}>You're not hosting any events at the moment.</p>
      <button className={s.emptyBtn} onClick={() => onNavigate?.('create')}>+ Create a HangOut</button>
    </div>
  );
}

function EmptyToday({ onNavigate }) {
  return (
    <div className={s.emptyState}>
      <div className={s.emptyIconWrap}>
        <SunMoon style={{ width: 32, height: 32, color: '#a855f7' }} />
      </div>
      <p className={s.emptyTitle}>Nothing Happening Today</p>
      <p className={s.emptySubtext}>No events scheduled for today. Check back later or discover new HangOuts.</p>
      <button className={s.emptyBtn} onClick={() => onNavigate?.('discover')}>Discover HangOuts</button>
    </div>
  );
}