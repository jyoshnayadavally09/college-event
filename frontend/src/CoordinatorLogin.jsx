import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function CoordinatorLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/coordinator/login", form);
      if (res.data.token) {
        localStorage.setItem("username", res.data.username);
        localStorage.setItem("role", "coordinator");
        localStorage.setItem("token", res.data.token);
        alert("✅ Login successful");
        navigate("/coordinatorhome");
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error");
    }
  };

  return (
    <div className="coordinator-login-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          height: 100%;
          width: 100%;
          font-family: 'Poppins', sans-serif;
          overflow: hidden;
        }

       .coordinator-login-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background-image: linear-gradient(
      rgba(0, 0, 0, 0.6),
      rgba(0, 0, 0, 0.6)
    ),
    url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  filter: brightness(0.9);
}

/* OPTIONAL: soft blur for aesthetic depth */
.coordinator-login-page::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(8px);
  z-index: 0;
}
        /* === LOGIN CARD === */
        .login-box {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 50px 45px;
          max-width: 400px;
          width: 90%;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.08),
                      0 0 60px rgba(255, 255, 255, 0.05);
          animation: fadeIn 1s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(25px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-title {
  font-size: 2.2rem;
  font-weight: 600;
  color: #f8f9ff;
  margin-bottom: 20px;
  letter-spacing: 1px;
  text-shadow: 0 0 6px rgba(173, 216, 230, 0.4),
               0 0 12px rgba(147, 112, 219, 0.35);
}

        /* === INPUT FIELDS === */
        .login-input {
          width: 100%;
          padding: 12px 15px;
          margin-bottom: 18px;
          border-radius: 10px;
          border: none;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .login-input::placeholder {
          color: #aaa;
        }

        .login-input:focus {
          background: rgba(255, 255, 255, 0.22);
          box-shadow: 0 0 12px rgba(180, 220, 255, 0.5);
        }

        /* === LOGIN BUTTON === */
        .login-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #7b2ff7, #f107a3);
          color: #ffffff;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          box-shadow: 0 0 15px rgba(123, 47, 247, 0.4);
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(241, 7, 163, 0.6);
        }

        /* === ERROR TEXT === */
        .error-text {
          margin-top: 12px;
          color: #ff5c5c;
          font-size: 0.9rem;
        }

        @media (max-width: 480px) {
          .login-box {
            padding: 35px 25px;
          }
          .login-title {
            font-size: 1.8rem;
          }
        }
      `}</style>

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
