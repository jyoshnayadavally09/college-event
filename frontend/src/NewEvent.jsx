// src/components/NewEvent.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";

export default function NewEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    branch: "",
    date: "",
    closeDate: "",
    time: "",
    venue: "",
    description: "",
    type: "Individual",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const token = localStorage.getItem("token");
  const facultyName = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token) navigate("/faculty-login");
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    const MAX_MB = 6;
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`Please pick an image smaller than ${MAX_MB}MB.`);
      e.target.value = "";
      return;
    }

    setImageFile(f);
    setImageUrlInput("");
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrlInput("");
  };

  const validateAndNormalize = () => {
    const titleTrim = (form.title || "").trim();
    const branchTrim = (form.branch || "").trim();
    if (!titleTrim) throw new Error("Please enter an event title.");
    if (!branchTrim) throw new Error("Please enter a branch.");
    if (!form.date) throw new Error("Please select an event date.");
    if (form.closeDate && new Date(form.closeDate) > new Date(form.date)) {
      throw new Error("Registration close date cannot be after event date.");
    }

    // Add fallback title keys to handle backend mismatches
    const normalized = {
      ...form,
      title: titleTrim,
      branch: branchTrim,
      proposedBy: facultyName,
      proposedRole: role,
      status: "Pending",
      // fallback aliases — backend might expect any of these
      name: titleTrim,
      eventTitle: titleTrim,
      event_title: titleTrim,
      event_name: titleTrim,
    };

    return normalized;
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    setUploading(true);
    setProgressMsg("Preparing...");

    let baseFields;
    try {
      baseFields = validateAndNormalize();
    } catch (valErr) {
      setUploading(false);
      setProgressMsg("");
      alert(valErr.message);
      return;
    }

    try {
      console.log("Normalized baseFields:", baseFields);

      // 1) File upload via FormData
      if (imageFile) {
        setProgressMsg("Preparing file upload...");
        const fd = new FormData();
        Object.entries(baseFields).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (typeof v === "object") fd.append(k, JSON.stringify(v));
          else fd.append(k, String(v));
        });
        fd.append("image", imageFile);

        console.group("FormData contents");
        for (const pair of fd.entries()) {
          if (pair[1] instanceof File) {
            console.log(pair[0], "=> File:", pair[1].name, pair[1].type, pair[1].size);
          } else {
            console.log(pair[0], "=>", pair[1]);
          }
        }
        console.groupEnd();

        setProgressMsg("Uploading image...");
        if (api && typeof api.createEventForm === "function") {
          const resp = await api.createEventForm(fd, token);
          console.log("Server response (createEventForm):", resp);
        } else {
          const DEFAULT_BASE = "https://college-event-qi7b.onrender.com";
          const res = await fetch(`${DEFAULT_BASE}/events/add`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: fd,
          });
          const text = await res.text().catch(() => "");
          let parsed;
          try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
          if (!res.ok) {
            console.error("Server returned non-OK for form upload:", parsed, res.status);
            throw new Error((parsed && parsed.message) || text || res.statusText);
          }
          console.log("Server response (form fallback):", parsed);
        }

        setProgressMsg("Event created (file uploaded).");
        alert("✅ Event submitted to Admin (image uploaded).");
        navigate("/faculty-home");
        return;
      }

      // 2) Image URL path
      if (imageUrlInput && imageUrlInput.trim()) {
        const payload = { ...baseFields, image: imageUrlInput.trim() };
        console.log("Sending JSON payload (image URL):", payload);
        setProgressMsg("Submitting with image URL...");
        if (api && typeof api.createEvent === "function") {
          const resp = await api.createEvent(payload, token);
          console.log("Server response (createEvent):", resp);
        } else {
          const DEFAULT_BASE = "https://college-event-qi7b.onrender.com";
          const res = await fetch(`${DEFAULT_BASE}/events/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          const text = await res.text().catch(() => "");
          let parsed;
          try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
          if (!res.ok) {
            console.error("Server returned non-OK:", parsed, res.status);
            throw new Error((parsed && parsed.message) || text || res.statusText);
          }
          console.log("Server response (fallback):", parsed);
        }

        setProgressMsg("Event created (URL).");
        alert("✅ Event submitted to Admin (image URL used).");
        navigate("/faculty-home");
        return;
      }

      // 3) base64 preview path
      if (imagePreview) {
        const payload = { ...baseFields, image: imagePreview };
        console.log("Sending JSON payload (base64):", payload);
        setProgressMsg("Submitting with base64 image...");
        if (api && typeof api.createEvent === "function") {
          const resp = await api.createEvent(payload, token);
          console.log("Server response (createEvent base64):", resp);
        } else {
          const DEFAULT_BASE = "https://college-event-qi7b.onrender.com";
          const res = await fetch(`${DEFAULT_BASE}/events/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          const text = await res.text().catch(() => "");
          let parsed;
          try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
          if (!res.ok) {
            console.error("Server returned non-OK:", parsed, res.status);
            throw new Error((parsed && parsed.message) || text || res.statusText);
          }
          console.log("Server response (fallback base64):", parsed);
        }

        setProgressMsg("Event created (base64).");
        alert("✅ Event submitted to Admin (base64 image).");
        navigate("/faculty-home");
        return;
      }

      // 4) No image -> JSON
      console.log("Sending JSON payload (no image):", baseFields);
      setProgressMsg("Submitting...");
      if (api && typeof api.createEvent === "function") {
        const resp = await api.createEvent(baseFields, token);
        console.log("Server response (createEvent no-image):", resp);
      } else {
        const DEFAULT_BASE = "https://college-event-qi7b.onrender.com";
        const res = await fetch(`${DEFAULT_BASE}/events/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(baseFields),
        });
        const text = await res.text().catch(() => "");
        let parsed;
        try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
        if (!res.ok) {
          console.error("Server returned non-OK:", parsed, res.status);
          throw new Error((parsed && parsed.message) || text || res.statusText);
        }
        console.log("Server response (fallback no-image):", parsed);
      }

      setProgressMsg("Event created.");
      alert("✅ Event submitted to Admin!");
      navigate("/faculty-home");
    } catch (err) {
      console.error("Event submit error (detailed):", err);
      alert(`❌ Failed to submit event: ${err.message || String(err)}`);
      console.warn("If you repeatedly get 'title is required' double-check the backend's expected field names (e.g., 'title' vs 'name').");
    } finally {
      setUploading(false);
      setProgressMsg("");
    }
  };

  return (
    <>
      <style>{`
        body { font-family: 'Poppins', sans-serif; }
        .new-event-container { display:flex; justify-content:center; align-items:center; min-height:100vh; min-width:100vw; background:#eef3f8; }
        .form-card { width: 100%; max-width: 520px; background:white; padding:28px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.08); }
        h2 { text-align:center; margin-bottom:18px; color:#003366; }
        label { font-weight:600; margin-top:12px; display:block; color:#003366; }
        input, textarea, select { width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:14px; margin-top:6px; outline:none; transition:.15s; }
        input:focus, textarea:focus, select:focus { border-color:#003366; box-shadow:0 0 6px rgba(0,51,102,0.12); }
        textarea { height:96px; resize:none; }
        .submit-btn { width:100%; padding:12px; margin-top:18px; background:#003366; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:600; }
        .submit-btn[disabled] { opacity:0.7; cursor:not-allowed; }
        .back-btn { width:100%; margin-top:10px; background:#e2e8f0; color:#003366; padding:10px; border:none; border-radius:8px; cursor:pointer; font-weight:700; }
        .image-row { display:flex; gap:8px; align-items:center; margin-top:8px; }
        .image-preview { margin-top:10px; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb; width:140px; height:92px; display:flex; align-items:center; justify-content:center; background:#fafafa; }
        .image-preview img { width:100%; height:100%; object-fit:cover; display:block; }
        .small-btn { padding:8px 10px; border-radius:8px; border:none; cursor:pointer; background:#e2e8f0; color:#0b3b66; font-weight:700; }
        .muted { color:#6b7280; font-size:13px; margin-top:6px; }
        .uploading-bar { margin-top:10px; color:#334155; font-weight:700; font-size:13px; }
      `}</style>

      <div className="new-event-container">
        <div className="form-card">
          <h2>✨ Create New Event</h2>

          <form onSubmit={submitEvent}>
            <label>Event Title</label>
            <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Coding Hackathon" />

            <label>Branch</label>
            <input name="branch" value={form.branch} onChange={handleChange} required placeholder="e.g. CSE, ECE, All" />

            <label>Event Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required />

            <label>Registration Close Date</label>
            <input type="date" name="closeDate" value={form.closeDate} onChange={handleChange} />

            <label>Event time</label>
            <input type="time" name="time" value={form.time} onChange={handleChange} />

            <label>Venue</label>
            <input name="venue" value={form.venue} onChange={handleChange} />

            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Brief about event..." />

            <label>Event Type</label>
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="Individual">Individual</option>
              <option value="Team">Team</option>
            </select>

            <label style={{ marginTop: 14 }}>Event Image (optional)</label>
            <div className="muted">Upload a file (recommended) or paste an image URL. Upload takes priority.</div>

            <div className="image-row">
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ flex: 1 }} disabled={uploading} />
              <button type="button" className="small-btn" onClick={clearImageSelection} disabled={uploading}>Clear</button>
            </div>

            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Or paste image URL here (e.g. https://...)"
                value={imageUrlInput}
                onChange={(e) => {
                  setImageUrlInput(e.target.value);
                  if (e.target.value) {
                    setImageFile(null);
                    setImagePreview(null);
                  }
                }}
                disabled={uploading}
              />
            </div>

            {imagePreview ? (
              <div className="image-preview" aria-label="Selected image preview">
                <img src={imagePreview} alt="Selected preview" />
              </div>
            ) : imageUrlInput ? (
              <div className="image-preview" aria-label="URL image preview">
                <img src={imageUrlInput} alt="URL preview" />
              </div>
            ) : null}

            {uploading && <div className="uploading-bar">{progressMsg || "Uploading..."}</div>}

            <button className="submit-btn" type="submit" disabled={uploading}>{uploading ? "Submitting…" : "✅ Submit Event"}</button>

            <button type="button" className="back-btn" onClick={() => navigate("/faculty-home")} disabled={uploading}>← Back to Dashboard</button>
          </form>
        </div>
      </div>
    </>
  );
}
