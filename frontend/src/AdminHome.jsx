// src/components/AdminHome.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AdminHome
 * - Fetches events and shows them in a dark, full-width layout
 * - Approve / Reject protected calls include the admin token
 * - Export registrations (CSV) for an event (protected)
 * - Navigates to event registrations/details
 *
 * Usage: drop into src/components/AdminHome.jsx
 */

export default function AdminHome() {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  // load events (admin token optional since endpoint is public but we require login for admin UI)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/admin-login");
      return;
    }

    setLoading(true);
    fetch("http://localhost:5000/events", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            // token invalid or expired -> force login
            localStorage.removeItem("token");
            navigate("/admin-login");
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // ensure createdAt exists and sort by newest first
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id)
        );
        setEvents(sorted);
      })
      .catch((err) => {
        console.error("Error fetching events:", err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // update event status (approve / reject)
  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in as admin to perform this action.");
      navigate("/admin-login");
      return;
    }

    if (!window.confirm(`Are you sure you want to mark this event as "${status}"?`)) return;

    setUpdating(true);
    // optimistic update snapshot
    const prev = [...events];
    setEvents(events.map((e) => (e._id === id ? { ...e, status } : e)));
    setSelected(null);

    try {
      const res = await fetch(`http://localhost:5000/events/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // revert optimistic update
        setEvents(prev);
        alert(`Failed to update: ${err.message || res.statusText}`);
        return;
      }

      const data = await res.json();
      // patch the list with server response (ensures fields match)
      setEvents((list) => list.map((e) => (e._id === id ? data : e)));
      alert(`Event ${status} ✅`);
    } catch (err) {
      setEvents(prev);
      console.error("Update error:", err);
      alert("Network error while updating event status.");
    } finally {
      setUpdating(false);
    }
  };

  // logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/admin-login");
  };

  // export registrations CSV
  const handleExport = async (eventId, title = "") => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Login required");
      navigate("/admin-login");
      return;
    }

    if (!window.confirm("Download registrations CSV for this event?")) return;

    setExporting(true);
    try {
      const res = await fetch(`http://localhost:5000/events/${eventId}/registrations/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      alert("Network error while exporting CSV.");
    } finally {
      setExporting(false);
    }
  };

  // quick nav to registrations page (protected route in your app)
  const viewRegistrationsPage = (eventId) => {
    navigate(`/event-registrations/${eventId}`);
  };

  // small helper to render status badges
  const StatusBadge = ({ status }) => {
    const s = (status || "").toLowerCase();
    const bg =
      s === "approved" ? "#154c0a" :
      s === "rejected" ? "#5f0b0b" :
      s === "pending" ? "#6b5500" :
      "#333";
    const color = "#fff";
    return (
      <span style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 12,
        textTransform: "capitalize"
      }}>
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <>
      <style>{`
        :root {
          --primary: #00aaff;
          --bg: #0b0b0c;
          --card: #0f1720;
          --muted: #94a3b8;
          --accent: #00aaff;
          --success: #16a34a;
          --danger: #ef4444;
          --glass: rgba(255,255,255,0.03);
        }
        * { box-sizing: border-box; }
        body, html, #root { height: 100%; }
        .admin-wrap { min-height: 100vh; background: linear-gradient(180deg,#050505 0%, #0b0b0c 100%); color: #e6eef8; font-family: 'Poppins', sans-serif; }
        .admin-header {
          display:flex; align-items:center; justify-content:space-between;
          padding: 18px 24px; position: sticky; top: 0; z-index: 40;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          background: linear-gradient(0deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02));
        }
        .title { font-size: 20px; font-weight: 700; color: var(--primary); display:flex; gap:12px; align-items:center; }
        .header-actions { display:flex; gap:10px; align-items:center; }
        .logout-btn { background: var(--danger); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor:pointer; font-weight:700; }
        .content { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .event-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.03);
          padding: 18px; border-radius: 12px; cursor: pointer;
          display:flex; flex-direction:column; gap:10px;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .event-card:hover { transform: translateY(-6px); box-shadow: 0 8px 30px rgba(0,0,0,0.6); }
        .event-meta { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .event-row { display:flex; justify-content:space-between; gap:12px; align-items:center; }
        .event-title { font-size:18px; font-weight:700; color: var(--accent); }
        .small { font-size:13px; color:var(--muted); }
        .card-actions { display:flex; gap:8px; margin-top:8px; }
        .btn { padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color: #e6eef8; cursor:pointer; font-weight:600; }
        .btn:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-primary { background: var(--primary); color: #000; border: none; }
        .btn-success { background: var(--success); color: #fff; border: none; }
        .btn-danger { background: var(--danger); color: #fff; border: none; }

        /* Modal */
        .modal-overlay { position: fixed; inset:0; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:999; }
        .modal { width:92%; max-width:700px; background: #fff; color: #000; border-radius: 10px; padding:22px; box-shadow: 0 12px 40px rgba(2,6,23,0.6); }
        .modal h2 { margin-bottom:6px; }
        .modal p { margin:6px 0; color: #111827; }
        .modal .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:14px; }
        @media(min-width:900px) {
          .cards { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="admin-wrap">
        <div className="admin-header">
          <div className="title">Admin Dashboard</div>

          <div className="header-actions">
            <div style={{ color: "#9fb7d8", fontWeight: 600 }}>{loading ? "Loading…" : `${events.length} events`}</div>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="content">
          {events.length === 0 && !loading ? (
            <div style={{ padding: 20, borderRadius: 12, background: "var(--glass)" }}>
              <p className="small">No events found. Faculty haven't created any events yet.</p>
            </div>
          ) : (
            <div className="cards">
              {events.map((ev) => (
                <div key={ev._id} className="event-card" onClick={() => setSelected(ev._id)}>
                  <div className="event-row">
                    <div>
                      <div className="event-title">{ev.title}</div>
                      <div className="small">Forwarded by: <strong style={{ color: "#fff" }}>{ev.proposedBy || "—"}</strong></div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <StatusBadge status={ev.status} />
                      <div className="small">{ev.date || "Date: TBA"}</div>
                    </div>
                  </div>

                  <div className="event-meta">
                    <div className="small"><b>Branch:</b> {ev.branch || "All"}</div>
                    <div className="small"><b>Venue:</b> {ev.venue || "TBA"}</div>
                    <div className="small"><b>Type:</b> {ev.type || "General"}</div>
                  </div>

                  <div style={{ marginTop: 8 }} className="small">{ev.description ? ev.description.slice(0, 220) + (ev.description.length > 220 ? "…" : "") : "No description provided."}</div>

                  <div className="card-actions">
                    <button
                      className="btn"
                      onClick={(e) => { e.stopPropagation(); viewRegistrationsPage(ev._id); }}
                    >
                      View registrations
                    </button>

                    <button
                      className="btn"
                      onClick={(e) => { e.stopPropagation(); handleExport(ev._id, ev.title); }}
                      disabled={exporting}
                    >
                      {exporting ? "Exporting…" : "Export CSV"}
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={(e) => { e.stopPropagation(); setSelected(ev._id); }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const ev = events.find((x) => x._id === selected);
                if (!ev) return <div>Event not found</div>;
                return (
                  <>
                    <h2>{ev.title}</h2>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                      <StatusBadge status={ev.status} />
                      <div className="small"><b>Forwarded by:</b> {ev.proposedBy}</div>
                      <div className="small"><b>Branch:</b> {ev.branch || "All"}</div>
                      <div className="small"><b>Date:</b> {ev.date || "TBA"}</div>
                      <div className="small"><b>Venue:</b> {ev.venue || "TBA"}</div>
                    </div>

                    <p style={{ whiteSpace: "pre-wrap" }}>{ev.description || "No description"}</p>

                    <div className="modal-actions">
                      <button
                        className="btn btn-success"
                        disabled={updating}
                        onClick={() => updateStatus(ev._id, "Approved")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={updating}
                        onClick={() => updateStatus(ev._1d || ev._id, "Rejected")}
                      >
                        ❌ Reject
                      </button>
                      <button className="btn" onClick={() => { setSelected(null); }}>
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
