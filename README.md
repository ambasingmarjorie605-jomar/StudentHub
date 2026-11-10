# StudentHub – Student Management Dashboard

A dashboard application with full **CRUD** (Create, Read, Update, Delete) for student records.
Web version of my Kodular app (*Output kay sir Buenaflor) *STUDENTHUB*.

**Tech:** Express.js (backend) · SQLite via Node's built-in `node:sqlite` (database) · HTML/CSS/JS (frontend)

## Requirements
- Node.js **22.13 or newer** (check with `node -v`)
- No Python, no Visual Studio Build Tools, nothing to compile.

## Run
```bash
cd SHub22
cd studenthub
npm install
npm start
```
Open http://localhost:3000 → sign up → log in.

> You may see `ExperimentalWarning: SQLite is an experimental feature`. This is harmless.

## Roles
|                   | Client (default on sign-up) |     Admin    |
|-------------------|-----------------------------|--------------|
| View all students |           yes               |      yes     |
| Add students      |           yes               |      yes     |
| Edit / delete     | only students they added    | all students |

A default admin is created on first run: **admin@studenthub.local / admin123**. Students added before roles existed have no owner, so only Admins can edit or delete them. Permissions are enforced on the server, not just hidden in the UI.

## Features
- Sign up / Log in / Log out (passwords hashed with bcrypt)
- Sidebar layout: Dashboard, Student View, My Profile
- Dashboard with stat cards, course/year bar charts, recently added list
- Student View with live search (name, ID, contact), course/year filters, sorting and highlighted matches
- Add, edit and delete students with toast notifications
- Edit your own profile name

## API
| Method |               Endpoint               |      Action     |
|--------|--------------------------------------|-----------------|
|  POST  | /api/signup, /api/login, /api/logout |       Auth      |
|  GET   |              /api/stats              | Dashboard stats |
|  GET   |            /api/students?q=          |  List / search  |
|  GET   |           /api/students/:id          |     Read one    |
|  POST  |             /api/students            |      Create     |
|  PUT   |           /api/students/:id          |      Update     |
| DELETE |           /api/students/:id          |      Delete     |
