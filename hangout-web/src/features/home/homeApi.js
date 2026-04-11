import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

const homeCache = {
  hostingEvents: null,
  todayEvents: null,
  userStats: null,
};

function clearHomeCache() {
  homeCache.hostingEvents = null;
  homeCache.todayEvents = null;
  homeCache.userStats = null;
}

export async function getHostingEvents(refresh = false) {
  if (!refresh && homeCache.hostingEvents) return homeCache.hostingEvents;

  const res = await fetch(`${API_BASE}/events/hosting`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load hosting events");

  homeCache.hostingEvents = data;
  return data;
}

export async function getTodayEvents(refresh = false) {
  if (!refresh && homeCache.todayEvents) return homeCache.todayEvents;

  const res = await fetch(`${API_BASE}/events/today`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load today's events");

  homeCache.todayEvents = data;
  return data;
}

export async function getUserStats(refresh = false) {
  if (!refresh && homeCache.userStats) return homeCache.userStats;

  const res = await fetch(`${API_BASE}/user/stats`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load stats");

  homeCache.userStats = data;
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create event');

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
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update event');

  clearHomeCache();
  return data;
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete event');

  clearHomeCache();
}