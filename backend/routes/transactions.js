const express = require('express');
const Joi = require('joi');
const { query, pool } = require('../config/database');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// Validation schemas
const transactionSchema = Joi.object({
  budgetId: Joi.string().uuid().required(),
  categoryId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(1).max(500).required(),
  transactionDate: Joi.date().max('now').required(),
  location: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

// Create a new transaction
router.post('/', async (req, res) => {
  try {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { budgetId, categoryId, amount, description, transactionDate, location, tags } = value;
    const userId = req.user.id;

    // Verify budget belongs to user and is active
    const budgetResult = await query(
      'SELECT id, amount, spent_amount, currency FROM budgets WHERE id = $1 AND user_id = $2 AND is_active = true',
      [budgetId, userId]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found or inactive' });
    }

    const budget = budgetResult.rows[0];
    const newSpentAmount = parseFloat(budget.spent_amount) + parseFloat(amount);

    // Check if transaction would exceed budget
    if (newSpentAmount > parseFloat(budget.amount)) {
      return res.status(400).json({ 
        error: 'Transaction would exceed budget limit',
        remaining: parseFloat(budget.amount) - parseFloat(budget.spent_amount)
      });
    }

    // Verify category exists
    const categoryResult = await query(
      'SELECT id, name FROM categories WHERE id = $1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions (user_id, budget_id, category_id, amount, description, transaction_date, location, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, amount, description, transaction_date, created_at`,
        [userId, budgetId, categoryId, amount, description, transactionDate, location, tags || []]
      );

      // Update budget spent amount
      await client.query(
        'UPDATE budgets SET spent_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSpentAmount, budgetId]
      );

      await client.query('COMMIT');

      const transaction = transactionResult.rows[0];

      // Check budget status and create notifications
      const budgetPercentage = (newSpentAmount / parseFloat(budget.amount)) * 100;
      
      if (budgetPercentage >= 90) {
        await createNotification(userId, {
          title: 'Budget Critical Alert',
          message: `Your budget has reached ${budgetPercentage.toFixed(1)}% of its limit. Only ${(parseFloat(budget.amount) - newSpentAmount).toFixed(2)} ${budget.currency} remaining.`,
          type: 'budget_critical',
          data: { budgetId, percentage: budgetPercentage }
        });
      } else if (budgetPercentage >= 75) {
        await createNotification(userId, {
          title: 'Budget Warning',
          message: `Your budget has reached ${budgetPercentage.toFixed(1)}% of its limit.`,
          type: 'budget_warning',
          data: { budgetId, percentage: budgetPercentage }
        });
      }

      res.status(201).json({
        message: 'Transaction created successfully',
        transaction: {
          ...transaction,
          category: categoryResult.rows[0].name,
          budgetRemaining: parseFloat(budget.amount) - newSpentAmount
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's transactions
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      budgetId, 
      categoryId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      sortBy = 'transaction_date',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const validSortFields = ['transaction_date', 'amount', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'transaction_date';
    const order = validSortOrders.includes(String(sortOrder).toLowerCase()) ? String(sortOrder).toUpperCase() : 'DESC';

    // --- START OF CHANGES ---

    // Define the base parts of the query
    const fromClause = `
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN budgets b ON t.budget_id = b.id
    `;
    
    const whereClause = `WHERE t.user_id = $1`;
    const params = [userId];
    let paramCount = 1;
    let conditions = [];

    // Build dynamic conditions for the WHERE clause
    if (budgetId) {
      conditions.push(`t.budget_id = $${++paramCount}`);
      params.push(budgetId);
    }
    if (categoryId) {
      conditions.push(`t.category_id = $${++paramCount}`);
      params.push(categoryId);
    }
    if (startDate) {
      conditions.push(`t.transaction_date >= $${++paramCount}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`t.transaction_date <= $${++paramCount}`);
      params.push(endDate);
    }

    // Combine all parts for the final query strings
    const fullWhereClause = whereClause + (conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '');

    // 1. Build the COUNT query separately and reliably
    const countQueryStr = `SELECT COUNT(*) ${fromClause} ${fullWhereClause}`;
    const countResult = await query(countQueryStr, params);
    
    // 2. Safely parse the count
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    // 3. Build the data-fetching query
    const dataQueryStr = `
      SELECT t.id, t.amount, t.description, t.transaction_date, t.location, t.tags, t.created_at,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             b.name as budget_name, b.currency
      ${fromClause}
      ${fullWhereClause}
      ORDER BY t.${sortField} ${order} 
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    // Add pagination params at the end
    const dataParams = [...params, parseInt(limit), offset];
    const result = await query(dataQueryStr, dataParams);
    
    // --- END OF CHANGES ---

    res.json({
      transactions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              b.name as budget_name, b.currency
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       JOIN budgets b ON t.budget_id = b.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: result.rows[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { amount, description, categoryId, location, tags } = req.body;

    // Verify transaction belongs to user
    const transactionResult = await query(
      'SELECT id, budget_id, amount FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];
    const amountDifference = amount ? parseFloat(amount) - parseFloat(transaction.amount) : 0;

    // If amount is being changed, check budget limits
    if (amountDifference !== 0) {
      const budgetResult = await query(
        'SELECT amount, spent_amount FROM budgets WHERE id = $1',
        [transaction.budget_id]
      );

      const budget = budgetResult.rows[0];
      const newSpentAmount = parseFloat(budget.spent_amount) + amountDifference;

      if (newSpentAmount > parseFloat(budget.amount)) {
        return res.status(400).json({ 
          error: 'Updated amount would exceed budget limit' 
        });
      }

      // Update budget spent amount
      await query(
        'UPDATE budgets SET spent_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSpentAmount, transaction.budget_id]
      );
    }

    // Update transaction
    const updateFields = [];
    const params = [];
    let paramCount = 1;

    if (amount !== undefined) {
      updateFields.push(`amount = $${paramCount++}`);
      params.push(amount);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (categoryId !== undefined) {
      updateFields.push(`category_id = $${paramCount++}`);
      params.push(categoryId);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramCount++}`);
      params.push(location);
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramCount++}`);
      params.push(tags);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id, userId);

    const result = await query(
      `UPDATE transactions SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING id, amount, description, transaction_date, updated_at`,
      params
    );

    res.json({
      message: 'Transaction updated successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get transaction details for budget update
    const transactionResult = await query(
      'SELECT id, budget_id, amount FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete transaction
      await client.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      // Update budget spent amount
      await client.query(
        'UPDATE budgets SET spent_amount = spent_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [transaction.amount, transaction.budget_id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
