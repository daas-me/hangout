import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

const favoriteCache = {
  userFavorites: null,
};

export function clearFavoriteCache() {
  favoriteCache.userFavorites = null;
}

export async function addFavorite(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/favorite`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to add favorite');
  }

  return await res.json();
}

export async function removeFavorite(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/favorite`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to remove favorite');
  }

  return await res.json();
}

export async function getUserFavorites(refresh = false) {
  // Cache expires after 2 minutes (120000ms) for favorites
  if (!refresh && favoriteCache.userFavorites) {
    const cached = favoriteCache.userFavorites;
    if (cached && cached.timestamp && Date.now() - cached.timestamp < 120000) {
      return cached.data;
    }
  }

  const res = await fetch(`${API_BASE}/events/favorites/list`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch favorites');
  }

  const data = await res.json();
  favoriteCache.userFavorites = { data, timestamp: Date.now() };
  return data;
}

export async function checkIsFavorite(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/favorite/check`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to check favorite status');
  }

  return await res.json();
}

export async function getFavoriteCount() {
  const res = await fetch(`${API_BASE}/events/favorites/count`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to get favorite count');
  }

  return await res.json();
}
