const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET single user with task stats
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Count tasks in each status for workload balancing
    const statsResult = await pool.query(
      `SELECT t.status, COUNT(*) as count
       FROM tasks t
       JOIN task_assignees ta ON ta.task_id = t.id
       WHERE ta.user_id = $1
       GROUP BY t.status`,
      [id]
    );

    const stats = { todo: 0, inprogress: 0, done: 0 };
    statsResult.rows.forEach(row => { stats[row.status] = parseInt(row.count); });

    res.json({ ...userResult.rows[0], task_stats: stats, burnout: stats.inprogress > 5 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET workload data for all users (used for the burnout panel)
router.get('/workload/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         u.id, u.name, u.email, u.avatar_color,
         SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_count,
         SUM(CASE WHEN t.status = 'inprogress' THEN 1 ELSE 0 END) AS inprogress_count,
         SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_count,
         COUNT(t.id) AS total_tasks
       FROM users u
       LEFT JOIN task_assignees ta ON ta.user_id = u.id
       LEFT JOIN tasks t ON t.id = ta.task_id
       GROUP BY u.id, u.name, u.email, u.avatar_color
       ORDER BY inprogress_count DESC`
    );

    const workload = result.rows.map(row => ({
      ...row,
      todo_count: parseInt(row.todo_count) || 0,
      inprogress_count: parseInt(row.inprogress_count) || 0,
      done_count: parseInt(row.done_count) || 0,
      total_tasks: parseInt(row.total_tasks) || 0,
      burnout: parseInt(row.inprogress_count) > 5,
    }));

    res.json(workload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workload data' });
  }
});

// POST create user
router.post('/', async (req, res) => {
  const { name, email, avatar_color } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, avatar_color) VALUES ($1, $2, $3) RETURNING *',
      [name, email, avatar_color || '#6366f1']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, avatar_color } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), avatar_color = COALESCE($3, avatar_color) WHERE id = $4 RETURNING *',
      [name, email, avatar_color, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
