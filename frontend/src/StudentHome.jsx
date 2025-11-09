// src/components/StudentHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api"; // centralized API helper

export default function StudentHome() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [filterType, setFilterType] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // map normalizedEventId -> { registered: true, date, status, raw }
  const [registeredMap, setRegisteredMap] = useState({});

  const token = localStorage.getItem("token");
  const storedStudent = (() => {
    try {
      return JSON.parse(localStorage.getItem("student")) || {};
    } catch {
      return {};
    }
  })();

  // Choose a stable per-user identifier (prefer ID, fallback to username)
  const currentUserId = storedStudent._id || storedStudent.id || storedStudent.username || localStorage.getItem("username") || "guest";
  const username = storedStudent.username || localStorage.getItem("username") || "";
  const displayName = storedStudent.name || storedStudent.fullName || storedStudent.username || "";

  // ---------- Local storage key helpers (per-user) ----------
  const getLocalKey = () => `registrations:${String(currentUserId)}`;
  const getLocalNotifyKey = () => `registrations:added:${String(currentUserId)}`;

  // ---------- Utility: normalize ids ----------
  const normalizeId = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") {
      const s = v.trim();
      if (s === "") return null;
      return s;
    }
    if (typeof v === "number") return String(v);
    try {
      if (typeof v === "object") {
        if (v._id) return String(v._id);
        if (v.id) return String(v.id);
        if (v.eventId) return String(v.eventId);
        if (v.event_id) return String(v.event_id);
        if (v.toString && typeof v.toString === "function") {
          const s = v.toString();
          if (s && typeof s === "string" && s !== "[object Object]") return s;
        }
      }
      return String(v);
    } catch {
      return String(v);
    }
  };

  // ---------- Helpers for registration fallback (per-user storage) ----------
  const saveLocalRegistration = (ev, opts = {}) => {
    try {
      const eventId = normalizeId(ev._id ?? ev.id ?? ev.eventId) || ev.title || `temp-${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();

      const key = getLocalKey();
      const localRegs = JSON.parse(localStorage.getItem(key) || "[]");
      const reg = {
        id: `local-${Math.random().toString(36).slice(2, 9)}`,
        eventId,
        eventTitle: ev.title,
        eventDate: ev.date || null,
        registeredAt: timestamp,
        status: opts.status || "Registered (local)",
        localFallback: true,
        savedBy: username || currentUserId || null,
        rawFormData: opts.rawFormData || null,
      };

      localRegs.push(reg);
      localStorage.setItem(key, JSON.stringify(localRegs));
      try { localStorage.setItem(getLocalNotifyKey(), String(Date.now())); } catch (e) {}

      // update registeredMap & events immediately
      setRegisteredMap((m) => ({ ...(m || {}), [eventId]: { registered: true, date: timestamp, status: reg.status, raw: reg } }));

      setEvents((prev) =>
        prev.map((p) =>
          normalizeId(p._id ?? p.id ?? p.eventId) === eventId ? { ...p, registered: true, regInfo: { registered: true, date: timestamp, status: reg.status, raw: reg } } : p
        )
      );

      alert("Saved locally — you will appear as registered in the UI. You can sync this later.");
      return reg;
    } catch (err) {
      console.error("saveLocalRegistration err", err);
      alert("Failed to save locally.");
      return null;
    }
  };

  const clearLocalRegistration = (evOrReg) => {
    try {
      const key = getLocalKey();
      const localRegs = JSON.parse(localStorage.getItem(key) || "[]");
      let kept;
      // evOrReg might be event object or registration object
      if (evOrReg && evOrReg.eventId) {
        const targetId = String(evOrReg.eventId);
        kept = localRegs.filter((r) => String(r.eventId) !== targetId || r.localFallback !== true);
      } else {
        // if passed event object
        const eventId = normalizeId(evOrReg?._id ?? evOrReg?.id ?? evOrReg?.eventId) || null;
        if (eventId) kept = localRegs.filter((r) => String(r.eventId) !== String(eventId) || r.localFallback !== true);
        else kept = localRegs.filter((r) => !r.localFallback);
      }
      localStorage.setItem(key, JSON.stringify(kept));
      try { localStorage.setItem(getLocalNotifyKey(), String(Date.now())); } catch (e) {}

      // update UI map
      const eventId = normalizeId(evOrReg?._id ?? evOrReg?.id ?? evOrReg?.eventId) || (evOrReg && evOrReg.eventId) || null;
      if (eventId) {
        setRegisteredMap((m) => {
          const copy = { ...(m || {}) };
          delete copy[eventId];
          return copy;
        });
        setEvents((prev) => prev.map((p) => (normalizeId(p._id ?? p.id ?? p.eventId) === eventId ? { ...p, registered: false, regInfo: undefined } : p)));
      } else {
        // fallback: rebuild map on next load
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.warn("clearLocalRegistration error", err);
    }
  };

  // ---------- Check registration closed ----------
  const isDateOnlyClosed = (dateLike) => {
    if (!dateLike) return false;
    const parsed = Date.parse(dateLike);
    if (isNaN(parsed)) return false;
    const deadline = new Date(parsed);
    const dDead = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()).getTime();
    const now = new Date();
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return dNow >= dDead;
  };

  const isRegistrationClosed = (ev) => {
    const candidates = [
      ev.closeDate,
      ev.registrationDeadline,
      ev.registrationClose,
      ev.close_at,
      ev.registration_close,
      ev.deadline,
      ev.endDate,
      ev.end_date,
      ev.closeDateTime,
    ];

    for (const c of candidates) {
      if (c && isDateOnlyClosed(c)) return true;
    }

    const seats = ev.seats ?? ev.capacity ?? ev.maxSeats ?? ev.totalSeats;
    const regCount = ev.registeredCount ?? ev.registrationsCount ?? ev.registeredNumber ?? (Array.isArray(ev.registrations) ? ev.registrations.length : undefined);

    if (typeof seats === "number" && typeof regCount === "number" && regCount >= seats) return true;

    if (ev.registrationClosed === true || ev.isClosed === true) return true;

    return false;
  };

  // ---------- Load events + my registrations (reads per-user local storage) ----------
  useEffect(() => {
    if (!token) {
      navigate("/student-login");
      return;
    }
    loadAll();

    const onStorage = (e) => {
      // only respond to the per-user notifications (so other users don't affect this user)
      if (e.key === getLocalNotifyKey() || e.key === "events:updated") {
        setRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, token, refreshKey]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(token);
      const arr = Array.isArray(data) ? data : data?.events ?? [];

      // filter: approved + form/link exists
      const filtered = arr.filter(
        (ev) =>
          ev &&
          (!ev.status || (typeof ev.status === "string" && ev.status.toLowerCase() === "approved")) &&
          ((Array.isArray(ev.formSchema) && ev.formSchema.length > 0) || (ev.formLink && ev.formLink.trim() !== ""))
      );

      // Build registration map
      const myMap = {};
      let regsArray = [];

      try {
        let myRegs = null;
        if (typeof api.getMyRegistrations === "function") {
          myRegs = await api.getMyRegistrations(token);
        } else if (typeof api.getRegistrationsForMe === "function") {
          myRegs = await api.getRegistrationsForMe(token);
        }
        regsArray = Array.isArray(myRegs) ? myRegs : (myRegs?.registrations ?? myRegs?.data ?? []);
      } catch (err) {
        regsArray = [];
      }

      // fallback to per-user localStorage registrations if none returned
      if (!Array.isArray(regsArray) || regsArray.length === 0) {
        try {
          const key = getLocalKey();
          const localRegs = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(localRegs) && localRegs.length > 0) regsArray = localRegs;
        } catch {
          // ignore
        }
      }

      if (Array.isArray(regsArray)) {
        regsArray.forEach((r) => {
          try {
            let evRef = null;
            if (r.event && typeof r.event === "object") {
              evRef = r.event._id ?? r.event.id ?? r.event;
            } else if (r.eventId) {
              evRef = r.eventId;
            } else if (r.event_id) {
              evRef = r.event_id;
            } else if (r.event) {
              evRef = r.event;
            } else if (r.eventRef) {
              evRef = r.eventRef;
            } else if (r.registration && r.registration.event) {
              evRef = r.registration.event;
            } else if (r.eventIdObject && r.eventIdObject._id) {
              evRef = r.eventIdObject._id;
            }

            const evId = normalizeId(evRef);
            const date = r.date ?? r.registeredAt ?? r.createdAt ?? r.when ?? null;
            const status = r.status ?? r.registrationStatus ?? "Registered";

            if (evId) {
              myMap[evId] = { registered: true, date, status, raw: r };
            } else {
              const title = r.eventTitle ?? r.eventName ?? r.title ?? null;
              const evDate = r.eventDate ?? r.date ?? r.when ?? null;
              if (title) {
                const key = `bytitle:${String(title).trim().toLowerCase()}|${evDate ? new Date(evDate).toDateString() : ""}`;
                myMap[key] = { registered: true, date, status, raw: r, byTitle: true, titleMatch: title, evDate };
              }
            }
          } catch (e) {
            console.warn("Failed to parse registration item", r, e);
          }
        });
      }

      // Annotate events using normalized ids and myMap
      const withStatus = filtered.map((ev) => {
        const id = normalizeId(ev._id ?? ev.id ?? ev.eventId ?? ev.event?._id ?? ev._id?.toString());
        if (id && myMap[id]) {
          return { ...ev, registered: true, regInfo: myMap[id] };
        }
        if (id) {
          const altId = String(Number(id)) !== "NaN" ? String(Number(id)) : null;
          if (altId && myMap[altId]) return { ...ev, registered: true, regInfo: myMap[altId] };
        }
        const titleKey = `bytitle:${String((ev.title || "").trim().toLowerCase())}|${ev.date ? new Date(ev.date).toDateString() : ""}`;
        if (myMap[titleKey] && myMap[titleKey].byTitle) {
          return { ...ev, registered: true, regInfo: myMap[titleKey] };
        }
        const titleOnlyKey = `bytitle:${String((ev.title || "").trim().toLowerCase())}|`;
        if (myMap[titleOnlyKey]) {
          return { ...ev, registered: true, regInfo: myMap[titleOnlyKey] };
        }
        return { ...ev, registered: false };
      });

      setEvents(withStatus);
      setRegisteredMap(myMap);
    } catch (err) {
      console.error("Error loading events:", err);
      setEvents([]);
      setRegisteredMap({});
    } finally {
      setLoading(false);
    }
  };

  // ---------- Attempt to sync local registrations to server (per-user) ----------
  const syncLocalRegistrations = async () => {
    try {
      const key = getLocalKey();
      const localRegs = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(localRegs) || localRegs.length === 0) {
        alert("No local registrations to sync.");
        return;
      }

      let successCount = 0;
      let failCount = 0;
      for (const reg of localRegs.slice()) {
        if (!reg.localFallback) continue; // skip non-local entries
        try {
          // best-effort attempt - try the most common server endpoints
          const endpoints = [
            `/events/${reg.eventId}/registrations`,
            `/events/${reg.eventId}/register`,
            `/events/${reg.eventId}/register-user`,
          ];
          let posted = false;

          for (const ep of endpoints) {
            try {
              if (typeof api.rawRequest === "function") {
                const res = await api.rawRequest(ep, { method: "POST", body: reg, token });
                if (res.ok) {
                  posted = true;
                  break;
                }
              } else {
                const res = await fetch(ep, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(reg),
                });
                if (res.ok) {
                  posted = true;
                  break;
                }
              }
            } catch {
              // try next endpoint
            }
          }

          if (posted) {
            successCount++;
            clearLocalRegistration(reg);
          } else {
            failCount++;
          }
        } catch (err) {
          console.warn("Sync failed for reg", reg, err);
          failCount++;
        }
      }

      alert(`Sync finished. Success: ${successCount}, Failed: ${failCount}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("syncLocalRegistrations", err);
      alert("Failed to sync local registrations.");
    }
  };

  // ---------- Registration action (with local fallback) ----------
  const handleRegister = async (ev) => {
    const id = normalizeId(ev._id ?? ev.id ?? ev.eventId);
    const regInfo = registeredMap[id] ?? ev.regInfo ?? (ev.registered ? { registered: true, date: ev.regInfo?.date ?? null } : null);
    if (regInfo?.registered) {
      alert("You are already registered for this event.");
      return;
    }

    if (isRegistrationClosed(ev)) {
      alert("Registration for this event is closed.");
      return;
    }

    // If there's a registration form (internal), navigate to it (original behavior)
    if (Array.isArray(ev.formSchema) && ev.formSchema.length > 0) {
      navigate(`/student/event-form/${ev._id}`);
      return;
    }

    // If there's an external link, open it and optionally mark local on confirmation
    if (ev.formLink && ev.formLink.trim() !== "") {
      try {
        window.open(ev.formLink, "_blank", "noopener,noreferrer");
        const completed = window.confirm("Did you complete the external registration form? (Yes = mark as registered locally)");
        if (completed) {
          saveLocalRegistration(ev);
        }
        return;
      } catch (err) {
        console.warn("Failed to open external link", err);
      }
    }

    // Try a server quick-register (if your backend supports POST /events/:id/register)
    try {
      const tryEndpoints = [
        `/events/${ev._id}/register`,
        `/events/${ev._id}/registrations`,
        `/events/${ev._id}/register-user`,
      ];
      let registeredOnServer = false;
      for (const ep of tryEndpoints) {
        try {
          if (typeof api.rawRequest === "function") {
            const res = await api.rawRequest(ep, { method: "POST", body: { student: username }, token });
            if (res.ok) {
              registeredOnServer = true;
              break;
            }
          } else {
            const res = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ student: username }),
            });
            if (res.ok) {
              registeredOnServer = true;
              break;
            }
          }
        } catch {
          // try next endpoint
        }
      }

      if (registeredOnServer) {
        alert("Registered with server ✅");
        setRefreshKey((k) => k + 1);
        return;
      }
    } catch (err) {
      console.warn("Server registration attempts failed", err);
    }

    // If we reach here, server registration didn't happen — ask to save locally
    const ok = window.confirm(
      "Registration request failed (server or no form). Would you like to save your registration locally so it shows as registered in the UI?"
    );
    if (!ok) return;

    saveLocalRegistration(ev);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/student-login");
  };

  // ---------- small helpers for UI ----------
  const initials = (displayName || username || "S")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fmtDate = (d) => {
    try {
      if (!d) return "TBA";
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleString();
    } catch {
      return d;
    }
  };

  const types = useMemo(() => {
    const set = new Set();
    events.forEach((e) => { if (e.type) set.add(e.type); });
    return ["all", ...Array.from(set)];
  }, [events]);

  const visibleEvents = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = events.slice();

    if (filterType !== "all") {
      list = list.filter((e) => (e.type || "").toLowerCase() === filterType.toLowerCase());
    }

    if (ql) {
      list = list.filter((e) => {
        const hay = `${e.title || ""} ${e.description || ""} ${(e.venue || "").toString()} ${(e.organizer || "")}`.toLowerCase();
        return hay.includes(ql);
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.date || a.createdAt || null).getTime() || 0;
      const db = new Date(b.date || b.createdAt || null).getTime() || 0;
      return sort === "newest" ? db - da : da - db;
    });

    return list;
  }, [events, q, sort, filterType]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // ---------- UI (keeps your styling) ----------
  return (
    <>
      <style>{`
        :root{ --primary: #1a55c4ff; --primary-dark:#0b948c; --bg:#f8fafc; --card:#fff; --muted:#6b7280; --border:#e6e7eb; --text:#0f172a; --radius:12px; }
        body{ background:var(--bg); margin:0; font-family:Inter, Poppins, system-ui, sans-serif; color:var(--text);} 
        .topbar{ display:flex; justify-content:space-between; align-items:center; padding:14px 28px; background:linear-gradient(90deg,var(--primary),var(--primary-dark)); color:white; box-shadow:0 6px 20px rgba(2,6,23,0.12); position:sticky; top:0; z-index:40}
        .main-full{ width:100%; display:grid; grid-template-columns: 1fr 320px; gap:20px; padding:26px; box-sizing:border-box}
        @media (max-width:980px){ .main-full{ grid-template-columns:1fr; padding:18px } .profile-card{ position:static } }

        .header-row{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap }
        .controls{ display:flex; gap:10px; align-items:center }
        .search{ padding:10px 12px; border-radius:10px; border:1px solid var(--border); width:340px }
        .select{ padding:10px 12px; border-radius:10px; border:1px solid var(--border) }

        .event-list{ display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px }
        .event-card{ background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:14px; box-shadow:0 8px 24px rgba(2,6,23,0.04); display:flex; flex-direction:column; justify-content:space-between }
        .event-title{ font-weight:700; font-size:16px; margin:0 0 6px 0 }
        .meta{ color:var(--muted); font-size:13px }
        .desc{ color:var(--muted); font-size:14px; min-height:44px; margin-top:8px }
        .btn-row{ display:flex; gap:10px; align-items:center; margin-top:12px }
        .btn{ padding:10px 12px; border-radius:10px; border:none; font-weight:700; cursor:pointer }
        .btn-primary{ background:linear-gradient(90deg,var(--primary),var(--primary-dark)); color:white }
        .btn-muted{ background:#f3f4f6; color:#111827 }

        .profile-card{ position:sticky; top:94px; background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px; box-shadow:0 8px 20px rgba(2,6,23,0.04); display:flex; flex-direction:column; gap:12px }
        .avatar{ width:64px; height:64px; border-radius:12px; background:linear-gradient(135deg,#7c3aed,#06b6d4); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:20px }

        .pill{ display:inline-block; padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px }
        .pill.green{ background:#f0fdf4; color:#166534 }
        .pill.gray{ background:#f3f4f6; color:#111827 }
        .pill.red{ background:#fff1f2; color:#991b1b }
        .pill.blue{ background:#eef2ff; color:#3730a3 }

        .small-muted{ color:var(--muted); font-size:13px }
        .empty{ grid-column:1/-1; color:var(--muted); padding:18px }
      `}</style>

      <div>
        <div className="topbar">
          <div>
            <h1 style={{ margin: 0, fontSize: 18 }}>🎓 Student Dashboard</h1>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ color: "white", fontWeight: 700 }}>{username || "Student"}</div>
            <button
              onClick={() => refresh()}
              style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", padding: "8px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{ background: "#ef4444", border: "none", color: "white", padding: "8px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="main-full">
          <div className="content">
            <div className="header-row">
              <div className="header-left">
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Welcome, {displayName || "Student"}</h2>
                <p style={{ marginTop: 6, color: "#6b7280" }}>Browse approved events and register. Use search and filters to find what you need.</p>
              </div>

              <div className="controls">
                <input className="search" placeholder="Search events by title, venue, organizer..." value={q} onChange={(e) => setQ(e.target.value)} />

                <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  {types.map((t) => (
                    <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
                  ))}
                </select>

                <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            <div className="event-list">
              {loading ? (
                <div className="empty">Loading events…</div>
              ) : visibleEvents.length === 0 ? (
                <div className="empty">No active events available for registration.</div>
              ) : (
                visibleEvents.map((ev) => {
                  const eventId = normalizeId(ev._id ?? ev.id ?? ev.eventId) || ev.title;
                  const regInfo = registeredMap[eventId] ?? ev.regInfo ?? (ev.registered ? { registered: true, date: ev.regInfo?.date ?? null } : null);
                  const closed = isRegistrationClosed(ev);

                  const seats = ev.seats ?? ev.capacity ?? ev.maxSeats ?? ev.totalSeats;
                  const regCount = ev.registeredCount ?? ev.registrationsCount ?? ev.registeredNumber ?? (Array.isArray(ev.registrations) ? ev.registrations.length : undefined);
                  const seatsLeft = typeof seats === "number" && typeof regCount === "number" ? Math.max(0, seats - regCount) : null;

                  return (
                    <div key={eventId || ev.title} className="event-card" aria-label={`Event ${ev.title}`}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div className="event-title">{ev.title}</div>
                            <div className="meta">📅 {fmtDate(ev.date)} &nbsp; | &nbsp; 📍 {ev.venue || "TBA"}</div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div className={`pill ${ev.type ? 'blue' : 'gray'}`} style={{ marginBottom: 6 }}>{ev.type || 'Event'}</div>
                            <div className="small-muted" style={{ marginTop: 6 }}>{seatsLeft !== null ? `${seatsLeft} seats left` : (ev.seats ? `${ev.seats} seats` : 'Open')}</div>
                          </div>
                        </div>

                        <div className="desc">{ev.description || "No description provided."}</div>

                        {ev.results && ev.results.length > 0 && (
                          <div style={{ marginTop: 10, background: "#f8fafc", padding: 10, borderRadius: 8 }}>
                            <strong>Winners:</strong>
                            <div style={{ color: "var(--muted)", marginTop: 6 }}>
                              {ev.results.slice(0, 3).map((r) => `${r.rank}. ${r.name}`).join(" • ")}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="btn-row">
                        {regInfo?.registered ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="pill green">✅ Registered</div>
                            {regInfo.date && <div style={{ fontSize: 12, color: 'var(--muted)' }}>on {fmtDate(regInfo.date)}</div>}
                            <button className="btn btn-muted" onClick={() => navigate(`/student/event/${eventId}`)}>View</button>
                          </div>
                        ) : closed ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="pill red">🔒 Registration Closed</div>
                            <button className="btn btn-muted" onClick={() => navigate(`/student/event/${eventId}`)}>View</button>
                          </div>
                        ) : (
                          <>
                            <button className="btn btn-primary" onClick={() => handleRegister(ev)}>Register</button>
                            <button className="btn btn-muted" onClick={() => navigate(`/student/event/${eventId}`)}>View</button>
                          </>
                        )}

                        <button className="btn btn-muted" onClick={() => refresh()}>Refresh</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Profile card */}
          <aside className="profile-card" aria-label="Student profile">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div className="avatar" aria-hidden>{initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{displayName || username || "Student"}</div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>@{username || "student"}</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              <div><strong>Role:</strong> Student</div>
              <div style={{ marginTop: 8 }}>
                <strong>Logged in with token:</strong>
                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12, wordBreak: "break-all" }}>{token ? `${token.slice(0, 20)}…` : '—'}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="btn btn-primary" onClick={() => navigate("/student-profile")} style={{ flex: 1 }}>
                Edit Profile
              </button>
              <button className="btn btn-muted" onClick={handleLogout} style={{ flex: 1 }}>
                Logout
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}><strong>Quick filters</strong></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className={`pill ${filterType==='all' ? 'green' : 'gray'}`} onClick={() => setFilterType('all')}>All</button>
                {types.slice(1,5).map((t) => (
                  <button key={t} className={`pill ${filterType===t ? 'green' : 'gray'}`} onClick={() => setFilterType(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn btn-light" onClick={syncLocalRegistrations} style={{ width: "100%", padding: 10, borderRadius: 10 }}>
                Sync local registrations
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
