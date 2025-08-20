const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const router = express.Router();

// Validation schema
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error: Unable to fetch your profile', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { firstName, lastName, email}= value;

    // Check if email is already taken by another user to prevent duplicate meail registrations
    if (email) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    const updateFields = [];
    const params = [];
    let paramCount = 1;
 
    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      params.push(firstName);
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      params.push(lastName);
    }
    if (email) {
      updateFields.push(`email = $${paramCount++}`);
      params.push(email);
    }
  

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, updated_at`,
      params
    );

    const user = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = value;

    // Get current password hash
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total budgets
    const budgetResult = await query(
      'SELECT COUNT(*) as total_budgets, COUNT(CASE WHEN is_active = true THEN 1 END) as active_budgets FROM budgets WHERE user_id = $1',
      [userId]
    );

    // Get total transactions
    const transactionResult = await query(
      'SELECT COUNT(*) as total_transactions, COALESCE(SUM(amount), 0) as total_spent FROM transactions WHERE user_id = $1',
      [userId]
    );

    // Get total receipts
    const receiptResult = await query(
      'SELECT COUNT(*) as total_receipts FROM receipts WHERE user_id = $1',
      [userId]
    );

    // Get unread notifications
    const notificationResult = await query(
      'SELECT COUNT(*) as unread_notifications FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    const stats = {
      budgets: {
        total: parseInt(budgetResult.rows[0].total_budgets),
        active: parseInt(budgetResult.rows[0].active_budgets)
      },
      transactions: {
        total: parseInt(transactionResult.rows[0].total_transactions),
        totalSpent: parseFloat(transactionResult.rows[0].total_spent)
      },
      receipts: {
        total: parseInt(receiptResult.rows[0].total_receipts)
      },
      notifications: {
        unread: parseInt(notificationResult.rows[0].unread_notifications)
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
