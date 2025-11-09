// src/components/EventDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EventRegisterForm from "./EventRegisterForm";
import { api } from "./api";

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!eventId) return;

    const loadEvent = async () => {
      try {
        setLoading(true);
        const allEvents = await api.getEvents(token);
        const ev = Array.isArray(allEvents)
          ? allEvents.find((e) => e._id === eventId)
          : allEvents?.events?.find((e) => e._id === eventId);

        setEvent(ev || null);
      } catch (err) {
        console.error("Error loading event:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId, token]);

  if (loading)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h3>Loading event...</h3>
      </div>
    );

  if (!event)
    return (
      <div style={{ padding: 20, textAlign: "center", color: "red" }}>
        <h3>Event not found.</h3>
      </div>
    );

  // 🕒 Check if registration is closed
  const isClosed = event.closeDate && new Date(event.closeDate) < new Date();

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth :"100vw",
        display: "flex",
        alignItems: "center", // vertical center
        justifyContent: "center", // horizontal center
        backgroundColor: "#f3f4f6",
        padding: 20,
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 29,
            borderRadius: 12,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            position: "relative",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              position: "absolute",
              left: 30,
              top: 20,
              background: "#4f46e5",
              color: "white",
              padding: "8px 19px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ← Back
          </button>

          <div style={{ paddingTop: 30 /* give some room for absolute back button */ }}>
            <h2 style={{ marginTop: 0, color: "#0b3d91", fontSize: "1.8rem" }}>
              {event.title}
            </h2>

            <div style={{ color: "#444", marginBottom: 10, lineHeight: 1.8 }}>
              <div>
                <b>Branch:</b> {event.branch || "All"}
              </div>
              <div>
                <b>Date:</b> {event.date || "TBA"}
              </div>
              <div>
                <b>Time:</b> {event.time || "TBA"}
              </div>
              <div>
                <b>Venue:</b> {event.venue || "TBA"}
              </div>
              {event.closeDate && (
                <div>
                  <b>Registration Closes:</b>{" "}
                  {new Date(event.closeDate).toLocaleString()}
                </div>
              )}
              <div style={{ marginTop: 12, whiteSpace: "pre-line" }}>
                {event.description || "No description provided."}
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                borderTop: "1px solid #e5e7eb",
                paddingTop: 20,
              }}
            >
              {isClosed ? (
                <div
                  style={{
                    background: "#fee2e2",
                    padding: 16,
                    borderRadius: 8,
                    textAlign: "center",
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Registration Closed
                </div>
              ) : event.formSchema && event.formSchema.length ? (
                <EventRegisterForm event={event} />
              ) : (
                <div
                  style={{
                    padding: 16,
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
                    textAlign: "center",
                  }}
                >
                  <p style={{ color: "#555" }}>
                    No registration form configured for this event yet.
                  </p>
                  <button
                    onClick={() => navigate(`/event-form-builder/${event._id}`)}
                    style={{
                      background: "#4f46e5",
                      color: "white",
                      padding: "8px 14px",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ➕ Create Registration Form
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
