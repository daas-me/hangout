/**
 * Get display text for event location/platform based on event format
 * @param {Object} event - The event object
 * @returns {string} Display text for location/platform
 */
export function getLocationDisplay(event) {
  if (!event) return 'Location not set';

  const format = event.format || 'In-Person';
  const location = event.location || '';
  const platform = event.virtualPlatform || '';

  if (format === 'Virtual') {
    return platform ? `${platform}` : 'Virtual Event';
  }

  if (format === 'Hybrid') {
    return platform && location 
      ? `${location} & ${platform}`
      : location || 'Location not set';
  }

  return location || 'Location not set';
}

/**
 * Check if event is virtual format
 * @param {Object} event - The event object
 * @returns {boolean} True if event is virtual or hybrid
 */
export function isVirtualEvent(event) {
  const format = event?.format || 'In-Person';
  return format === 'Virtual' || format === 'Hybrid';
}

/**
 * Check if event has a virtual link
 * @param {Object} event - The event object
 * @returns {boolean} True if event has virtual link
 */
export function hasVirtualLink(event) {
  return event?.virtualLink && event.virtualLink.trim().length > 0;
}
