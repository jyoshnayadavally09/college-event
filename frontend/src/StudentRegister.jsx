import React, { useState, useEffect } from "react";
import "./StudentRegister.css";

export default function StudentRegister({ onRegister }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    roll: "",
    branch: "",
  });
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    validateAll(); // live-validate as user types
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
  };

  const validateAll = () => {
    const errs = {};

    if (!form.username.trim()) errs.username = "Username is required.";
    else if (form.username.length < 3)
      errs.username = "Username must be at least 3 characters.";

    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 6)
      errs.password = "Password should be at least 6 characters.";

    if (!form.roll.trim()) errs.roll = "Registration number (roll) is required.";
    else if (!/^[A-Za-z0-9-]+$/.test(form.roll))
      errs.roll = "Roll must contain only letters, numbers or hyphen.";

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Please enter a valid email address.";

    // optional: branch length check
    if (form.branch && form.branch.length > 10)
      errs.branch = "Use an abbreviation (e.g. CSE, IT).";

    setFieldErrors(errs);
    return errs;
  };

  const passwordStrength = (pw) => {
    if (!pw) return { label: "Empty", score: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ["Very weak", "Weak", "Okay", "Good", "Strong"];
    return { label: labels[score], score };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setSuccessMsg("");
    const errs = validateAll();
    if (Object.keys(errs).length) {
      setTouched({ username: true, password: true, roll: true, email: true, branch: true });
      return;
    }

   setLoading(true);
    try {
   
const headers = { "Content-Type": "application/json", Accept: "application/json" };
     const token = localStorage.getItem("token");
          if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("http://localhost:5000/student/register", {
      method: "POST",
      headers,
       body: JSON.stringify(form),
});

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setGlobalError(data.message || "Registration failed. Please try again.");
        return;
      }

      // success handling
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("student", JSON.stringify({ username: data.username, role: data.role }));
      }
      setSuccessMsg("Registration successful — you're logged in!");
      setForm({
        name: "",
        email: "",
        username: "",
        password: "",
        roll: "",
        branch: "",
      });
      setTouched({});
      setFieldErrors({});
      if (onRegister) onRegister(data);
    } catch (err) {
      console.error(err);
      setGlobalError("Network error. Try again later.");
      setLoading(false);
    }
  };

  const pwStrength = passwordStrength(form.password);

  return (
    <div className="sr-wrapper">
      <form className="sr-card" onSubmit={handleSubmit} noValidate aria-labelledby="sr-title">
        <div className="sr-header">
          <div className="sr-avatar" aria-hidden>
            {form.name ? form.name.split(" ").map(n => n[0]).slice(0,2).join("") : "S"}
          </div>
          <div>
            <h2 id="sr-title" className="sr-title">Student Register</h2>
            <p className="sr-sub">Create your student account to access events & forms</p>
          </div>
        </div>

        {globalError && <div className="sr-alert sr-alert-error" role="alert">{globalError}</div>}
        {successMsg && <div className="sr-alert sr-alert-success" role="status">{successMsg}</div>}

        <div className="sr-grid">
          <label className="sr-field">
            <span className="sr-label">Full name</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Priya Sharma"
              aria-invalid={!!fieldErrors.name}
            />
            <small className="sr-hint">Optional — helps personalize your profile</small>
          </label>

          <label className="sr-field">
            <span className="sr-label">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@college.edu (optional)"
              aria-invalid={!!fieldErrors.email}
            />
            {touched.email && fieldErrors.email && <div className="sr-error">{fieldErrors.email}</div>}
          </label>

          <label className="sr-field">
            <span className="sr-label">Username <span className="sr-required">*</span></span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="choose a login id"
              aria-required="true"
              aria-invalid={!!fieldErrors.username}
            />
            {touched.username && fieldErrors.username && <div className="sr-error">{fieldErrors.username}</div>}
          </label>

          <label className="sr-field">
            <span className="sr-label">Password <span className="sr-required">*</span></span>
            <div className="sr-password-row">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="At least 6 characters"
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                className="sr-toggle"
                onClick={() => setShowPassword(s => !s)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="sr-password-meta">
              <div className="sr-strength" data-score={pwStrength.score}>
                <div className="sr-strength-bar" />
              </div>
              <small className="sr-hint">Strength: {pwStrength.label}</small>
            </div>

            {touched.password && fieldErrors.password && <div className="sr-error">{fieldErrors.password}</div>}
          </label>

          <label className="sr-field">
            <span className="sr-label">Registration No (Roll) <span className="sr-required">*</span></span>
            <input
              name="roll"
              value={form.roll}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 18CSE123"
              aria-required="true"
              aria-invalid={!!fieldErrors.roll}
            />
            {touched.roll && fieldErrors.roll && <div className="sr-error">{fieldErrors.roll}</div>}
          </label>

          <label className="sr-field">
            <span className="sr-label">Branch</span>
            <input
              name="branch"
              value={form.branch}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="CSE / IT / ECE"
              aria-invalid={!!fieldErrors.branch}
            />
            {touched.branch && fieldErrors.branch && <div className="sr-error">{fieldErrors.branch}</div>}
          </label>
        </div>

        <div className="sr-actions">
          <button className="sr-btn" type="submit" disabled={loading}>
            {loading ? "Registering…" : "Create account"}
          </button>
          <button
            type="button"
            className="sr-btn sr-btn-ghost"
            onClick={() => {
              setForm({ name: "", email: "", username: "", password: "", roll: "", branch: "" });
              setFieldErrors({});
              setGlobalError("");
              setSuccessMsg("");
              setTouched({});
            }}
          >
            Reset
          </button>
        </div>

        <div className="sr-foot">
          <small>By creating an account you agree to your college's usage policies.</small>
        </div>
      </form>
    </div>
  );
}