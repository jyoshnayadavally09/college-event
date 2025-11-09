// src/components/AdminCalendar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { api } from "./api"; // ✅ update import path if needed

export default function AdminCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin-login");
      return;
    }

    // ✅ Using centralized API function
    api.getEvents(token)
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.events || [];
        const formatted = arr.map((e) => ({
          title: e.title || e.name || "Untitled Event",
          date: e.date,
          backgroundColor:
            e.status?.toLowerCase() === "approved"
              ? "#16a34a"
              : e.status?.toLowerCase() === "pending"
              ? "#facc15"
              : "#dc2626",
          borderColor:
            e.status?.toLowerCase() === "approved"
              ? "#16a34a"
              : e.status?.toLowerCase() === "pending"
              ? "#facc15"
              : "#dc2626",
        }));
        setEvents(formatted);
      })
      .catch((err) => console.error("Error loading events:", err));
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f6f8fc, #e9ecf5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "40px",
        paddingBottom: "40px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          padding: "24px",
          width: "90%",
          maxWidth: "720px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "18px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "12px",
          }}
        >
          <h2
            style={{
              color: "#1e3a8a",
              fontWeight: "800",
              fontSize: "22px",
              marginBottom: "6px",
            }}
          >
            📅 Admin Calendar Overview
          </h2>
          <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>
            <span style={{ color: "#16a34a", fontWeight: "700" }}>Green</span> =
            Approved &nbsp;|&nbsp;
            <span style={{ color: "#facc15", fontWeight: "700" }}>Yellow</span> =
            Pending &nbsp;|&nbsp;
            <span style={{ color: "#dc2626", fontWeight: "700" }}>Red</span> =
            Rejected
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            padding: "10px",
          }}
        >
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="auto"
            events={events}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            dayMaxEvents={3}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => navigate("/adminhome")}
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "10px 22px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
              transition: "all 0.2s ease-in-out",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#4338ca")}
            onMouseLeave={(e) => (e.target.style.background = "#4f46e5")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
