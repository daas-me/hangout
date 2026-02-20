export const saveToken = (token) => localStorage.setItem("hangout_token", token);
export const getToken = () => localStorage.getItem("hangout_token");
export const clearToken = () => localStorage.removeItem("hangout_token");

export const saveUser = (user) => localStorage.setItem("hangout_user", JSON.stringify(user));
export const getUser = () => {
  const u = localStorage.getItem("hangout_user");
  return u ? JSON.parse(u) : null;
};
export const clearUser = () => localStorage.removeItem("hangout_user");

export const clearSession = () => { clearToken(); clearUser(); };