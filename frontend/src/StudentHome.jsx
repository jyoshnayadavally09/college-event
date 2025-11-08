import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentHome() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    if (!token) {
      navigate("/student-login");
      return;
    }
    loadEvents();
  }, [navigate, token]);

  const loadEvents = async () => {
    try {
      const res = await fetch("http://localhost:5000/events");
      const data = await res.json();

      if (!Array.isArray(data)) return;

      // ✅ Filter only approved events with forms (either formSchema or formLink)
      const filtered = data.filter(
        (ev) =>
          ev.status?.toLowerCase() === "approved" &&
          ((ev.formSchema && ev.formSchema.length > 0) ||
            (ev.formLink && ev.formLink.trim() !== ""))
      );

      // ✅ Add registration status
      const withStatus = await Promise.all(
        filtered.map(async (ev) => {
          const status = await checkRegistration(ev._id);
          return { ...ev, registered: status.registered };
        })
      );

      setEvents(withStatus);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const checkRegistration = async (eventId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/events/${eventId}/registrations/check`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) return { registered: false };
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Check error:", err);
      return { registered: false };
    }
  };

  const handleRegister = (ev) => {
    if (ev.formSchema && ev.formSchema.length > 0) {
      navigate(`/student/event-form/${ev._id}`);
    } else if (ev.formLink && ev.formLink.trim() !== "") {
      window.open(ev.formLink, "_blank", "noopener,noreferrer");
    } else {
      alert("No registration form available for this event. Contact the organizer.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/student-login");
  };

  return (
    <>
      <style>{`
        :root {
          --primary: #4f46e5;
          --primary-dark: #3730a3;
          --bg: #f9fafb;
          --card: #ffffff;
          --border: #e5e7eb;
          --text: #111827;
          --muted: #6b7280;
          --success: #16a34a;
          --radius: 12px;
          font-family: "Poppins", system-ui, sans-serif;
        }
        body {
          background: var(--bg);
          color: var(--text);
        }

        .student-wrapper {
          max-width: 1000px;
          margin: 30px auto;
          padding: 20px;
          background: var(--card);
          border-radius: var(--radius);
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
        }

        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .title {
          font-size: 24px;
          font-weight: 800;
          color: var(--primary);
        }

        .logout-btn {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .logout-btn:hover {
          background: var(--primary-dark);
        }

        .event-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .event-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.04);
          transition: transform 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .event-card:hover {
          transform: translateY(-3px);
        }

        .event-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .event-meta {
          font-size: 13px;
          color: var(--muted);
          margin-top: 6px;
          line-height: 1.5;
        }

        .event-desc {
          color: var(--muted);
          margin: 10px 0 14px;
          font-size: 14px;
          line-height: 1.4;
        }

        .btn-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .register-btn {
          background: var(--primary);
          color: white;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
        }

        .register-btn:hover {
          background: var(--primary-dark);
        }

        .registered-btn {
          background: var(--success);
          color: white;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: not-allowed;
          flex: 1;
        }

        .footer {
          text-align: center;
          margin-top: 25px;
          color: var(--muted);
          font-size: 13px;
        }
      `}</style>

      <div className="student-wrapper">
        <div className="top-bar">
          <div>
            <div className="title">🎓 Student Dashboard</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Welcome, {username || "Student"}
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="event-list">
          {events.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>
              No active events available for registration.
            </div>
          ) : (
            events.map((ev) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // normalize today's date
              const closeDate = ev.closeDate ? new Date(ev.closeDate) : null;
              if (closeDate) closeDate.setHours(0, 0, 0, 0);
              
              // ✅ Closed if no closeDate, or closeDate <= today
              const isClosed = !closeDate || closeDate <= today;

              return (
                <div key={ev._id} className="event-card">
                  <div>
                    <div className="event-title">{ev.title}</div>
                    <div className="event-meta">
                      📅 {ev.date || "Date: TBA"} <br />
                      📅 {ev.closeDate || "Closing date: Not disclosed"} <br />
                      📍 {ev.venue || "Venue: TBA"} <br />
                      🏷️ Type: {ev.type || "Individual"}
                    </div>
                    <div className="event-desc">
                      {ev.description || "No description provided."}
                    </div>

                    {ev.results && ev.results.length > 0 && (
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 8,
                          padding: "8px 10px",
                          marginTop: 10,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#166534" }}>🏆 Winners</div>
                        <ul
                          style={{
                            marginTop: 6,
                            paddingLeft: 16,
                            color: "#065f46",
                            fontSize: 14,
                          }}
                        >
                          {ev.results.slice(0, 5).map((w) => (
                            <li key={w.rank}>
                              #{w.rank}: {w.name} {w.roll ? `(${w.roll})` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="btn-group">
                    {ev.registered ? (
                      <button className="registered-btn" disabled>
                        ✅ Registered
                      </button>
                    ) : isClosed ? (
                      <button
                        className="register-btn"
                        disabled
                        style={{ background: "#9ca3af", cursor: "not-allowed" }}
                      >
                        ❌ Registration Closed
                      </button>
                    ) : (
                      <button className="register-btn" onClick={() => handleRegister(ev)}>
                        Register
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="footer">
          © {new Date().getFullYear()} Event Registration Portal
        </div>
      </div>
    </>
  );
}
