import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CoordinatorHome() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);

  const [formLink, setFormLink] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token) {
      navigate("/coordinator-login");
      return;
    }

    fetch("http://localhost:5000/events")
      .then((res) => res.json())
      .then((data) => {
        const myEvents = data.filter(
          (ev) =>
            ev.proposedBy === username &&
            (ev.proposedRole === role || !ev.proposedRole)
        );

        setEvents(myEvents);
      })
      .catch((err) => console.log("Error loading events:", err));
  }, [navigate, token, username, role]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    navigate("/coordinator-login");
  };

  const saveFormLink = async () => {
    await fetch(`http://localhost:5000/events/form/${selected._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formLink }),
    });

    alert("✅ Form link added successfully!");
    window.location.reload();
  };

  return (
    <>
      <style>{`
        * { font-family: 'Poppins', sans-serif; }

        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #003366;
          padding: 15px 30px;
          color: white;
        }

        .nav-actions { display: flex; gap: 12px; }

        .btn {
          padding: 8px 15px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-create { background: #ffcc00; color: #003366; }
        .btn-create:hover { background: #e6b800; }

        .btn-logout { background: red; color: white; }

        .container {
          padding: 25px;
          background: #f2f4f8;
          min-height: 100vh;
          min-width: 100vw;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .event-card {
          background: white;
          padding: 18px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: 0.25s;
          cursor: pointer;
        }

        .event-card:hover { transform: scale(1.02); }

        .status { font-weight: 700; }
        .approved { color: green; }
        .pending { color: orange; }
        .rejected { color: red; }

        .modal-bg {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex; justify-content: center; align-items: center;
        }

        .modal {
          background: white; width: 450px;
          padding: 25px; border-radius: 10px;
          animation: fadeIn .3s ease-in-out;
        }

        @keyframes fadeIn {
          from {opacity: 0; transform: scale(0.9);}
          to {opacity: 1; transform: scale(1);}
        }

        .close-btn {
          width: 100%; padding: 10px; margin-top: 15px;
          background: #003366; color: white;
          border: none; border-radius: 6px; cursor: pointer;
        }

        input {
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 10px;
          width: 100%;
          outline: none;
        }
      `}</style>

      <div className="navbar">
        <h2>Coordinator Dashboard</h2>
        <div className="nav-actions">
          <button className="btn btn-create" onClick={() => navigate("/new-event")}>
            + Create Event
          </button>
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <h2>Welcome, {username} 👋</h2>
        <h3>Your Event Requests</h3>

        {events.length === 0 ? (
          <p>No events found. Create one!</p>
        ) : (
          <div className="events-grid">
            {events.map((ev) => (
              <div key={ev._id} className="event-card" onClick={() => setSelected(ev)}>
                <h3>{ev.title}</h3>
                <p><b>Branch:</b> {ev.branch}</p>
                <p><b>Date:</b> {ev.date}</p>
                <p>
                  <b>Status:</b>{" "}
                  <span className={`status ${ev.status.toLowerCase()}`}>
                    {ev.status}
                  </span>
                </p>

                {ev.status === "Approved" && !ev.formLink && (
                  <button
                    className="btn btn-create"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(ev);
                      setShowFormModal(true);
                    }}
                  >
                    + Add Google Form Link
                  </button>
                )}

                {ev.formLink && (
                  <a href={ev.formLink} target="_blank" rel="noopener noreferrer">
                    View Form
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showFormModal && selected && (
        <div className="modal-bg" onClick={() => setShowFormModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Registration Link</h2>
            <input
              type="text"
              placeholder="Enter Google Form URL"
              value={formLink}
              onChange={(e) => setFormLink(e.target.value)}
            />

            <button
              className="btn btn-create"
              style={{ width: "100%", marginTop: "10px" }}
              onClick={saveFormLink}
            >
              Save Link
            </button>

            <button className="close-btn" onClick={() => setShowFormModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
