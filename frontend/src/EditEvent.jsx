import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "./api";

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Load single event from API
  const loadEvent = async () => {
    try {
      const allEvents = await api.getEvents(token);
      const found = Array.isArray(allEvents)
        ? allEvents.find((e) => e._id === id)
        : allEvents?.events?.find((e) => e._id === id);

      if (found) {
        setEvent(found);
        setEditDate(found.date || "");
        setEditTime(found.time || "");
      } else {
        alert("Event not found!");
        navigate("/adminhome");
      }
    } catch (err) {
      console.error("Error loading event:", err);
      alert("Failed to load event details.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save updated date/time using centralized API call
  const handleSave = async () => {
    if (!editDate || !editTime) {
      alert("Please provide both date and time.");
      return;
    }

    setSaving(true);
    try {
      await api.updateEventDateTime(id, { date: editDate, time: editTime }, token);
      alert("✅ Date & Time updated successfully!");
      navigate("/adminhome");
    } catch (err) {
      console.error("Error updating event:", err);
      alert(err.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h3>Loading event...</h3>
      </div>
    );

  if (!event)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h3>Event not found.</h3>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        fontFamily: "Inter, system-ui",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: "24px",
          width: "100%",
          maxWidth: "500px",
        }}
      >
        <h2 style={{ color: "#0b3d91", marginBottom: "8px" }}>🕒 Modify Event</h2>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
          Update the date and time for: <strong>{event.title}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontWeight: "600", color: "#374151" }}>Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                marginTop: "6px",
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: "600", color: "#374151" }}>Time</label>
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                marginTop: "6px",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => navigate("/adminhome")}
              style={{
                background: "#f3f4f6",
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "#4f46e5",
                color: "white",
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
