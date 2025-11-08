// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// export default function NewEvent() {
//   const navigate = useNavigate();

//   const [form, setForm] = useState({
//     title: "",
//     branch: "",
//     date: "",
//     enddate:"",
//     venue: "",
//     description: "",
//     type: "Individual"
//   });

//   const token = localStorage.getItem("token");
//   const facultyName = localStorage.getItem("username");
//   const role = localStorage.getItem("role"); // ✅ role added

//   useEffect(() => {
//     if (!token) navigate("/faculty-login");
//   }, [token, navigate]);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const submitEvent = async (e) => {
//     e.preventDefault();

//     const data = {
//       ...form,
//       proposedBy: facultyName,
//       proposedRole: role, // ✅ sent to backend
//       status: "Pending"
//     };

//     const res = await fetch("http://localhost:5000/events/add", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(data),
//     });

//     if (res.ok) {
//       alert("✅ Event submitted to Admin!");
//       navigate("/faculty-home");
//     } else {
//       alert("❌ Failed to submit event");
//     }
//   };

//   return (
//     <>
//       <style>{`
//         body {
//           font-family: 'Poppins', sans-serif;
//         }
//         .new-event-container {
//           display:flex;
//           justify-content:center;
//           align-items:center;
//           min-height:100vh;
//           min-width:100vw;
//           background:#eef3f8;
//         }
//         .form-card {
//           width: 430px;
//           background:white;
//           padding:28px;
//           border-radius:12px;
//           box-shadow:0 4px 15px rgba(0,0,0,0.15);
//           animation:fadeIn .3s ease-in-out;
//         }
//         @keyframes fadeIn {
//           from {opacity:0; transform:translateY(10px);}
//           to {opacity:1; transform:translateY(0);}
//         }
//         h2 {
//           text-align:center;
//           margin-bottom:20px;
//           color:#003366;
//         }
//         label {
//           font-weight:600;
//           margin-top:12px;
//           display:block;
//           color:#003366;
//         }
//         input, textarea, select {
//           width:100%;
//           padding:10px;
//           border-radius:8px;
//           border:1px solid #b6c4d6;
//           font-size:14px;
//           margin-top:5px;
//           outline:none;
//           transition:.2s;
//         }
//         input:focus, textarea:focus, select:focus {
//           border-color:#003366;
//           box-shadow:0 0 5px rgba(0,51,102,0.3);
//         }
//         textarea {
//           height:80px;
//           resize:none;
//         }
//         .submit-btn {
//           width:100%;
//           padding:12px;
//           margin-top:18px;
//           background:#003366;
//           color:white;
//           border:none;
//           border-radius:8px;
//           cursor:pointer;
//           font-size:16px;
//           font-weight:600;
//           transition:.25s;
//         }
//         .submit-btn:hover {
//           background:#002244;
//         }
//         .back-btn {
//           width:100%;
//           margin-top:10px;
//           background:#ccc;
//           color:#003366;
//           padding:10px;
//           border:none;
//           border-radius:8px;
//           cursor:pointer;
//           font-weight:600;
//         }
//       `}</style>

//       <div className="new-event-container">
//         <div className="form-card">
//           <h2>✨ Create New Event</h2>

//           <form onSubmit={submitEvent}>
//             <label>Event Title</label>
//             <input name="title" onChange={handleChange} required />

//             <label>Branch</label>
//             <input name="branch" onChange={handleChange} required />

//             <label>Date</label>
//             <input type="date" name="date" onChange={handleChange} required />

//             <label>Venue</label>
//             <input name="venue" onChange={handleChange} required />

//             <label>Description</label>
//             <textarea name="description" onChange={handleChange} required />

//             <label>Event Type</label>
//             <select name="type" onChange={handleChange}>
//               <option value="Individual">Individual</option>
//               <option value="Team">Team</option>
//             </select>

//             <button className="submit-btn" type="submit">
//               ✅ Submit Event
//             </button>

//             <button
//               type="button"
//               className="back-btn"
//               onClick={() => navigate("/faculty-home")}
//             >
//               ← Back to Dashboard
//             </button>
//           </form>
//         </div>
//       </div>
//     </>
//   );
// }

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NewEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    branch: "",
    date: "",
    closeDate: "", // ✅ Added close date
    venue: "",
    description: "",
    type: "Individual",
  });

  const token = localStorage.getItem("token");
  const facultyName = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  useEffect(() => {
    if (!token) navigate("/faculty-login");
  }, [token, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submitEvent = async (e) => {
    e.preventDefault();

    // 🧠 Validation
    if (form.closeDate && new Date(form.closeDate) < new Date(form.date)) {
      alert("⚠️ Close date cannot be before event date!");
      return;
    }

    const data = {
      ...form,
      proposedBy: facultyName,
      proposedRole: role,
      status: "Pending",
    };

    try {
      const res = await fetch("http://localhost:5000/events/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`❌ Failed to submit event: ${err.message || "Server error"}`);
        return;
      }

      alert("✅ Event submitted to Admin!");
      navigate("/faculty-home");
    } catch (err) {
      console.error("Event submit error:", err);
      alert("❌ Network error while submitting event");
    }
  };

  return (
    <>
      <style>{`
        body {
          font-family: 'Poppins', sans-serif;
        }
        .new-event-container {
          display:flex;
          justify-content:center;
          align-items:center;
          min-height:100vh;
          min-width:100vw;
          background:#eef3f8;
        }
        .form-card {
          width: 450px;
          background:white;
          padding:28px;
          border-radius:12px;
          box-shadow:0 4px 15px rgba(0,0,0,0.15);
          animation:fadeIn .3s ease-in-out;
        }
        @keyframes fadeIn {
          from {opacity:0; transform:translateY(10px);}
          to {opacity:1; transform:translateY(0);}
        }
        h2 {
          text-align:center;
          margin-bottom:20px;
          color:#003366;
        }
        label {
          font-weight:600;
          margin-top:12px;
          display:block;
          color:#003366;
        }
        input, textarea, select {
          width:100%;
          padding:10px;
          border-radius:8px;
          border:1px solid #b6c4d6;
          font-size:14px;
          margin-top:5px;
          outline:none;
          transition:.2s;
        }
        input:focus, textarea:focus, select:focus {
          border-color:#003366;
          box-shadow:0 0 5px rgba(0,51,102,0.3);
        }
        textarea {
          height:80px;
          resize:none;
        }
        .submit-btn {
          width:100%;
          padding:12px;
          margin-top:18px;
          background:#003366;
          color:white;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-size:16px;
          font-weight:600;
          transition:.25s;
        }
        .submit-btn:hover {
          background:#002244;
        }
        .back-btn {
          width:100%;
          margin-top:10px;
          background:#ccc;
          color:#003366;
          padding:10px;
          border:none;
          border-radius:8px;
          cursor:pointer;
          font-weight:600;
        }
      `}</style>

      <div className="new-event-container">
        <div className="form-card">
          <h2>✨ Create New Event</h2>

          <form onSubmit={submitEvent}>
            <label>Event Title</label>
            <input
              name="title"
              onChange={handleChange}
              required
              placeholder="e.g. Coding Hackathon"
            />

            <label>Branch</label>
            <input
              name="branch"
              onChange={handleChange}
              required
              placeholder="e.g. CSE, ECE, All"
            />

            <label>Event Date</label>
            <input type="date" name="date" onChange={handleChange} required />

            <label>Registration Close Date</label>
            <input
              type="date"
              name="closeDate"
              onChange={handleChange}
              required
            />

            <label>Venue</label>
            <input name="venue" onChange={handleChange} required />

            <label>Description</label>
            <textarea
              name="description"
              onChange={handleChange}
              required
              placeholder="Brief about event..."
            />

            <label>Event Type</label>
            <select name="type" onChange={handleChange}>
              <option value="Individual">Individual</option>
              <option value="Team">Team</option>
            </select>

            <button className="submit-btn" type="submit">
              ✅ Submit Event
            </button>

            <button
              type="button"
              className="back-btn"
              onClick={() => navigate("/faculty-home")}
            >
              ← Back to Dashboard
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

