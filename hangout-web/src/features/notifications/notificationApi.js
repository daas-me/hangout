import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

/** Fetch all notifications (up to 50, newest first) */
export async function getNotifications() {
  const res = await fetch(`${API_BASE}/notifications`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

/** Get unread count only (cheap poll) */
export async function getUnreadNotificationCount() {
  const res = await fetch(`${API_BASE}/notifications/unread/count`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch notification count');
  return res.json(); // { unreadCount: number }
}

/** Mark a single notification as read */
export async function markNotificationRead(id) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

/** Mark ALL notifications as read */
export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
  return res.json();
}

/** Delete a single notification */
export async function deleteNotification(id) {
  const res = await fetch(`${API_BASE}/notifications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete notification');
  return res.json();
}

/** Delete ALL notifications */
export async function deleteAllNotifications() {
  const res = await fetch(`${API_BASE}/notifications`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete all notifications');
  return res.json();
}
