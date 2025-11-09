// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const multer = require("multer");

const app = express();
app.use(express.json({ limit: "8mb" })); // allow reasonably large JSON (for base64 images if used)
app.use(cors()); // dev: allow all origins

// ensure uploads + exports folders exist
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXPORTS_DIR = path.join(__dirname, "exports");
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://231fa04091_db_user:GHIdLWzMhubN55x2@cluster0.zghyfea.mongodb.net/?retryWrites=true&w=majority";
const JWT_SECRET = process.env.JWT_SECRET || "sectiona";

// MULTER: disk storage with timestamp to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// serve uploads statically so frontend can fetch /uploads/<filename>
app.use("/uploads", express.static(UPLOADS_DIR));

// ======= SCHEMAS / MODELS =======
const adminSchema = new mongoose.Schema({ username: String, password: String });
const facultySchema = new mongoose.Schema({ username: String, password: String });
const coordinatorSchema = new mongoose.Schema({ username: String, password: String });

const studentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true },
  password: String,
  roll: String,
  branch: String,
});
const winnerSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  name: { type: String, required: true },
  roll: { type: String, default: "" },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  branch: { type: String, default: "All" },
  date: { type: String },
  closeDate: { type: String }, // registration closes after this date
  time : { type : String},
  venue: { type: String },
  description: { type: String },
  type: { type: String, default: "General" },

  proposedBy: { type: String, required: true },
  proposedRole: { type: String, default: "Faculty" },

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },

  formSchema: { type: Array, default: [] },
  formLink: { type: String, default: "" },

  // Results field
  results: {
    type: [winnerSchema],
    default: [],
  },

  // store uploaded image path (public path like "/uploads/<file>")
  image: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

eventSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Models
const Admin = mongoose.model("Admin", adminSchema, "admin");
const Faculty = mongoose.model("Faculty", facultySchema, "faculty");
const Coordinator = mongoose.model("Coordinator", coordinatorSchema, "coordinator");
const Student = mongoose.model("Student", studentSchema, "student");
const Event = mongoose.model("Event", eventSchema, "events");

// ======= DB CONNECT & indexes =======
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ MongoDB Connected");
    try {
      console.log("Connected DB:", mongoose.connection.db && mongoose.connection.db.databaseName ? mongoose.connection.db.databaseName : "(unknown)");
    } catch (e) {
      console.warn("Could not read databaseName:", e && e.message ? e.message : e);
    }

    try {
      const coll = mongoose.connection.collection("event_registrations");
      await coll.createIndex({ eventId: 1, studentUsername: 1 });
      const reqColl = mongoose.connection.collection("student_requests");
      await reqColl.createIndex({ username: 1, roll: 1, status: 1 });
    } catch (e) {
      console.warn("Index warning:", e && e.message ? e.message : e);
    }
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });

// ======= HELPERS / MIDDLEWARE =======

// Strict Bearer token parsing + verify
function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "Authorization header missing" });

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid Authorization header. Use: 'Bearer <token>'" });
  }

  const token = parts[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    req.user = jwt.verify(token, JWT_SECRET); // { username, role }
    return next();
  } catch (err) {
    console.error("verifyToken:", err && err.message ? err.message : err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// Role guard (case-insensitive)
function requireAnyRole(allowed = []) {
  const normal = allowed.map(r => r.toString().toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const userRole = (req.user.role || "").toString().toLowerCase();
    if (!normal.includes(userRole)) return res.status(403).json({ message: "Forbidden - insufficient role" });
    next();
  };
}

// Simple login helper (plaintext passwords for dev)
async function login(Model, req, res, role) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });

    const user = await Model.findOne({ username });
    if (!user) return res.status(404).json({ message: `${role} not found` });

    // plaintext compare (dev). Replace with bcrypt in production.
    if (user.password !== password) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ username, role }, JWT_SECRET);
    return res.json({ token, username, role });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ======= AUTH ROUTES =======
app.post("/admin/login", (req, res) => login(Admin, req, res, "Admin"));
app.post("/faculty/login", (req, res) => login(Faculty, req, res, "Faculty"));
app.post("/coordinator/login", (req, res) => login(Coordinator, req, res, "Coordinator"));

// ======= STUDENT FLOWS =======

// Protected: create a student account (only Faculty/Admin/Coordinator)
app.post("/student/register", async (req, res) => {
  try {
    const { name, email, username, password, roll, branch } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });
    const normUsername = String(username).trim().toLowerCase();
    const normEmail = email ? String(email).trim().toLowerCase() : null;
    const conflictQuery = { $or: [{ username: normUsername }] };
    if (normEmail) conflictQuery.$or.push({ email: normEmail });
    const existing = await Student.findOne(conflictQuery).lean();
    if (existing) {
      const field = existing.username === normUsername ? "username" : "email";
      return res.status(409).json({ message: `${field} already exists` });
    }
    const newStudent = await Student.create({
      name: name || null,
      email: normEmail,
      username: normUsername,
      password,
      roll: roll || null,
      branch: branch || null
    });
    const token = jwt.sign({ username: normUsername, role: "Student" }, JWT_SECRET);
    return res.status(201).json({ token, username: normUsername, role: "Student" });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Duplicate key error" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

// Public: student login (plaintext compare - dev)
app.post("/student/login", async (req, res) => login(Student, req, res, "Student"));

// ======= EVENTS API =======

// Helper to sanitize eventId into a safe string for filenames
function safeId(evId) {
  return String(evId).replace(/[^a-zA-Z0-9_-]/g, "_");
}

// CREATE/ADD EVENT (protected) - accepts either JSON or multipart/form-data with 'image'
app.post(
  "/events/add",
  (req, res, next) => {
    // if multipart/form-data -> run multer; else skip
    const ct = (req.headers["content-type"] || "").toLowerCase();
    if (ct.includes("multipart/form-data")) {
      return upload.single("image")(req, res, (err) => {
        if (err) {
          console.warn("[/events/add] multer error:", err && err.message ? err.message : err);
          return res.status(400).json({ message: err.message || "File upload error" });
        }
        return next();
      });
    } else {
      return next();
    }
  },
  verifyToken,
  requireAnyRole(["Faculty","Admin","Coordinator"]),
  async (req, res) => {
    try {
      console.log("[/events/add] incoming request from user:", req.user?.username, "role:", req.user?.role);

      // Make a copy of req.body (works for both JSON and multipart fields)
      const payload = typeof req.body === "object" ? { ...req.body } : {};

      // If multer saved a file, expose a public path
      if (req.file) {
        payload.image = `/uploads/${path.basename(req.file.path)}`;
        console.log("[/events/add] saved file to:", req.file.path, "public:", payload.image);
      }

      // Normalize title from several possible keys (client may send 'name' or 'eventTitle', etc.)
      payload.title = (payload.title || payload.name || payload.eventTitle || payload.event_title || payload.event_name || "").toString().trim();

      // Defensive: ensure proposedBy/proposedRole set from token if not present
      payload.proposedBy = (payload.proposedBy && payload.proposedBy.toString()) || req.user?.username || "unknown";
      payload.proposedRole = (payload.proposedRole && payload.proposedRole.toString()) || req.user?.role || "unknown";
      payload.status = payload.status || "Pending";

      // Helpful debug log: show headers and first-level payload keys (avoids spamming full objects)
      console.log("[/events/add] headers Authorization:", !!req.headers.authorization, "payload keys:", Object.keys(payload));

      if (!payload.title) {
        console.warn("[/events/add] validation failed - missing title. payload keys:", Object.keys(payload), "payload sample:", payload);
        return res.status(400).json({ message: "title is required" });
      }

      const evToSave = {
        title: payload.title,
        branch: payload.branch,
        date: payload.date,
        closeDate: payload.closeDate,
        time: payload.time,
        venue: payload.venue,
        description: payload.description,
        type: payload.type,
        proposedBy: payload.proposedBy,
        proposedRole: payload.proposedRole,
        status: payload.status,
        image: payload.image || payload.imageUrl || payload.imagePath || "",
        formSchema: Array.isArray(payload.formSchema) ? payload.formSchema : [],
      };

      const event = await Event.create(evToSave);
      console.log(`[/events/add] created event _id=${event._id} title="${event.title}" by=${payload.proposedBy}`);
      return res.status(201).json(event);
    } catch (err) {
      console.error("[/events/add] error creating event:", err && err.message ? err.message : err);
      return res.status(500).json({ message: "Server error creating event", error: err && err.message ? err.message : undefined });
    }
  }
);

// Legacy create route (kept for compatibility) - JSON only
app.post("/events/create", verifyToken, requireAnyRole(["Faculty","Admin","Coordinator"]), async (req, res) => {
  try {
    console.log("[/events/create] incoming request from user:", req.user?.username, "role:", req.user?.role);
    const payload = { ...req.body };
    payload.proposedBy = payload.proposedBy || req.user?.username || "unknown";
    payload.proposedRole = payload.proposedRole || req.user?.role || "unknown";
    payload.status = payload.status || "Pending";

    if (!payload.title || !payload.title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const event = await Event.create(payload);
    console.log(`[/events/create] created event _id=${event._id} title="${event.title}"`);
    return res.status(201).json(event);
  } catch (err) {
    console.error("[/events/create] error:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "Server error creating event" });
  }
});

// Approve event (admin/coordinator) — set approvedAt + approvedBy
app.put("/admin/approve/:id", verifyToken, requireAnyRole(["Admin","Coordinator"]), async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { status: "Approved", approvedAt: new Date(), approvedBy: req.user?.username || null },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Event not found" });
    console.log(`[/admin/approve] ${req.params.id} approvedBy ${req.user?.username}`);
    return res.json({ message: "Event approved successfully", event: updated });
  } catch (err) {
    console.error("/admin/approve:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reject event (admin/coordinator) — set rejectionReason optionally
app.put("/admin/reject/:id", verifyToken, requireAnyRole(["Admin","Coordinator"]), async (req, res) => {
  try {
    const update = { status: "Rejected", rejectionReason: req.body.rejectionReason || null };
    const updated = await Event.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Event not found" });
    console.log(`[/admin/reject] ${req.params.id} rejectedBy ${req.user?.username}`);
    return res.json({ message: "Event rejected", event: updated });
  } catch (err) {
    console.error("/admin/reject:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all events (public)
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    return res.json(events);
  } catch (err) {
    console.error("/events:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update event status (Admin/Coordinator) - alternate route
app.put("/events/update/:id", verifyToken, requireAnyRole(["Admin", "Coordinator"]), async (req, res) => {
  try {
    const updatePayload = {};
    if (req.body.status) updatePayload.status = req.body.status;
    if (req.body.status && req.body.status.toLowerCase() === "approved") {
      updatePayload.approvedAt = new Date();
      updatePayload.approvedBy = req.user?.username || null;
    }
    const updated = await Event.findByIdAndUpdate(req.params.id, updatePayload, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Event not found" });
    console.log(`[/events/update] ${req.params.id} -> ${JSON.stringify(updatePayload)} by ${req.user?.username}`);
    return res.json(updated);
  } catch (err) {
    console.error("/events/update:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update event datetime (public or protected depending on your flow)
app.put("/events/update-datetime/:id", async (req, res) => {
  try {
    const { date, time } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { date, time },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event updated successfully", event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Save in-app form schema for an event (Faculty/Admin/Coordinator)
app.put("/events/:id/form-schema", verifyToken, requireAnyRole(["Faculty", "Admin", "Coordinator"]), async (req, res) => {
  try {
    const { formSchema } = req.body;
    if (!Array.isArray(formSchema)) return res.status(400).json({ message: "formSchema should be an array" });

    const updated = await Event.findByIdAndUpdate(req.params.id, { formSchema }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Event not found" });
    console.log(`[/events/:id/form-schema] saved schema for ${req.params.id} by ${req.user.username}`);
    return res.json({ message: "Form schema saved", event: updated });
  } catch (err) {
    console.error("/events/:id/form-schema:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Optional legacy: set formLink (kept for compatibility)
app.put("/events/form/:id", verifyToken, requireAnyRole(["Faculty", "Admin", "Coordinator"]), async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, { formLink: req.body.formLink }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Event not found" });
    return res.json(updated);
  } catch (err) {
    console.error("/events/form:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /events/:id/results — save winners
app.post("/events/:id/results", verifyToken, requireAnyRole(["Faculty", "Admin", "Coordinator"]), async (req, res) => {
  try {
    const { winners } = req.body;
    if (!Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ message: "Winners array is required" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.results = winners.slice(0, 5);
    await event.save();

    res.json({ message: "Results added successfully", event });
  } catch (err) {
    console.error("Error saving results:", err);
    res.status(500).json({ message: "Server error saving results", error: err.message || err });
  }
});

// ======= REGISTRATIONS (student-facing) =======

// Enhanced Register for an event (token-aware) + per-event collection + per-event Excel
app.post("/events/:id/register", async (req, res) => {
  try {
    const eventId = req.params.id;
    let { responses, student } = req.body;
    if (!responses || typeof responses !== "object") return res.status(400).json({ message: "Invalid responses" });

    // If auth token present and valid Student, prefer profile from token
    try {
      const header = req.headers.authorization;
      if (header && header.split(" ")[0] === "Bearer") {
        const token = header.split(" ")[1];
        if (token) {
          try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (payload && payload.username && payload.role && payload.role.toLowerCase() === "student") {
              const s = await Student.findOne({ username: payload.username }).select("-password -__v").lean();
              if (s) student = s;
            }
          } catch (e) { /* ignore invalid token */ }
        }
      }
    } catch (e) { /* ignore header parse issues */ }

    const centralCollection = mongoose.connection.collection("event_registrations");
    const studentUsername = student && student.username ? student.username : null;

    // prevent duplicate registration by same student (if username present)
    if (studentUsername) {
      const existing = await centralCollection.findOne({ eventId, studentUsername });
      if (existing) {
        return res.status(409).json({ message: "You have already registered for this event", registration: existing });
      }
    }

    const doc = {
      eventId,
      student: student || null,
      studentUsername: student && student.username
        ? String(student.username).trim().toLowerCase()
        : null,
      responses,
      createdAt: new Date(),
    };

    // 1) insert into central collection (keeps compatibility)
    const centralResult = await centralCollection.insertOne(doc);

    // 2) ensure a per-event collection exists and insert there too
    const safeEventId = safeId(eventId);
    const perEventCollectionName = `registrations_event_${safeEventId}`;
    const perEventColl = mongoose.connection.collection(perEventCollectionName);
    await perEventColl.insertOne({ ...doc, _fromCentralId: centralResult.insertedId });

    // 3) append to per-event Excel file
    try {
      const excelPath = path.join(EXPORTS_DIR, `registrations_event_${safeEventId}.xlsx`);
      let rows = [];

      if (fs.existsSync(excelPath)) {
        try {
          const wb = XLSX.readFile(excelPath);
          const sheetName = wb.SheetNames[0] || "Registrations";
          const sheet = wb.Sheets[sheetName];
          rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "" }) : [];
        } catch (err) {
          console.warn("Could not read existing xlsx, will create fresh:", err && err.message ? err.message : err);
          rows = [];
        }
      }

      // Flatten responses into JSON-friendly string values for Excel
      const row = {
        registrationId: centralResult.insertedId ? String(centralResult.insertedId) : "",
        studentUsername: studentUsername || "",
        createdAt: new Date().toISOString(),
        responses: JSON.stringify(responses),
      };

      if (responses && typeof responses === "object") {
        Object.keys(responses).forEach(k => {
          const colKey = `resp_${k}`;
          const val = responses[k];
          row[colKey] = (typeof val === "object") ? JSON.stringify(val) : String(val);
        });
      }

      rows.push(row);

      const newWb = XLSX.utils.book_new();
      const newSheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(newWb, newSheet, "Registrations");
      XLSX.writeFile(newWb, excelPath);
    } catch (excelErr) {
      console.warn("Excel write failed for event", eventId, excelErr && excelErr.message ? excelErr.message : excelErr);
      // do not fail registration just because Excel write failed
    }

    // log the insert
    try {
      console.log(`[register] insertedId=${centralResult.insertedId} eventId=${eventId} student=${studentUsername || 'anon'}`);
    } catch (e) {
      console.log(`[register] eventId=${eventId} student=${studentUsername || 'anon'}`);
    }

    return res.status(201).json({ message: "Registration saved", registrationId: centralResult.insertedId, registration: doc });
  } catch (err) {
    console.error("/events/:id/register:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Check if current student (from token) or ?username= already registered
app.get("/events/:id/registrations/check", async (req, res) => {
  try {
    const eventId = req.params.id;
    let username = null;

    const header = req.headers.authorization;
    if (header && header.split(" ")[0] === "Bearer") {
      const token = header.split(" ")[1];
      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET);
          if (payload && payload.username) username = payload.username;
        } catch (e) { /* invalid token -> continue */ }
      }
    }

    username = username || req.query.username || null;

    if (!username) return res.status(400).json({ message: "username not provided (use token or ?username=...)" });

    const collection = mongoose.connection.collection("event_registrations");
    const existing = await collection.findOne({ eventId, studentUsername: username });

    if (!existing) return res.json({ registered: false });
    return res.json({ registered: true, registration: existing });
  } catch (err) {
    console.error("/events/:id/registrations/check:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get registrations for an event (protected)
app.get("/events/:id/registrations", verifyToken, requireAnyRole(["Faculty", "Admin", "Coordinator"]), async (req, res) => {
  try {
    const eventId = req.params.id;
    const collection = mongoose.connection.collection("event_registrations");
    const regs = await collection.find({ eventId }).sort({ createdAt: -1 }).toArray();
    return res.json(regs);
  } catch (err) {
    console.error("/events/:id/registrations:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// CSV export helper & endpoint
const toCsv = (rows) => {
  if (!rows || !rows.length) return "";
  const fieldSet = new Set();
  rows.forEach(r => {
    if (r.responses && typeof r.responses === "object") {
      Object.keys(r.responses).forEach(k => fieldSet.add(k));
    } else if (typeof r.responses === "string") {
      try {
        const obj = JSON.parse(r.responses);
        Object.keys(obj).forEach(k => fieldSet.add(k));
      } catch (e) { /* ignore */ }
    }
  });
  const responseFields = Array.from(fieldSet).sort();

  const header = ["registrationId","studentUsername","createdAt", ...responseFields];
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g,'""')}"`;
  };

  const lines = [header.join(",")];
  rows.forEach(r => {
    const regId = r._id ? String(r._id) : (r.registrationId ? String(r.registrationId) : "");
    const base = [escape(regId), escape(r.studentUsername), escape(r.createdAt)];
    const resp = responseFields.map(k => {
      let val = "";
      if (r.responses && typeof r.responses === "object" && Object.prototype.hasOwnProperty.call(r.responses, k)) {
        val = r.responses[k];
      } else if (typeof r.responses === "string") {
        try {
          const obj = JSON.parse(r.responses);
          val = Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : "";
        } catch (e) {
          val = "";
        }
      }
      return escape(val);
    });
    lines.push([...base, ...resp].join(","));
  });

  return lines.join("\n");
};

app.get("/events/:id/registrations/export", verifyToken, requireAnyRole(["Faculty","Admin","Coordinator"]), async (req,res) => {
  try {
    const eventId = req.params.id;
    const collection = mongoose.connection.collection("event_registrations");
    const regs = await collection.find({ eventId }).sort({ createdAt: -1 }).toArray();

    const csv = toCsv(regs);
    const filename = `registrations_event_${eventId}.csv`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(csv);
  } catch (err) {
    console.error("/events/:id/registrations/export:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// XLSX download endpoint (per-event file)
app.get("/events/:id/registrations/export-xlsx", verifyToken, requireAnyRole(["Faculty","Admin","Coordinator"]), async (req, res) => {
  try {
    const eventId = req.params.id;
    const safeEventId = safeId(eventId);
    const filePath = path.join(EXPORTS_DIR, `registrations_event_${safeEventId}.xlsx`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "No registrations XLSX found for this event" });
    return res.download(filePath);
  } catch (err) {
    console.error("/events/:id/registrations/export-xlsx:", err);
    res.status(500).json({ message: "Server error exporting xlsx" });
  }
});

// ======= STUDENT PROFILE (protected) =======
app.get("/student/profile", verifyToken, async (req, res) => {
  try {
    if (!req.user || !req.user.username) return res.status(401).json({ message: "Not authenticated" });
    const username = req.user.username;
    const student = await Student.findOne({ username }).select("-password -__v").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.json(student);
  } catch (err) {
    console.error("/student/profile:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Health check
app.get("/health", (req, res) => {
  const up = mongoose.connection.readyState === 1;
  res.json({ ok: up, dbState: mongoose.connection.readyState });
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Start
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
