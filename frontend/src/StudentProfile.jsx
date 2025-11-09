// src/StudentProfile.jsx
import React, { useEffect, useState, useRef } from "react";
import "./StudentProfile.css";
import { useNavigate } from "react-router-dom";

/*
 StudentProfile.jsx
 - Shows student details (left) and a neat Events/Registrations list (right)
 - Tries to fetch registrations from backend: GET /student/registrations
 - Falls back to localStorage.registrations if backend not available
 - Edit profile (saves locally and attempts server update if token exists)
*/

export default function StudentProfile({ baseUrl = "https://hacthon-stackhack.onrender.com" }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const fileRef = useRef(null);

  const loadStored = () => {
    try {
      return JSON.parse(localStorage.getItem("student")) || {};
    } catch {
      return {};
    }
  };

  const [profile, setProfile] = useState(() => {
    const s = loadStored();
    return {
      name: s.name || "",
      email: s.email || "",
      username: s.username || localStorage.getItem("username") || "",
      roll: s.roll || "",
      branch: s.branch || "",
      avatar: s.avatar || "",
    };
  });

  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [registrations, setRegistrations] = useState([]); // event list
  const [loadingRegs, setLoadingRegs] = useState(false);

  // helper api wrapper (simple)
  const apiRequest = async (endpoint, { method = "GET", body } = {}) => {
    const url = `${baseUrl}${endpoint}`;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || res.statusText || "Request failed");
    return data;
  };

  useEffect(() => {
    // try to load registrations from server -> fallback to localStorage
    const loadRegs = async () => {
      setLoadingRegs(true);
      try {
        if (token) {
          const data = await apiRequest("/student/registrations", { method: "GET" });
          // expect an array of { event, date, status, meta? }
          if (Array.isArray(data)) setRegistrations(data);
          else if (Array.isArray(data.registrations)) setRegistrations(data.registrations);
        } else {
          // no token -> fallback
          const localRegs = JSON.parse(localStorage.getItem("registrations") || "[]");
          setRegistrations(Array.isArray(localRegs) ? localRegs : []);
        }
      } catch (err) {
        // fallback to localStorage
        try {
          const localRegs = JSON.parse(localStorage.getItem("registrations") || "[]");
          setRegistrations(Array.isArray(localRegs) ? localRegs : []);
        } catch {
          setRegistrations([]);
        }
      } finally {
        setLoadingRegs(false);
      }
    };
    loadRegs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // validate fields before saving
  function validate(vals) {
    const e = {};
    if (!vals.username || vals.username.trim().length < 3) e.username = "Username at least 3 chars.";
    if (vals.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)) e.email = "Invalid email.";
    if (!vals.roll || vals.roll.trim().length < 2) e.roll = "Registration number required.";
    if (vals.branch && vals.branch.length > 30) e.branch = "Branch too long.";
    if (password && password.length > 0 && password.length < 6) e.password = "Password must be 6+ chars.";
    return e;
  }

  const startEdit = () => {
    setErrors({});
    setMessage("");
    setPassword("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setErrors({});
    setPassword("");
    setMessage("");
    // reload from storage to discard changes
    const s = loadStored();
    setProfile({
      name: s.name || "",
      email: s.email || "",
      username: s.username || localStorage.getItem("username") || "",
      roll: s.roll || "",
      branch: s.branch || "",
      avatar: s.avatar || "",
    });
    setEditing(false);
  };

  const handleChange = (field, value) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const onFile = (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setProfile((p) => ({ ...p, avatar: url }));
    try {
      const s = JSON.parse(localStorage.getItem("student") || "{}") || {};
      s.avatar = url;
      localStorage.setItem("student", JSON.stringify(s));
    } catch {}
  };

  const saveProfile = async () => {
    const vals = { ...profile };
    const errs = validate(vals);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setMessage("Please fix errors.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      // attempt server update if token present
      if (token) {
        const body = {
          name: vals.name,
          email: vals.email,
          username: vals.username,
          roll: vals.roll,
          branch: vals.branch,
        };
        if (password) body.password = password;
        // update endpoint - adjust to backend API shape if needed
        await apiRequest("/student/update", { method: "PUT", body });
      }

      // always persist locally
      const stored = {
        name: vals.name,
        email: vals.email,
        username: vals.username,
        roll: vals.roll,
        branch: vals.branch,
        avatar: vals.avatar || undefined,
        _savedAt: new Date().toISOString(),
      };
      localStorage.setItem("student", JSON.stringify(stored));
      if (stored.username) localStorage.setItem("username", stored.username);

      setMessage("Profile saved.");
      setEditing(false);
      setPassword("");
    } catch (err) {
      console.warn("Save failed, saved locally:", err.message || err);
      // fallback to local save
      try {
        const stored = {
          name: vals.name,
          email: vals.email,
          username: vals.username,
          roll: vals.roll,
          branch: vals.branch,
          avatar: vals.avatar || undefined,
          _savedAt: new Date().toISOString(),
        };
        localStorage.setItem("student", JSON.stringify(stored));
        if (stored.username) localStorage.setItem("username", stored.username);
        setMessage("Saved locally (server unavailable).");
        setEditing(false);
        setPassword("");
      } catch (e) {
        setMessage("Failed to save profile.");
        console.error(e);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/student-login");
  };

  // small helper to format date strings nicely
  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      if (isNaN(d)) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="profile-wrapper" style={{ maxWidth: 1100, margin: "28px auto", padding: 10 }}>
      <div className="sr-card" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 18 }}>
        {/* LEFT: profile card */}
        <div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 8 }}>
            <div className="sr-avatar large" aria-hidden>
              {profile.avatar ? <img src={profile.avatar} alt="avatar" /> : (profile.name ? profile.name.split(" ").map(n => n[0]).slice(0,2).join("") : "S")}
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="sr-title" style={{ margin: 0 }}>{profile.name || "—"}</h2>
              <p className="sr-sub" style={{ margin: "6px 0 0 0" }}>@{profile.username || "—"}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sr-btn sr-btn-ghost" onClick={() => navigate(-1)}>← Back</button>
              <button className="sr-btn sr-btn-danger" onClick={handleLogout}>Logout</button>
            </div>
          </div>

          {!editing ? (
            <>
              <div className="sr-grid display">
                <div className="display-field">
                  <label>Full name</label>
                  <div className="display-value">{profile.name || "—"}</div>
                </div>
                <div className="display-field">
                  <label>Email</label>
                  <div className="display-value">{profile.email || "—"}</div>
                </div>
                <div className="display-field">
                  <label>Username</label>
                  <div className="display-value">{profile.username || "—"}</div>
                </div>
                <div className="display-field">
                  <label>Password</label>
                  <div className="display-value">{"•".repeat(showPassword ? (password || 8) : 8)}</div>
                </div>
                <div className="display-field">
                  <label>Registration No (Roll)</label>
                  <div className="display-value">{profile.roll || "—"}</div>
                </div>
                <div className="display-field">
                  <label>Branch</label>
                  <div className="display-value">{profile.branch || "—"}</div>
                </div>
              </div>

              <div className="sr-actions" style={{ marginTop: 16 }}>
                <button className="sr-btn sr-btn-primary" onClick={startEdit}>Edit Profile</button>
                <button className="sr-btn sr-btn-ghost" onClick={() => navigator.clipboard?.writeText(JSON.stringify(profile))}>Export JSON</button>
              </div>
            </>
          ) : (
            <>
              <form className="sr-grid" onSubmit={(e) => { e.preventDefault(); saveProfile(); }}>
                <label className="sr-field">
                  <span className="sr-label">Full name</span>
                  <input name="name" value={profile.name} onChange={(e) => handleChange("name", e.target.value)} />
                </label>

                <label className="sr-field">
                  <span className="sr-label">Email</span>
                  <input name="email" type="email" value={profile.email} onChange={(e) => handleChange("email", e.target.value)} />
                  {errors.email && <div className="sr-error">{errors.email}</div>}
                </label>

                <label className="sr-field">
                  <span className="sr-label">Username</span>
                  <input name="username" value={profile.username} onChange={(e) => handleChange("username", e.target.value)} />
                  {errors.username && <div className="sr-error">{errors.username}</div>}
                </label>

                <label className="sr-field">
                  <span className="sr-label">Password</span>
                  <div className="sr-password-row">
                    <input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep existing" />
                    <button type="button" className="sr-toggle" onClick={() => setShowPassword(s => !s)}>{showPassword ? "Hide" : "Show"}</button>
                  </div>
                  {errors.password && <div className="sr-error">{errors.password}</div>}
                </label>

                <label className="sr-field">
                  <span className="sr-label">Registration No (Roll)</span>
                  <input name="roll" value={profile.roll} onChange={(e) => handleChange("roll", e.target.value)} />
                  {errors.roll && <div className="sr-error">{errors.roll}</div>}
                </label>

                <label className="sr-field">
                  <span className="sr-label">Branch</span>
                  <input name="branch" value={profile.branch} onChange={(e) => handleChange("branch", e.target.value)} />
                  {errors.branch && <div className="sr-error">{errors.branch}</div>}
                </label>

                <label className="sr-field file-field">
                  <span className="sr-label">Avatar (preview only)</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="sr-btn sr-btn-ghost" onClick={() => fileRef.current?.click()}>Choose file</button>
                    <div style={{ minWidth: 64, minHeight: 40 }}>
                      {profile.avatar ? <img src={profile.avatar} alt="avatar" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ width: 64, height: 40, borderRadius: 6, background: "#eef6fb" }} />}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
                  </div>
                </label>

                <div className="sr-actions">
                  <button className="sr-btn sr-btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
                  <button className="sr-btn sr-btn-ghost" type="button" onClick={cancelEdit} disabled={saving}>Cancel</button>
                </div>
              </form>
            </>
          )}

          {message && <div className="sr-msg" style={{ marginTop: 12 }}>{message}</div>}
        </div>

        {/* RIGHT: Registrations / Events list */}
        <aside style={{ borderLeft: "1px solid #f0f6f8", paddingLeft: 18 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 800 }}>Registrations</h3>
          <p style={{ marginTop: 0, marginBottom: 12, color: "#6b7280", fontSize: 13 }}>Events you have registered for</p>

          {loadingRegs ? (
            <div style={{ color: "#6b7280" }}>Loading…</div>
          ) : registrations.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No registrations yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {registrations.map((r, idx) => {
                // normalize r to expected shape
                const evName = r.event ?? r.name ?? r.title ?? "Untitled event";
                const evDate = r.date ?? r.registeredAt ?? r.createdAt ?? r.when ?? "";
                const evStatus = r.status ?? r.state ?? "Registered";
                return (
                  <div key={idx} style={{ background: "#fbfeff", border: "1px solid #eef8fb", padding: 10, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{evName}</div>
                      <div style={{ color: "#6b7280", fontSize: 13 }}>{fmtDate(evDate)}</div>
                    </div>

                    <div style={{ textAlign: "right", display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 13, color: evStatus === "Registered" ? "#0b9448" : "#92400e" }}>{evStatus}</div>
                      <button className="sr-btn sr-btn-ghost" onClick={() => alert(`Show details for ${evName}`)}>View</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
