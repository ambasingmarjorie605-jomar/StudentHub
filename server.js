const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || "studenthub-secret", resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, "public")));

const auth = (req, res, next) => {
  const u = req.session.userId && db.prepare("SELECT id, full_name, email, role FROM users WHERE id = ?").get(req.session.userId);
  if (!u) return res.status(401).json({ error: "Please log in first" });
  req.user = u; next();
};
// Admin
const canModify = (u, s) => u.role === "Admin" || s.created_by === u.id;
const withPerm = (u) => (s) => ({ ...s, can_modify: canModify(u, s) });
const getStudent = (id) => db.prepare("SELECT * FROM students WHERE id = ?").get(id);
const SELECT = "SELECT s.*, u.full_name AS added_by FROM students s LEFT JOIN users u ON u.id = s.created_by";


app.post("/api/signup", (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) return res.status(400).json({ error: "All fields are required" });
  try {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'Client')").run(full_name, email, hash);
    res.json({ message: "Account created" });
  } catch {
    res.status(400).json({ error: "Email already registered" });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid email or password" });
  req.session.userId = user.id;
  res.json({ id: user.id, full_name: user.full_name, email: user.email, role: user.role });
});

app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ message: "Logged out" })));
app.get("/api/me", auth, (req, res) => res.json(req.user));

app.put("/api/me", auth, (req, res) => {
  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ error: "Name is required" });
  db.prepare("UPDATE users SET full_name = ? WHERE id = ?").run(full_name, req.user.id);
  res.json({ ...req.user, full_name });
});

//DASHBOARD
app.get("/api/stats", auth, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) c FROM students").get().c;
  const byCourse = db.prepare("SELECT course, COUNT(*) count FROM students GROUP BY course").all();
  const byYear = db.prepare("SELECT year, COUNT(*) count FROM students GROUP BY year ORDER BY year").all();
  const recent = db.prepare(SELECT + " ORDER BY s.id DESC LIMIT 5").all().map(withPerm(req.user));
  const mine = db.prepare("SELECT COUNT(*) c FROM students WHERE created_by = ?").get(req.user.id).c;
  const clients = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'Client'").get().c;
  res.json({ total, byCourse, byYear, recent, courses: byCourse.length, mine, clients });
});

//STUDENTS CRUD
//READ (with search)
app.get("/api/students", auth, (req, res) => {
  const q = `%${req.query.q || ""}%`;
  const course = req.query.course || "%", year = req.query.year || "%";
  const sort = { name: "s.name", student_id: "s.student_id", newest: "s.id DESC" }[req.query.sort] || "s.id DESC";
  res.json(db.prepare(`${SELECT} WHERE (s.name LIKE ? OR s.student_id LIKE ? OR s.contact LIKE ?) AND s.course LIKE ? AND s.year LIKE ? ORDER BY ${sort}`).all(q, q, q, course, year).map(withPerm(req.user)));
});
app.get("/api/students/:id", auth, (req, res) => {
  const s = db.prepare(SELECT + " WHERE s.id = ?").get(req.params.id);
  s ? res.json(withPerm(req.user)(s)) : res.status(404).json({ error: "Not found" });
});
//CREATE
app.post("/api/students", auth, (req, res) => {
  const { student_id, name, course, year, contact } = req.body;
  if (!student_id || !name || !course || !year) return res.status(400).json({ error: "Missing required fields" });
  try {
    const r = db.prepare("INSERT INTO students (student_id, name, course, year, contact, created_by) VALUES (?,?,?,?,?,?)")
      .run(student_id, name, course, year, contact || "", req.user.id);
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch {
    res.status(400).json({ error: "Student ID already exists" });
  }
});
//UPDATE
app.put("/api/students/:id", auth, (req, res) => {
  const s = getStudent(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  if (!canModify(req.user, s)) return res.status(403).json({ error: "You can only edit students you added" });
  const { student_id, name, course, year, contact } = req.body;
  if (!student_id || !name || !course || !year) return res.status(400).json({ error: "Missing required fields" });
  try {
    const r = db.prepare("UPDATE students SET student_id=?, name=?, course=?, year=?, contact=? WHERE id=?")
      .run(student_id, name, course, year, contact || "", req.params.id);
    r.changes ? res.json({ message: "Updated" }) : res.status(404).json({ error: "Not found" });
  } catch {
    res.status(400).json({ error: "Student ID already exists" });
  }
});
//DELETE
app.delete("/api/students/:id", auth, (req, res) => {
  const s = getStudent(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  if (!canModify(req.user, s)) return res.status(403).json({ error: "You can only delete students you added" });
  const r = db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
  r.changes ? res.json({ message: "Deleted" }) : res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => console.log(`StudentHub running at http://localhost:${PORT}`));
