// src/components/CoordinatorLogin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function CoordinatorLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  const BASE_URL = "https://hacthon-stackhack.onrender.com";
  // const BASE_URL = "http://localhost:5000";

  useEffect(() => {
    const saved = localStorage.getItem("coordinator_username");
    if (saved) setForm((f) => ({ ...f, username: saved, remember: true }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/coordinator/login`, form, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.token) {
        localStorage.setItem("username", res.data.username);
        localStorage.setItem("role", "Coordinator");
        localStorage.setItem("token", res.data.token);

        if (form.remember)
          localStorage.setItem("coordinator_username", form.username.trim());
        else localStorage.removeItem("coordinator_username");

        alert("✅ Login successful");
        navigate("/coordinatorhome");
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Server error during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coord-login-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          height: 100%;
          font-family: 'Poppins', sans-serif;
        }

        .coord-login-page {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0,0,0,0.85)),
            url('https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          overflow: hidden;
        }

        .login-card {
          background: rgba(20, 20, 20, 0.7);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 45px 35px;
          width: 90%;
          max-width: 420px;
          color: #fff;
          box-shadow: 0 0 25px rgba(124,58,237,0.2), 0 0 45px rgba(6,182,212,0.15);
          border: 1px solid rgba(255,255,255,0.08);
          animation: fadeIn 1s ease-in-out;
          z-index: 1;
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-logo {
          width: 70px;
          height: 70px;
          border-radius: 14px;
          background: linear-gradient(135deg, #06b6d4, #7c3aed);
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 22px;
          color: #fff;
          box-shadow: 0 0 20px rgba(124,58,237,0.25);
        }

        .login-title {
          font-size: 1.9rem;
          font-weight: 700;
          margin-bottom: 25px;
          color: #f1f5f9;
          text-shadow: 0 0 8px rgba(124,58,237,0.3);
        }

        .input-label {
          text-align: left;
          display: block;
          font-size: 0.9rem;
          margin-bottom: 6px;
          color: #cbd5e1;
        }

        .login-input {
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 18px;
          border: none;
          border-radius: 10px;
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .login-input:focus {
          background: rgba(255,255,255,0.15);
          box-shadow: 0 0 12px rgba(6,182,212,0.4);
        }

        .pwd-container {
          position: relative;
        }

        .toggle-btn {
          position: absolute;
          right: 12px;
          top: 10px;
          background: transparent;
          border: none;
          color: #8b5cf6;
          font-weight: 600;
          cursor: pointer;
        }

        .login-btn {
          width: 100%;
          padding: 12px;
          margin-top: 5px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #06b6d4, #7c3aed);
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(6,182,212,0.2);
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(124,58,237,0.5);
        }

        .remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: #cbd5e1;
          margin-top: 10px;
        }

        .error-text {
          margin-top: 14px;
          color: #f87171;
          background: rgba(239,68,68,0.12);
          padding: 8px;
          border-radius: 8px;
          font-weight: 500;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 35px 25px;
          }
          .login-title {
            font-size: 1.6rem;
          }
        }
      `}</style>

      <div className="login-card">
        <div className="login-logo">VE</div>
        <h1 className="login-title">Coordinator Login</h1>

        <form onSubmit={handleSubmit}>
          <label className="input-label">Username</label>
          <input
            type="text"
            placeholder="Enter username"
            className="login-input"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />

          <label className="input-label">Password</label>
          <div className="pwd-container">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Enter password"
              className="login-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPwd(!showPwd)}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          <div className="remember-row">
            <label>
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) =>
                  setForm({ ...form, remember: e.target.checked })
                }
              />{" "}
              Remember me
            </label>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "#818cf8",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => alert("Contact admin to reset password.")}
            >
              Forgot?
            </button>
          </div>

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Login"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
}
