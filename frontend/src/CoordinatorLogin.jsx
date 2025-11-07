import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginStyle.css";

export default function CoordinatorLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // ✅ Send login request to backend
      const res = await axios.post("http://localhost:5000/coordinator/login", form);

      if (res.data.token) {
        // ✅ Save token to localStorage
       localStorage.setItem("username", res.data.username);
localStorage.setItem("role", "coordinator");
localStorage.setItem("token", res.data.token);


        // ✅ Redirect to coordinator home
        navigate("/coordinatorhome");
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error");
    }
  };

  return (
    <div className="login-container coordinator">
      <div className="login-box">
        <h1 className="login-title">Coordinator Login</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            className="login-input"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <button type="submit" className="login-btn">
            Login
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
}
