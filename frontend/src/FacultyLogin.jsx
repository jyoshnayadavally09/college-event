import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FacultyLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/faculty/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || data.message) {
        setError(data.message || "Invalid username or password");
        return;
      }

      // store token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username || username);
      localStorage.setItem("role", data.role || "faculty");

      // navigate to faculty area
      navigate("/faculty-home");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again later.");
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
        fontFamily: '"Poppins", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
            "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1920&q=80')",
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
          background: "rgba(3, 3, 3, 0.76)",
          zIndex: -1,
        }}
      />

      {/* Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(10px)",
          borderRadius: "14px",
          padding: "36px 30px",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          color: "#fff",
        }}
      >
        <h2 style={{ textAlign: "center", fontWeight: 700, fontSize: "1.8rem", margin: 0 }}>
          🧑‍🏫 Faculty Login
        </h2>
        <p style={{ textAlign: "center", opacity: 0.85, marginBottom: "18px" }}>
          Login to your Vignan Faculty account
        </p>

        {error && (
          <div
            style={{
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,80,80,0.35)",
              padding: "10px",
              borderRadius: "8px",
              color: "#ffb6b6",
              marginBottom: "12px",
              textAlign: "center",
              fontSize: "0.95rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: ".95rem", color: "#e6eef8" }}>
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
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: ".95rem", color: "#e6eef8" }}>
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
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(90deg,#ff8a00,#ff4d79)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              fontSize: "1rem",
              boxShadow: "0 8px 24px rgba(255,77,121,0.18)",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "16px",
            fontSize: "0.95rem",
            color: "#dbeafe",
          }}
        >
          Need an account?{" "}
          <span
            onClick={() => navigate("/faculty-register")}
            style={{ color: "#7dd3fc", cursor: "pointer", fontWeight: 700 }}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}
