// src/components/EventDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventRegisterForm from "./EventRegisterForm";

/**
 * Fetch single event (from /events list) and show details + registration form.
 * If your backend had GET /events/:id you could fetch that — here we fetch all and filter (works with provided server).
 */

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetch("http://localhost:5000/events")
      .then((r) => r.json())
      .then((events) => {
        const ev = events.find((e) => e._id === eventId);
        setEvent(ev || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [eventId]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!event) return <div style={{ padding: 20 }}>Event not found</div>;

  return (
    <div style={{ maxWidth: 980, margin: "18px auto", padding: 18 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>

      <div style={{ background: "#fff", padding: 14, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
        <h2 style={{ marginTop: 0 }}>{event.title}</h2>
        <div style={{ color: "#555", marginBottom: 8 }}>
          <div><b>Branch:</b> {event.branch || "All"}</div>
          <div><b>Date:</b> {event.date || "TBA"}</div>
          <div><b>Venue:</b> {event.venue || "TBA"}</div>
          <div style={{ marginTop: 8 }}>{event.description}</div>
        </div>
      </div>

      {/* Registration form (if configured) */}
      <div style={{ marginTop: 18 }}>
        {event.formSchema && event.formSchema.length ? (
          <EventRegisterForm event={event} />
        ) : (
          <div style={{ padding: 12, background: "#fff", borderRadius: 8 }}>
            <p>No registration form configured for this event yet.</p>
            <button onClick={() => navigate(`/event-form-builder/${event._id}`)}>Create Registration Form</button>
          </div>
        )}
      </div>
    </div>
  );
}
