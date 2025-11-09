import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api"; // ✅ Import centralized API helper

export default function StudentLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Helper function (you can move this into api.js later)
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
    if (!res.ok) {
      throw new Error(data.message || res.statusText);
    }
    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Use your centralized API logic
      const data = await apiRequest("/student/login", {
        method: "POST",
        body: { username, password },
      });

      setLoading(false);

      // ✅ Save user details & token
      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "student",
        JSON.stringify({ username: data.username, role: data.role })
      );

      navigate("/student-home");
    } catch (err) {
      console.error(err);
      setError(err.message || "Invalid username or password.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        overflow: "hidden",
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage:
            "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1350&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(50%)",
          zIndex: -2,
        }}
      />

      {/* Overlay for transparency */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.4)",
          zIndex: -1,
        }}
      />

      {/* Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          borderRadius: "14px",
          padding: "35px",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 25px rgba(0,0,0,0.5)",
          color: "#fff",
        }}
      >
        <h2 style={{ textAlign: "center", fontWeight: "700", fontSize: "1.8rem" }}>
          🎓 Student Login
        </h2>
        <p style={{ textAlign: "center", opacity: 0.8, marginBottom: "16px" }}>
          Login to your Vignan account
        </p>

        {error && (
          <div
            style={{
              background: "rgba(255,0,0,0.15)",
              border: "1px solid rgba(255,80,80,0.4)",
              padding: "10px",
              borderRadius: "8px",
              color: "#ffb6b6",
              marginBottom: "12px",
              textAlign: "center",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: ".9rem" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Username"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: ".9rem" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#ff4d6d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "16px",
            fontSize: "0.9rem",
          }}
        >
          New student?{" "}
          <span
            onClick={() => navigate("/student-register")}
            style={{ color: "#4da6ff", cursor: "pointer", fontWeight: "600" }}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}
