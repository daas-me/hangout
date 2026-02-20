import React from "react";

export default function EventCard({ event }) {
  const isFull = event.current_attendees >= event.capacity;
  const pct = Math.round((event.current_attendees / event.capacity) * 100);

  return (
    <div className="event-card">
      <div
        className="event-card-img"
        style={{
          background: `linear-gradient(135deg,
            hsl(${event.id * 47}, 50%, 12%) 0%,
            hsl(${event.id * 47 + 40}, 40%, 8%) 100%)`,
        }}
      >
        <span>{event.emoji}</span>
      </div>

      <div className="event-card-body">
        <div className="event-card-meta">
          <span className={`tag ${event.price === 0 ? "tag-free" : "tag-paid"}`}>
            {event.price === 0 ? "Free" : `₱${event.price}`}
          </span>
          <span className={`tag ${event.event_format === "Virtual" ? "tag-virtual" : ""}`}>
            {event.event_format}
          </span>
        </div>
        <div className="event-card-title">{event.title}</div>
        <div className="event-card-info">
          <span>📅 {event.date} · {event.time}</span>
          <span>📍 {event.location}</span>
        </div>
      </div>

      <div className="event-card-footer">
        <div>
          <div className="event-slots">
            {isFull ? "Full" : `${event.capacity - event.current_attendees} slots left`}
          </div>
          <div className="slots-bar">
            <div className="slots-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button className="btn-sm" disabled={isFull} style={{ opacity: isFull ? 0.5 : 1 }}>
          {isFull ? "Full" : "RSVP"}
        </button>
      </div>
    </div>
  );
}