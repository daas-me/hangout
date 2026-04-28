import { API_BASE, getAuthHeaders } from './apiClient';

// ── Existing auth calls ───────────────────────────────────────────────────────

export async function loginApi(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  localStorage.setItem('hangout_token', data.token);
  return data; // { token, email, firstname }
}

export async function registerApi(fields) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
}

// ── Shared helpers (used by all other api/ files) ─────────────────────────────

/**
 * GET /api/user/profile
 * Returns the logged-in user's info.
 * Response: { id, firstname, lastname, email, age, birthdate, role }
 */
export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load user");
  return data;
}