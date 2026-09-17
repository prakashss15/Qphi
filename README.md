# TaskFlow — Kanban Task Management App

> A full-stack task management application with Kanban-style board, drag-and-drop, team workload balancing, real-time sidebar updates, and a premium dark glassmorphism UI.

---

## 📸 Overview

TaskFlow is a productivity tool that allows individuals and teams to manage tasks using a visual Kanban board. Tasks move through three stages — **To Do**, **In Progress**, and **Done** — with real-time team workload monitoring and burnout detection built in.

---

## 🚀 Features

### Kanban Board
- **3-Column Layout** — To Do, In Progress, Done
- **Drag & Drop** — Move tasks between columns using HTML5 Drag API
- **Live Column Counters** — Each column header shows task count, updated in real time
- **Quick Add** — Click "Add task" at the bottom of any column

### Task Cards
- **Priority Tags** — High 🔴 / Medium 🟡 / Low 🟢 with color-coded borders
- **Due Dates** — Shows date with red highlight for overdue, amber for upcoming
- **Descriptions** — Truncated preview on card, full view in detail modal
- **Assignee Avatars** — Stacked avatar previews with initials and custom colors
- **Edit & Delete** — Hover actions on each card

### Workload Balancing *(Vibe Check Feature)*
- **Team Workload Panel** in sidebar — shows each user's In Progress / Total task count
- **Burnout Alert** — If any user has **more than 5 tasks In Progress**, their avatar **pulses red** automatically
- **Real-time Updates** — Sidebar updates instantly on every drag-drop, create, edit, or delete — no page refresh needed
- **Server-computed** — Burnout logic (`inprogress_count > 5`) calculated on the backend, not the frontend

### User Controls
- **Create Tasks** — Modal with title, description, priority, status, due date, project, assignees
- **Edit Tasks** — Pre-filled modal with all existing data
- **Delete Tasks** — Confirmation prompt before deletion
- **Filter by Priority** — One-click filter: All / High / Medium / Low
- **Add Team Members** — Name, email, custom avatar color picker
- **Create Projects** — Organize tasks under named projects
- **Filter by Project** — Click any project in sidebar to scope the board

### Backend
- **RESTful API** — 20+ endpoints for tasks, projects, users
- **Relational Data** — PostgreSQL schema with projects → tasks and users ↔ tasks (many-to-many)
- **All business logic on the server** — filtering, workload stats, burnout detection, validation
- **SQLite Fallback** — Auto-detects PostgreSQL; if unavailable, falls back to SQLite seamlessly

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, Vanilla CSS, Vanilla JavaScript |
| **Backend** | Node.js + Express.js |
| **Primary DB** | PostgreSQL |
| **Fallback DB** | SQLite (via `better-sqlite3`) |
| **ORM/Driver** | `pg` (node-postgres) |
| **Dev Server** | `http-server` |

---

## 📁 Project Structure

```
task-manager/
├── backend/
│   ├── routes/
│   │   ├── projects.js      # Project CRUD + member management
│   │   ├── tasks.js         # Task CRUD, status PATCH, assignee management
│   │   └── users.js         # User CRUD + workload/burnout endpoint
│   ├── db.js                # Smart DB adapter (PostgreSQL → SQLite fallback)
│   ├── schema.sql           # PostgreSQL schema + seed data
│   ├── schema-sqlite.sql    # SQLite schema + seed data
│   ├── server.js            # Express app entry point
│   ├── .env.example         # Environment config template
│   └── package.json
└── frontend/
    ├── index.html           # Kanban board with all modals
    ├── style.css            # Dark glassmorphism design + animations
    └── app.js               # Drag-drop, API, workload, filtering logic
```

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js v16+
- PostgreSQL (optional — SQLite fallback works automatically)

---

### 1. Clone the Repository

```bash
git clone https://github.com/prakashss15/Qphi.git
cd Qphi
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy the environment file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# Option A: PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskmanager
DB_USER=postgres
DB_PASSWORD=your_password

# Option B: Supabase (hosted PostgreSQL)
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres

PORT=3001
```

> ✅ **No PostgreSQL?** Skip this — the app automatically uses SQLite with pre-seeded data.

---

### 3. Database Setup (PostgreSQL only)

```bash
# Create database
createdb taskmanager

# Run schema + seed data
psql -d taskmanager -f schema.sql
```

Or open **pgAdmin** → Query Tool → paste `schema.sql` → Run.

---

### 4. Start the Backend

Open a terminal and navigate to the backend directory:

**Windows (PowerShell):**
```powershell
cd backend
npm run dev
# or for production: npm start
```
*(Note: In Windows PowerShell 5.1, run commands sequentially or separate with `;` instead of `&&`)*

**Linux / macOS / Git Bash / CMD:**
```bash
cd backend && npm run dev
# or for production: npm start
```

Expected output:
```
[SERVER] Task Manager API running at http://localhost:3001
[DB] Connected to PostgreSQL ✓          ← if PostgreSQL configured
  — OR —
[DB] Falling back to SQLite...
[DB] Connected to SQLite ✓              ← automatic fallback
```

---

### 5. Start the Frontend

Open a **second terminal** and serve the static files:

**Windows (PowerShell):**
```powershell
cd frontend
npx -y serve .
```

**Linux / macOS / Git Bash / CMD:**
```bash
cd frontend && npx -y serve .
```

*Alternative using `http-server`:*
```bash
npx http-server frontend -p 8080 --cors
```

Open in your browser:
- **http://localhost:3000** (or the port displayed by `serve`)
- or **http://127.0.0.1:8080** (if using `http-server`)
- or open [`frontend/index.html`](frontend/index.html) directly in your browser.

---

## 🔌 API Reference

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project + members |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add user to project |
| DELETE | `/api/projects/:id/members/:uid` | Remove user from project |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks (filters: `project_id`, `status`, `priority`, `assignee_id`) |
| GET | `/api/tasks/counts` | Task counts per status column |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get single task with assignees |
| PUT | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/status` | Update status only (drag-drop) |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/assignees` | Assign user to task |
| DELETE | `/api/tasks/:id/assignees/:uid` | Unassign user |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/workload/all` | Workload stats + burnout flags (server-computed) |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user + task stats |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

---

## 🗄️ Database Schema

```sql
projects        (id, name, description, created_at)
users           (id, name, email, avatar_color, created_at)
tasks           (id, project_id→projects, title, description,
                 priority∈{high,medium,low}, status∈{todo,inprogress,done},
                 due_date, created_at)
task_assignees  (task_id→tasks, user_id→users)   -- many-to-many
project_members (project_id→projects, user_id→users)
```

---

## 🎨 Design System

- **Theme** — Dark glassmorphism with animated gradient orbs
- **Font** — Inter (Google Fonts)
- **Colors** — HSL-tuned indigo, pink, emerald, amber palette
- **Animations** — Card entrance, avatar burnout pulse, drag-over glow, modal slide-in, toast slide-in
- **Responsive** — Adapts to tablet and mobile viewports

---

## 🔥 The Vibe Check — Workload Balancing

> *"If any user has more than 5 tasks in 'In Progress', the background color of their avatar in the team list must pulse red to warn of potential burnout."*

### Implementation

**Backend** (`/api/users/workload/all`):
```sql
SELECT
  u.id, u.name, u.avatar_color,
  SUM(CASE WHEN t.status = 'inprogress' THEN 1 ELSE 0 END) AS inprogress_count,
  ...
FROM users u
LEFT JOIN task_assignees ta ON ta.user_id = u.id
LEFT JOIN tasks t ON t.id = ta.task_id
GROUP BY u.id
```

The `burnout` flag is computed server-side:
```js
burnout: parseInt(row.inprogress_count) > 5
```

**Frontend** (`style.css`):
```css
.avatar.burnout {
  animation: burnoutPulse 1.2s ease-in-out infinite;
}
@keyframes burnoutPulse {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.8); background: #ef4444; }
  50%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); background: #dc2626; }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0);   background: #ef4444; }
}
```

**Real-time** (`app.js`):
- On every drag-drop → `computeWorkloadFromState()` runs instantly (zero latency)
- Background sync → `loadWorkload()` polls API every 5 seconds

---

## 🧪 Sample Data (Pre-seeded)

**Projects:** Product Launch, Website Redesign

**Users:** Alice Johnson, Bob Martinez, Carol White, David Kim, Eva Chen

**Tasks (8):**
- Design mockups — High, To Do
- Setup CI/CD pipeline — Medium, In Progress
- Write unit tests — Low, To Do
- Database optimization — High, Done
- User authentication — High, In Progress
- Content audit — Medium, To Do
- SEO optimization — High, In Progress
- Mobile responsiveness — Medium, Done

---

## 📝 Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Vanilla JS (no framework) | Faster load, zero build step, demonstrates raw JS proficiency |
| `pg` + `better-sqlite3` dual DB | Resilient — works without any DB install |
| `PATCH /tasks/:id/status` | Optimized endpoint for drag-drop (minimal payload) |
| Server-side burnout logic | All calculations on backend — frontend only renders |
| Optimistic UI updates | Board and sidebar update instantly before API confirms |
| localStorage fallback | Frontend works completely offline with demo data |

---

## 👨‍💻 Author

**Prakash** — Vibe Coding Round Submission  
GitHub: [@prakashss15](https://github.com/prakashss15)  
Repo: [https://github.com/prakashss15/Qphi](https://github.com/prakashss15/Qphi)