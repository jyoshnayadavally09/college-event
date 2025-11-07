import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LoginStyle.css";

export default function FacultyLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // ✅ Send login request
      const res = await axios.post("http://localhost:5000/faculty/login", form);

      if (res.data.token) {
        // ✅ Store token + username globally
        localStorage.setItem("username", res.data.username);
localStorage.setItem("role", "faculty");
localStorage.setItem("token", res.data.token);


        alert("✅ Login successful");
        navigate("/faculty-home");
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error");
    }
  };

  return (
    <div className="login-container faculty">
      <div className="login-box">
        <h1 className="login-title">Faculty Login</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Faculty Username"
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

          <button className="login-btn" type="submit">
            Login
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
}
