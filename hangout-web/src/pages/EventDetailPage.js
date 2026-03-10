import { useState } from 'react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Ticket,
  Tag, Armchair, CreditCard, Heart, Share2, HelpCircle,
  CheckCircle2, ExternalLink
} from 'lucide-react';
import s from '../styles/EventDetail.module.css';

export default function EventDetailPage({ event, onBack, currentUser }) {
  const [liked,  setLiked]  = useState(false);
  const [rsvped, setRsvped] = useState(false);

  if (!event) return null;

  const attendeeCurrent = event.attendees?.current ?? event.attendeeCount ?? 0;
  const attendeeMax     = event.capacity ?? event.attendees?.max ?? 100;
  const capPct          = Math.min(100, Math.round((attendeeCurrent / attendeeMax) * 100));
  const seatsLeft       = attendeeMax - attendeeCurrent;

  const hostFirst = event.hostFirstName ?? event.host?.firstname ?? currentUser?.firstname ?? 'Host';
  const hostLast  = event.hostLastName  ?? event.host?.lastname  ?? currentUser?.lastname  ?? '';
  const hostEmail = event.hostEmail     ?? event.host?.email     ?? 'host@example.com';
  const initials  = (hostFirst[0] ?? '') + (hostLast[0] ?? '') || 'HO';

  const formatLabel = event.format ?? 'In-Person';
  const isPaid      = (event.price ?? 0) > 0;

  const fmtDate = (d) => {
    if (!d) return 'Date TBD';
    const parsed = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
    if (isNaN(parsed)) return d;
    return parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const timeLabel = event.time
    ? event.time
    : event.startTime && event.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime ?? 'Time TBD';

  const paymentLabel =
    event.paymentMethod === 'gcash'   ? 'GCash'
  : event.paymentMethod === 'paymaya' ? 'PayMaya'
  : event.paymentMethod === 'bank'    ? 'Bank Transfer'
  : event.paymentMethod
    ? event.paymentMethod.charAt(0).toUpperCase() + event.paymentMethod.slice(1)
    : 'GCash';

  return (
    <div className={s.page}>

      {/* ── Hero ── */}
      <div className={s.hero}>
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className={s.heroImg} />
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
              onClick={() => setLiked(l => !l)}
              title={liked ? 'Unlike' : 'Like'}
            >
              <Heart size={20} fill={liked ? '#ec4899' : 'none'} />
            </button>
            <button className={s.iconBtn} title="Share">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className={s.heroContent}>
          <div className={s.formatBadge}>{formatLabel}</div>
          <h1 className={s.heroTitle}>{event.title ?? 'Untitled Event'}</h1>
        </div>
      </div>

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
                  <p className={s.cardValue}>{fmtDate(event.date ?? event._rawDate)}</p>
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
                {event.location && formatLabel !== 'Virtual' && (
                <div className={s.card}>
                    <MapPin size={18} className={s.cardIcon} />
                    <div>
                    <p className={s.cardLabel}>Location</p>
                    <p className={s.cardValue}>{event.location}</p>
                    <a href={event.placeUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className={s.mapLink}>
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
              <p className={s.sectionTitle}>About This Event</p>
              <p className={s.aboutText}>{event.description || 'No description provided.'}</p>
            </div>

            {/* Seating */}
            <div className={s.card}>
              <Armchair size={18} className={s.cardIcon} />
              <div>
                <p className={s.cardLabel}>Seating</p>
                <p className={s.cardValue}>
                  {event.seatingType === 'reserved' ? 'Assigned Seats' : 'Open Seating'}
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
                <div className={s.avatar}>{initials.toUpperCase()}</div>
                <div>
                  <div className={s.hostNameRow}>
                    <p className={s.cardValue}>{hostFirst} {hostLast}</p>
                    <div className={s.verified}>✓</div>
                  </div>
                  <p className={s.cardLabel}>Event Organizer</p>
                </div>
              </div>
              <p className={s.email}>{hostEmail}</p>
              <button className={s.msgBtn}>Message Host</button>
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
                    {event.accountNumber || '—'}
                  </p>
                </div>
                <p className={s.paymentNote}>
                  After payment, you'll be asked to upload proof of payment for host approval.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky RSVP Bar ── */}
      <div className={s.rsvpBar}>
        <div className={s.rsvpInfo}>
          <div>
            <p className={s.rsvpPrice}>{isPaid ? `₱${event.price}` : 'Free'}</p>
            <p className={s.rsvpSeats}>
              {seatsLeft > 0 ? `${seatsLeft} spots remaining` : 'Fully booked'}
            </p>
          </div>
        </div>
        <button
          className={`${s.rsvpBtn} ${rsvped ? s.rsvpBtnRsvped : ''}`}
          onClick={() => setRsvped(r => !r)}
          disabled={seatsLeft === 0 && !rsvped}
        >
          {rsvped
            ? <><CheckCircle2 size={20} /> RSVP'd!</>
            : <><Ticket size={20} /> RSVP Now</>
          }
        </button>
      </div>

      {/* ── Help ── */}
      <button className={s.helpBtn}>
        <HelpCircle size={24} />
      </button>
    </div>
  );
}