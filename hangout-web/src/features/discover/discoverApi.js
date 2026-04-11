import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

export async function getDiscoverEvents({ search = '', filter = 'all' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filter && filter !== 'all') params.set('filter', filter);

  const res = await fetch(`${API_BASE}/events/discover?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}