// src/components/StudentEventForm.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "./api"; // ✅ Import centralized API helper

export default function StudentEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [responses, setResponses] = useState({});
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvent = async () => {
    try {
      // Use centralized API
      const all = await api.getEvents(token);
      const found = Array.isArray(all)
        ? all.find((e) => String(e._id) === String(id))
        : (all.events || []).find((e) => String(e._id) === String(id));
      setEvent(found || null);
    } catch (err) {
      console.error("Failed to load event:", err);
    }
  };

  const handleChange = (field, value) => {
    setResponses((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field, value, checked) => {
    setResponses((prev) => {
      const prevValues = prev[field] || [];
      if (checked) {
        return { ...prev, [field]: [...prevValues, value] };
      } else {
        return { ...prev, [field]: prevValues.filter((v) => v !== value) };
      }
    });
  };

  const handleFileChange = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleChange(field, reader.result);
    };
    reader.readAsDataURL(file);
  };

  // helper: safe save registration into localStorage.registrations
  const persistLocalRegistration = (regObj) => {
    try {
      const raw = localStorage.getItem("registrations") || "[]";
      const arr = JSON.parse(raw);
      // normalize to array
      const regs = Array.isArray(arr) ? arr : [];
      // avoid duplicates: same event id + username
      const evId = regObj.eventId ?? regObj.event?._id ?? regObj.event;
      const exists = regs.find((r) => {
        const rid = r.eventId ?? r.event?._id ?? r.event;
        const ruser = r.username ?? r.studentUsername ?? r.student?.username;
        return String(rid) === String(evId) && String(ruser) === String(regObj.username);
      });
      if (!exists) {
        regs.push(regObj);
        localStorage.setItem("registrations", JSON.stringify(regs));
      } else {
        // update existing entry (e.g., set date/status) in case server returned details
        const updated = regs.map((r) => {
          const rid = r.eventId ?? r.event?._id ?? r.event;
          const ruser = r.username ?? r.studentUsername ?? r.student?.username;
          if (String(rid) === String(evId) && String(ruser) === String(regObj.username)) {
            return { ...r, ...regObj };
          }
          return r;
        });
        localStorage.setItem("registrations", JSON.stringify(updated));
      }
    } catch (e) {
      try {
        // fallback simple write
        localStorage.setItem("registrations", JSON.stringify([regObj]));
      } catch (ee) {
        console.error("Failed to persist registration locally:", ee);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!event) return;

    try {
      // Try centralized API first
      const res = await apiRequest(`/events/${id}/register`, {
        method: "POST",
        token,
        body: {
          responses,
          student: { username },
        },
      });

      // Prefer server-returned registration object if available
      // Many backends return { registration } or the created object — try a few shapes
      const serverReg =
        res?.registration ??
        res?.data ??
        (res && typeof res === "object" && (res.event || res.eventId || res._id) ? res : null);

      const registrationRecord = serverReg
        ? // normalize server returned object
          {
            eventId: serverReg.eventId ?? serverReg.event?._id ?? serverReg.event ?? id,
            eventTitle: serverReg.eventTitle ?? serverReg.event?.title ?? event.title,
            date: serverReg.date ?? serverReg.registeredAt ?? serverReg.createdAt ?? new Date().toISOString(),
            username: serverReg.username ?? serverReg.studentUsername ?? username,
            status: serverReg.status ?? "Registered",
            raw: serverReg,
          }
        : // fallback record if server didn't return structured object
          {
            eventId: id,
            eventTitle: event.title,
            date: new Date().toISOString(),
            username,
            status: "Registered",
            responses,
          };

      // persist to localStorage.registrations so StudentHome can read and mark "Registered"
      persistLocalRegistration(registrationRecord);

      alert("✅ Registration successful!");
      // navigate back to student home where StudentHome will re-load events/registrations
      navigate("/student-home");
    } catch (err) {
      console.error("Error registering:", err);

      // If server failed, still persist a local optimistic registration (so UI shows registered)
      const optimistic = {
        eventId: id,
        eventTitle: event?.title ?? "Event",
        date: new Date().toISOString(),
        username,
        status: "Registered (local)",
        responses,
      };

      // Ask user whether to save locally when server fails
      const saveLocal = window.confirm(
        "Registration request failed (server). Would you like to save your registration locally so it shows as registered in the UI?"
      );
      if (saveLocal) {
        persistLocalRegistration(optimistic);
        alert("Saved locally. The organizer may not have your registration on the server.");
        navigate("/student-home");
      } else {
        alert(err.message || "Registration failed");
      }
    }
  };

  // ✅ Local API wrapper (same logic as in api.js)
  const apiRequest = async (endpoint, options) => {
    const BASE_URL = "https://hacthon-stackhack.onrender.com";
    const url = `${BASE_URL}${endpoint}`;
    const headers = { "Content-Type": "application/json" };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const res = await fetch(url, {
      method: options.method,
      headers,
      body: JSON.stringify(options.body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || res.statusText || "Request failed");
    return data;
  };

  if (!event)
    return (
      <div className="loading">
        <div className="loader"></div>
        <p>Loading form...</p>
      </div>
    );

  const formSchema = event.formSchema || [];

  return (
    <div className="page-container">
      <style>{`
        :root {
          --primary:#4f46e5;
          --bg:#f3f4f6;
          --paper:#ffffff;
          --text:#111827;
          --muted:#6b7280;
          --radius:14px;
        }

        body {
          background: var(--bg);
          font-family: "Inter", "Roboto", system-ui;
        }

        .page-container {
          min-height: 100vh;
          min-width : 100vw;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
          background: var(--bg);
        }

        .form-shell {
          width: 100%;
          max-width: 650px;
          background: var(--paper);
          border-radius: var(--radius);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          padding: 40px 36px;
          color: var(--text);
          transition: all 0.3s ease;
        }

        .form-shell:hover {
          box-shadow: 0 12px 35px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .title {
          font-size: 1.8rem;
          font-weight: 700;
          text-align: center;
          color: var(--primary);
          margin-bottom: 6px;
        }

        .desc {
          color: var(--muted);
          text-align: center;
          margin-bottom: 28px;
          font-size: 1rem;
        }

        .field {
          margin-bottom: 22px;
        }

        label {
          font-weight: 600;
          margin-bottom: 8px;
          display: block;
        }

        input[type="text"],
        input[type="email"],
        input[type="number"],
        input[type="date"],
        textarea,
        select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          font-size: 15px;
          transition: border 0.2s, box-shadow 0.2s;
        }

        input:focus, textarea:focus, select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(79,70,229,0.15);
          outline: none;
        }

        textarea {
          resize: vertical;
        }

        .radio-group label,
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          cursor: pointer;
          color: var(--text);
        }

        .file-upload {
          border: 2px dashed #cbd5e1;
          padding: 24px;
          text-align: center;
          border-radius: 12px;
          color: var(--muted);
          transition: all 0.2s;
          background: #f9fafb;
        }

        .file-upload:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: #eef2ff;
        }

        button[type="submit"] {
          background: var(--primary);
          color: white;
          padding: 14px 22px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s, transform 0.1s;
          font-size: 1rem;
        }

        button[type="submit"]:hover {
          background: #4338ca;
        }

        button[type="submit"]:active {
          transform: scale(0.98);
        }

        .loading {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--muted);
        }

        .loader {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width:600px){
          .form-shell { padding: 24px 20px; margin: 0 10px; }
        }
      `}</style>

      <div className="form-shell">
        <h2 className="title">📝 {event.title}</h2>
        <p className="desc">{event.description}</p>

        {formSchema.length === 0 ? (
          <p>No form fields found.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {formSchema.map((field, idx) => (
              <div key={idx} className="field">
                <label>
                  {field.label || field.name}
                  {field.required && <span style={{ color: "red" }}> *</span>}
                </label>

                {["text", "email", "number", "date"].includes(field.type) && (
                  <input
                    type={field.type}
                    required={field.required}
                    onChange={(e) =>
                      handleChange(field.label || field.name, e.target.value)
                    }
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    rows="3"
                    required={field.required}
                    onChange={(e) =>
                      handleChange(field.label || field.name, e.target.value)
                    }
                  ></textarea>
                )}

                {field.type === "select" && (
                  <select
                    required={field.required}
                    onChange={(e) =>
                      handleChange(field.label || field.name, e.target.value)
                    }
                  >
                    <option value="">Select an option</option>
                    {Array.isArray(field.options) &&
                      field.options.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                  </select>
                )}

                {field.type === "radio" && (
                  <div className="radio-group">
                    {Array.isArray(field.options) &&
                      field.options.map((opt, i) => (
                        <label key={i}>
                          <input
                            type="radio"
                            name={field.label}
                            value={opt}
                            required={field.required}
                            onChange={(e) =>
                              handleChange(
                                field.label || field.name,
                                e.target.value
                              )
                            }
                          />
                          {opt}
                        </label>
                      ))}
                  </div>
                )}

                {field.type === "checkbox" && (
                  <div className="checkbox-group">
                    {Array.isArray(field.options) &&
                      field.options.map((opt, i) => (
                        <label key={i}>
                          <input
                            type="checkbox"
                            value={opt}
                            onChange={(e) =>
                              handleCheckboxChange(
                                field.label || field.name,
                                opt,
                                e.target.checked
                              )
                            }
                          />
                          {opt}
                        </label>
                      ))}
                  </div>
                )}

                {field.type === "file" && (
                  <div className="file-upload">
                    <input
                      type="file"
                      accept="image/*"
                      required={field.required}
                      onChange={(e) =>
                        handleFileChange(
                          field.label || field.name,
                          e.target.files[0]
                        )
                      }
                      style={{ display: "none" }}
                      id={`file-${idx}`}
                    />
                    <label htmlFor={`file-${idx}`} style={{ cursor: "pointer" }}>
                      📁 Click to upload image
                    </label>
                  </div>
                )}
              </div>
            ))}
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
    </div>
  );
}
