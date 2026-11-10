// Uses Node's built-in SQLite (node:sqlite) -> nothing to compile.
const path = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(path.join(__dirname, "studenthub.db"));
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Client'
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  course TEXT NOT NULL,
  year TEXT NOT NULL,
  contact TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);
`);
//for older database: track who added each student.
if (!db.prepare("PRAGMA table_info(students)").all().some((c) => c.name === "created_by"))
  db.exec("ALTER TABLE students ADD COLUMN created_by INTEGER");

//1 Admin
if (!db.prepare("SELECT 1 FROM users WHERE role='Admin'").get()) {
  db.prepare("INSERT OR IGNORE INTO users (full_name,email,password,role) VALUES (?,?,?,'Admin')")
    .run("Administrator", "admin@studenthub.local", bcrypt.hashSync("admin123", 10));
  console.log("Default admin created -> admin@studenthub.local / admin123 (change this!)");
}
module.exports = db;
