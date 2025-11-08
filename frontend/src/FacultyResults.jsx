import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    const loadApproved = async () => {
      const res = await fetch("http://localhost:5000/events");
      const data = await res.json();
      const mine = (Array.isArray(data) ? data : []).filter(
        (e) =>
          (e.proposedBy === username || e.createdBy === username) &&
          (e.status || "").toLowerCase() === "approved"
      );
      setEvents(mine);
    };
    loadApproved();
  }, [username]);

  const handleChange = (i, key, value) => {
    setWinners((prev) => {
      const copy = [...prev];
      copy[i][key] = value;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return alert("Select an event first");
    const filled = winners.filter((w) => w.name.trim());
    if (filled.length === 0) return alert("Add at least one winner");

    try {
      const res = await fetch(`http://localhost:5000/events/${selected}/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ winners: filled }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Error saving results");
      alert("✅ Results saved successfully!");
      navigate("/faculty-home");
    } catch {
      alert("Network error saving results");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", background: "#fff", padding: 20, borderRadius: 12 }}>
      <h2>🏆 Add Event Results</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 10 }}>
          Select Event:
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{ width: "100%", marginTop: 6, padding: 8 }}
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

        <h4 style={{ marginTop: 20 }}>Enter Top 5 Winners</h4>
        {winners.map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder={`#${w.rank} Name`}
              value={w.name}
              onChange={(e) => handleChange(i, "name", e.target.value)}
              style={{ flex: 2, padding: 8 }}
            />
            <input
              type="text"
              placeholder="Roll No"
              value={w.roll}
              onChange={(e) => handleChange(i, "roll", e.target.value)}
              style={{ flex: 1, padding: 8 }}
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
            padding: "10px 18px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Save Results
        </button>
      </form>
    </div>
  );
}
