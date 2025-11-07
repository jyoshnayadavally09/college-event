// src/components/EventRegisterForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * EventRegisterForm
 *
 * Props:
 *   - event: optional. If passed, component uses it. Otherwise it reads eventId from useParams()
 *
 * Behavior:
 *   - If event/formSchema not present, try to fetch event via GET /events and find by id.
 *   - Checks registration status for current student via GET /events/:id/registrations/check (Authorization Bearer token).
 *   - If already registered -> show saved responses (read-only).
 *   - If not registered -> render formSchema, prefill from localStorage.student or /student/profile, POST responses to /events/:id/register.
 *   - On successful register: store localStorage registered_<eventId> marker, navigate to /student-home (so StudentHome instantly reflects status).
 */

export default function EventRegisterForm({ event: propEvent }) {
  const params = useParams();
  const navigate = useNavigate();
  const routeEventId = params.eventId;
  const [event, setEvent] = useState(propEvent || null);

  const [loadingEvent, setLoadingEvent] = useState(!propEvent && !!routeEventId);
  const [checking, setChecking] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [savedRegistration, setSavedRegistration] = useState(null);

  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token");

  // helper: fetch event if not provided
  useEffect(() => {
    let mounted = true;
    async function loadEvent() {
      if (propEvent) return;
      if (!routeEventId) {
        setLoadingEvent(false);
        return;
      }
      setLoadingEvent(true);
      try {
        const res = await fetch("http://localhost:5000/events");
        if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.events ?? [];
        const ev = arr.find((e) => (e._id ?? e.id) === routeEventId);
        if (mounted) {
          setEvent(ev || null);
        }
      } catch (err) {
        console.error("Failed to load event:", err);
        if (mounted) setEvent(null);
      } finally {
        if (mounted) setLoadingEvent(false);
      }
    }
    loadEvent();
    return () => { mounted = false; };
  }, [propEvent, routeEventId]);

  // helper: load student snapshot from localStorage or (optionally) refresh from server
  const getLocalStudent = async () => {
    try {
      const s = localStorage.getItem("student");
      if (s) {
        const parsed = JSON.parse(s);
        // if missing key details, try profile endpoint
        const needKeys = ["name", "email", "roll", "branch"];
        const hasAll = needKeys.every((k) => parsed && parsed[k]);
        if (!hasAll && token) {
          try {
            const res = await fetch("http://localhost:5000/student/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const full = await res.json();
              const merged = { ...parsed, ...full };
              localStorage.setItem("student", JSON.stringify(merged));
              return merged;
            }
          } catch (e) {
            // ignore
          }
        }
        return parsed;
      }
      // no local student; try token-based profile
      if (token) {
        try {
          const res = await fetch("http://localhost:5000/student/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const full = await res.json();
            localStorage.setItem("student", JSON.stringify(full));
            return full;
          }
        } catch (e) {
          // ignore
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  // initialize values from event.formSchema and prefill with local student if possible
  useEffect(() => {
    if (!event) return;
    const init = {};
    const s = JSON.parse(localStorage.getItem("student") || "null");
    (event.formSchema || []).forEach((f) => {
      // allow common keys: id, label. Prefill from student snapshot if possible.
      const key = f.id;
      if (f.type === "checkbox") init[key] = [];
      else init[key] = (s && (s[key] ?? s[key.toLowerCase()] ?? s[key.toUpperCase()] ?? "")) || "";
    });
    setValues(init);
  }, [event]);

  // check if student already registered (via token)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!event || !event._id) {
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`http://localhost:5000/events/${event._id}/registrations/check`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          // 400 means token not provided or server can't check; treat as not registered
          const text = await res.text().catch(() => "");
          console.debug("registrations/check returned non-ok:", res.status, text);
          if (mounted) setRegistered(false);
          return;
        }

        const data = await res.json();
        if (mounted && data.registered) {
          setRegistered(true);
          setSavedRegistration(data.registration || null);
          setStatusMsg("You have already registered for this event.");
        } else {
          if (mounted) {
            setRegistered(false);
            setSavedRegistration(null);
          }
        }
      } catch (err) {
        console.error("Error checking registration:", err);
        if (mounted) setRegistered(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, [event, token]);

  const setField = (id, v) => setValues((p) => ({ ...p, [id]: v }));

  const handleCheckboxToggle = (id, option) => {
    setValues((prev) => {
      const arr = Array.isArray(prev[id]) ? [...prev[id]] : [];
      if (arr.includes(option)) return { ...prev, [id]: arr.filter((x) => x !== option) };
      arr.push(option);
      return { ...prev, [id]: arr };
    });
  };

  const validateRequired = () => {
    const missing = (event.formSchema || []).filter((f) => f.required && (
      f.type === "checkbox" ? !(Array.isArray(values[f.id]) && values[f.id].length > 0) : !values[f.id]
    ));
    return missing;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setStatusMsg("");

    if (!event || !event._id) {
      setErrorMsg("Event not loaded.");
      return;
    }

    const missing = validateRequired();
    if (missing.length) {
      setErrorMsg("Please fill required fields: " + missing.map(m => m.label).join(", "));
      return;
    }

    setSubmitting(true);
    try {
      // prefer authoritative student profile from token (server will do same)
      const localStudent = await getLocalStudent();
      const payload = { responses: values, student: localStudent || null };

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`http://localhost:5000/events/${event._id}/register`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        // duplicate - server will return existing registration
        setRegistered(true);
        setSavedRegistration(data.registration || null);
        setStatusMsg(data.message || "Already registered");
        // still write local marker so StudentHome updates instantly
        try {
          localStorage.setItem(`registered_${event._id}`, JSON.stringify(data.registration || { responses: values }));
        } catch (e) { /* ignore */ }
        setSubmitting(false);
        // navigate back so StudentHome shows updated state
        navigate("/student-home");
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.message || "Registration failed");
        setSubmitting(false);
        return;
      }

      // success
      const saved = data.registration || { registrationId: data.registrationId, responses: values };
      setRegistered(true);
      setSavedRegistration(saved);
      setStatusMsg("Registered successfully!");

      // write a short localStorage marker so StudentHome sees instant result
      try {
        localStorage.setItem(`registered_${event._id}`, JSON.stringify(saved));
      } catch (e) {
        console.warn("Could not write registered marker", e);
      }

      setSubmitting(false);
      // navigate back to student home (so it re-checks and shows Registered). You can change route if needed.
      navigate("/student-home");
    } catch (err) {
      console.error("Registration error:", err);
      setErrorMsg("Network error - try again");
      setSubmitting(false);
    }
  };

  if (loadingEvent) return <div style={{ padding: 20 }}>Loading event…</div>;
  if (!event) return <div style={{ padding: 20 }}>Event not found.</div>;

  // If still checking registration, show small loader
  if (checking) return <div style={{ padding: 20 }}>Checking registration status…</div>;

  // If already registered, show saved registration read-only
  if (registered) {
    return (
      <div style={{ maxWidth: 900, margin: "20px auto", padding: 16, background: "#fff", borderRadius: 8 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>
        <h3 style={{ marginTop: 0 }}>You’re registered — {event.title}</h3>
        {statusMsg && <div style={{ color: "green", marginBottom: 12 }}>{statusMsg}</div>}

        {savedRegistration && savedRegistration.responses ? (
          <div style={{ background: "#f7f7f7", padding: 12, borderRadius: 6 }}>
            {Object.entries(savedRegistration.responses).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <strong>{k}:</strong> {Array.isArray(v) ? v.join(", ") : String(v)}
              </div>
            ))}
          </div>
        ) : (
          <p>No saved response snapshot available.</p>
        )}

        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate("/student-home")} style={{ padding: "8px 12px" }}>Go to Events</button>
        </div>
      </div>
    );
  }

  // Not registered -> render the form
  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 18, background: "#fff", borderRadius: 8 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>
      <h3 style={{ marginTop: 0 }}>Register for — {event.title}</h3>
      {errorMsg && <div style={{ color: "crimson", marginBottom: 10 }}>{errorMsg}</div>}
      {statusMsg && <div style={{ color: "green", marginBottom: 10 }}>{statusMsg}</div>}

      <form onSubmit={handleSubmit}>
        {(event.formSchema || []).map((f) => (
          <div key={f.id} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              {f.label} {f.required && <span style={{ color: "red" }}>*</span>}
            </label>

            {["text", "email", "number", "date"].includes(f.type) && (
              <input
                type={f.type}
                value={values[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                required={f.required}
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
              />
            )}

            {f.type === "textarea" && (
              <textarea
                value={values[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                required={f.required}
                style={{ width: "100%", minHeight: 100, padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
              />
            )}

            {f.type === "select" && (
              <select
                value={values[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                required={f.required}
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
              >
                <option value="">Select...</option>
                {(f.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}

            {(f.type === "radio" || f.type === "checkbox") && (
              <div>
                {(f.options || []).map((opt) => (
                  <label key={opt} style={{ display: "block", marginBottom: 6 }}>
                    <input
                      type={f.type}
                      name={f.id}
                      value={opt}
                      checked={f.type === "checkbox"
                        ? Array.isArray(values[f.id]) && values[f.id].includes(opt)
                        : values[f.id] === opt}
                      onChange={() => {
                        if (f.type === "radio") setField(f.id, opt);
                        else handleCheckboxToggle(f.id, opt);
                      }}
                    />{" "}
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={submitting} style={{ background: "#003366", color: "#fff", padding: "8px 12px", borderRadius: 8, border: "none" }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <button type="button" onClick={async () => {
            const s = await getLocalStudent();
            const init = {};
            (event.formSchema || []).forEach((f) => {
              init[f.id] = (s && (s[f.id] ?? s[f.id.toLowerCase()] ?? "")) || (f.type === "checkbox" ? [] : "");
            });
            setValues(init);
            setErrorMsg("");
            setStatusMsg("");
          }} style={{ padding: "8px 12px", borderRadius: 8 }}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
