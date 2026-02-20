import React, { useState, useEffect } from "react";
import "./styles/global.css";

import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage     from "./pages/HomePage";

import { getToken, getUser, clearSession } from "./utils/storage";

export default function App() {
  const [page, setPage] = useState("login");   // "login" | "register" | "home"
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Restore session on load
  useEffect(() => {
    const token = getToken();
    const saved = getUser();
    if (token && saved) {
      setUser(saved);
      setPage("home");
    }
    setChecking(false);
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    setPage("home");
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setPage("login");
  }

  if (checking) {
    return (
      <div className="loading" style={{ height: "100vh", alignItems: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (page === "home")     return <HomePage     user={user} onLogout={handleLogout} />;
  if (page === "register") return <RegisterPage onGoLogin={() => setPage("login")} />;
  return                          <LoginPage    onLogin={handleLogin} onGoRegister={() => setPage("register")} />;
}