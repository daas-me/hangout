const API_BASE = 'http://localhost:8081/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('hangout_token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

export { API_BASE };
