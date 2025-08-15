const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Tesseract = require('tesseract.js');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { query } = require('../config/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation schema for receipt processing
const receiptProcessSchema = Joi.object({
  budgetId: Joi.string().uuid().required(),
  categoryId: Joi.string().uuid().optional(),
  amount: Joi.number().positive().optional(),
  description: Joi.string().optional(),
  transactionDate: Joi.date().optional()
});

// Upload and process receipt
router.post('/upload', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No receipt image provided' });
    }

    const userId = req.user.id;
    const imagePath = req.file.path;
    const imageUrl = `/uploads/receipts/${req.file.filename}`;

    // Perform OCR on the image
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: m => console.log(m)
      }
    );

    // Extract information from OCR text
    const extractedData = extractReceiptData(text);

    // Save receipt record
    const receiptResult = await query(
      `INSERT INTO receipts (user_id, image_url, extracted_text, merchant_name, total_amount, transaction_date, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, merchant_name, total_amount, transaction_date, confidence_score`,
      [
        userId,
        imageUrl,
        text,
        extractedData.merchantName,
        extractedData.totalAmount,
        extractedData.transactionDate,
        extractedData.confidenceScore
      ]
    );

    const receipt = receiptResult.rows[0];

    res.status(201).json({
      message: 'Receipt uploaded and processed successfully',
      receipt: {
        ...receipt,
        extractedText: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
        suggestedData: extractedData
      }
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

// Process receipt and create transaction
router.post('/process/:receiptId', async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user.id;
    const { error, value } = receiptProcessSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { budgetId, categoryId, amount, description, transactionDate } = value;

    // Get receipt data
    const receiptResult = await query(
      'SELECT * FROM receipts WHERE id = $1 AND user_id = $2',
      [receiptId, userId]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptResult.rows[0];

    // Verify budget belongs to user
    const budgetResult = await query(
      'SELECT id, amount, spent_amount, currency FROM budgets WHERE id = $1 AND user_id = $2 AND is_active = true',
      [budgetId, userId]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found or inactive' });
    }

    const budget = budgetResult.rows[0];
    const transactionAmount = amount || receipt.total_amount || 0;
    const newSpentAmount = parseFloat(budget.spent_amount) + parseFloat(transactionAmount);

    // Check if transaction would exceed budget
    if (newSpentAmount > parseFloat(budget.amount)) {
      return res.status(400).json({ 
        error: 'Transaction would exceed budget limit',
        remaining: parseFloat(budget.amount) - parseFloat(budget.spent_amount)
      });
    }

    // Start transaction
    const client = await query.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create transaction
      const transactionResult = await client.query(
        `INSERT INTO transactions (user_id, budget_id, category_id, amount, description, transaction_date, receipt_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, amount, description, transaction_date, created_at`,
        [
          userId,
          budgetId,
          categoryId,
          transactionAmount,
          description || receipt.merchant_name || 'Receipt transaction',
          transactionDate || receipt.transaction_date || new Date(),
          receipt.image_url
        ]
      );

      // Update receipt with transaction ID
      await client.query(
        'UPDATE receipts SET transaction_id = $1 WHERE id = $2',
        [transactionResult.rows[0].id, receiptId]
      );

      // Update budget spent amount
      await client.query(
        'UPDATE budgets SET spent_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSpentAmount, budgetId]
      );

      await client.query('COMMIT');

      const transaction = transactionResult.rows[0];

      res.status(201).json({
        message: 'Transaction created from receipt successfully',
        transaction: {
          ...transaction,
          receiptUrl: receipt.image_url,
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
    console.error('Process receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's receipts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.id, r.image_url, r.merchant_name, r.total_amount, r.transaction_date, 
              r.confidence_score, r.created_at, r.transaction_id,
              t.description as transaction_description, t.amount as transaction_amount
       FROM receipts r
       LEFT JOIN transactions t ON r.transaction_id = t.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM receipts WHERE user_id = $1',
      [userId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      receipts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific receipt
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT r.*, t.description as transaction_description, t.amount as transaction_amount,
              t.category_id, c.name as category_name
       FROM receipts r
       LEFT JOIN transactions t ON r.transaction_id = t.id
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt: result.rows[0] });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete receipt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get receipt details
    const receiptResult = await query(
      'SELECT image_url, transaction_id FROM receipts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptResult.rows[0];

    // Delete image file
    if (receipt.image_url) {
      const imagePath = path.join(__dirname, '..', receipt.image_url);
      try {
        await fs.unlink(imagePath);
      } catch (error) {
        console.error('Error deleting image file:', error);
      }
    }

    // Delete receipt record
    await query(
      'DELETE FROM receipts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to extract data from OCR text
function extractReceiptData(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchantName = '';
  let totalAmount = 0;
  let transactionDate = null;
  let confidenceScore = 0.5; // Default confidence

  // Extract merchant name (usually first few lines)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].toUpperCase();
    if (line.length > 3 && line.length < 50 && !line.includes('TOTAL') && !line.includes('$')) {
      merchantName = lines[i];
      break;
    }
  }

  // Extract total amount
  const totalPatterns = [
    /TOTAL[:\s]*\$?([0-9,]+\.?[0-9]*)/i,
    /AMOUNT[:\s]*\$?([0-9,]+\.?[0-9]*)/i,
    /BALANCE[:\s]*\$?([0-9,]+\.?[0-9]*)/i,
    /\$([0-9,]+\.?[0-9]*)/g
  ];

  for (const pattern of totalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      const amount = parseFloat(matches[1].replace(/,/g, ''));
      if (amount > totalAmount) {
        totalAmount = amount;
      }
    }
  }

  // Extract date
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\w{3})\s+(\d{1,2}),?\s+(\d{4})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        transactionDate = new Date(match[0]);
        if (!isNaN(transactionDate.getTime())) {
          break;
        }
      } catch (error) {
        // Continue to next pattern
      }
    }
  }

  // Calculate confidence score based on extracted data
  if (merchantName) confidenceScore += 0.2;
  if (totalAmount > 0) confidenceScore += 0.3;
  if (transactionDate) confidenceScore += 0.2;

  return {
    merchantName,
    totalAmount,
    transactionDate,
    confidenceScore: Math.min(confidenceScore, 1.0)
  };
}

module.exports = router;
