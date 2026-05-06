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

export function getPublicHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

export function isAuthenticated() {
  const token = localStorage.getItem('hangout_token');
  return !!token;
}

/**
 * Handle 401 responses
 * Clears the stale token and redirects to login regardless of whether
 * a token existed — if the server says 401, the token is no good.
 */
export function handle401(errorMsg = 'Authentication required. Please log in.') {
  const token = localStorage.getItem('hangout_token');

  if (!token) {
    console.error('[API] 401 Unauthorized - No token found. Redirecting to login.');
  } else {
    console.error('[API] 401 Unauthorized - Token is expired or invalid. Clearing and redirecting to login.');
    console.error('[API] Error:', errorMsg);
    localStorage.removeItem('hangout_token');
  }

  window.location.href = '/login?reason=session-expired';
}

export { API_BASE };