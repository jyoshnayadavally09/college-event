import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

export default function CoordinatorHome() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("approved");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [exportingId, setExportingId] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/coordinator-login");
      return;
    }
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // helper: parse different date shapes -> ms
  const parseDateToMs = (v) => {
    try {
      if (!v) return 0;
      if (typeof v === "number") return v;
      if (v instanceof Date) return v.getTime();
      if (typeof v === "object" && v !== null) {
        if (v.$date) return parseDateToMs(v.$date);
        if (v.date) return parseDateToMs(v.date);
      }
      const d = new Date(v);
      const t = d.getTime();
      return isNaN(t) ? 0 : t;
    } catch {
      return 0;
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents(token);
      const arr = Array.isArray(data) ? data : data?.events ?? [];

      const normalized = arr.map((ev) => {
        // robust statusUpdatedAt extraction (approvedAt, statusUpdatedAt, updatedAt, modifiedAt, createdAt, date)
        const statusUpdatedCandidate =
          ev.approvedAt ??
          ev.statusUpdatedAt ??
          ev.updatedAt ??
          ev.modifiedAt ??
          ev.status_changed_at ??
          ev.status_at ??
          ev.approved_at ??
          ev.updated_at ??
          ev.createdAt ??
          ev.created_at ??
          ev.date ??
          null;

        const statusUpdatedAtMs = parseDateToMs(statusUpdatedCandidate);
        const dateMs = parseDateToMs(ev.date ?? ev.eventDate ?? ev.event_at ?? ev.date_at ?? ev.createdAt);

        return {
          ...ev,
          _id: ev._id ?? ev.id ?? `${ev.title ?? "untitled"}-${Math.random().toString(36).slice(2, 8)}`,
          title: ev.title ?? ev.name ?? "Untitled Event",
          statusNormalized: (ev.status || ev.state || "pending").toString().toLowerCase(),
          statusUpdatedAtMs,
          dateMs,
        };
      });

      // sort so that:
      // 1) approved/accepted events first
      // 2) among approved, newest statusUpdatedAtMs first (recently-approved first)
      // 3) fallback: sort by dateMs (newest first)
      normalized.sort((a, b) => {
        const aApproved = ["approved", "accepted"].includes(a.statusNormalized);
        const bApproved = ["approved", "accepted"].includes(b.statusNormalized);

        if (aApproved && !bApproved) return -1;
        if (!aApproved && bApproved) return 1;

        // both approved or both not approved
        if (aApproved && bApproved) {
          // newest approval first
          return (b.statusUpdatedAtMs || 0) - (a.statusUpdatedAtMs || 0) || (b.dateMs || 0) - (a.dateMs || 0);
        }

        // neither approved: use event date (or createdAt) per sortOrder
        if (sortOrder === "newest") return (b.dateMs || 0) - (a.dateMs || 0);
        return (a.dateMs || 0) - (b.dateMs || 0);
      });

      setEvents(normalized);
    } catch (err) {
      console.error("Error loading events:", err);
      alert("Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/coordinator-login");
  };

  // ✅ Export Excel only for approved events
  const handleExport = async (eventId) => {
    if (!window.confirm("Download registrations Excel/CSV for this event?")) return;
    setExportingId(eventId);
    try {
      const blob = await api.exportRegistrations(eventId, token);
      if (!blob || blob.size === 0) {
        alert("No registrations or empty file.");
        setExportingId(null);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations_${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert("Download started ✅");
    } catch (err) {
      console.error("Export error:", err);
      alert(err?.message || "Export failed.");
    } finally {
      setExportingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "TBA";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "TBA" : dt.toLocaleDateString();
  };

  const filtered = events
    .filter((e) => {
      if (filter === "approved") return e.statusNormalized === "approved" || e.statusNormalized === "accepted";
      if (filter === "pending") return e.statusNormalized === "pending";
      if (filter === "rejected") return e.statusNormalized === "rejected";
      return true;
    })
    .filter((e) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (e.title || "").toLowerCase().includes(q) ||
        (e.branch || "").toLowerCase().includes(q) ||
        (e.venue || "").toLowerCase().includes(q)
      );
    })
    // note: events are already sorted in loadEvents respecting approved recency; still we allow client-side sort for non-approved buckets
    .sort((a, b) => {
      // If both are approved, they already are sorted by statusUpdatedAtMs from loadEvents — keep that order.
      const aApproved = ["approved", "accepted"].includes(a.statusNormalized);
      const bApproved = ["approved", "accepted"].includes(b.statusNormalized);
      if (aApproved && bApproved) return 0;

      // For non-approved lists, sort by date per the chosen sortOrder
      const da = a.dateMs || 0;
      const db = b.dateMs || 0;
      return sortOrder === "newest" ? db - da : da - db;
    });

  const StatusPill = ({ status }) => {
    const st = (status || "").toLowerCase();
    if (st === "approved" || st === "accepted") {
      return <span style={{ background: "#dcfce7", color: "#065f46", padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 13 }}>Approved</span>;
    }
    if (st === "pending") {
      return <span style={{ background: "#fffbeb", color: "#92400e", padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 13 }}>Pending</span>;
    }
    if (st === "rejected") {
      return <span style={{ background: "#fee2e2", color: "#991b1b", padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 13 }}>Rejected</span>;
    }
    return <span style={{ background: "#f3f4f6", color: "#374151", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 13 }}>{status || "Unknown"}</span>;
  };

  return (
    <>
      <style>{`
        :root {
          --nav-dark: #0f172a;
          --nav-light: #2563eb;
          --border: #e5e7eb;
          --radius: 12px;
          --muted: #6b7280;
        }

        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow-x: hidden;
          background: #ffffff;
          color: #111827;
          font-family: 'Inter', sans-serif;
        }

        .navbar {
          width: 100%;
          background: linear-gradient(90deg, var(--nav-dark), var(--nav-light));
          color: white;
          padding: 14px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .navbar h2 { font-size: 22px; font-weight: 800; margin: 0; }
        .logout-btn { background: #ef4444; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
        .logout-btn:hover { background: #b91c1c; }

        .layout { display: grid; grid-template-columns: 260px 1fr; height: calc(100vh - 64px); width: 100vw; }
        .sidebar { background: #ffffff; border-right: 1px solid var(--border); padding: 20px; height: 100%; position: sticky; top: 64px; }
        .sidebar h3 { margin: 0 0 12px 0; font-weight: 800; }

        .filter-btn { width: 100%; border: none; padding: 12px; border-radius: 8px; text-align: left; font-weight: 700; background: #f3f4f6; margin-bottom: 8px; cursor: pointer; }
        .filter-btn.active { background: linear-gradient(90deg, #1d4ed8, #3b82f6); color: white; }

        .content { width: 100%; padding: 20px 40px; overflow-y: auto; }

        .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .search { padding: 10px; border-radius: 8px; border: 1px solid var(--border); width: 280px; }
        .sort { padding: 10px; border-radius: 8px; border: 1px solid var(--border); }

        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; width: 100%; }
        .card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.05); height: 180px; display:flex; flex-direction:column; justify-content:space-between; }
        .card h4 { margin: 0; font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .meta { color: var(--muted); font-size: 13px; margin-top: 8px; }
        .actions { display:flex; justify-content:space-between; align-items:center; margin-top: 12px; gap: 12px; }
        .btn { border: none; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
        .btn-primary { background: linear-gradient(90deg, #2563eb, #3b82f6); color: white; }
        .btn-light { background: #f3f4f6; color: #111827; }

        @media (max-width: 900px) {
          .layout { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .content { padding: 16px; }
        }
      `}</style>

      <div className="navbar">
        <h2>Coordinator Dashboard</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>{username || "coordinator"}</div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <h3>Filters</h3>
          <button className={`filter-btn ${filter === "approved" ? "active" : ""}`} onClick={() => setFilter("approved")}>Approved</button>
          <button className={`filter-btn ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>Pending</button>
          <button className={`filter-btn ${filter === "rejected" ? "active" : ""}`} onClick={() => setFilter("rejected")}>Rejected</button>
        </aside>

        <main className="content">
          <div className="top-row">
            <div>
              <h3 style={{ margin: 0 }}>Welcome, {username || "coordinator"} 👋</h3>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>Manage and download event registrations.</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input className="search" placeholder="Search event..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p>Loading events...</p>
          ) : filtered.length === 0 ? (
            <p>No events found.</p>
          ) : (
            <div className="cards">
              {filtered.map((ev) => (
                <article key={ev._id} className="card">
                  <div>
                    <h4 title={ev.title}>{ev.title}</h4>
                    <div className="meta">
                      <b>Branch:</b> {ev.branch || "N/A"} | <b>Date:</b> {formatDate(ev.date)} | <b>Venue:</b> {ev.venue || "TBA"}
                    </div>
                    <div style={{ marginTop: 8 }}><StatusPill status={ev.statusNormalized} /></div>
                  </div>

                  {/* ✅ Only show buttons for Approved */}
                  {ev.statusNormalized === "approved" || ev.statusNormalized === "accepted" ? (
                    <div className="actions">
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleExport(ev._id)}
                          disabled={exportingId === ev._id}
                        >
                          {exportingId === ev._id ? "Downloading..." : "Download Excel"}
                        </button>
                        <button className="btn btn-light" onClick={loadEvents}>Refresh</button>
                      </div>
                      <div style={{ fontWeight: 700, color: "#374151" }}>{ev.proposedBy || "faculty"}</div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
