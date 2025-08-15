const { query } = require('../config/database');

// Create a new notification
async function createNotification(userId, notificationData) {
  try {
    const { title, message, type, data } = notificationData;
    
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, message, type, created_at`,
      [userId, title, message, type, data || {}]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Get user's notifications
async function getUserNotifications(userId, options = {}) {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT id, title, message, type, is_read, data, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    const params = [userId];
    let paramCount = 1;

    if (unreadOnly) {
      queryStr += ` AND is_read = false`;
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
    const countParams = [userId];

    if (unreadOnly) {
      countQuery += ' AND is_read = false';
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    return {
      notifications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

// Mark notification as read
async function markNotificationAsRead(notificationId, userId) {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read
async function markAllNotificationsAsRead(userId) {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id',
      [userId]
    );

    return result.rows.length;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Delete notification
async function deleteNotification(notificationId, userId) {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Get unread notification count
async function getUnreadNotificationCount(userId) {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
}

// Create budget-related notifications
async function createBudgetNotification(userId, budgetId, budgetName, percentage, currency, remaining) {
  let title, message, type;

  if (percentage >= 90) {
    title = 'Budget Critical Alert';
    message = `Your budget "${budgetName}" has reached ${percentage.toFixed(1)}% of its limit. Only ${remaining.toFixed(2)} ${currency} remaining.`;
    type = 'budget_critical';
  } else if (percentage >= 75) {
    title = 'Budget Warning';
    message = `Your budget "${budgetName}" has reached ${percentage.toFixed(1)}% of its limit.`;
    type = 'budget_warning';
  } else {
    return; // No notification needed
  }

  return await createNotification(userId, {
    title,
    message,
    type,
    data: { budgetId, percentage, remaining }
  });
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  createBudgetNotification
};
