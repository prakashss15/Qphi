-- SQLite Schema for TaskFlow (fallback when PostgreSQL unavailable)

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('todo', 'inprogress', 'done')) DEFAULT 'todo',
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_assignees (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- Seed Data
INSERT OR IGNORE INTO projects (id, name, description) VALUES
    (1, 'Product Launch', 'Q4 product launch coordination'),
    (2, 'Website Redesign', 'Complete overhaul of company website');

INSERT OR IGNORE INTO users (id, name, email, avatar_color) VALUES
    (1, 'Alice Johnson', 'alice@team.com', '#6366f1'),
    (2, 'Bob Martinez',  'bob@team.com',   '#ec4899'),
    (3, 'Carol White',   'carol@team.com', '#10b981'),
    (4, 'David Kim',     'david@team.com', '#f59e0b'),
    (5, 'Eva Chen',      'eva@team.com',   '#3b82f6');

INSERT OR IGNORE INTO tasks (id, project_id, title, description, priority, status, due_date) VALUES
    (1, 1, 'Design mockups',       'Create Figma mockups for all screens',         'high',   'todo',       '2026-09-25'),
    (2, 1, 'Setup CI/CD pipeline', 'Configure GitHub Actions for deployment',       'medium', 'inprogress', '2026-09-20'),
    (3, 1, 'Write unit tests',     'Cover all API endpoints with Jest tests',       'low',    'todo',       '2026-09-28'),
    (4, 1, 'Database optimization','Index frequently queried columns',              'high',   'done',       '2026-09-15'),
    (5, 1, 'User authentication',  'Implement JWT-based auth flow',                'high',   'inprogress', '2026-09-22'),
    (6, 2, 'Content audit',        'Review and update all website copy',            'medium', 'todo',       '2026-09-30'),
    (7, 2, 'SEO optimization',     'Fix meta tags and improve page speed',          'high',   'inprogress', '2026-09-19'),
    (8, 2, 'Mobile responsiveness','Ensure all pages work on mobile',              'medium', 'done',       '2026-09-14');

INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (1,1),(2,2),(5,1),(7,3),(4,4),(8,5);
INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (1,1),(1,2),(1,3),(2,3),(2,4),(2,5);
