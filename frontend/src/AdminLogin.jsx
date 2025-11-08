import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("admin_username");
    if (saved) setForm((f) => ({ ...f, username: saved, remember: true }));
  }, []);

  const validate = () => {
    if (!form.username.trim() || !form.password) {
      setMessage({ text: "Please enter both username and password.", type: "error" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/admin/login", {
        username: form.username.trim(),
        password: form.password,
      });
      const token = res?.data?.token;
      if (!token) throw new Error(res?.data?.message || "Invalid response");

      localStorage.setItem("token", token);
      if (form.remember) localStorage.setItem("admin_username", form.username.trim());
      else localStorage.removeItem("admin_username");

      setMessage({ text: "Login successful.", type: "success" });
      setTimeout(() => navigate("/adminhome"), 500);
    } catch (err) {
      setMessage({
        text: err?.response?.data?.message || "Login failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}></div>

      <main style={styles.container}>
        <section style={styles.card}>
          <div style={styles.logoArea}>
            <div style={styles.logo}>VE</div>
            <h1 style={styles.title}>Vignan EventConnect</h1>
            <p style={styles.subtitle}>Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Username
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username"
                style={styles.input}
                disabled={loading}
              />
            </label>

            <label style={styles.label}>
              Password
              <div style={styles.pwdRow}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter password"
                  style={{ ...styles.input, paddingRight: 70 }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  style={styles.pwdToggle}
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div style={styles.row}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                  style={styles.checkbox}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() =>
                  setMessage({ text: "Contact admin to reset password.", type: "info" })
                }
                style={styles.forgotBtn}
              >
                Forgot?
              </button>
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? <span style={styles.spinner} /> : "Sign In"}
            </button>

            {message.text && (
              <div
                style={{
                  ...styles.message,
                  ...(message.type === "error" && styles.messageError),
                  ...(message.type === "success" && styles.messageSuccess),
                  ...(message.type === "info" && styles.messageInfo),
                }}
              >
                {message.text}
              </div>
            )}
          </form>

          <div style={styles.footer}>
            <button style={styles.linkBtn} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/* 🎨 Styles: simple bg + dark glass login card */
const styles = {
  page: {
    height: "100vh",
    width: "100vw",
    position: "relative",
    backgroundImage:
      "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80')", // clean office background
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: '"Poppins", sans-serif',
    color: "#fff",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.65)", // ✨ subtle dark transparency overlay
    backdropFilter: "blur(3px)",
  },

  container: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(10, 10, 20, 0.85)", // dark glass
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "36px 32px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.8)",
    backdropFilter: "blur(8px)",
    textAlign: "center",
  },

  logoArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },

  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    background: "linear-gradient(135deg, #ff8a00, #ff4d79, #a64eff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontSize: 24,
    boxShadow: "0 10px 25px rgba(166,78,255,0.25)",
  },

  title: { margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" },
  subtitle: { margin: 0, fontSize: 13, color: "#ccc" },

  form: {
    marginTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    textAlign: "left",
  },

  label: { fontSize: 13, color: "#ccc", fontWeight: 600 },

  input: {
    width: "100%",
    marginTop: 6,
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "border 0.2s, box-shadow 0.2s",
  },

  pwdRow: { position: "relative" },

  pwdToggle: {
    position: "absolute",
    right: 10,
    top: 9,
    border: "none",
    background: "transparent",
    color: "#ffb84d",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#ccc",
  },

  checkbox: { width: 14, height: 14 },

  forgotBtn: {
    background: "transparent",
    border: "none",
    color: "#ff4d79",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: 13,
  },

  button: {
    marginTop: 10,
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#ff8a00,#ff4d79,#a64eff)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 8px 25px rgba(255,77,121,0.3)",
    transition: "all 0.2s ease",
  },

  spinner: {
    width: 18,
    height: 18,
    border: "3px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
    display: "inline-block",
  },

  message: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 13,
    textAlign: "center",
  },

  messageError: {
    background: "rgba(255,77,121,0.1)",
    color: "#ff9aa2",
    border: "1px solid rgba(255,77,121,0.2)",
  },

  messageSuccess: {
    background: "rgba(16,185,129,0.1)",
    color: "#86efac",
    border: "1px solid rgba(16,185,129,0.2)",
  },

  messageInfo: {
    background: "rgba(59,130,246,0.1)",
    color: "#93c5fd",
    border: "1px solid rgba(59,130,246,0.2)",
  },

  footer: { marginTop: 20, textAlign: "center" },

  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#a78bfa",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: 13,
  },
};

/* inject keyframes */
(function inject() {
  if (document.getElementById("adminlogin-anim")) return;
  const s = document.createElement("style");
  s.id = "adminlogin-anim";
  s.innerHTML = `
    @keyframes spin { to { transform: rotate(360deg); } }
    input:focus, button:focus {
      outline: none !important;
      border-color: #ff4d79 !important;
      box-shadow: 0 0 8px rgba(255,77,121,0.4);
    }
  `;
  document.head.appendChild(s);
})();
