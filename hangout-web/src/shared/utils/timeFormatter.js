/**
 * Formats a 24-hour time string to 12-hour format (e.g., "14:30" -> "2:30 PM")
 */
export function formatTo12Hour(time24) {
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

/**
 * Formats the event time range based on available time fields
 * Returns either a single time or a time range (start – end)
 */
export function getTimeLabel(event) {
  // Check if we have individual startTime and endTime (prefer these for full range)
  const hasStartTime = event.startTime && event.startTime.trim() !== '';
  const hasEndTime = event.endTime && event.endTime.trim() !== '';
  
  if (hasStartTime && hasEndTime) {
    return `${formatTo12Hour(event.startTime)} – ${formatTo12Hour(event.endTime)}`;
  }
  
  if (hasStartTime) {
    return formatTo12Hour(event.startTime);
  }
  
  // Fall back to pre-formatted time field from backend
  if (event.time) {
    return formatTo12Hour(event.time);
  }
  
  return 'Time TBD';
}
