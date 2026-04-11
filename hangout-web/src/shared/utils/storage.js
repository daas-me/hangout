export const saveToken = (token) => localStorage.setItem("hangout_token", token);
export const getToken = () => localStorage.getItem("hangout_token");
export const clearToken = () => localStorage.removeItem("hangout_token");

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(decoded.split('').map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join('')));
  } catch {
    return null;
  }
}

export const getTokenExpiry = (token) => {
  const payload = parseJwt(token);
  return payload?.exp ? payload.exp * 1000 : null;
};

export const isTokenExpired = (token) => {
  const expiry = getTokenExpiry(token);
  return expiry ? Date.now() >= expiry : false;
};

export const saveUser = (user) => localStorage.setItem("hangout_user", JSON.stringify(user));
export const getUser = () => {
  const u = localStorage.getItem("hangout_user");
  return u ? JSON.parse(u) : null;
};
export const clearUser = () => localStorage.removeItem("hangout_user");

export const clearSession = () => { clearToken(); clearUser(); };