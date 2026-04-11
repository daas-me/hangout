import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

export async function fetchUserProfile() {
  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load profile');
  return data;
}

export async function fetchUserPhoto() {
  const res = await fetch(`${API_BASE}/user/photo`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load profile photo');
  return res.json();
}

export async function fetchUserStats() {
  const res = await fetch(`${API_BASE}/user/stats`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load stats');
  return data;
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
  return res.json();
}

export async function deleteUserPhoto() {
  const res = await fetch(`${API_BASE}/user/photo`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete profile photo');
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
