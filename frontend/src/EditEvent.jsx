// src/components/EditEvent.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
  }, []);

  const loadEvent = async () => {
    try {
      const res = await fetch("http://localhost:5000/events");
      const all = await res.json();
      const found = Array.isArray(all)
        ? all.find((e) => e._id === id)
        : all.events?.find((e) => e._id === id);
      if (found) {
        setEvent(found);
        setEditDate(found.date || "");
        setEditTime(found.time || "");
      }
    } catch (err) {
      console.error("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `http://localhost:5000/events/update-datetime/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ date: editDate, time: editTime }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        alert("✅ Date & Time updated successfully!");
        navigate("/adminhome");
      } else {
        alert(data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error updating event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading event...</div>;
  if (!event) return <div style={{ padding: 20 }}>Event not found.</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth:"100vw",
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
        <h2 style={{ color: "#0b3d91", marginBottom: "8px" }}>
          🕒 Modify Event
        </h2>
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
