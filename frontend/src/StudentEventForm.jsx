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

  if (!event) return <div style={{ padding: 20 }}>Loading form...</div>;

  const formSchema = event.formSchema || [];

  return (
    <div style={{ maxWidth: 600, margin: "30px auto", background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.05)" }}>
      <h2 style={{ color: "#4f46e5" }}>📝 {event.title}</h2>
      <p>{event.description}</p>

      {formSchema.length === 0 ? (
        <p>No form fields found.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {formSchema.map((field, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                {field.label || field.name}
                {field.required && <span style={{ color: "red" }}> *</span>}
              </label>
              {field.type === "text" || field.type === "email" || field.type === "number" ? (
                <input
                  type={field.type}
                  required={field.required}
                  onChange={(e) => handleChange(field.label || field.name, e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  rows="3"
                  required={field.required}
                  onChange={(e) => handleChange(field.label || field.name, e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                ></textarea>
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  onChange={(e) => handleChange(field.label || field.name, e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value="">Select</option>
                  {Array.isArray(field.options)
                    ? field.options.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))
                    : null}
                </select>
              ) : (
                <input
                  type="text"
                  onChange={(e) => handleChange(field.label || field.name, e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            style={{
              marginTop: 14,
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
