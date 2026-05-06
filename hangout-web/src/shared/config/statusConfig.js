/**
 * Centralized status configuration for consistent UI across the application.
 * Used in hosting and attending dashboards to ensure uniform colors, labels, and icons.
 */

import {
  CheckCircle, AlertCircle, RefreshCcw, Ban, AlertTriangle, Clock
} from 'lucide-react';

export const STATUS_CONFIG = {
  // ─── Hosting Event Statuses ───
  draft: {
    label: 'Draft',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
    color: '#f59e0b',
    lightColor: '#fef3c7',
    icon: Clock,
    description: 'Event is saved but not yet published',
  },
  published: {
    label: 'Published',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #e040fb 100%)',
    bgLight: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(224, 64, 251, 0.08) 100%)',
    color: '#ffffff',
    textColor: '#7c3aed',
    lightColor: '#ede9fe',
    icon: CheckCircle,
    description: 'Event is live and accepting RSVPs',
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  completed: {
    label: 'Completed',
    bg: '#a855f7',
    bgLight: 'rgba(168, 85, 247, 0.12)',
    color: '#ffffff',
    textColor: '#a855f7',
    lightColor: '#ede9fe',
    icon: CheckCircle,
    description: 'Event has ended',
  },

  // ─── Attending Event Statuses ───
  confirmed: {
    label: 'Confirmed',
    bg: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.08)',
    color: '#ffffff',
    textColor: '#10b981',
    lightColor: '#d1fae5',
    icon: CheckCircle,
    description: 'RSVP confirmed and ticket ready',
    borderColor: '#10b981',
  },
  pending: {
    label: 'Pending',
    bg: '#fbbf24',
    bgLight: 'rgba(251, 191, 36, 0.08)',
    color: '#000000',
    textColor: '#fbbf24',
    lightColor: '#fde68a',
    icon: AlertCircle,
    description: 'Awaiting host approval',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  pending_refund: {
    label: 'Pending Refund',
    bg: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.08)',
    color: '#ffffff',
    textColor: '#f59e0b',
    lightColor: '#fed7aa',
    icon: RefreshCcw,
    description: 'Refund being processed',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  rejected: {
    label: 'Rejected',
    bg: '#ef4444',
    bgLight: 'rgba(239, 68, 68, 0.08)',
    color: '#ffffff',
    textColor: '#ef4444',
    lightColor: '#fecaca',
    icon: Ban,
    description: 'RSVP was rejected by host',
    borderColor: '#ef4444',
  },
  cancelled: {
    label: 'HangOut Cancelled',
    bg: '#6b7280',
    bgLight: 'rgba(107, 114, 128, 0.08)',
    color: '#ffffff',
    textColor: '#6b7280',
    lightColor: '#d1d5db',
    icon: AlertTriangle,
    description: 'Event was cancelled by host',
    borderColor: '#6b7280',
  },
  deleted: {
    label: 'HangOut Deleted',
    bg: '#8b5cf6',
    bgLight: 'rgba(139, 92, 246, 0.08)',
    color: '#ffffff',
    textColor: '#8b5cf6',
    lightColor: '#ede9fe',
    icon: AlertTriangle,
    description: 'Event was deleted by host',
    borderColor: '#8b5cf6',
  },
  'rsvp-cancelled': {
    label: 'RSVP Cancelled',
    bg: '#ec4899',
    bgLight: 'rgba(236, 72, 153, 0.08)',
    color: '#ffffff',
    textColor: '#ec4899',
    lightColor: '#fbcfe8',
    icon: AlertTriangle,
    description: 'You cancelled your RSVP',
    borderColor: '#ec4899',
  },
};

/**
 * Get status configuration with defaults
 */
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

/**
 * Get all status configurations for a section
 */
export const HOSTING_STATUSES = ['draft', 'published', 'completed'];
export const ATTENDING_STATUSES = ['confirmed', 'pending', 'pending_refund', 'rejected', 'completed', 'cancelled', 'deleted', 'rsvp-cancelled'];

/**
 * Status category helpers
 */
export const isSuccessStatus = (status) => ['confirmed', 'completed'].includes(status);
export const isWarningStatus = (status) => ['pending', 'pending_refund', 'draft'].includes(status);
export const isErrorStatus = (status) => ['rejected', 'cancelled', 'deleted', 'rsvp-cancelled'].includes(status);
