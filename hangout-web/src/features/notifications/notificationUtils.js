import {
  Gift, FileText, XCircle, RefreshCcw, CheckCircle,
  AlertCircle, Ban, Armchair, MessageCircle, Bell, Trash2,
} from 'lucide-react';

/* ── Icon + colour per type ─────────────────────────────────────────────── */
export const TYPE_META = {
  NEW_RSVP:            { icon: Gift,          accent: '#10b981' },
  PAYMENT_PROOF:       { icon: FileText,       accent: '#a855f7' },
  RSVP_CANCELLED:      { icon: XCircle,        accent: '#ef4444' },
  REFUND_REQUEST:      { icon: RefreshCcw,     accent: '#f59e0b' },
  REFUND_ACKNOWLEDGED: { icon: CheckCircle,    accent: '#10b981' },
  PAYMENT_APPROVED:    { icon: CheckCircle,    accent: '#10b981' },
  PAYMENT_REJECTED:    { icon: XCircle,        accent: '#ef4444' },
  RSVP_REJECTED:       { icon: Ban,            accent: '#ef4444' },
  REFUND_PROCESSED:    { icon: RefreshCcw,     accent: '#f59e0b' },
  REFUND_COMPLETED:    { icon: CheckCircle,    accent: '#10b981' },
  EVENT_CANCELLED:     { icon: AlertCircle,    accent: '#6b7280' },
  EVENT_DELETED:       { icon: Trash2,         accent: '#6b7280' },
  SEAT_ASSIGNED:       { icon: Armchair,       accent: '#3b82f6' },
  NEW_MESSAGE:         { icon: MessageCircle,  accent: '#ec4899' },
};

export const meta = (type) => TYPE_META[type] ?? { icon: Bell, accent: '#a855f7' };

export function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
