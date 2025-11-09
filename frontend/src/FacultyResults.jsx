// src/components/FacultyResults.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api"; // ✅ import centralized API

export default function FacultyResults() {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState("");
  const [winners, setWinners] = useState([
    { rank: 1, name: "", roll: "" },
    { rank: 2, name: "", roll: "" },
    { rank: 3, name: "", roll: "" },
    { rank: 4, name: "", roll: "" },
    { rank: 5, name: "", roll: "" },
  ]);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  // ✅ Load only approved events by this faculty
  useEffect(() => {
    const loadApproved = async () => {
      try {
        const data = await api.getEvents(token);
        const list = Array.isArray(data) ? data : data.events || [];
        const mine = list.filter(
          (e) =>
            (e.proposedBy === username || e.createdBy === username) &&
            (e.status || "").toLowerCase() === "approved"
        );
        setEvents(mine);
      } catch (err) {
        console.error("Failed to load events:", err);
        alert("Error fetching events. Please try again later.");
      }
    };
    loadApproved();
  }, [username, token]);

  // ✅ Update winner fields
  const handleChange = (i, key, value) => {
    setWinners((prev) => {
      const copy = [...prev];
      copy[i][key] = value;
      return copy;
    });
  };

  // ✅ Submit results using centralized API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return alert("Please select an event first.");
    const filled = winners.filter((w) => w.name.trim());
    if (filled.length === 0) return alert("Add at least one winner before submitting.");

    try {
      await api.addResults(selected, { winners: filled }, token);
      alert("✅ Results saved successfully!");
      navigate("/faculty-home");
    } catch (err) {
      console.error("Error saving results:", err);
      alert(`❌ Failed to save results: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#4f46e5" }}>🏆 Add Event Results</h2>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>
          Select Event:
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
            required
          >
            <option value="">-- Select an approved event --</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title}
              </option>
            ))}
          </select>
        </label>

        <h4 style={{ marginTop: 20, color: "#333" }}>Enter Top 5 Winners</h4>
        {winners.map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder={`#${w.rank} Name`}
              value={w.name}
              onChange={(e) => handleChange(i, "name", e.target.value)}
              style={{
                flex: 2,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
            <input
              type="text"
              placeholder="Roll No"
              value={w.roll}
              onChange={(e) => handleChange(i, "roll", e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
          </div>
        ))}

        <button
          type="submit"
          style={{
            marginTop: 20,
            background: "#4f46e5",
            color: "white",
            border: "none",
            padding: "12px 20px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            width: "100%",
          }}
        >
          💾 Save Results
        </button>

        <button
          type="button"
          onClick={() => navigate("/faculty-home")}
          style={{
            marginTop: 10,
            background: "#ddd",
            color: "#333",
            border: "none",
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            width: "100%",
          }}
        >
          ← Back to Dashboard
        </button>
      </form>
    </div>
  );
}
 