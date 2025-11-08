import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function StudentEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [responses, setResponses] = useState({});
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      const res = await fetch(`http://localhost:5000/events`);
      const all = await res.json();
      const found = Array.isArray(all)
        ? all.find((e) => e._id === id)
        : all.events?.find((e) => e._id === id);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!event) return;
    try {
      const res = await fetch(`http://localhost:5000/events/${id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          responses,
          student: { username },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Registration successful!");
        navigate("/student-home");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Error registering:", err);
      alert("Network error submitting form");
    }
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
