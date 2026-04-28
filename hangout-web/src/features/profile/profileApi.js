import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

const profileCache = {
  profile: null,
  photo: null,
  stats: null,
};

function clearProfileCache() {
  profileCache.profile = null;
  profileCache.photo = null;
  profileCache.stats = null;
}

export async function fetchUserProfile(refresh = false) {
  if (!refresh && profileCache.profile) return profileCache.profile;

  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load profile');

  profileCache.profile = data;
  return data;
}

export async function fetchUserPhoto(refresh = false) {
  if (!refresh && profileCache.photo) return profileCache.photo;

  const res = await fetch(`${API_BASE}/user/photo`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load profile photo');
  const data = await res.json();

  profileCache.photo = data;
  return data;
}

export async function fetchUserStats(refresh = false) {
  if (!refresh && profileCache.stats) return profileCache.stats;

  const res = await fetch(`${API_BASE}/user/stats`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load stats');

  profileCache.stats = data;
  return data;
}

export async function fetchCalculatedActivityStats(refresh = false) {
  try {
    // Fetch both hosting and attending events from the home endpoints
    const [hostingRes, attendingRes] = await Promise.all([
      fetch(`${API_BASE}/events/hosting`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/events/attending`, { headers: getAuthHeaders() }),
    ]);

    const hostingData = await hostingRes.json();
    const attendingData = await attendingRes.json();

    if (!hostingRes.ok) throw new Error(hostingData?.message || 'Failed to load hosting events');
    if (!attendingRes.ok) throw new Error(attendingData?.message || 'Failed to load attending events');

    // Filter only published (non-draft) hosting events
    const publishedHostingCount = (hostingData || []).filter(e => e.isDraft !== true).length;

    // Count attending events
    const attendingCount = (attendingData || []).length;

    // Calculate total attendees: sum of attendee counts for all attending events
    const totalAttendees = (attendingData || []).reduce((sum, event) => {
      const attendeeCount = event.attendees?.current ?? event.attendeeCount ?? 0;
      return sum + attendeeCount;
    }, 0);

    const stats = {
      hostingCount: publishedHostingCount,
      attendingCount: attendingCount,
      totalAttendees: totalAttendees,
    };

    profileCache.stats = stats;
    return stats;
  } catch (err) {
    console.error('Failed to calculate activity stats:', err);
    // Fallback to the original fetchUserStats if calculation fails
    return fetchUserStats(refresh);
  }
}

export async function updateUserProfile(payload) {
  const res = await fetch(`${API_BASE}/user/profile`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update profile');

  clearProfileCache();
  return data;
}

export async function uploadUserPhoto(formData) {
  const res = await fetch(`${API_BASE}/user/photo`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeaders().Authorization,
    },
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload profile photo');
  const data = await res.json();

  clearProfileCache();
  return data;
}

export async function deleteUserPhoto() {
  const res = await fetch(`${API_BASE}/user/photo`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete profile photo');

  clearProfileCache();
}

export async function changeUserPassword(payload) {
  const res = await fetch(`${API_BASE}/user/password`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update password');
  return data;
}
