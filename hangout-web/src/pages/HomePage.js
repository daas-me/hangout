import React from "react";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";

const MOCK_EVENTS = [
  { id: 1, title: "Cebu Street Food Night",        date: "Mar 1, 2026",  time: "6:00 PM", location: "Colon St, Cebu City",       price: 0,   capacity: 50, current_attendees: 32, event_format: "In-Person", emoji: "🍜" },
  { id: 2, title: "Web Dev Study Group",            date: "Mar 5, 2026",  time: "3:00 PM", location: "Zoom",                      price: 0,   capacity: 30, current_attendees: 18, event_format: "Virtual",   emoji: "💻" },
  { id: 3, title: "Photography Walk: Taoist Temple",date: "Mar 8, 2026",  time: "7:00 AM", location: "Beverly Hills, Cebu",       price: 150, capacity: 20, current_attendees: 15, event_format: "In-Person", emoji: "📸" },
  { id: 4, title: "Indie Film Night",               date: "Mar 12, 2026", time: "7:30 PM", location: "Casa Verde, Cebu",          price: 200, capacity: 40, current_attendees: 10, event_format: "In-Person", emoji: "🎬" },
  { id: 5, title: "CIT-U Hackathon Prep",           date: "Mar 15, 2026", time: "9:00 AM", location: "Google Meet + SM Cebu",    price: 0,   capacity: 60, current_attendees: 44, event_format: "Hybrid",    emoji: "🚀" },
  { id: 6, title: "Acoustic Night at The Venue",    date: "Mar 20, 2026", time: "8:00 PM", location: "The Venue, IT Park",       price: 100, capacity: 80, current_attendees: 25, event_format: "In-Person", emoji: "🎵" },
];

export default function HomePage({ user, onLogout }) {
  return (
    <div className="home-wrap">
      <Navbar user={user} onLogout={onLogout} />

      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Events near Cebu City
        </div>
        <h1>Find your next<br /><span>HangOut</span></h1>
        <p>Discover events hosted by people like you. RSVP, connect, and show up.</p>
        <div className="hero-cta">
          <button className="btn-hero">+ Create Event</button>
          <button className="btn-hero-ghost">Browse All →</button>
        </div>
      </div>

      {/* Events */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">Upcoming Events</div>
          <button className="section-link">See all →</button>
        </div>
        <div className="events-grid">
          {MOCK_EVENTS.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </div>
    </div>
  );
}