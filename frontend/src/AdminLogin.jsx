import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ✅ Corrected endpoint
      const res = await axios.post("http://localhost:5000/admin/login", form);

      setMessage(res.data.message);

      // Save token to localStorage
      localStorage.setItem("token", res.data.token);

      // Navigate to Admin Home
      navigate("/adminhome");
    } catch (err) {
      console.log(err.response?.data);
      setMessage(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-container admin">
      <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a0a, #111);
          color: white;
          font-family: "Poppins", sans-serif;
        }
        .login-box {
          background: #1c1c1c;
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 0 15px #00aaff55;
          width: 350px;
        }
        .login-title {
          text-align: center;
          color: #00aaff;
          margin-bottom: 20px;
        }
        .login-input {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: none;
          border-radius: 8px;
          background: #2a2a2a;
          color: white;
          font-size: 1rem;
        }
        .login-input:focus {
          outline: 2px solid #00aaff;
        }
        .login-btn {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 8px;
          background: #00aaff;
          color: black;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
        }
        .login-btn:hover {
          background: #00ddff;
        }
        p {
          text-align: center;
          color: #ccc;
          margin-top: 10px;
        }
      `}</style>

      <div className="login-box">
        <h1 className="login-title">Admin Login</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            className="login-input"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            className="login-input"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button className="login-btn" type="submit">
            Login
          </button>
        </form>

        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
