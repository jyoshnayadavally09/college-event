import React from "react";
import { useNavigate } from "react-router-dom";
// import { api } from "./api";
export default function UniversityRolesPage() {
  const navigate = useNavigate();

  const handleViewDetails = (id) => {
    if (id === "admin") navigate("/admin-login");
    else if (id === "faculty") navigate("/faculty-login");
    else if (id === "coordinator") navigate("/coordinator-login");
    else if (id === "student") navigate("/student-login");
  };

  const roles = [
    { id: "admin", title: "Admin", desc: "Manage events and users" },
    { id: "faculty", title: "Faculty", desc: "Organize and oversee events" },
    { id: "coordinator", title: "Coordinator", desc: "Coordinate student activities" },
    { id: "student", title: "Student", desc: "Participate and explore" },
  ];

  const events = [
    {
      title: "Vignan Tech Fest 2024",
      img: "https://images.unsplash.com/photo-1561489428-cc1e5b6b2e47?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Cultural Carnival 2024",
      img: "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Sports Meet 2024",
      img: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Innovation Expo 2024",
      img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Hackathon: CodeVignan 2024",
      img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Green Campus Initiative",
      img: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Research Conclave 2024",
      img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Cultural Night Fiesta",
      img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Entrepreneurship Summit",
      img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80",
    },
  ];

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body, html {
          font-family: 'Poppins', sans-serif;
          overflow-x: hidden;
        }

        .navbar {
          width: 100%;
          padding: 20px 60px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
        }

        .nav-logo {
          font-size: 1.8rem;
          font-weight: 700;
          color: #fff;
        }

        .nav-links {
          display: flex;
          gap: 30px;
        }

        .nav-links a {
          text-decoration: none;
          color: #fff;
          font-weight: 500;
          transition: 0.3s;
        }

        .nav-links a:hover {
          color: #ffd36a;
        }

        .hero {
          height: 100vh;
          width: 100%;
          background: url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80')
            center/cover no-repeat;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          color: white;
          position: relative;
        }

        .hero::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 900px;
          padding: 0 20px;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 15px;
          background: linear-gradient(90deg, #ff8a00, #e52e71);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: #f3f3f3;
          margin-bottom: 30px;
        }

        .explore-btn {
          background: linear-gradient(90deg, #6a11cb, #2575fc);
          padding: 12px 28px;
          border: none;
          border-radius: 25px;
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .explore-btn:hover {
          transform: scale(1.1);
          background: linear-gradient(90deg, #2575fc, #6a11cb);
        }

        .role-cards {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 25px;
          margin-top: 60px;
          position: relative;
          z-index: 2;
        }

        .role-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 25px 20px;
          width: 220px;
          color: #fff;
          transition: all 0.4s ease;
          cursor: pointer;
        }

        .role-card:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.25);
        }

        .role-card h3 {
          font-size: 1.4rem;
          margin-bottom: 10px;
          color: #fff;
        }

        .role-card p {
          font-size: 0.95rem;
          color: #f1f1f1;
        }

        .about {
          padding: 100px 60px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-around;
          background: #fff;
        }

        .about-text {
          flex: 1;
          min-width: 300px;
          padding: 20px;
        }

        .about-text h2 {
          font-size: 2.2rem;
          margin-bottom: 15px;
          color: #333;
        }

        .about-text p {
          font-size: 1.1rem;
          color: #555;
          line-height: 1.6;
        }

        .about-img {
          flex: 1;
          min-width: 320px;
        }

        .about-img img {
          width: 100%;
          border-radius: 20px;
          box-shadow: 0 0 20px rgba(0,0,0,0.2);
        }

        .events {
          background: linear-gradient(180deg, #f3f3f3, #fff);
          padding: 100px 60px;
          text-align: center;
        }

        .events h2 {
          font-size: 2.5rem;
          color: #222;
          margin-bottom: 60px;
        }

        .event-cards {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 30px;
        }

        .event-card {
          background: white;
          border-radius: 15px;
          width: 300px;
          overflow: hidden;
          box-shadow: 0 0 20px rgba(0,0,0,0.15);
          transition: all 0.4s ease;
        }

        .event-card:hover {
          transform: scale(1.05);
        }

        .event-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }

        .event-card h3 {
          font-size: 1.4rem;
          margin: 15px;
          color: #333;
        }

        .footer {
          text-align: center;
          padding: 30px;
          background: #222;
          color: white;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .about {
            flex-direction: column;
            padding: 60px 20px;
          }

          .role-cards {
            flex-direction: column;
            align-items: center;
          }

          .navbar {
            flex-direction: column;
            gap: 10px;
          }

          .hero-title {
            font-size: 2.4rem;
          }

          .events {
            padding: 60px 20px;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="nav-logo">Vignan EventConnect</div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#events">Events</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <h1 className="hero-title">Discover. Connect. Celebrate.</h1>
          <p className="hero-subtitle">
            Join Vignan’s most exciting event platform for students and faculty.
          </p>
          <button className="explore-btn">Explore Now</button>

          <div className="role-cards">
            {roles.map((role) => (
              <div
                key={role.id}
                className="role-card"
                onClick={() => handleViewDetails(role.id)}
              >
                <h3>{role.title}</h3>
                <p>{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-text">
          <h2>About Vignan</h2>
          <p>
            Vignan's Institute fosters innovation, creativity, and collaboration through
            diverse academic and cultural events. Our event portal helps students and
            coordinators seamlessly organize and participate in these activities,
            bringing the campus community closer together.
          </p>
        </div>
        <div className="about-img">
          <img
            src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1000&q=80"
            alt="About Vignan"
          />
        </div>
      </section>

      <section className="events" id="events">
        <h2>Previous Events</h2>
        <div className="event-cards">
          {events.map((event, index) => (
            <div key={index} className="event-card">
              <img src={event.img} alt={event.title} />
              <h3>{event.title}</h3>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        © 2025 Vignan EventConnect. All Rights Reserved.
      </footer>
    </>
  );
}
