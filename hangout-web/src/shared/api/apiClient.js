const API_BASE = 'http://localhost:8080/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('hangout_token');
  if (!token) {
    console.warn('No authentication token found in localStorage');
  }
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function isAuthenticated() {
  const token = localStorage.getItem('hangout_token');
  return !!token;
}

export { API_BASE };
