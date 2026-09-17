-- Task Manager DB Schema
-- Run this file against your PostgreSQL database to set up the schema

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(10) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('todo', 'inprogress', 'done')) DEFAULT 'todo',
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
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
INSERT INTO projects (name, description) VALUES
    ('Product Launch', 'Q4 product launch coordination'),
    ('Website Redesign', 'Complete overhaul of company website')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, avatar_color) VALUES
    ('Alice Johnson', 'alice@team.com', '#6366f1'),
    ('Bob Martinez', 'bob@team.com', '#ec4899'),
    ('Carol White', 'carol@team.com', '#10b981'),
    ('David Kim', 'david@team.com', '#f59e0b'),
    ('Eva Chen', 'eva@team.com', '#3b82f6')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (project_id, title, description, priority, status, due_date) VALUES
    (1, 'Design mockups', 'Create Figma mockups for all screens', 'high', 'todo', '2026-09-25'),
    (1, 'Setup CI/CD pipeline', 'Configure GitHub Actions for deployment', 'medium', 'inprogress', '2026-09-20'),
    (1, 'Write unit tests', 'Cover all API endpoints with Jest tests', 'low', 'todo', '2026-09-28'),
    (1, 'Database optimization', 'Index frequently queried columns', 'high', 'done', '2026-09-15'),
    (1, 'User authentication', 'Implement JWT-based auth flow', 'high', 'inprogress', '2026-09-22'),
    (2, 'Content audit', 'Review and update all website copy', 'medium', 'todo', '2026-09-30'),
    (2, 'SEO optimization', 'Fix meta tags and improve page speed', 'high', 'inprogress', '2026-09-19'),
    (2, 'Mobile responsiveness', 'Ensure all pages work on mobile', 'medium', 'done', '2026-09-14')
ON CONFLICT DO NOTHING;

-- Assign tasks to users
INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, u.id FROM tasks t, users u
WHERE t.title = 'Design mockups' AND u.email = 'alice@team.com'
ON CONFLICT DO NOTHING;

INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, u.id FROM tasks t, users u
WHERE t.title = 'Setup CI/CD pipeline' AND u.email = 'bob@team.com'
ON CONFLICT DO NOTHING;

INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, u.id FROM tasks t, users u
WHERE t.title = 'User authentication' AND u.email = 'alice@team.com'
ON CONFLICT DO NOTHING;

INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, u.id FROM tasks t, users u
WHERE t.title = 'SEO optimization' AND u.email = 'carol@team.com'
ON CONFLICT DO NOTHING;

INSERT INTO task_assignees (task_id, user_id)
SELECT t.id, u.id FROM tasks t, users u
WHERE t.title = 'Database optimization' AND u.email = 'david@team.com'
ON CONFLICT DO NOTHING;

-- Add project members
INSERT INTO project_members (project_id, user_id)
SELECT p.id, u.id FROM projects p, users u
WHERE p.name = 'Product Launch' AND u.email IN ('alice@team.com', 'bob@team.com', 'carol@team.com')
ON CONFLICT DO NOTHING;

INSERT INTO project_members (project_id, user_id)
SELECT p.id, u.id FROM projects p, users u
WHERE p.name = 'Website Redesign' AND u.email IN ('carol@team.com', 'david@team.com', 'eva@team.com')
ON CONFLICT DO NOTHING;
