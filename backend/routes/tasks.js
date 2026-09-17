const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to build base task query with assignees
const BASE_QUERY = `
  SELECT 
    t.*,
    COALESCE(
      json_agg(
        json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar_color', u.avatar_color)
      ) FILTER (WHERE u.id IS NOT NULL),
      '[]'
    ) AS assignees
  FROM tasks t
  LEFT JOIN task_assignees ta ON ta.task_id = t.id
  LEFT JOIN users u ON u.id = ta.user_id
`;

// GET all tasks (with filters)
router.get('/', async (req, res) => {
  const { project_id, status, priority, assignee_id } = req.query;
  try {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (project_id) { conditions.push(`t.project_id = $${idx++}`); values.push(project_id); }
    if (status) { conditions.push(`t.status = $${idx++}`); values.push(status); }
    if (priority) { conditions.push(`t.priority = $${idx++}`); values.push(priority); }
    if (assignee_id) { conditions.push(`ta.user_id = $${idx++}`); values.push(assignee_id); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const query = `${BASE_QUERY} ${where} GROUP BY t.id ORDER BY t.created_at DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET task column counts (for Kanban column headers)
router.get('/counts', async (req, res) => {
  const { project_id } = req.query;
  try {
    const conditions = project_id ? 'WHERE project_id = $1' : '';
    const values = project_id ? [project_id] : [];
    const result = await pool.query(
      `SELECT status, COUNT(*) as count FROM tasks ${conditions} GROUP BY status`,
      values
    );
    const counts = { todo: 0, inprogress: 0, done: 0 };
    result.rows.forEach(row => { counts[row.status] = parseInt(row.count); });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch task counts' });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`${BASE_QUERY} WHERE t.id = $1 GROUP BY t.id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST create task
router.post('/', async (req, res) => {
  const { project_id, title, description, priority, status, due_date, assignee_ids } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });
  try {
    const taskResult = await pool.query(
      `INSERT INTO tasks (project_id, title, description, priority, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id || null, title, description || '', priority || 'medium', status || 'todo', due_date || null]
    );
    const task = taskResult.rows[0];

    // Assign users if provided
    if (assignee_ids && assignee_ids.length > 0) {
      for (const uid of assignee_ids) {
        await pool.query(
          'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [task.id, uid]
        );
      }
    }

    // Return full task with assignees
    const fullTask = await pool.query(`${BASE_QUERY} WHERE t.id = $1 GROUP BY t.id`, [task.id]);
    res.status(201).json(fullTask.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT update task (including status change for drag-drop)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, due_date, project_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        priority = COALESCE($3, priority),
        status = COALESCE($4, status),
        due_date = COALESCE($5, due_date),
        project_id = COALESCE($6, project_id)
       WHERE id = $7 RETURNING *`,
      [title, description, priority, status, due_date, project_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    // Return full task with assignees
    const fullTask = await pool.query(`${BASE_QUERY} WHERE t.id = $1 GROUP BY t.id`, [id]);
    res.json(fullTask.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH update task status only (optimized for drag-drop)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['todo', 'inprogress', 'done'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Valid status required: todo, inprogress, done' });
  }
  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// POST assign user to task
router.post('/:id/assignees', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    await pool.query(
      'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, user_id]
    );
    res.json({ message: 'User assigned to task' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// DELETE remove user from task
router.delete('/:id/assignees/:user_id', async (req, res) => {
  const { id, user_id } = req.params;
  try {
    await pool.query(
      'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [id, user_id]
    );
    res.json({ message: 'User unassigned from task' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unassign user' });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
