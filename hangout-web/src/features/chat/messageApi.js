import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

export async function sendMessage(recipientId, content) {
  const res = await fetch(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipientId, content }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to send message');
  }
  return res.json();
}

export async function getConversations() {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function getConversation(userId) {
  const res = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

export async function getUnreadCount() {
  const res = await fetch(`${API_BASE}/messages/unread/count`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch unread count');
  return res.json();
}
