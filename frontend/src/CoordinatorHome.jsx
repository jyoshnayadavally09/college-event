import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CoordinatorHome() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    if (!token) {
      navigate("/coordinator-login");
      return;
    }
    loadEvents();
  }, [token, navigate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/events");
      const data = await res.json();

      const approvedEvents = data.filter(
        (ev) => ev.status?.toLowerCase() === "approved"
      );

      setEvents(approvedEvents);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/coordinator-login");
  };

  const handleExport = async (eventId) => {
    if (!window.confirm("Download registrations Excel for this event?")) return;
    setExporting(true);

    try {
      const res = await fetch(
        `http://localhost:5000/events/${eventId}/registrations/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to export: ${err.message || res.statusText}`);
        return;
      }

      const blob = await res.blob();
      const filename = `registrations_${eventId}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Network error while exporting file.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --primary: #2563eb;
          --primary-dark: #1e3a8a;
          --navbar-gradient: linear-gradient(90deg, #6366f1, #0ea5e9);
          --success: #10b981;
          --danger: #ef4444;
          --muted: #6b7280;
          --bg: #f8fafc;
          --card: #ffffff;
          --shadow: 0 10px 25px rgba(0,0,0,0.08);
          --radius: 14px;
          font-family: 'Poppins', sans-serif;
        }

        body {
          background: var(--bg);
          margin: 0;
          color: #111827;
        }

        /* Move the entire page to the right */
        .page-wrapper {
          margin-left: 250px; /* Adjust this value to move the whole content */
          transition: all 0.4s ease;
        }

        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--navbar-gradient);
          padding: 18px 40px;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-bottom-left-radius: 14px;
          border-bottom-right-radius: 14px;
        }

        .navbar h2 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .btn-logout {
          background: var(--danger);
          color: white;
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s ease;
        }

        .btn-logout:hover {
          background: #b91c1c;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0,0,0,0.12);
        }

        .container {
          min-height: calc(100vh - 90px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 60px 20px;
          text-align: center;
        }

        h2 {
          font-size: 28px;
          color: var(--primary-dark);
          font-weight: 700;
          margin-bottom: 10px;
        }

        h3 {
          font-size: 18px;
          color: var(--muted);
          margin-bottom: 35px;
        }

        .events-grid {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 25px;
          flex-wrap: wrap;
          max-width: 1000px;
        }

        .event-card {
          background: var(--card);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 24px 26px;
          width: 300px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: 0.3s ease;
          border-top: 5px solid var(--primary);
        }

        .event-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.12);
        }

        .event-card h3 {
          margin: 0 0 10px 0;
          font-weight: 700;
          color: var(--primary-dark);
        }

        .meta {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
        }

        .status {
          display: inline-block;
          font-weight: 600;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 13px;
          margin-top: 12px;
          text-align: center;
          background: #d1fae5;
          color: var(--success);
        }

        .export-btn {
          margin-top: 16px;
          padding: 10px 14px;
          background: linear-gradient(135deg, #2563eb, #6366f1);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s ease;
          width: 100%;
        }

        .export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .empty-state {
          text-align: center;
          color: var(--muted);
          background: var(--card);
          padding: 50px 20px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          border: 1px solid #e5e7eb;
          max-width: 500px;
        }

        .empty-state h4 {
          color: var(--primary-dark);
          font-weight: 700;
          margin-bottom: 8px;
        }

        @media (max-width: 768px) {
          .page-wrapper {
            margin-left: 0;
          }
          .container {
            padding: 40px 20px;
          }
        }
      `}</style>

      <div className="page-wrapper">
        <div className="navbar">
          <h2>Coordinator Dashboard</h2>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="container">
          <h2>Welcome, {username} 👋</h2>
          <h3>Approved Events</h3>

          {loading ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <h4>No approved events yet.</h4>
              <p>Approved events will appear here once available.</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((ev) => (
                <div key={ev._id} className="event-card">
                  <h3>{ev.title}</h3>
                  <p className="meta"><b>Branch:</b> {ev.branch || "N/A"}</p>
                  <p className="meta"><b>Date:</b> {ev.date || "TBA"}</p>
                  <p className="meta"><b>Venue:</b> {ev.venue || "TBA"}</p>
                  <p className="meta"><b>Proposed By:</b> {ev.proposedBy || "Unknown"}</p>
                  <span className="status">✅ Approved</span>

                  <button
                    className="export-btn"
                    onClick={() => handleExport(ev._id)}
                    disabled={exporting}
                  >
                    {exporting ? "Exporting..." : "📥 Download Registrations Excel"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
