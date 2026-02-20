import React from "react";

export default function Navbar({ user, onLogout }) {
  const initials = `${user?.firstname?.[0] || "?"}`.toUpperCase();

  return (
    <nav className="navbar">
      <div className="nav-logo">HangOut</div>

      <div className="nav-links">
        <button className="nav-link active">Home</button>
        <button className="nav-link">Discover</button>
        <button className="nav-link">My HangOuts</button>
      </div>

      <div className="nav-actions">
        <div className="profile-chip">
          <div className="avatar">{initials}</div>
          <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            {user?.firstname}
          </span>
        </div>
        <button className="btn-outline" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}