import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import "./styles/global.css";
import { getToken, getTokenExpiry, getUser, isTokenExpired, clearSession, saveUser } from "./shared/utils/storage";
import { fetchUserProfile, fetchUserPhoto } from "./features/profile/profileApi";

const LoginPage       = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage    = lazy(() => import("./features/auth/RegisterPage"));
const HomePage        = lazy(() => import("./features/home/HomePage"));
const DiscoverPage    = lazy(() => import("./features/discover/DiscoverPage"));
const MyHangoutsPage  = lazy(() => import("./features/myHangouts/MyHangoutsPage"));
const CreateEventPage = lazy(() => import("./features/events/CreateEventPage"));
const EventDetailPage = lazy(() => import("./features/events/EventDetailPage"));
const ProfilePage     = lazy(() => import("./features/profile/ProfilePage"));

const ROUTES = {
  login: "/login",
  register: "/register",
  home: "/home",
  discover: "/discover",
  "my-hangouts": "/my-hangouts",
  create: "/create",
  profile: "/profile",
};

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [hostedEvents, setHostedEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventSourceRoute, setEventSourceRoute] = useState(null);

  const idleTimer = useRef(null);
  const expiryTimer = useRef(null);
  const IDLE_TIMEOUT_MS = 1000 * 60 * 15; // 15 minutes

  const clearSessionTimers = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    window.clearTimeout(expiryTimer.current);
  }, []);

  const handleLogout = useCallback(() => {
    clearSessionTimers();
    clearSession();
    // Clear cached profile data to prevent stale data on next login
    localStorage.removeItem("cachedProfile");
    localStorage.removeItem("cachedPhoto");
    localStorage.removeItem("lastProfileFetch");
    setUser(null);
    setHostedEvents([]);
    setEditingEvent(null);
    setSelectedEvent(null);
    // Reload the entire app to ensure clean state
    window.location.reload();
  }, [clearSessionTimers]);

  const scheduleIdleLogout = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT_MS);
  }, [handleLogout, IDLE_TIMEOUT_MS]);

  const scheduleTokenExpiryLogout = useCallback((token) => {
    window.clearTimeout(expiryTimer.current);
    const expiry = getTokenExpiry(token);
    if (!expiry) return;
    const msUntilExpiry = expiry - Date.now();
    if (msUntilExpiry <= 0) {
      handleLogout();
      return;
    }
    expiryTimer.current = window.setTimeout(() => {
      handleLogout();
    }, msUntilExpiry);
  }, [handleLogout]);

  useEffect(() => {
    const token = getToken();
    const saved = getUser();
    if (token && saved && !isTokenExpired(token)) {
      scheduleTokenExpiryLogout(token);
      scheduleIdleLogout();
      
      // Fetch full profile data on app load, but cache for 10 minutes to reduce server hits
      (async () => {
        try {
          const lastProfileFetch = localStorage.getItem("lastProfileFetch");
          const now = Date.now();
          const cacheAge = lastProfileFetch ? now - parseInt(lastProfileFetch) : Infinity;
          const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
          
          let profile, photo;
          
          // Only fetch if cache is older than 10 minutes
          if (cacheAge > CACHE_DURATION) {
            profile = await fetchUserProfile(true);
            photo = await fetchUserPhoto(true);
            localStorage.setItem("lastProfileFetch", now.toString());
          } else {
            // Use cached values
            const cachedProfile = localStorage.getItem("cachedProfile");
            const cachedPhoto = localStorage.getItem("cachedPhoto");
            profile = cachedProfile ? JSON.parse(cachedProfile) : saved;
            photo = cachedPhoto ? JSON.parse(cachedPhoto) : null;
          }
          
          // Cache the fetched data
          if (profile) localStorage.setItem("cachedProfile", JSON.stringify(profile));
          if (photo) localStorage.setItem("cachedPhoto", JSON.stringify(photo));
          
          const mergedUser = {
            ...saved,
            ...profile,
            photoUrl: photo?.photo || null,
            photo: photo?.photo || null,
          };
          setUser(mergedUser);
          saveUser(mergedUser);
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
          setUser(saved);
        } finally {
          setChecking(false);
        }
      })();
    } else {
      clearSession();
      setChecking(false);
    }
    // Empty dependency array - only run once on app mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(userData) {
    // Clear all cached state from previous account before logging in new user
    setHostedEvents([]);
    setEditingEvent(null);
    setSelectedEvent(null);
    setEventSourceRoute(null);
    
    scheduleTokenExpiryLogout(getToken());
    scheduleIdleLogout();
    // Fetch full profile data after login and wait for it to complete
    (async () => {
      try {
        const profile = await fetchUserProfile(true);
        const photo = await fetchUserPhoto(true);
        const mergedUser = {
          ...userData,
          ...profile,
          photoUrl: photo?.photo || null,
          photo: photo?.photo || null,
        };
        setUser(mergedUser);
        saveUser(mergedUser);
        navigate(ROUTES.home, { replace: true });
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setUser(userData);
        navigate(ROUTES.home, { replace: true });
      }
    })();
  }

  function handleEventCreated(newEvent) {
    setHostedEvents(prev => [newEvent, ...prev]);
    setEditingEvent(null);
  }

  function handleUserUpdated(updatedUser) {
    setUser(prev => {
      const next = { ...prev, ...updatedUser };
      saveUser(next);
      return next;
    });
  }

  function handleEventUpdated(updatedEvent) {
    setHostedEvents(prev =>
      prev.map(e => (e.id === updatedEvent.id ? updatedEvent : e))
    );
    setEditingEvent(null);
  }

  function handleEditEvent(event) {
    setEditingEvent(event);
    navigate(ROUTES.create);
  }

  function handleViewEvent(event) {
    setSelectedEvent(event);
    // Track the current route as the source for the back button
    setEventSourceRoute(location.pathname);
    navigate(`/events/${event.id}`, { state: { event } });
  }

  function handleBackFromEvent() {
    setSelectedEvent(null);
    // Navigate back to the source route, or home if not set
    const backRoute = eventSourceRoute || ROUTES.home;
    navigate(backRoute);
    setEventSourceRoute(null);
  }

  function EventDetailRoute({ selectedEvent, onBack, currentUser, onEditEvent }) {
    const params = useParams();
    const location = useLocation();
    const routeEvent = location.state?.event;
    const detailEvent = selectedEvent || routeEvent || (params?.id ? { id: Number(params.id) } : null);

    return detailEvent ? (
      <EventDetailPage
        event={detailEvent}
        onBack={onBack}
        currentUser={currentUser}
        onEditEvent={onEditEvent}
      />
    ) : (
      <Navigate to={ROUTES.home} replace />
    );
  }

  useEffect(() => {
    if (!user) return;

    const resetIdle = () => {
      scheduleIdleLogout();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, resetIdle));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, resetIdle));
    };
  }, [user, scheduleIdleLogout]);

  const sharedProps = {
    user,
    onLogout: handleLogout,
    onNavigate: key => {
      if (key === 'create') {
        setEditingEvent(null);
      }
      navigate(ROUTES[key] || ROUTES.home);
    },
  };

  if (checking) {
    return (
      <div className="loading" style={{ height: "100vh", alignItems: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="loading" style={{ height: "100vh", alignItems: "center" }}>
          <div className="spinner" />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to={user ? ROUTES.home : ROUTES.login} replace />} />

        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={ROUTES.home} replace />
            ) : (
              <LoginPage onLogin={handleLogin} onGoRegister={() => navigate(ROUTES.register)} />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to={ROUTES.home} replace />
            ) : (
              <RegisterPage onGoLogin={() => navigate(ROUTES.login)} />
            )
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute user={user}>
              <HomePage key={user?.id} {...sharedProps} hostedEvents={hostedEvents} onViewEvent={handleViewEvent} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/discover"
          element={
            <ProtectedRoute user={user}>
              <DiscoverPage {...sharedProps} onViewEvent={handleViewEvent} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-hangouts"
          element={
            <ProtectedRoute user={user}>
              <MyHangoutsPage
                {...sharedProps}
                hostedEvents={hostedEvents}
                onEditEvent={handleEditEvent}
                onViewEvent={handleViewEvent}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create"
          element={
            <ProtectedRoute user={user}>
              <CreateEventPage
                {...sharedProps}
                initialEvent={editingEvent}
                onEventCreated={handleEventCreated}
                onEventUpdated={handleEventUpdated}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfilePage {...sharedProps} onUserUpdated={handleUserUpdated} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:id"
          element={
            <ProtectedRoute user={user}>
              <EventDetailRoute
                selectedEvent={selectedEvent}
                onBack={handleBackFromEvent}
                currentUser={user}
                onEditEvent={handleEditEvent}
              />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
