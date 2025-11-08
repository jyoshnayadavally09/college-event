// src/components/AdminHome.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EditDateTimeModal from "./EditEvent.jsx";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminHome() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
const [editingEvent, setEditingEvent] = useState(null);
const [editDate, setEditDate] = useState("");
const [editTime, setEditTime] = useState("");

  const [regsLoading, setRegsLoading] = useState(false);
  const [regsChartData, setRegsChartData] = useState([]);
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("admin_username");

  // Colors for pie
  const COLORS = [
    "#4f46e5",
    "#06b6d4",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#7c3aed",
    "#e11d48",
    "#059669",
    "#f97316",
    "#0ea5e9",
  ];
const handleBackToHome = () => {
  navigate("/");
};

  // Load events on mount
  useEffect(() => {
    if (!token) {
      navigate("/admin-login");
      return;
    }
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filter, search]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/events", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          navigate("/admin-login");
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setRawResponse(data);
      const arr = Array.isArray(data) ? data : data?.events ?? [];
      const normalized = (arr || []).map((ev) => {
        const title = ev.title ?? ev.name ?? "Untitled event";
        const id = ev._id ?? ev.id ?? `${title}-${Math.random().toString(36).slice(2, 8)}`;
        const status = (ev.status || ev.state || "pending").toString();
        return {
          ...ev,
          _id: id,
          title,
          status,
          statusNormalized: status.toLowerCase(),
        };
      });
      const sorted = normalized.sort(
        (a, b) =>
          new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let list = [...events];
    if (filter !== "all") {
      list = list.filter((e) => (e.status || "").toLowerCase() === filter);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (ev) =>
          (ev.title || "").toLowerCase().includes(q) ||
          (ev.venue || "").toLowerCase().includes(q) ||
          (ev.branch || "").toLowerCase().includes(q)
      );
    }
    setFilteredEvents(list);
  };

  // Approve or Reject
  const updateStatus = async (id, status) => {
    if (!token) {
      alert("You must be logged in as admin to perform this action.");
      navigate("/admin-login");
      return;
    }

    if (!window.confirm(`Mark this event as "${status}"?`)) return;

    setUpdating(true);
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
        setEvents(prev);
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update: ${err.message || res.statusText}`);
        return;
      }

      const data = await res.json();
      setEvents((list) => list.map((e) => (e._id === id ? data : e)));
      alert(`Event ${status} ✅`);
    } catch (err) {
      console.error("Network error:", err);
      setEvents(prev);
      alert("Network error while updating event status.");
    } finally {
      setUpdating(false);
    }
  };

  // Export CSV
  const handleExport = async (eventId) => {
    if (!token) {
      alert("Login required");
      navigate("/admin-login");
      return;
    }

    if (!window.confirm("Download registrations CSV for this event?")) return;
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
      alert("Network error while exporting CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/admin-login");
  };

  const viewRegistrationsPage = (eventId) => {
    // keep existing navigation as fallback
    navigate(`/event-registrations/${eventId}`);
  };

  // OPEN REGISTRATIONS + PIE CHART
  const openRegistrationsModal = async (ev) => {
    // ev = event object
    if (!ev) return;
    try {
      setRegsLoading(true);
      setRegistrations([]);
      setRegsChartData([]);
      setRegistrationsModalOpen(true);

      const tok = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/events/${ev._id}/registrations`, {
        method: "GET",
        headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert("Failed to load registrations: " + (txt || res.status));
        setRegsLoading(false);
        return;
      }
      const data = await res.json();
      const regs = Array.isArray(data) ? data : data.registrations || [];
      setRegistrations(regs);

      // Build distribution by branch/department
      const counts = {};
      regs.forEach((r) => {
        const s = r.student || {};
        // try multiple possible keys
        const branch =
          (s.branch && String(s.branch).trim()) ||
          (s.department && String(s.department).trim()) ||
          (r.branch && String(r.branch).trim()) ||
          (r.department && String(r.department).trim()) ||
          (s.course && String(s.course).trim()) ||
          "Unknown";
        const key = branch || "Unknown";
        counts[key] = (counts[key] || 0) + 1;
      });

      // If there are zero regs, create a single Unknown entry with 0
      const chartData =
        Object.keys(counts).length > 0
          ? Object.entries(counts).map(([name, value]) => ({ name, value }))
          : [{ name: "No registrations", value: 0 }];

      setRegsChartData(chartData);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      alert("Network error loading registrations");
    } finally {
      setRegsLoading(false);
    }
  };

  const closeRegistrationsModal = () => {
    setRegistrationsModalOpen(false);
    setRegistrations([]);
    setRegsChartData([]);
  };

  const statusClass = (s) => {
    const st = (s || "").toLowerCase();
    if (st === "approved") return "status-pill status-approved";
    if (st === "pending") return "status-pill status-pending";
    if (st === "rejected") return "status-pill status-rejected";
    return "status-pill";
  };

  const counts = {
    total: events.length,
    pending: events.filter((e) => (e.status || "").toLowerCase() === "pending").length,
    approved: events.filter((e) => (e.status || "").toLowerCase() === "approved").length,
    rejected: events.filter((e) => (e.status || "").toLowerCase() === "rejected").length,
  };

  // format date helper
  const formatDate = (d) => {
    try {
      if (!d) return "-";
      const date = new Date(d);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleString();
    } catch {
      return "-";
    }
  };

  return (
    <>
      <style>{`
        :root{
          --primary: #4f46e5;
          --primary-dark: #4338ca;
          --bg: #f6f8fb;
          --card: #ffffff;
          --muted: #6b7280;
          --border: #e6e9ee;
          --success: #16a34a;
          --warning: #d97706;
          --danger: #dc2626;
          --shadow-lg: 0 14px 40px rgba(14,20,30,0.07);
          --shadow-sm: 0 6px 20px rgba(14,20,30,0.04);
          font-family: "Poppins", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }
        * { box-sizing: border-box; }
html, body, #root {
  height: 100%;
  margin: 0;
  background: var(--bg);
  color: #111827;
  display: flex;
  flex-direction: column;
}

.wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* 👈 Ensures full page height */
}

.main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 18px;
  align-items: start;
  min-height: calc(100vh - 120px); /* 👈 Ensures main fills space under header */
}

@media (max-width: 980px) {
  .main {
    grid-template-columns: 1fr;
  }
}


        .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
        .title { font-size:20px; font-weight:700; color:var(--primary); }
        .subtitle { font-size:13px; color:var(--muted); margin-top:4px; }
        .actions { display:flex; gap:8px; align-items:center; }

        button.btn { padding:8px 12px; border-radius:8px; border:none; cursor:pointer; font-weight:700; }
        button.logout { background:#ef4444; color:white; padding:8px 10px; border-radius:8px; font-weight:700; }

        .main { display:grid; grid-template-columns: 280px 1fr; gap:18px; align-items:start; }
        @media (max-width: 980px) { .main { grid-template-columns: 1fr; } }

        .sidebar { background:var(--card); padding:16px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow-sm); }
        .overview .big { font-size:28px; font-weight:800; color:#111827; margin-top:8px; }
        .stats { display:flex; gap:8px; margin-top:12px; }
        .stat {
          flex:1;
          border-radius:10px;
          padding:12px;
          text-align:center;
          border:1px solid #f0f2f8;
          cursor: pointer;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .stat:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(14,20,30,0.05); }
        .stat small { display:block; color:var(--muted); font-size:13px; margin-bottom:6px; }
        .stat strong { display:block; font-size:18px; font-weight:800; }

        .status-pending { background:#fff7ed; border:1px solid #fde68a; color:var(--warning); }
        .status-approved { background:#dcfce7; border:1px solid #bbf7d0; color:var(--success); }
        .status-rejected { background:#fee2e2; border:1px solid #fecaca; color:var(--danger); }

        .content { }
        .controls { display:flex; gap:12px; align-items:center; margin-bottom:14px; background:var(--card); padding:12px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow-sm); }
        .controls input.search { flex:1; padding:10px 12px; border-radius:10px; border:1px solid var(--border); font-size:14px; }

        .event-list { display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:18px; align-items:stretch; }
        .card {
          background:var(--card);
          padding:14px;
          border-radius:12px;
          border:1px solid #eaeef5;
          box-shadow: 0 8px 20px rgba(14,20,30,0.03);
          display:flex;
          flex-direction:column;
          gap:10px;
          min-height:160px;
        }
        .card .top { display:flex; justify-content:space-between; gap:10px; }
        .card .title { font-weight:800; color: var(--primary); font-size:16px; }
        .card .meta { color:var(--muted); font-size:13px; margin-top:4px; }
        .card .desc { 
  color:#374151; 
  font-size:14px; 
  line-height:1.35; 
  flex:1; 
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

        .status-pill { font-weight:800; padding:6px 10px; border-radius:999px; font-size:12px; }
        .status-approved { background:#dcfce7; color:var(--success); }
        .status-pending { background:#fff7ed; color:var(--warning); }
        .status-rejected { background:#fee2e2; color:var(--danger); }

        .footer { display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; padding-top:10px; border-top:1px solid var(--border); }
        .venue { color:var(--muted); font-size:13px; }

        .btn-group { display:flex; gap:8px; flex-wrap:wrap; }
        .btn-small { padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:white; font-weight:800; cursor:pointer; min-width:120px; text-align:center; }
        .btn-small:hover { box-shadow: 0 10px 26px rgba(14,20,30,0.04); }

        .modal-overlay{ position:fixed; inset:0; background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:1200 }
        .modal { width:90%; max-width:920px; background:var(--card); border-radius:12px; padding:18px; max-height:85vh; overflow:auto; }
        .modal h2{ margin:0 0 6px 0 }

        .regs-grid { display:grid; grid-template-columns: 1fr 320px; gap:12px; align-items:start; }
        @media (max-width: 920px) { .regs-grid { grid-template-columns: 1fr; } }

        .regs-list { max-height: 380px; overflow:auto; border-radius:8px; padding:8px; border:1px solid #f1f5f9; background:#fbfdff; }
        .regs-list table { width:100%; border-collapse: collapse; font-size:13px; }
        .regs-list th, .regs-list td { padding:8px 6px; text-align:left; border-bottom:1px solid #f1f5f9; }
      `}</style>

      <div className="wrapper">
        <div className="topbar">
           <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
    <button
      onClick={handleBackToHome}
      style={{
        background: "white",
        border: "1px solid var(--border)",
        color: "var(--primary)",
        fontWeight: "700",
        padding: "8px 14px",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
      }}
      onMouseEnter={(e) => (e.target.style.background = "var(--primary)", e.target.style.color = "white")}
      onMouseLeave={(e) => (e.target.style.background = "white", e.target.style.color = "var(--primary)")}
    >
      🏠 Back to Home
    </button>
    <div>
      <div className="title">🎯 Admin Dashboard</div>
      <div className="subtitle">Approve events, export registrations and manage requests</div>
    </div>
  </div>

          <div className="actions">
            <div style={{ textAlign: "right", marginRight: 6 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Signed in as</div>
              <div style={{ fontWeight: 800 }}>{username || "admin"}</div>
            </div>
            <button className="btn-small" onClick={() => loadEvents()}>{loading ? "Refreshing..." : "Refresh"}</button>
            <button className="logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div className="main">
          <aside className="sidebar">
  {/* === ORIGINAL OVERVIEW === */}
  <div className="overview">
    <div style={{ fontSize: 13, color: "var(--muted)" }}>Overview</div>
    <div className="big">{counts.total} Events</div>

    <div className="stats" style={{ marginTop: 16 }}>
      <div
        className={`stat status-pending`}
        onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
        title="Click to filter pending"
      >
        <small>Pending</small>
        <strong>{counts.pending}</strong>
      </div>
      <div
        className={`stat status-approved`}
        onClick={() => setFilter(filter === "approved" ? "all" : "approved")}
        title="Click to filter approved"
      >
        <small>Approved</small>
        <strong>{counts.approved}</strong>
      </div>
      <div
        className={`stat status-rejected`}
        onClick={() => setFilter(filter === "rejected" ? "all" : "rejected")}
        title="Click to filter rejected"
      >
        <small>Rejected</small>
        <strong>{counts.rejected}</strong>
      </div>
    </div>
  </div>

  {/* === MINI CALENDAR OVERVIEW === */}
  <div
    className="overview"
    style={{
      marginTop: "25px",
      background: "white",
      padding: "16px",
      borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      border: "1px solid #e5e7eb",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 13, color: "var(--muted)" }}>Calendar Overview</div>
    <div className="big" style={{ color: "#0b3d91" }}>
      📅 Approved Events
    </div>

    {/* Simple static mini calendar preview */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px",
        fontSize: "12px",
        color: "#333",
        justifyItems: "center",
        alignItems: "center",
        marginTop: "12px",
        marginBottom: "14px",
      }}
    >
      {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
        <div key={d} style={{ fontWeight: "700", color: "#0b3d91" }}>
          {d}
        </div>
      ))}
      {[...Array(28)].map((_, i) => (
        <div
          key={i}
          style={{
            width: "20px",
            height: "20px",
            background: i % 5 === 0 ? "#dcfce7" : "#f9fafb", // green = approved days
            borderRadius: "5px",
          }}
        />
      ))}
    </div>

    <button
      onClick={() => navigate("/calendar")}
      style={{
        background: "#4f46e5",
        color: "white",
        border: "none",
        padding: "8px 14px",
        borderRadius: "8px",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      View Full Calendar
    </button>
  </div>
</aside>


          <section className="content">
            <div className="controls">
              <input
                className="search"
                placeholder="Search events (title, venue, branch)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 8, color: "var(--muted)", fontWeight: 700 }}>
              Admin — Event Requests {filter !== "all" && `· filter: ${filter}`}
            </div>

            <div className="event-list">
              {filteredEvents.length === 0 ? (
                <div style={{ padding: 18, borderRadius: 12, background: "white", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, color: "var(--primary)" }}>No events found</div>
                  <div style={{ color: "var(--muted)", marginTop: 8 }}>Events from the system will appear here for review.</div>
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", color: "var(--primary)" }}>Raw response</summary>
                    <pre style={{ marginTop: 8, maxHeight: 260, overflow: "auto", background: "#fbfdff", padding: 8, borderRadius: 8 }}>
                      {JSON.stringify(rawResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <article key={ev._id} className="card" onClick={() => setSelected(ev._id)}>
                    <div className="top">
                      <div style={{ flex: 1 }}>
                        <div className="title">{ev.title}</div>
                        <div className="meta">By: {ev.proposedBy || ev.createdBy || "—"}</div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>
  📅 {ev.date || "Date: TBA"}{" "}
  {ev.time ? (
    <span>⏰ {ev.time }</span>
  ) : null}
</div>

                        <div className={statusClass(ev.status)} style={{ marginTop: 8 }}>{ev.status || "Unknown"}</div>
                      </div>
                    </div>

                    <div className="desc">{ev.description?.slice(0, 180) || "No description"}</div>

                    <div className="footer">
  <div className="venue">{ev.venue || "Venue: TBA"}</div>
  <div className="btn-group" style={{ justifyContent: "flex-end" }}>
    <button
      className="btn-small"
      onClick={(e) => { e.stopPropagation(); openRegistrationsModal(ev); }}
    >
      View registrations
    </button>
    <button
      className="btn-small"
      onClick={(e) => { e.stopPropagation(); handleExport(ev._id); }}
      disabled={exporting}
    >
      {exporting ? "Exporting..." : "Export CSV"}
    </button>

    {/* ✏️ MODIFY BUTTON — ADDED HERE */}
    <button
  className="btn-small"
  style={{ background: "#4f46e5", color: "white" }}
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/edit-event/${ev._id}`);
  }}
>
  🕒 Modify
</button>

    {ev.status?.toLowerCase() === "pending" ? (
      <>
        <button
          className="btn-small"
          onClick={(e) => { e.stopPropagation(); updateStatus(ev._id, "Approved"); }}
          disabled={updating}
        >
          Approve
        </button>
        <button
          className="btn-small"
          onClick={(e) => { e.stopPropagation(); updateStatus(ev._id, "Rejected"); }}
          disabled={updating}
        >
          Reject
        </button>
      </>
    ) : null}
  </div>
</div>

                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Registrations + Pie Chart Modal */}
      {registrationsModalOpen && (
        <div className="modal-overlay" onClick={closeRegistrationsModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <strong>Registrations</strong>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{registrations.length} registrations</div>
              </div>
              <div>
                <button className="btn-small" onClick={closeRegistrationsModal}>Close</button>
              </div>
            </div>

            {regsLoading ? (
              <div>Loading registrations…</div>
            ) : (
              <>
                <div className="regs-grid" style={{ marginTop: 8 }}>
                  <div style={{ minHeight: 240 }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={regsChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.name} (${entry.value})`}
                        >
                          {regsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Breakdown</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                      Grouped by branch/department (fallbacks applied).
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {regsChartData.map((d, i) => (
                        <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 12, height: 12, background: COLORS[i % COLORS.length], borderRadius: 4 }} />
                            <div style={{ fontWeight: 700 }}>{d.name}</div>
                          </div>
                          <div style={{ fontWeight: 800 }}>{d.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Registrations list</div>
                  <div className="regs-list">
                    {registrations.length === 0 ? (
                      <div style={{ color: "var(--muted)" }}>No registrations yet.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Branch</th>
                            <th>Submitted at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((r, idx) => {
                            const s = r.student || {};
                            const name = s.name || s.fullName || r.studentName || "-";
                            const uname = s.username || r.studentUsername || "-";
                            const branch =
                              (s.branch && String(s.branch)) ||
                              (s.department && String(s.department)) ||
                              r.branch ||
                              r.department ||
                              "-";
                            const submitted = formatDate(r.createdAt || r.submittedAt || r.createdAt);
                            return (
                              <tr key={String(r._id || r.registrationId || idx)}>
                                <td>{idx + 1}</td>
                                <td>{name}</td>
                                <td>{uname}</td>
                                <td>{branch}</td>
                                <td>{submitted}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
