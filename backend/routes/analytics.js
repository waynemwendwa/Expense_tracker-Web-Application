const express = require('express');
const moment = require('moment');
const { query } = require('../config/database');

const router = express.Router();

// Get spending overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    let startDate, endDate;
    const now = moment();

    switch (period) {
      case 'week':
        startDate = now.clone().startOf('week');
        endDate = now.clone().endOf('week');
        break;
      case 'month':
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
        break;
      case 'quarter':
        startDate = now.clone().startOf('quarter');
        endDate = now.clone().endOf('quarter');
        break;
      case 'year':
        startDate = now.clone().startOf('year');
        endDate = now.clone().endOf('year');
        break;
      default:
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
    }

    // Get total spending for period
    const spendingResult = await query(
      `SELECT COALESCE(SUM(t.amount), 0) as total_spent,
              COUNT(t.id) as transaction_count,
              AVG(t.amount) as average_transaction
       FROM transactions t
       WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2 AND $3`,
      [userId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    // Get budget information
    const budgetResult = await query(
      `SELECT COALESCE(SUM(b.amount), 0) as total_budget,
              COALESCE(SUM(b.spent_amount), 0) as total_spent_budget,
              COUNT(b.id) as active_budgets
       FROM budgets b
       WHERE b.user_id = $1 AND b.is_active = true
       AND b.start_date <= $2 AND b.end_date >= $3`,
      [userId, endDate.format('YYYY-MM-DD'), startDate.format('YYYY-MM-DD')]
    );

    const spending = spendingResult.rows[0];
    const budget = budgetResult.rows[0];

    const overview = {
      period: {
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD'),
        name: period
      },
      spending: {
        total: parseFloat(spending.total_spent),
        count: parseInt(spending.transaction_count),
        average: parseFloat(spending.average_transaction) || 0
      },
      budget: {
        total: parseFloat(budget.total_budget),
        spent: parseFloat(budget.total_spent_budget),
        remaining: parseFloat(budget.total_budget) - parseFloat(budget.total_spent_budget),
        percentage: budget.total_budget > 0 ? 
          (parseFloat(budget.total_spent_budget) / parseFloat(budget.total_budget)) * 100 : 0,
        activeCount: parseInt(budget.active_budgets)
      }
    };

    res.json({ overview });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get spending by category
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month', limit = 10 } = req.query;

    let startDate, endDate;
    const now = moment();

    switch (period) {
      case 'week':
        startDate = now.clone().startOf('week');
        endDate = now.clone().endOf('week');
        break;
      case 'month':
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
        break;
      case 'quarter':
        startDate = now.clone().startOf('quarter');
        endDate = now.clone().endOf('quarter');
        break;
      case 'year':
        startDate = now.clone().startOf('year');
        endDate = now.clone().endOf('year');
        break;
      default:
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
    }

    const result = await query(
      `SELECT c.id, c.name, c.icon, c.color,
              COALESCE(SUM(t.amount), 0) as total_spent,
              COUNT(t.id) as transaction_count,
              AVG(t.amount) as average_amount
       FROM categories c
       LEFT JOIN transactions t ON c.id = t.category_id 
         AND t.user_id = $1 
         AND t.transaction_date BETWEEN $2 AND $3
       GROUP BY c.id, c.name, c.icon, c.color
       HAVING COALESCE(SUM(t.amount), 0) > 0
       ORDER BY total_spent DESC
       LIMIT $4`,
      [userId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), parseInt(limit)]
    );

    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      totalSpent: parseFloat(row.total_spent),
      transactionCount: parseInt(row.transaction_count),
      averageAmount: parseFloat(row.average_amount) || 0
    }));

    res.json({ categories });
  } catch (error) {
    console.error('Analytics categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get spending trends over time
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month', groupBy = 'day' } = req.query;

    let startDate, endDate, dateFormat;
    const now = moment();

    switch (period) {
      case 'week':
        startDate = now.clone().subtract(1, 'week');
        endDate = now.clone();
        dateFormat = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH';
        break;
      case 'month':
        startDate = now.clone().subtract(1, 'month');
        endDate = now.clone();
        dateFormat = groupBy === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH';
        break;
      case 'quarter':
        startDate = now.clone().subtract(3, 'months');
        endDate = now.clone();
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'year':
        startDate = now.clone().subtract(1, 'year');
        endDate = now.clone();
        dateFormat = 'YYYY-MM';
        break;
      default:
        startDate = now.clone().subtract(1, 'month');
        endDate = now.clone();
        dateFormat = 'YYYY-MM-DD';
    }

    let groupByClause;
    switch (groupBy) {
      case 'hour':
        groupByClause = "DATE_TRUNC('hour', t.transaction_date)";
        break;
      case 'day':
        groupByClause = "DATE(t.transaction_date)";
        break;
      case 'week':
        groupByClause = "DATE_TRUNC('week', t.transaction_date)";
        break;
      case 'month':
        groupByClause = "DATE_TRUNC('month', t.transaction_date)";
        break;
      default:
        groupByClause = "DATE(t.transaction_date)";
    }

    const result = await query(
      `SELECT ${groupByClause} as date,
              COALESCE(SUM(t.amount), 0) as total_spent,
              COUNT(t.id) as transaction_count
       FROM generate_series($1::date, $2::date, '1 ${groupBy}'::interval) as dates(date)
       LEFT JOIN transactions t ON ${groupByClause} = dates.date AND t.user_id = $3
       GROUP BY dates.date
       ORDER BY dates.date`,
      [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), userId]
    );

    const trends = result.rows.map(row => ({
      date: moment(row.date).format(dateFormat),
      totalSpent: parseFloat(row.total_spent),
      transactionCount: parseInt(row.transaction_count)
    }));

    res.json({ trends });
  } catch (error) {
    console.error('Analytics trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get budget performance
router.get('/budgets', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT b.id, b.name, b.amount, b.spent_amount, b.currency, b.start_date, b.end_date,
              c.card_number, c.card_type,
              (b.amount - b.spent_amount) as remaining_amount,
              CASE 
                WHEN b.spent_amount >= b.amount * 0.9 THEN 'critical'
                WHEN b.spent_amount >= b.amount * 0.75 THEN 'warning'
                ELSE 'safe'
              END as status,
              (b.spent_amount / b.amount * 100) as percentage_used
       FROM budgets b
       JOIN cards c ON b.card_id = c.id
       WHERE b.user_id = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [userId]
    );

    const budgets = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      amount: parseFloat(row.amount),
      spentAmount: parseFloat(row.spent_amount),
      remainingAmount: parseFloat(row.remaining_amount),
      currency: row.currency,
      startDate: row.start_date,
      endDate: row.end_date,
      cardNumber: row.card_number,
      cardType: row.card_type,
      status: row.status,
      percentageUsed: parseFloat(row.percentage_used)
    }));

    res.json({ budgets });
  } catch (error) {
    console.error('Analytics budgets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get spending insights
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    let startDate, endDate;
    const now = moment();

    switch (period) {
      case 'week':
        startDate = now.clone().subtract(1, 'week');
        endDate = now.clone();
        break;
      case 'month':
        startDate = now.clone().subtract(1, 'month');
        endDate = now.clone();
        break;
      case 'quarter':
        startDate = now.clone().subtract(3, 'months');
        endDate = now.clone();
        break;
      case 'year':
        startDate = now.clone().subtract(1, 'year');
        endDate = now.clone();
        break;
      default:
        startDate = now.clone().subtract(1, 'month');
        endDate = now.clone();
    }

    // Get top spending categories
    const topCategoriesResult = await query(
      `SELECT c.name, c.icon, c.color, SUM(t.amount) as total_spent
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2 AND $3
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total_spent DESC
       LIMIT 5`,
      [userId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    // Get largest transactions
    const largestTransactionsResult = await query(
      `SELECT t.amount, t.description, t.transaction_date, c.name as category_name, c.icon
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2 AND $3
       ORDER BY t.amount DESC
       LIMIT 5`,
      [userId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    // Get spending patterns
    const patternsResult = await query(
      `SELECT 
         EXTRACT(DOW FROM t.transaction_date) as day_of_week,
         EXTRACT(HOUR FROM t.created_at) as hour_of_day,
         COUNT(t.id) as transaction_count,
         SUM(t.amount) as total_spent
       FROM transactions t
       WHERE t.user_id = $1 AND t.transaction_date BETWEEN $2 AND $3
       GROUP BY EXTRACT(DOW FROM t.transaction_date), EXTRACT(HOUR FROM t.created_at)
       ORDER BY total_spent DESC`,
      [userId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    // Get budget alerts
    const budgetAlertsResult = await query(
      `SELECT b.name, b.amount, b.spent_amount, b.currency,
              (b.spent_amount / b.amount * 100) as percentage_used
       FROM budgets b
       WHERE b.user_id = $1 AND b.is_active = true
       AND (b.spent_amount / b.amount * 100) >= 75
       ORDER BY percentage_used DESC`,
      [userId]
    );

    const insights = {
      period: {
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD'),
        name: period
      },
      topCategories: topCategoriesResult.rows.map(row => ({
        name: row.name,
        icon: row.icon,
        color: row.color,
        totalSpent: parseFloat(row.total_spent)
      })),
      largestTransactions: largestTransactionsResult.rows.map(row => ({
        amount: parseFloat(row.amount),
        description: row.description,
        transactionDate: row.transaction_date,
        categoryName: row.category_name,
        icon: row.icon
      })),
      patterns: patternsResult.rows.map(row => ({
        dayOfWeek: parseInt(row.day_of_week),
        hourOfDay: parseInt(row.hour_of_day),
        transactionCount: parseInt(row.transaction_count),
        totalSpent: parseFloat(row.total_spent)
      })),
      budgetAlerts: budgetAlertsResult.rows.map(row => ({
        name: row.name,
        amount: parseFloat(row.amount),
        spentAmount: parseFloat(row.spent_amount),
        currency: row.currency,
        percentageUsed: parseFloat(row.percentage_used)
      }))
    };

    res.json({ insights });
  } catch (error) {
    console.error('Analytics insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
