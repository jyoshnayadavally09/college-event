import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "./api";

/**
 * EventRegisterForm — Unified Student Registration Component
 *
 * ✅ Uses centralized API from api.js (Render safe)
 * ✅ Handles registration check, fetch, and submission
 * ✅ Works both with passed event prop OR via useParams
 * ✅ Gracefully handles already registered state
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

  /** ✅ Load event if not passed as prop */
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
        const allEvents = await api.getEvents(token);
        const ev = Array.isArray(allEvents)
          ? allEvents.find((e) => e._id === routeEventId)
          : allEvents?.events?.find((e) => e._id === routeEventId);
        if (mounted) setEvent(ev || null);
      } catch (err) {
        console.error("Failed to load event:", err);
        if (mounted) setEvent(null);
      } finally {
        if (mounted) setLoadingEvent(false);
      }
    }
    loadEvent();
    return () => {
      mounted = false;
    };
  }, [propEvent, routeEventId, token]);

  /** ✅ Get local student profile snapshot */
  const getLocalStudent = async () => {
    try {
      const s = localStorage.getItem("student");
      if (s) return JSON.parse(s);
      return null;
    } catch {
      return null;
    }
  };

  /** ✅ Prefill form from student details */
  useEffect(() => {
    if (!event) return;
    const init = {};
    const s = JSON.parse(localStorage.getItem("student") || "null");
    (event.formSchema || []).forEach((f) => {
      const key = f.id;
      if (f.type === "checkbox") init[key] = [];
      else
        init[key] =
          (s &&
            (s[key] ??
              s[key?.toLowerCase()] ??
              s[key?.toUpperCase()] ??
              "")) ||
          "";
    });
    setValues(init);
  }, [event]);

  /** ✅ Check if already registered */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!event || !event._id) {
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const res = await fetch(
          `${api.BASE_URL || "https://hacthon-stackhack.onrender.com"}/events/${
            event._id
          }/registrations/check`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (!res.ok) {
          if (mounted) setRegistered(false);
          return;
        }
        const data = await res.json();
        if (mounted && data.registered) {
          setRegistered(true);
          setSavedRegistration(data.registration || null);
          setStatusMsg("You have already registered for this event.");
        } else {
          setRegistered(false);
          setSavedRegistration(null);
        }
      } catch (err) {
        console.error("Error checking registration:", err);
        if (mounted) setRegistered(false);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [event, token]);

  /** ✅ Input helpers */
  const setField = (id, v) => setValues((p) => ({ ...p, [id]: v }));

  const handleCheckboxToggle = (id, option) => {
    setValues((prev) => {
      const arr = Array.isArray(prev[id]) ? [...prev[id]] : [];
      if (arr.includes(option))
        return { ...prev, [id]: arr.filter((x) => x !== option) };
      arr.push(option);
      return { ...prev, [id]: arr };
    });
  };

  /** ✅ Required validation */
  const validateRequired = () => {
    const missing = (event.formSchema || []).filter(
      (f) =>
        f.required &&
        (f.type === "checkbox"
          ? !(Array.isArray(values[f.id]) && values[f.id].length > 0)
          : !values[f.id])
    );
    return missing;
  };

  /** ✅ Submit registration */
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
      setErrorMsg(
        "Please fill required fields: " + missing.map((m) => m.label).join(", ")
      );
      return;
    }

    setSubmitting(true);
    try {
      const localStudent = await getLocalStudent();
      const payload = { responses: values, student: localStudent || null };

      const res = await fetch(
        `${api.BASE_URL || "https://hacthon-stackhack.onrender.com"}/events/${
          event._id
        }/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      // ✅ success
      setRegistered(true);
      setSavedRegistration(data.registration || null);
      localStorage.setItem(
        `registered_${event._id}`,
        JSON.stringify(data.registration || {})
      );
      alert("✅ Registration successful!");
      navigate("/student-home");
    } catch (err) {
      console.error("Registration error:", err);
      setErrorMsg(err.message || "Network error - try again");
    } finally {
      setSubmitting(false);
    }
  };

  // === RENDER STATES ===
  if (loadingEvent) return <div style={{ padding: 20 }}>Loading event…</div>;
  if (!event) return <div style={{ padding: 20 }}>Event not found.</div>;
  if (checking)
    return <div style={{ padding: 20 }}>Checking registration status…</div>;

  // === Registered State ===
  if (registered)
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "20px auto",
          padding: 16,
          background: "#fff",
          borderRadius: 8,
        }}
      >
        <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          ← Back
        </button>
        <h3 style={{ marginTop: 0 }}>You’re registered — {event.title}</h3>
        {statusMsg && (
          <div style={{ color: "green", marginBottom: 12 }}>{statusMsg}</div>
        )}

        {savedRegistration?.responses ? (
          <div style={{ background: "#f7f7f7", padding: 12, borderRadius: 6 }}>
            {Object.entries(savedRegistration.responses).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <strong>{k}:</strong>{" "}
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </div>
            ))}
          </div>
        ) : (
          <p>No saved response snapshot available.</p>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => navigate("/student-home")}
            style={{
              background: "#4f46e5",
              color: "white",
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
            }}
          >
            Go to Events
          </button>
        </div>
      </div>
    );

  // === Registration Form ===
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "20px auto",
        padding: 18,
        background: "#fff",
        borderRadius: 8,
      }}
    >
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <h3 style={{ marginTop: 0 }}>Register for — {event.title}</h3>
      {errorMsg && (
        <div style={{ color: "crimson", marginBottom: 10 }}>{errorMsg}</div>
      )}
      {statusMsg && (
        <div style={{ color: "green", marginBottom: 10 }}>{statusMsg}</div>
      )}

      <form onSubmit={handleSubmit}>
        {(event.formSchema || []).map((f) => (
          <div key={f.id} style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              {f.label} {f.required && <span style={{ color: "red" }}>*</span>}
            </label>

            {["text", "email", "number", "date"].includes(f.type) && (
              <input
                type={f.type}
                value={values[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                required={f.required}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              />
            )}

            {f.type === "textarea" && (
              <textarea
                value={values[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                required={f.required}
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              />
            )}

            {f.type === "select" && (
              <select
                value={values[f.id] ?? ""}
                onChange={(e) => setField(f.id, e.target.value)}
                required={f.required}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              >
                <option value="">Select...</option>
                {(f.options || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {(f.type === "radio" || f.type === "checkbox") && (
              <div>
                {(f.options || []).map((opt) => (
                  <label
                    key={opt}
                    style={{ display: "block", marginBottom: 6 }}
                  >
                    <input
                      type={f.type}
                      name={f.id}
                      value={opt}
                      checked={
                        f.type === "checkbox"
                          ? Array.isArray(values[f.id]) &&
                            values[f.id].includes(opt)
                          : values[f.id] === opt
                      }
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
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => setValues({})}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
