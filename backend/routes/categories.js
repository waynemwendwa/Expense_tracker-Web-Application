// routes/categories.js
const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// GET /api/categories
// Fetches all available spending categories
router.get('/', async (req, res) => {
  try {
    // Query to get all categories
    const result = await query(
      'SELECT id, name, icon, color FROM categories ORDER BY name ASC'
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;