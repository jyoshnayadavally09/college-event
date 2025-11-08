// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// export default function FacultyHome() {
//   const navigate = useNavigate();
//   const [events, setEvents] = useState([]);
//   const token = localStorage.getItem("token");
//   const username = localStorage.getItem("username");
//   const role = localStorage.getItem("role");

//   useEffect(() => {
//     if (!token) {
//       navigate("/faculty-login");
//       return;
//     }

//     fetch("http://localhost:5000/events/my", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((res) => res.json())
//       .then((data) => setEvents(Array.isArray(data) ? data : []))
//       .catch((err) => console.error("Error loading events:", err));
//   }, [navigate, token]);

//   const handleLogout = () => {
//     localStorage.clear();
//     navigate("/faculty-login");
//   };

//   const handleCreateAndEdit = async () => {
//     const title = prompt("Enter title for new event:");
//     if (!title) return;
//     try {
//       const res = await fetch("http://localhost:5000/events/add", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ title }),
//       });
//       const data = await res.json();
//       if (!res.ok) return alert(data.message || "Failed to create event");
//       navigate(`/event-form-builder/${data._id}`);
//     } catch {
//       alert("Network error creating event");
//     }
//   };

//   const handleViewRegistrations = (ev) =>
//     navigate(`/event-registrations/${ev._id}`);

//   const handleEditForm = (ev) => navigate(`/event-form-builder/${ev._id}`);

//   return (
//     <>
//       <style>{`
//         * { font-family: 'Poppins', sans-serif; }
//         .navbar { display:flex; justify-content:space-between; align-items:center; background:#003366; padding:15px 30px; color:white; }
//         .nav-actions { display:flex; gap:12px; }
//         .btn { padding:8px 15px; border:none; border-radius:6px; cursor:pointer; font-weight:600; }
//         .btn-create { background:#ffcc00; color:#003366; }
//         .btn-create:hover { background:#e6b800; }
//         .btn-logout { background:red; color:white; }
//         .container { padding:25px; background:#f2f4f8; min-height:100vh; min-width:100vw; }
//         .events-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:16px; margin-top:20px; }
//         .event-card { background:white; padding:18px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
//       `}</style>

//       <div className="navbar">
//         <h2>Faculty Dashboard</h2>
//         <div className="nav-actions">
//           <button className="btn btn-create" onClick={handleCreateAndEdit}>
//             + Create Event
//           </button>
//           <button className="btn btn-logout" onClick={handleLogout}>
//             Logout
//           </button>
//         </div>
//       </div>

//       <div className="container">
//         <h2>Welcome, {username} 👋</h2>
//         <h3>Your Events</h3>

//         {events.length === 0 ? (
//           <p>No events found. Create one!</p>
//         ) : (
//           <div className="events-grid">
//             {events.map((ev) => (
//               <div key={ev._id} className="event-card">
//                 <h3>{ev.title}</h3>
//                 <p>
//                   <b>Status:</b> {ev.status}
//                 </p>
//                 <p>
//                   <b>Branch:</b> {ev.branch || "All"} | <b>Date:</b>{" "}
//                   {ev.date || "TBA"}
//                 </p>
//                 <div>
//                   <button
//                     className="btn btn-create"
//                     onClick={() => handleEditForm(ev)}
//                   >
//                     Edit Registration Form
//                   </button>
//                   <button
//                     className="btn"
//                     style={{ background: "#003366", color: "#fff" }}
//                     onClick={() => handleViewRegistrations(ev)}
//                   >
//                     View Registrations
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </>
//   );
// }
// src/components/FacultyHome.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * FacultyHome — full component with Registrations modal + download XLSX
 */
export default function FacultyHome() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [rawResponse, setRawResponse] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  // Registrations modal state
  const [registrations, setRegistrations] = useState([]);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [selectedEventForRegs, setSelectedEventForRegs] = useState(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [expandedRespId, setExpandedRespId] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/faculty-login");
      return;
    }
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, token, username, role]);

  const loadEvents = async () => {
    try {
      const res = await fetch("http://localhost:5000/events");
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${txt}`);
      }
      const data = await res.json();
      setRawResponse(data);
      const arr = Array.isArray(data) ? data : data?.events ?? [];

      const normalized = (arr || []).map((ev) => {
        const title = ev.title ?? ev.name ?? ev.eventTitle ?? "Untitled event";
        const status = (ev.status ?? ev.state ?? "").toString().trim();
        const id = ev._id ?? ev.id ?? `${title}-${Math.random().toString(36).slice(2, 8)}`;
        return {
          ...ev,
          _id: id,
          title,
          status: status || "Pending",
          statusNormalized: (status || "pending").toLowerCase(),
          __raw: ev,
        };
      });

      // show only events proposed by current faculty (tolerant)
      const myEvents = normalized.filter((ev) => {
        const proposedBy = ev.proposedBy ?? ev.createdBy ?? ev.creator ?? ev.owner ?? "";
        const proposedRole = ev.proposedRole ?? ev.role ?? "";
        const byMatch = proposedBy && username ? proposedBy === username : false;
        const roleMatch = proposedRole ? proposedRole === role : true;
        return byMatch && roleMatch;
      });

      setEvents(myEvents);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/faculty-login");
  };

  const handleEditForm = (ev) => navigate(`/event-form-builder/${ev._id}`);
  // Previously handleViewRegistrations navigated to a page — now we fetch and open modal
  const handleViewRegistrations = async (ev) => {
    try {
      setLoadingRegs(true);
      setRegistrations([]);
      setSelectedEventForRegs(ev);
      const tok = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/events/${ev._id}/registrations`, {
        method: "GET",
        headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert("Failed to load registrations: " + (txt || res.status));
        setLoadingRegs(false);
        return;
      }
      const data = await res.json();
      // server returns array directly; if wrapped, handle both shapes
      const regs = Array.isArray(data) ? data : data.registrations || [];
      setRegistrations(regs);
      setRegistrationsModalOpen(true);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      alert("Network error loading registrations");
    } finally {
      setLoadingRegs(false);
    }
  };

  // Download XLSX (per-event)
  const handleDownloadXlsx = async (ev) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/events/${ev._id}/registrations/export-xlsx`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert("Failed to download XLSX: " + (txt || res.status));
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations_event_${ev._id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Network error downloading XLSX");
    }
  };

  // Quick create: create pending event but DO NOT open builder
  const handleCreateAndEdit = async () => {
    const title = prompt("Enter a quick title for the new event:");
    if (!title) return;
    try {
      const tok = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/events/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        body: JSON.stringify({
          title,
          status: "Pending",
          proposedBy: username,
          proposedRole: role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to create event");
        return;
      }
      alert(`✅ "${data.title || title}" created — Pending admin approval.`);
      const created = {
        ...data,
        _id: data._id ?? data.id ?? `temp-${Math.random().toString(36).slice(2, 9)}`,
        title: data.title ?? title,
        status: data.status ?? "Pending",
        statusNormalized: (data.status ?? "Pending").toLowerCase(),
        proposedBy: data.proposedBy ?? username,
        proposedRole: data.proposedRole ?? role,
        __raw: data,
      };
      setEvents((prev) => [created, ...prev]);
    } catch (err) {
      console.error("Network error creating event:", err);
      alert("Network error creating event");
    }
  };

  // Filter/sort/search helpers
  const matchesSearch = (ev) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(q) ||
      (ev.venue ?? "").toLowerCase().includes(q) ||
      (ev.branch ?? "").toLowerCase().includes(q)
    );
  };

  const filteredEvents = events
    .filter((ev) => {
      if (filter === "all") return true;
      if (filter === "approved") return ev.statusNormalized === "approved";
      if (filter === "pending") return ev.statusNormalized === "pending";
      if (filter === "rejected") return ev.statusNormalized === "rejected";
      return true;
    })
    .filter(matchesSearch)
    .sort((a, b) => {
      if (sortOrder === "newest") {
        const da = new Date(a.createdAt || a.date || 0).getTime();
        const db = new Date(b.createdAt || b.date || 0).getTime();
        return db - da;
      } else {
        const da = new Date(a.createdAt || a.date || 0).getTime();
        const db = new Date(b.createdAt || b.date || 0).getTime();
        return da - db;
      }
    });

  const counts = {
    total: events.length,
    pending: events.filter((e) => e.statusNormalized === "pending").length,
    approved: events.filter((e) => e.statusNormalized === "approved").length,
    rejected: events.filter((e) => e.statusNormalized === "rejected").length,
  };

  const statusClass = (s) => {
    const st = (s || "").toLowerCase();
    if (st === "approved") return "status-pill status-approved";
    if (st === "pending") return "status-pill status-pending";
    if (st === "rejected") return "status-pill status-rejected";
    return "status-pill";
  };

  // Helper to robustly format a createdAt value
  const formatDate = (d) => {
    try {
      if (!d) return "-";
      const date = (typeof d === "string" || typeof d === "number") ? new Date(d) : (d instanceof Date ? d : new Date(d));
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
          --radius: 12px;
          font-family: "Poppins", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }
        * { box-sizing: border-box; }
        html,body,#root { height:100%; margin:0; background: var(--bg); color:#111827; }

        .wrapper { max-width: 1500px; margin: 18px auto; padding: 12px; }

        /* Top bar */
        .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
        .top-left { display:flex; align-items:center; gap:12px; }
        .back { color: var(--primary); cursor:pointer; font-weight:700; border-radius:8px; padding:6px 8px; border:1px solid transparent; }
        .back:hover { background:#fff; box-shadow: var(--shadow-sm); }
        .title { font-size:20px; font-weight:700; color:var(--primary); }
        .subtitle { font-size:13px; color:var(--muted); margin-top:4px; }

        .top-right { display:flex; align-items:center; gap:10px; }
        .signed { text-align:right; font-size:13px; color:var(--muted); }
        .actions { display:flex; gap:8px; align-items:center; }

        button.btn {
          padding:8px 12px;
          border-radius:8px;
          border:none;
          cursor:pointer;
          font-weight:700;
        }
        button.create { background: linear-gradient(90deg,var(--primary),var(--primary-dark)); color:#fff; box-shadow: 0 8px 26px rgba(79,70,229,0.08); }
        button.quick { background: linear-gradient(90deg,#ffcc00,#f59e0b); color:#062a3c; }
        button.logout { background:#ef4444; color:white; padding:8px 10px; border-radius:8px; font-weight:700; }

        /* Main area: left sidebar + right content */
        .main { display:grid; grid-template-columns: 260px 1fr; gap:18px; align-items:start; }
        @media (max-width: 980px) { .main { grid-template-columns: 1fr; } }

        /* left sidebar */
        .sidebar { background:var(--card); padding:16px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow-sm); }
        .overview .big { font-size:28px; font-weight:800; color:#111827; margin-top:8px; }
        .stats { display:flex; gap:8px; margin-top:12px; }
        .stat { flex:1; background:#fcfcff; border-radius:10px; padding:10px; text-align:center; border:1px solid #f0f2f8; }
        .stat small { display:block; color:var(--muted); }
        .stat strong { display:block; margin-top:6px; font-size:18px; color:#111827; font-weight:800; }

        .filters { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
        .filter-btn { text-align:left; padding:10px 12px; border-radius:10px; border:1px solid var(--border); background: transparent; cursor:pointer; font-weight:700; }
        .filter-btn.active { background: linear-gradient(90deg,var(--primary),var(--primary-dark)); color:#fff; border-color:transparent; }

        /* right content */
        .content { }
        .controls { display:flex; gap:12px; align-items:center; margin-bottom:14px; background:var(--card); padding:12px; border-radius:12px; border:1px solid var(--border); box-shadow:var(--shadow-sm); }
        .controls input.search { flex:1; padding:10px 12px; border-radius:10px; border:1px solid var(--border); font-size:14px; }
        .controls select { padding:10px 12px; border-radius:10px; border:1px solid var(--border); background:white; }

        /* cards grid */
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
        .card .title { font-weight:800; color: #4b2cf7; font-size:16px; }
        .card .meta { color:var(--muted); font-size:13px; margin-top:4px; }
        .card .desc { color:#374151; font-size:14px; line-height:1.35; flex:1; }

        .status-pill { font-weight:800; padding:6px 10px; border-radius:999px; font-size:12px; }
        .status-approved { background:#dcfce7; color:var(--success); }
        .status-pending { background:#fff7ed; color:var(--warning); }
        .status-rejected { background:#fee2e2; color:var(--danger); }

        .footer { display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; padding-top:10px; border-top:1px solid var(--border); }
        .venue { color:var(--muted); font-size:13px; }

        .btn-group { display:flex; gap:8px; flex-wrap:wrap; }
        .btn-small {
          padding:10px 12px;
          border-radius:10px;
          border:1px solid var(--border);
          background:white;
          font-weight:800;
          cursor:pointer;
          min-width:120px;
          text-align:center;
        }
        .btn-small:hover { box-shadow: 0 10px 26px rgba(14,20,30,0.04); }

        .locked {
          padding:10px 12px;
          border-radius:10px;
          border:1px dashed #e6e9ee;
          background:#fbfbfd;
          color:var(--muted);
          min-width:120px;
          font-weight:700;
          text-align:center;
        }

        @media (max-width:520px) {
          .btn-small { min-width:100px; padding:9px 10px; font-size:13px; }
        }
      `}</style>

      <div className="wrapper">
        {/* top bar */}
        <div className="topbar">
          <div className="top-left">
            <div
              className="back"
              onClick={() => {
                if (window.history.length > 1) window.history.back();
                else navigate("/");
              }}
            >
              ← Back
            </div>
            <div>
              <div className="title">Faculty Dashboard</div>
              <div className="subtitle">Manage events, forms and registrations</div>
            </div>
          </div>

          <div className="top-right">
            <div className="signed">
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Signed in as</div>
              <div style={{ fontWeight: 800 }}>{username || "faculty"}</div>
            </div>

            <div className="actions">
              <button className="btn quick" onClick={() => navigate("/faculty-results")}>
  🏆 Results
</button>

              <button className="btn create" onClick={() => navigate("/new-event")}>+ Create Event</button>
              <button className="btn quick" onClick={handleCreateAndEdit}>+ Quick Create</button>
              <button className="logout" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>

        {/* main area */}
        <div className="main">
          {/* left sidebar */}
          <aside className="sidebar">
            <div className="overview">
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Overview</div>
              <div className="big">{counts.total} Events</div>
              <div className="stats" style={{ marginTop: 12 }}>
                <div className="stat">
                  <small>Pending</small>
                  <strong>{counts.pending}</strong>
                </div>
                <div className="stat">
                  <small>Approved</small>
                  <strong>{counts.approved}</strong>
                </div>
                <div className="stat">
                  <small>Rejected</small>
                  <strong>{counts.rejected}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, color: "#111827", marginBottom: 8 }}>Filter</div>
              <div className="filters">
                <button
                  className={`filter-btn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filter === "pending" ? "active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Pending
                </button>
                <button
                  className={`filter-btn ${filter === "approved" ? "active" : ""}`}
                  onClick={() => setFilter("approved")}
                >
                  Approved
                </button>
                <button
                  className={`filter-btn ${filter === "rejected" ? "active" : ""}`}
                  onClick={() => setFilter("rejected")}
                >
                  Rejected
                </button>
              </div>
            </div>
          </aside>

          {/* right content */}
          <section className="content">
            <div className="controls">
              <input
                className="search"
                placeholder="Search by title, venue or branch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
              </select>
            </div>

            <div style={{ marginBottom: 8, color: "var(--muted)", fontWeight: 700 }}>
              Welcome, {username || "Faculty"} — Your Event Requests
            </div>

            <div className="event-list">
              {filteredEvents.length === 0 ? (
                <div style={{ padding: 18, borderRadius: 12, background: "white", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, color: "var(--primary)" }}>No events found</div>
                  <div style={{ color: "var(--muted)", marginTop: 8 }}>Create one using the buttons above.</div>
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", color: "var(--primary)" }}>Raw response</summary>
                    <pre style={{ marginTop: 8, maxHeight: 260, overflow: "auto", background: "#fbfdff", padding: 8, borderRadius: 8 }}>
                      {JSON.stringify(rawResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const approved = (ev.statusNormalized || "").toLowerCase() === "approved";
                  return (
                    <article key={ev._id} className="card">
                      <div className="top">
                        <div style={{ flex: 1 }}>
                          <div className="title">{ev.title}</div>
                          <div className="meta">{ev.branch || "All branches"}</div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                         <div style={{ fontSize: 13, color: "var(--muted)" }}>
  📅 {ev.date || "Date: TBA"} <br />
  🕒 {ev.time || "Time: TBA"}
</div>

                        </div>
                      </div>

                      <div className="desc">{ev.description || "No description provided."}</div>

                      <div className="footer">
                        <div className="venue">{ev.venue || "Venue: TBA"}</div>

                        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                          {approved ? (
                            <button className="btn-small" onClick={() => handleEditForm(ev)}>
                              {ev.formSchema && ev.formSchema.length ? "Edit Registration Form" : "Create Registration Form"}
                            </button>
                          ) : (
                            <div className="locked" title="Forms locked until admin approval">
                              Forms locked — pending approval
                            </div>
                          )}

                          <button className="btn-small" onClick={() => handleViewRegistrations(ev)}>Registrations</button>
                          <button className="btn-small" onClick={() => handleDownloadXlsx(ev)}>Download Excel</button>
                          <button className="btn-small" onClick={() => navigate(`/event-details/${ev._id}`)}>Details</button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* --- Registrations Modal --- */}
      {registrationsModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200
        }}>
          <div style={{ width: "90%", maxWidth: 1000, maxHeight: "85vh", overflow: "auto", background: "white", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <strong>Registrations — {selectedEventForRegs?.title}</strong>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{registrations.length} registrations</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-small" onClick={() => handleDownloadXlsx(selectedEventForRegs)}>Download Excel</button>
                <button className="btn-small" onClick={() => { setRegistrationsModalOpen(false); setRegistrations([]); }}>Close</button>
              </div>
            </div>

            {loadingRegs ? (
              <div>Loading registrations…</div>
            ) : registrations.length === 0 ? (
              <div style={{ padding: 12, color: "#6b7280" }}>No registrations yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e6e9ee" }}>
                    <th style={{ padding: "8px 6px" }}>#</th>
                    <th style={{ padding: "8px 6px" }}>Name</th>
                    <th style={{ padding: "8px 6px" }}>Username</th>
                    <th style={{ padding: "8px 6px" }}>Email</th>
                    <th style={{ padding: "8px 6px" }}>Roll</th>
                    <th style={{ padding: "8px 6px" }}>Submitted At</th>
                    <th style={{ padding: "8px 6px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r, idx) => {
                    const sid = String(r._id || r.registrationId || idx);
                    const s = r.student || {};
                    // server may have flattened studentName/studentEmail fields in some exports
                    const name = s.name || s.fullName || r.studentName || "-";
                    const uname = s.username || r.studentUsername || "-";
                    const email = s.email || r.studentEmail || "-";
                    const roll = s.roll || r.studentRoll || "-";
                    return (
                      <React.Fragment key={sid}>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>{name}</td>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>{uname}</td>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>{email}</td>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>{roll}</td>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>{formatDate(r.createdAt || (r.createdAt && r.createdAt.$date) || r.createdAt)}</td>
                          <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                            <button className="btn-small" onClick={() => setExpandedRespId(expandedRespId === sid ? null : sid)}>
                              {expandedRespId === sid ? "Hide responses" : "View responses"}
                            </button>
                          </td>
                        </tr>

                        {expandedRespId === sid && (
                          <tr>
                            <td colSpan={7} style={{ background: "#fbfdff", padding: 10 }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Responses</div>
                              <div style={{ fontSize: 14 }}>
                                {r.responses && typeof r.responses === "object" ? (
                                  Object.entries(r.responses).map(([k, v]) => (
                                    <div key={k} style={{ marginBottom: 6 }}>
                                      <strong>{k}</strong>: {Array.isArray(v) ? v.join(", ") : String(v)}
                                    </div>
                                  ))
                                ) : (
                                  <pre style={{ whiteSpace: "pre-wrap" }}>{typeof r.responses === "string" ? r.responses : JSON.stringify(r.responses)}</pre>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
