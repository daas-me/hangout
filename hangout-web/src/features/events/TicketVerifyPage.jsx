import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Calendar,
  MapPin, Armchair, Loader2
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * TicketVerifyPage — publicly accessible at /verify/:eventId/:ticketToken
 *
 * Fetches ticket data from the public verify endpoint.
 * Includes the auth token if present (so hosts can scan and see full details),
 * but works without a token too (the endpoint is permitAll on the backend).
 */
export default function TicketVerifyPage() {
  const { eventId, ticketToken } = useParams();
  const [loading,  setLoading]  = useState(true);
  const [ticket,   setTicket]   = useState(null);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!eventId || !ticketToken) {
      setError('Invalid ticket URL.');
      setLoading(false);
      return;
    }

    async function verify() {
      try {
        // Build headers — include token if available so the server can
        // optionally enrich the response, but don't REQUIRE it.
        const headers = { 'Content-Type': 'application/json' };
        const token   = localStorage.getItem('hangout_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `${API_BASE}/events/${eventId}/rsvp/verify/${ticketToken}`,
          { method: 'GET', headers }
        );

        if (res.status === 404) {
          setError('Ticket not found. This ticket does not exist or has been removed.');
          return;
        }
        if (res.status === 400) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Invalid ticket format.');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || `Verification failed (HTTP ${res.status}).`);
          return;
        }

        const data = await res.json();
        setTicket(data);
      } catch (err) {
        console.error('[TicketVerifyPage] Network error:', err);
        setError('Unable to connect to the server. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [eventId, ticketToken]);

  /* ── Helpers ── */
  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const isValidTicket = ticket &&
    ticket.valid &&
    ticket.status === 'confirmed' &&
    (ticket.paymentStatus === 'confirmed' || ticket.paymentStatus === null) &&
    ticket.attendeeStatus !== 'rejected';

  /* ── Layout shell ── */
  const page = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a14',
    padding: 24,
    fontFamily: 'DM Sans, sans-serif',
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={page}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <Loader2 size={48} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite', color: '#a855f7' }} />
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600 }}>
            Verifying ticket…
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ── Error / Invalid ── */
  if (error || !isValidTicket) {
    const message = error || (() => {
      if (!ticket) return 'This ticket could not be verified.';
      if (ticket.attendeeStatus === 'rejected') return 'This attendee has been rejected by the host.';
      if (ticket.status === 'cancelled') return 'This RSVP has been cancelled.';
      if (ticket.paymentStatus === 'pending') return 'Payment for this ticket is still pending approval.';
      if (ticket.paymentStatus === 'rejected') return 'Payment was rejected. This ticket is not valid.';
      return 'This ticket is not valid.';
    })();

    return (
      <div style={page}>
        <div style={{
          background: '#13131f',
          borderRadius: 20,
          border: '1px solid rgba(239,68,68,0.25)',
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <XCircle size={40} style={{ color: '#ef4444' }} />
          </div>
          <h1 style={{
            color: '#ef4444', fontFamily: 'Syne, sans-serif',
            fontWeight: 700, fontSize: 22, margin: '0 0 10px',
          }}>
            ✕ Invalid Ticket
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            {message}
          </p>
          {ticket && (
            <div style={{
              marginTop: 20, padding: '12px 16px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 10,
              fontSize: 12,
              color: '#6b7280',
              textAlign: 'left',
            }}>
              <p style={{ margin: '0 0 4px' }}>Ticket: <span style={{ color: '#e5e7eb' }}>{ticketToken}</span></p>
              <p style={{ margin: '0 0 4px' }}>Status: <span style={{ color: '#fbbf24' }}>{ticket.status}</span></p>
              {ticket.paymentStatus && (
                <p style={{ margin: 0 }}>Payment: <span style={{ color: '#fbbf24' }}>{ticket.paymentStatus}</span></p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Valid Ticket ── */
  return (
    <div style={page}>
      <div style={{
        background: '#13131f',
        borderRadius: 20,
        border: '1px solid rgba(16,185,129,0.3)',
        overflow: 'hidden',
        maxWidth: 460,
        width: '100%',
        boxShadow: '0 0 60px rgba(16,185,129,0.1)',
      }}>

        {/* Green header strip */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <CheckCircle2 size={32} style={{ color: 'white' }} />
          </div>
          <div>
            <p style={{
              color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px',
            }}>
              ✓ Valid Ticket
            </p>
            <h1 style={{
              color: 'white', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: 20, margin: 0, lineHeight: 1.2,
            }}>
              {ticket.eventTitle}
            </h1>
          </div>
        </div>

        {/* Guest info */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px dashed rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'white', fontFamily: 'Syne, sans-serif',
          }}>
            {ticket.guestName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>
              Guest
            </p>
            <p style={{ color: '#f0eeff', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, margin: 0 }}>
              {ticket.guestName}
            </p>
            <p style={{ color: '#6b7280', fontSize: 12, margin: '2px 0 0' }}>{ticket.guestEmail}</p>
          </div>
        </div>

        {/* Event details */}
        <div style={{ padding: '20px 32px', borderBottom: '1px dashed rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: Calendar, label: 'Date',     value: formatDate(ticket.eventDate) },
            { icon: MapPin,   label: 'Ticket #', value: ticket.ticketNumber },
            { icon: Armchair, label: 'Seat',     value: ticket.seatNumber || 'Open Seating' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1px' }}>
                  {label}
                </p>
                <p style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500, margin: 0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status badges */}
        <div style={{ padding: '16px 32px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'rgba(16,185,129,0.15)', color: '#10b981',
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            ✓ RSVP Confirmed
          </span>
          {ticket.paymentStatus === 'confirmed' && (
            <span style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
              ✓ Payment Verified
            </span>
          )}
        </div>

        <div style={{
          padding: '12px 32px 24px',
          color: '#4b5563', fontSize: 11, textAlign: 'center',
          fontStyle: 'italic',
        }}>
          Scanned at entrance · HangOut Event System
        </div>
      </div>
    </div>
  );
}