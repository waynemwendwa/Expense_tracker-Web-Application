const express = require("express");
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const { query } = require("../config/database");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// Validation schemas
const cardSchema = Joi.object({
  cardNumber: Joi.string().creditCard().required(),
  cardType: Joi.string()
    .valid("visa", "mastercard", "amex", "discover")
    .required(),
  expiryDate: Joi.string()
    .pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
    .required(),
  cvv: Joi.string()
    .length(3)
    .pattern(/^[0-9]+$/)
    .required(),
  cardHolderName: Joi.string().min(2).max(255).required(),
});

const budgetSchema = Joi.object({
  cardId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default("KSH"),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref("startDate")).required(),
});

// Add a new card
router.post("/cards", async (req, res) => {
  try {
    const { error, value } = cardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { cardNumber, cardType, expiryDate, cvv, cardHolderName } = value;
    const userId = req.user.id;

    // Hash CVV for security
    const cvvHash = await bcrypt.hash(cvv, 10);

    // Mask card number for storage (keep last 4 digits)
    const maskedCardNumber = `****-****-****-${cardNumber.slice(-4)}`;

    const result = await query(
      'INSERT INTO cards (user_id, card_number, card_type, expiry_date, cvv_hash, card_holder_name) VALUES ($1, $2, $3, $4, $5, $6)RETURNING id, card_number, card_type, expiry_date, card_holder_name, created_at',
      [userId, maskedCardNumber, cardType, expiryDate, cvvHash, cardHolderName]
    );

    res.status(201).json({
      message: "Card added successfully",
      card: result.rows[0],
    });
  } catch (error) {
    console.error("Add card error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's cards
router.get("/cards", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      "SELECT id, card_number, card_type, expiry_date, card_holder_name, is_active, created_at FROM cards WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    res.json({ cards: result.rows });
  } catch (error) {
    console.error("Get cards error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new budget
router.post("/", async (req, res) => {
  try {
    const { error, value } = budgetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { cardId, name, amount, currency, startDate, endDate } = value;
    const userId = req.user.id;

    // Verify card belongs to user
    const cardResult = await query(
      "SELECT id FROM cards WHERE id = $1 AND user_id = $2 AND is_active = true",
      [cardId, userId]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: "Card not found or inactive" });
    }

    // Check for overlapping budgets
    const overlapResult = await query(
      'SELECT id FROM budgets  WHERE user_id = $1 AND card_id = $2 AND is_active = true AND ((start_date <= $3 AND end_date >= $3) OR (start_date <= $4 AND end_date >= $4) OR (start_date >= $3 AND end_date <= $4))',
      [userId, cardId, startDate, endDate]
    );

    if (overlapResult.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Budget period overlaps with existing budget" });
    }

    const result = await query(
      'INSERT INTO budgets (user_id, card_id, name, amount, currency, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, amount, spent_amount, currency, start_date, end_date, created_at',
      [userId, cardId, name, amount, currency, startDate, endDate]
    );

    const budget = result.rows[0];

    // Create notification for budget creation
    await createNotification(userId, {
      title: "Budget Created",
      message: `Your budget "${name}" has been created with a limit of ${currency} ${amount}`,
      type: "budget_created",
    });

    res.status(201).json({
      message: "Budget created successfully",
      budget,
    });
  } catch (error) {
    console.error("Create budget error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's budgets
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = "all" } = req.query;

    let queryStr = 
      "SELECT b.id, b.name, b.amount, b.spent_amount, b.currency, b.start_date, b.end_date, b.is_active, c.card_number, c.card_type, c.card_holder_name, (b.amount - b.spent_amount) as remaining_amount, CASE WHEN b.spent_amount >= b.amount * 0.9 THEN 'critical' WHEN b.spent_amount >= b.amount * 0.75 THEN 'warning' ELSE 'safe' END as status FROM budgets b JOIN cards c ON b.card_id = c.id WHERE b.user_id = $1";

    const params = [userId];

    if (status !== "all") {
      queryStr += " AND b.is_active = $2";
      params.push(status === "active");
    }

    queryStr += " ORDER BY b.created_at DESC";

    const result = await query(queryStr, params);

    res.json({ budgets: result.rows });
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific budget
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      'SELECT b.*, c.card_number, c.card_type, c.card_holder_name, (b.amount - b.spent_amount) as remaining_amount FROM budgets b JOIN cards c ON b.card_id = c.id WHERE b.id = $1 AND b.user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json({ budget: result.rows[0] });
  } catch (error) {
    console.error("Get budget error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update budget
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, amount, endDate } = req.body;

    // Verify budget belongs to user and Is ACTIVE
    const budgetResult = await query(
      "SELECT id, spent_amount FROM budgets WHERE id = $1 AND user_id = $2 AND is_active = true",
      [id, userId]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: "Active budget not found or you do not have permission to edit it." });
    }

    const budget = budgetResult.rows[0];

    // Validate new amount is not less than spent amount
    if (amount && parseFloat(amount) < parseFloat(budget.spent_amount)) {
      return res.status(400).json({
        error: "New budget amount cannot be less than already spent amount",
      });
    }

    const updateFields = [];
    const params = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (amount) {
      updateFields.push(`amount = $${paramCount++}`);
      params.push(amount);
    }
    if (endDate) {
      updateFields.push(`end_date = $${paramCount++}`);
      params.push(endDate);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    const finalParams = [...params, id, userId];
    //params.push(id, userId);

    const result = await query(
     `UPDATE budgets SET ${updateFields.join(", ")} 
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING id, name, amount, spent_amount, currency, start_date, end_date`,
      finalParams
       //params
    );

    res.json({
      message: "Budget updated successfully",
      budget: result.rows[0],
    });
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete budget
router.put("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      "UPDATE budgets SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json({ message: "Budget archived successfully" });
  } catch (error) {
    console.error("Archive budget error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Permanently delete budget which is already archived
router.delete("/:id/permanent", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    //only allow deletion of archived budgets
    const result = await query(
      "DELETE FROM budgets WHERE id = $1 AND user_id = $2 AND is_active = false RETURNING id",
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Archived budget not found or you do not have permission to delete it." });  
    }
    res.json({ message: "Budget permanently deleted successfully" });
  } catch (error) {
    console.error("Permanent delete budget error:", error);
    res.status(500).json({ error: "Internal server error" });
  }

});

module.exports = router;