import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

const homeCache = {
  hostingEvents: null,
  attendingEvents: null,
  todayEvents: null,
  userStats: null,
};

export function clearHomeCache() {
  homeCache.hostingEvents = null;
  homeCache.attendingEvents = null;
  homeCache.todayEvents = null;
  homeCache.userStats = null;
}

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getHostingEvents(refresh = false) {
  // Cache expires after 2 minutes (120000ms) for hosting events
  if (!refresh && homeCache.hostingEvents) {
    const cached = homeCache.hostingEvents;
    if (cached && cached.timestamp && Date.now() - cached.timestamp < 120000) {
      return cached.data;
    }
  }

  const res = await fetch(`${API_BASE}/events/hosting`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.message || 'Failed to load hosting events');

  homeCache.hostingEvents = { data, timestamp: Date.now() };
  return data;
}

export async function getAttendingEvents(refresh = false) {
  // Cache expires after 2 minutes (120000ms) for attending events
  if (!refresh && homeCache.attendingEvents) {
    const cached = homeCache.attendingEvents;
    if (cached && cached.timestamp && Date.now() - cached.timestamp < 120000) {
      return cached.data;
    }
  }

  const res = await fetch(`${API_BASE}/events/attending`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.message || 'Failed to load attending events');

  homeCache.attendingEvents = { data, timestamp: Date.now() };
  return data;
}

export async function getTodayEvents(refresh = false) {
  // Cache expires after 30 minutes (1800000ms) for today's events
  if (!refresh && homeCache.todayEvents) {
    const cached = homeCache.todayEvents;
    if (cached && cached.timestamp && Date.now() - cached.timestamp < 1800000) {
      return cached.data;
    }
  }

  const res = await fetch(`${API_BASE}/events/today`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to load today's events");

  homeCache.todayEvents = { data, timestamp: Date.now() };
  return data;
}

export async function getUserStats(refresh = false) {
  if (!refresh && homeCache.userStats) return homeCache.userStats;

  const res = await fetch(`${API_BASE}/user/stats`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.message || 'Failed to load stats');

  homeCache.userStats = data;
  return data;
}

export async function getCalculatedActivityStats(refresh = false) {
  try {
    // Fetch hosting and attending events
    const [hostingEvents, attendingEvents] = await Promise.all([
      getHostingEvents(refresh),
      getAttendingEvents(refresh),
    ]);

    // Filter only published (non-draft) hosting events
    const publishedHostingCount = (hostingEvents || []).filter(e => e.isDraft !== true).length;

    // Count attending events
    const attendingCount = (attendingEvents || []).length;

    // Calculate total attendees: sum of confirmed attendee counts for all created events
    const totalAttendees = (hostingEvents || []).reduce((sum, event) => {
      const attendeeCount = event.attendees?.current ?? event.attendeeCount ?? 0;
      return sum + attendeeCount;
    }, 0);

    return {
      hostingCount: publishedHostingCount,
      attendingCount: attendingCount,
      totalAttendees: totalAttendees,
    };
  } catch (err) {
    console.error('Failed to calculate activity stats:', err);
    // Fallback to the original getUserStats if calculation fails
    return getUserStats(refresh);
  }
}

export async function createEvent(payload) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.message || 'Failed to create event');

  clearHomeCache();
  return data;
}

export async function updateEvent(id, payload) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.message || 'Failed to update event');

  clearHomeCache();
  return data;
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.message || 'Failed to delete event');
  }

  clearHomeCache();
}