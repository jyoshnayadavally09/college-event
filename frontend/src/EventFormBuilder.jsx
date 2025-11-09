// src/components/EventFormBuilder.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "./api";

const FIELD_TYPES = [
  { id: "text", label: "Short answer" },
  { id: "textarea", label: "Paragraph" },
  { id: "email", label: "Email" },
  { id: "number", label: "Number" },
  { id: "date", label: "Date" },
  { id: "select", label: "Dropdown" },
  { id: "radio", label: "Multiple choice" },
  { id: "checkbox", label: "Checkboxes" },
  { id: "file", label: "File Upload (Image)" },
];

function genId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function blankField() {
  return { id: genId(), label: "Untitled question", type: "text", required: false, options: [] };
}

export default function EventFormBuilder() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [schema, setSchema] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    const token = localStorage.getItem("token");

    api
      .getEvent(eventId, token)
      .then((ev) => {
        setEvent(ev);
        setSchema(ev.formSchema ?? []);
      })
      .catch(() => setError("Failed to load event"));
  }, [eventId]);

  const addQuestion = (type = "text") => setSchema((s) => [...s, { ...blankField(), type }]);
  const updateQuestion = (id, patch) => setSchema((s) => s.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQuestion = (id) => setSchema((s) => s.filter((q) => q.id !== id));

  const saveSchema = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://hacthon-stackhack.onrender.com/events/${eventId}/form-schema`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ formSchema: schema }),
      });

      const data = await res.json();
      setSaving(false);
      if (!res.ok) return setError(data.message || "Save failed");
      navigate("/faculty-home");
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  const previewSchema = useMemo(() => schema.map((q) => ({ ...q, options: (q.options || []).slice() })), [schema]);

  return (
    <div className="form-builder">
       <style>{`
        :root {
          --bg:#f8fafc;
          --paper:#fff;
          --muted:#6b7280;
          --accent:#0f172a;
          --primary:#4f46e5;
          --radius:12px;
        }

        .form-builder {
          min-height:100vh;
          background:var(--bg);
          font-family:"Inter", system-ui;
          padding:30px;
          color:var(--accent);
        }

        .layout {
          display:grid;
          grid-template-columns:1fr 400px;
          gap:24px;
          max-width:1200px;
          margin:auto;
        }

        @media(max-width:900px){
          .layout{grid-template-columns:1fr;}
          .preview{order:-1;}
        }

        .card {
          background:var(--paper);
          border-radius:var(--radius);
          box-shadow:0 6px 24px rgba(0,0,0,0.05);
          padding:24px;
          border:1px solid rgba(0,0,0,0.05);
        }

        .title {
          font-size:1.4rem;
          font-weight:700;
          color:var(--primary);
          margin-bottom:8px;
        }

        .subtitle {
          color:var(--muted);
          font-size:0.9rem;
          margin-bottom:20px;
        }

        .btn {
          border:none;
          border-radius:8px;
          padding:8px 14px;
          cursor:pointer;
          font-weight:600;
          transition:all 0.2s;
        }

        .btn-primary { background:var(--primary); color:white; box-shadow:0 4px 14px rgba(79,70,229,0.2); }
        .btn-primary:hover { background:#4338ca; }

        .btn-ghost {
          background:white;
          border:1px solid #e5e7eb;
        }
        .btn-ghost:hover { background:#f9fafb; }

        .q-card {
          background:white;
          border-radius:10px;
          padding:16px;
          margin-bottom:16px;
          border:1px solid #e5e7eb;
          box-shadow:0 4px 10px rgba(0,0,0,0.02);
        }

        .q-label {
          font-weight:600;
          color:var(--accent);
          margin-bottom:8px;
        }

        .option-input, select, textarea {
          width:100%;
          padding:10px 12px;
          border-radius:8px;
          border:1px solid #d1d5db;
          font-size:14px;
          transition:all 0.2s;
        }

        .option-input:focus, select:focus, textarea:focus {
          outline:none;
          border-color:var(--primary);
          box-shadow:0 0 0 3px rgba(79,70,229,0.15);
        }

        .option-row {
          display:flex;
          align-items:center;
          gap:6px;
          margin-top:8px;
        }

        .divider {
          height:1px;
          background:#e5e7eb;
          margin:20px 0;
        }

        .preview label {
          display:block;
          font-weight:600;
          margin-bottom:6px;
        }

        .preview input, .preview textarea, .preview select {
          width:100%;
          padding:10px 12px;
          border-radius:8px;
          border:1px solid #d1d5db;
          background:white;
        }

        .preview h3 {
          color:var(--primary);
          font-size:1.2rem;
          margin-bottom:14px;
        }

        .question-type {
          margin-top:8px;
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }

        .required {
          font-size:13px;
          color:var(--muted);
          display:flex;
          align-items:center;
          gap:4px;
        }
      `}</style>

      <div className="layout">
        {/* Left Side: Builder */}
        <div className="card">
          <h2 className="title">{event ? `Form — ${event.title}` : "Event Form Builder"}</h2>
          <p className="subtitle">Build a custom registration form for your event. Live preview is shown on the right.</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {FIELD_TYPES.map((f) => (
              <button key={f.id} className="btn btn-ghost" onClick={() => addQuestion(f.id)}>
                + {f.label}
              </button>
            ))}
          </div>

          {schema.length === 0 && (
            <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 30 }}>
              No questions yet. Add one above to start building your form.
            </p>
          )}

          {schema.map((q, idx) => (
            <div key={q.id} className="q-card">
              <input
                className="option-input"
                value={q.label}
                onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                placeholder="Question title (e.g., Full Name)"
              />
              <select
                style={{ marginTop: 10 }}
                value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value, options: [] })}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>

              {(q.type === "select" || q.type === "radio" || q.type === "checkbox") && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className="option-input"
                    placeholder="Add option and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = e.target.value.trim();
                        if (!v) return;
                        updateQuestion(q.id, { options: [...(q.options || []), v] });
                        e.target.value = "";
                      }
                    }}
                  />
                  {(q.options || []).map((opt, oi) => (
                    <div className="option-row" key={oi}>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const arr = [...q.options];
                          arr[oi] = e.target.value;
                          updateQuestion(q.id, { options: arr });
                        }}
                        className="option-input"
                      />
                      <button
                        className="btn btn-ghost"
                        onClick={() => updateQuestion(q.id, { options: q.options.filter((_, i) => i !== oi) })}
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="question-type">
                <label className="required">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button className="btn btn-ghost" onClick={() => removeQuestion(q.id)}>Remove</button>
              </div>
            </div>
          ))}

          {schema.length > 0 && (
            <>
              <div className="divider" />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(schema, null, 2))}
                >
                  Export JSON
                </button>
                <button className="btn btn-primary" onClick={saveSchema} disabled={saving}>
                  {saving ? "Saving..." : "Save Form"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Live Preview */}
        <div className="card preview">
          <h3>📋 Live Preview</h3>
          {previewSchema.length === 0 && <p style={{ color: "var(--muted)" }}>No questions to preview</p>}
          {previewSchema.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 16 }}>
              <label>
                {i + 1}. {q.label} {q.required && <span style={{ color: "crimson" }}>*</span>}
              </label>

              {["text", "email", "number", "date"].includes(q.type) && <input type={q.type} readOnly />}
              {q.type === "textarea" && <textarea rows={3} readOnly />}
              {q.type === "file" && <input type="file" accept="image/*" disabled />}
              {q.type === "select" && (
                <select disabled>
                  <option>Select...</option>
                  {(q.options || []).map((o, oi) => <option key={oi}>{o}</option>)}
                </select>
              )}
              {q.type === "radio" &&
                (q.options || []).map((o, oi) => (
                  <label key={oi} style={{ display: "block", marginTop: 6 }}>
                    <input type="radio" disabled /> {o}
                  </label>
                ))}
              {q.type === "checkbox" &&
                (q.options || []).map((o, oi) => (
                  <label key={oi} style={{ display: "block", marginTop: 6 }}>
                    <input type="checkbox" disabled /> {o}
                  </label>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
