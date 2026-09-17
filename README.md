# TaskFlow — Kanban Task Management App

A full-stack task management application with Kanban-style board, drag-and-drop, team workload balancing, and a premium dark UI.

## 🚀 Features

- **Kanban Board** — Three columns: To Do, In Progress, Done with drag-and-drop
- **Task Cards** — Priority tags (High/Medium/Low), due dates, descriptions, assignees
- **Workload Balancing** — Team panel shows task counts per user; avatar pulses red if user has >5 "In Progress" tasks (burnout alert)
- **Column Counters** — Live task count badge on each column header
- **Priority Filter** — Filter all tasks by High, Medium, or Low priority
- **Project Management** — Create projects and filter the board by project
- **User Management** — Add team members with custom avatar colors
- **Full CRUD API** — REST endpoints for tasks, projects, and users
- **Relational Data** — PostgreSQL: projects → tasks, users ↔ tasks (many-to-many assignees)
- **Server-Side Logic** — All business logic (burnout detection, workload stats, filtering) computed on the backend

## 🛠 Tech Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Frontend | HTML5, Vanilla CSS, Vanilla JS |
| Backend  | Node.js + Express.js        |
| Database | PostgreSQL                  |
| ORM      | pg (node-postgres)          |

## 📁 Project Structure

```
task-manager/
├── backend/
│   ├── routes/
│   │   ├── projects.js   # Project CRUD + member management
│   │   ├── tasks.js      # Task CRUD + status patch + assignees
│   │   └── users.js      # User CRUD + workload/burnout endpoint
│   ├── db.js             # PostgreSQL connection pool
│   ├── schema.sql        # DB schema + seed data
│   ├── server.js         # Express entry point
│   ├── .env.example      # Environment config template
│   └── package.json
└── frontend/
    ├── index.html        # Kanban board UI
    ├── style.css         # Dark glassmorphism design
    └── app.js            # All frontend logic
```

## ⚙️ Setup & Run

### 1. PostgreSQL Setup

```bash
# Create the database
createdb taskmanager

# Apply schema and seed data
psql -d taskmanager -f backend/schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

npm install
npm start       # Runs on http://localhost:3001
```

### 3. Frontend

Open `frontend/index.html` directly in your browser, or serve with any static server:

```bash
# Using Python
python -m http.server 8080 --directory frontend

# Using Node http-server
npx http-server frontend -p 8080
```

Then visit: `http://localhost:8080`

## 🔌 API Endpoints

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/projects` | List all projects |
| POST   | `/api/projects` | Create project |
| GET    | `/api/projects/:id` | Get project + members |
| PUT    | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST   | `/api/projects/:id/members` | Add user to project |
| DELETE | `/api/projects/:id/members/:user_id` | Remove user from project |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/tasks` | List tasks (filter: `project_id`, `status`, `priority`, `assignee_id`) |
| GET    | `/api/tasks/counts` | Get task counts per status |
| POST   | `/api/tasks` | Create task |
| GET    | `/api/tasks/:id` | Get single task with assignees |
| PUT    | `/api/tasks/:id` | Update task |
| PATCH  | `/api/tasks/:id/status` | Update status only (drag-drop) |
| DELETE | `/api/tasks/:id` | Delete task |
| POST   | `/api/tasks/:id/assignees` | Assign user to task |
| DELETE | `/api/tasks/:id/assignees/:user_id` | Unassign user |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/users` | List all users |
| GET    | `/api/users/workload/all` | Get workload stats + burnout flags |
| POST   | `/api/users` | Create user |
| GET    | `/api/users/:id` | Get user + task stats |
| PUT    | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

## 🎨 Design

- Dark glassmorphism with animated background orbs
- Premium Inter font
- Smooth micro-animations on cards, modals, hover states
- Burnout detection: avatar pulses red when `inprogress_count > 5` (server-computed)
- Toast notifications for all user actions
- Fully accessible with ARIA attributes and keyboard navigation
