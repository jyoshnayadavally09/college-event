// src/components/EventFormBuilder.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * EventFormBuilder (Google Forms-inspired, neat UI)
 *
 * - Edit an event's formSchema and save to backend.
 * - Live-preview on the right shows how students will see the form.
 * - Single-file component with internal CSS (no external assets required).
 *
 * Keep existing behavior: save calls PUT /events/:id/form-schema with Authorization Bearer token.
 */

const FIELD_TYPES = [
  { id: "text", label: "Short answer" },
  { id: "textarea", label: "Paragraph" },
  { id: "email", label: "Email" },
  { id: "number", label: "Number" },
  { id: "date", label: "Date" },
  { id: "select", label: "Dropdown" },
  { id: "radio", label: "Multiple choice" },
  { id: "checkbox", label: "Checkboxes" },
];

function genId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
}

function blankField() {
  return { id: genId(), label: "Untitled question", type: "text", required: false, options: [] };
}

export default function EventFormBuilder() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [schema, setSchema] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load event
  useEffect(() => {
    let mounted = true;
    if (!eventId) return;
    fetch("http://localhost:5000/events")
      .then((r) => r.json())
      .then((arr) => {
        if (!mounted) return;
        const ev = Array.isArray(arr) ? arr.find((e) => (e._id ?? e.id) === eventId) : null;
        if (ev) {
          setEvent(ev);
          setSchema(ev.formSchema ?? []);
        } else {
          setEvent(null);
          setSchema([]);
        }
      })
      .catch((e) => {
        console.error("Failed fetching events:", e);
        if (mounted) setError("Failed to load event");
      });
    return () => { mounted = false; };
  }, [eventId]);

  const addQuestion = (type = "text") => {
    setSchema((s) => [...s, { ...blankField(), type }]);
  };

  const updateQuestion = (id, patch) => {
    setSchema((s) => s.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id) => {
    setSchema((s) => s.filter((q) => q.id !== id));
  };

  const moveQuestion = (id, dir) => {
    setSchema((s) => {
      const idx = s.findIndex((q) => q.id === id);
      if (idx === -1) return s;
      const to = idx + dir;
      if (to < 0 || to >= s.length) return s;
      const copy = [...s];
      const [item] = copy.splice(idx, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const saveSchema = async () => {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/events/${eventId}/form-schema`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ formSchema: schema }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.message || "Save failed");
        return;
      }
      // success
      navigate("/faculty-home");
    } catch (e) {
      console.error(e);
      setSaving(false);
      setError("Network error");
    }
  };

  // preview-ready schema (map option arrays to safe strings)
  const previewSchema = useMemo(() => schema.map((q) => ({ ...q, options: (q.options || []).slice() })), [schema]);

  return (
    <div className="gfb-shell">
      <style>{`
        /* Google-forms inspired clean layout */
        :root {
          --bg:#f1f5f9;
          --paper:#fff;
          --muted:#6b7280;
          --accent:#0f172a;
          --primary:#0b69ff;
          --soft:#e6eefc;
          --radius:12px;
        }

        .gfb-shell {
          min-height:100vh;
          background:var(--bg);
          font-family: "Roboto", "Inter", system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial;
          padding: 28px;
          box-sizing: border-box;
          color:var(--accent);
        }

        .gfb-wrap {
          max-width:1200px;
          margin: 0 auto;
          display:grid;
          grid-template-columns: 1fr 420px;
          gap: 20px;
        }

        @media (max-width:1000px) {
          .gfb-wrap { grid-template-columns: 1fr; padding: 0 12px; }
          .gfb-preview { order: -1; }
        }

        .gfb-canvas {
          background: linear-gradient(180deg, var(--paper), #fbfdff);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: 0 6px 20px rgba(16,24,40,0.06);
          border: 1px solid rgba(15,23,42,0.04);
        }

        .gfb-header {
          display:flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .gfb-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .gfb-sub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 6px;
        }

        .gfb-controls {
          display:flex;
          gap:8px;
        }

        .btn {
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-primary {
          background: var(--primary);
          color: white;
          box-shadow: 0 6px 18px rgba(11,105,255,0.12);
        }
        .btn-ghost {
          background: transparent;
          color: var(--accent);
          border: 1px solid rgba(15,23,42,0.06);
        }
        .btn-small {
          padding: 6px 8px;
          font-weight:600;
          border-radius: 8px;
        }

        .question-list { display:flex; flex-direction:column; gap:12px; }

        .q-card {
          background: white;
          border-radius: 10px;
          padding: 14px;
          border: 1px solid rgba(15,23,42,0.04);
          box-shadow: 0 8px 24px rgba(15,23,42,0.02);
        }

        .q-top {
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
        }

        .q-label {
          display:flex;
          flex-direction:column;
          gap:6px;
          flex:1;
        }

        .q-input {
          font-size: 16px;
          font-weight:600;
          border: none;
          outline: none;
          padding:6px 8px;
          border-radius:6px;
          background: transparent;
        }

        .meta-row {
          display:flex;
          gap:8px;
          align-items:center;
          margin-top:8px;
          flex-wrap:wrap;
        }

        .select {
          padding:7px 9px;
          border-radius:8px;
          border:1px solid rgba(15,23,42,0.06);
          background:white;
        }

        .option-input {
          width:100%;
          padding:8px;
          border-radius:8px;
          border:1px solid rgba(15,23,42,0.06);
        }

        .small-muted { color:var(--muted); font-size:13px; }

        .q-actions { display:flex; gap:8px; align-items:center; }

        .move-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding:6px;
          font-weight:700;
        }

        .required-toggle { display:flex; gap:6px; align-items:center; color:var(--muted); font-size:13px; }

        /* PREVIEW (right column) */
        .gfb-preview {
          position:sticky;
          top:24px;
          height: fit-content;
        }

        .preview-card {
          background: white;
          border-radius: 12px;
          padding: 18px;
          border:1px solid rgba(15,23,42,0.04);
          box-shadow: 0 8px 30px rgba(15,23,42,0.04);
        }

        .preview-title {
          font-size:18px;
          font-weight:700;
          margin: 0 0 8px 0;
        }

        .preview-desc {
          color: var(--muted);
          font-size:13px;
          margin-bottom: 14px;
        }

        .preview-question {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px dashed rgba(15,23,42,0.03);
        }

        .preview-q-label { font-weight:600; margin-bottom:8px; }
        .preview-input {
          width:100%;
          padding:10px 12px;
          border-radius:8px;
          border:1px solid rgba(15,23,42,0.06);
          background:#fff;
        }

        .preview-opts { display:flex; flex-direction:column; gap:8px; }

        .preview-opts label { display:flex; gap:8px; align-items:center; color:var(--muted); }

        .hint { color:var(--muted); font-size:13px; margin-top:8px; }

        .empty-state {
          text-align:center;
          padding:28px;
          color:var(--muted);
          border: 1px dashed rgba(15,23,42,0.04);
          border-radius:8px;
        }
      `}</style>

      <div className="gfb-wrap">
        <div className="gfb-canvas" role="region" aria-label="Form editor">
          <div className="gfb-header">
            <div>
              <h1 className="gfb-title">{event ? `Form — ${event.title}` : "Event Form Builder"}</h1>
              <div className="gfb-sub">Build the registration form students will fill. Live preview on the right.</div>
            </div>

            <div className="gfb-controls">
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => addQuestion()}>+ Add question</button>
                <button className="btn btn-ghost" onClick={() => addQuestion("select")}>+ Dropdown</button>
                <button className="btn btn-ghost" onClick={() => addQuestion("radio")}>+ Multiple choice</button>
                <button className="btn btn-ghost" onClick={() => addQuestion("checkbox")}>+ Checkboxes</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}

            <div className="question-list" aria-live="polite">
              {schema.length === 0 && (
                <div className="empty-state">
                  No questions yet — click <strong>+ Add question</strong> to start building your form.
                </div>
              )}

              {schema.map((q, idx) => (
                <div key={q.id} className="q-card" aria-labelledby={`q-${q.id}`}>
                  <div className="q-top">
                    <div className="q-label">
                      <input
                        id={`q-${q.id}`}
                        className="q-input"
                        value={q.label}
                        onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                        placeholder="Question title (e.g. Full name)"
                        aria-label={`Question ${idx + 1} title`}
                      />
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          className="select"
                          value={q.type}
                          onChange={(e) => updateQuestion(q.id, { type: e.target.value, options: [] })}
                          aria-label="Question type"
                        >
                          {FIELD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>

                        <div className="required-toggle">
                          <input
                            id={`req-${q.id}`}
                            type="checkbox"
                            checked={!!q.required}
                            onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                            aria-label="Required"
                          />
                          <label htmlFor={`req-${q.id}`}>Required</label>
                        </div>

                        <div className="q-actions" style={{ marginLeft: "auto" }}>
                          <button
                            className="move-btn"
                            title="Move up"
                            onClick={() => moveQuestion(q.id, -1)}
                            aria-label="Move question up"
                            disabled={idx === 0}
                          >▲</button>
                          <button
                            className="move-btn"
                            title="Move down"
                            onClick={() => moveQuestion(q.id, +1)}
                            aria-label="Move question down"
                            disabled={idx === schema.length - 1}
                          >▼</button>

                          <button
                            className="btn btn-small"
                            onClick={() => {
                              // duplicate question
                              const copy = { ...q, id: genId() };
                              setSchema((s) => {
                                const out = [...s];
                                out.splice(idx + 1, 0, copy);
                                return out;
                              });
                            }}
                            title="Duplicate question"
                          >Duplicate</button>

                          <button
                            className="btn btn-ghost btn-small"
                            onClick={() => removeQuestion(q.id)}
                            title="Remove question"
                          >Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* options editor for select/radio/checkbox */}
                  {(q.type === "select" || q.type === "radio" || q.type === "checkbox") && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <input
                          placeholder="Add option and press Enter"
                          className="option-input"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = e.target.value.trim();
                              if (!v) return;
                              updateQuestion(q.id, { options: [...(q.options || []), v] });
                              e.target.value = "";
                            }
                          }}
                          aria-label="Add option"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={(ev) => {
                            // fallback: collect value from previous input (not ideal). Simpler UX uses Enter.
                            ev.preventDefault();
                            const container = ev.currentTarget.closest(".q-card");
                            const input = container && container.querySelector(".option-input");
                            const v = input && input.value.trim();
                            if (v) {
                              updateQuestion(q.id, { options: [...(q.options || []), v] });
                              input.value = "";
                            }
                          }}
                        >Add</button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(q.options || []).map((opt, oi) => (
                          <div key={oi} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              value={opt}
                              onChange={(e) => {
                                const cloned = [...(q.options || [])];
                                cloned[oi] = e.target.value;
                                updateQuestion(q.id, { options: cloned });
                              }}
                              className="option-input"
                              aria-label={`Option ${oi + 1}`}
                            />
                            <button
                              className="btn btn-ghost btn-small"
                              onClick={() => {
                                const cloned = [...(q.options || [])];
                                cloned.splice(oi, 1);
                                updateQuestion(q.id, { options: cloned });
                              }}
                            >Delete</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="meta-row">
                    <div className="small-muted">Question id: <code style={{ padding: "2px 6px", background: "#f3f4f6", borderRadius: 6 }}>{q.id}</code></div>
                    <div className="small-muted">Type: {q.type}</div>
                    <div className="small-muted">Position: {idx + 1}</div>
                  </div>
                </div>
              ))}

            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div className="hint">Tip: press Enter in the "Add option" box to quickly add choices.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => {
                  // copy schema to clipboard
                  try {
                    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
                    alert("Schema JSON copied to clipboard");
                  } catch (e) {
                    alert("Could not copy schema");
                  }
                }}>Export JSON</button>

                <button className="btn btn-primary" onClick={saveSchema} disabled={saving}>
                  {saving ? "Saving…" : "Save form"}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* PREVIEW */}
        <div className="gfb-preview" aria-hidden>
          <div className="preview-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <div className="preview-title">{event ? event.title : "Form preview"}</div>
                <div className="preview-desc">This is a live preview of how the form will appear to students.</div>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>
              {previewSchema.length === 0 && (
                <div className="empty-state">No questions yet. Add some on the left to see them here.</div>
              )}

              {previewSchema.map((q, i) => (
                <div key={q.id} className="preview-question">
                  <div className="preview-q-label">
                    {i + 1}. {q.label} {q.required && <span style={{ color: "crimson" }}>*</span>}
                  </div>

                  {/* short answer / paragraph / email / number / date */}
                  {["text", "email", "number", "date"].includes(q.type) && (
                    <input className="preview-input" placeholder={q.type === "text" ? "Short answer" : q.type} readOnly />
                  )}
                  {q.type === "textarea" && (
                    <textarea className="preview-input" placeholder="Long answer" rows={4} readOnly style={{ resize: "vertical" }} />
                  )}

                  {/* select / radio / checkbox */}
                  {(q.type === "select" || q.type === "radio") && (
                    <div style={{ marginTop: 8 }}>
                      <select className="preview-input" disabled>
                        <option value="">Select...</option>
                        {(q.options || []).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                      </select>
                    </div>
                  )}

                  {q.type === "checkbox" && (
                    <div className="preview-opts" style={{ marginTop: 8 }}>
                      {(q.options || []).map((o, oi) => (
                        <label key={oi}><input type="checkbox" disabled /> {o}</label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ marginTop: 12 }}>
                <div className="small-muted">Form preview is read-only. Students will see a Submit button below the questions.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
