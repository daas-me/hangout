import React, { useState, useEffect } from "react";
import "./styles/global.css";

import LoginPage       from "./pages/LoginPage";
import RegisterPage    from "./pages/RegisterPage";
import HomePage        from "./pages/HomePage";
import DiscoverPage    from "./pages/DiscoverPage";
import MyHangoutsPage  from "./pages/MyHangoutsPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProfilePage from "./pages/ProfilePage";

import { getToken, getUser, clearSession } from "./utils/storage";

export default function App() {
  const [page,         setPage]         = useState("login");
  const [user,         setUser]         = useState(null);
  const [checking,     setChecking]     = useState(true);
  const [hostedEvents, setHostedEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null); 

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
    setHostedEvents([]);
    setEditingEvent(null);
    setSelectedEvent(null); 
  }

  function handleEventCreated(newEvent) {
    setHostedEvents(prev => [newEvent, ...prev]);
    setEditingEvent(null);
  }

  function handleUserUpdated(updatedUser) {
  setUser(prev => ({ ...prev, ...updatedUser }));
}

  function handleEventUpdated(updatedEvent) {
    setHostedEvents(prev =>
      prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
    );
    setEditingEvent(null);
  }

  function handleEditEvent(event) {
    setEditingEvent(event);
    setPage("create");
  }

  function handleViewEvent(event) {  
    setSelectedEvent(event);
  }

  function handleBackFromEvent() {  
    setSelectedEvent(null);
  }

  if (checking) {
    return (
      <div className="loading" style={{ height: "100vh", alignItems: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  // ── EventDetailPage sits above all pages ──────────────────────────────────
  if (selectedEvent) {
    return (
      <EventDetailPage
        event={selectedEvent}
        onBack={handleBackFromEvent}
        currentUser={user}
      />
    );
  }

  const sharedProps = { user, onLogout: handleLogout, onNavigate: setPage };

  if (page === "home")        return <HomePage        {...sharedProps} hostedEvents={hostedEvents} onViewEvent={handleViewEvent} />;
  if (page === "discover")    return <DiscoverPage    {...sharedProps} onViewEvent={handleViewEvent} />;
  if (page === "my-hangouts") return <MyHangoutsPage  {...sharedProps} hostedEvents={hostedEvents} onEditEvent={handleEditEvent} onViewEvent={handleViewEvent} />;
  if (page === "create")      return <CreateEventPage {...sharedProps} initialEvent={editingEvent} onEventCreated={handleEventCreated} onEventUpdated={handleEventUpdated} />;
  if (page === "profile") return <ProfilePage {...sharedProps} onUserUpdated={handleUserUpdated} />;
  if (page === "register")    return <RegisterPage onGoLogin={() => setPage("login")} />;
  return                             <LoginPage onLogin={handleLogin} onGoRegister={() => setPage("register")} />;
}