import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UniversityRolesPage from "./UniversityRolesPage";
import AdminLogin from "./AdminLogin";
import FacultyLogin from "./FacultyLogin";
import CoordinatorLogin from "./CoordinatorLogin";
import AdminHome from "./AdminHome";
import CoordinatorHome from "./CoordinatorHome";
import FacultyHome from "./FacultyHome";
import NewEvent from "./NewEvent";
import StudentHome from "./StudentHome";


import EventFormBuilder from "./EventFormBuilder";
import EventDetails from "./EventDetails";
// ...



// ✅ NEW: Import the student login/register pages
import StudentLogin from "./StudentLogin";
import StudentRegister from "./StudentRegister";
import StudentEventForm from "./StudentEventForm";
import FacultyResults from "./FacultyResults";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 🎓 Main Role Selection Page */}
        <Route path="/" element={<UniversityRolesPage />} />

        {/* 👨‍💼 Admin Routes */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/adminhome" element={<AdminHome />} />

        {/* 👩‍🏫 Faculty Routes */}
        <Route path="/faculty-login" element={<FacultyLogin />} />
        <Route path="/faculty-home" element={<FacultyHome />} /> 
         <Route path="/faculty-results" element={<FacultyResults/>} /> 
        <Route path="/new-event" element={<NewEvent />} />

        {/* 👨‍🏫 Coordinator Routes */}
        <Route path="/coordinator-login" element={<CoordinatorLogin />} />
        <Route path="/coordinatorhome" element={<CoordinatorHome />} />

        {/* 🎓 Student Routes */}
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-register" element={<StudentRegister />} />
        <Route path="/student-home" element={<StudentHome />} />
        <Route path="/event-form-builder/:eventId" element={<EventFormBuilder />} />
<Route path="/event-details/:eventId" element={<EventDetails />} />
<Route path="/student/event-form/:id" element={<StudentEventForm />} />
      </Routes>
    </Router>
  );
}
