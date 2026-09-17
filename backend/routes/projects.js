const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET single project with members
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const membersResult = await pool.query(
      `SELECT u.* FROM users u
       JOIN project_members pm ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [id]
    );
    res.json({ ...projectResult.rows[0], members: membersResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST create project
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST add user to project
router.post('/:id/members', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    await pool.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, user_id]
    );
    res.json({ message: 'User added to project' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add user to project' });
  }
});

// DELETE remove user from project
router.delete('/:id/members/:user_id', async (req, res) => {
  const { id, user_id } = req.params;
  try {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, user_id]
    );
    res.json({ message: 'User removed from project' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove user from project' });
  }
});

module.exports = router;
