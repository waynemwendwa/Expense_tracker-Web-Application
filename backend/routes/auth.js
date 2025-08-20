const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { query, pool } = require('../config/database');
const { sendVerificationCode } = require('../utils/email');
const passwordComplexity = require('joi-password-complexity');

const router = express.Router();

const complexityOptions = {
  min: 8,
  max: 30,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
  symbol: 1,
  requirementCount: 4, // Require 4 out of the 5 conditions
};

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: passwordComplexity(complexityOptions).required(),
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
// Verification schemas
const verifySchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required()
});
// Resend verification code schema
const resendCodeSchema = Joi.object({
  email: Joi.string().email().required()
});


// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);//Joi checks if payload matches roles
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName } = value;//value is returned from the Joi object instead of raw req.body

    // Check if user already exists
    const existingUser = await query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      if(existingUser.rows[0].is_verified) {
              return res.status(400).json({ error: 'User with this email already exists' });
      }else{
        // Allow re-registering if not verified, which will resend the code.
        // For security, you might want to add a rate limit here
        await query('DELETE FROM users WHERE email = $1', [email]);
      }
    }

    // Hash password
    const saltRounds = 12;//Salt rounds = 12 means the hashing function is intentionally slow to make brute-force attacks harder.
    const passwordHash = await bcrypt.hash(password, saltRounds);//password hashing

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit code
    const codeHash = await bcrypt.hash(verificationCode,10);
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // Code expires in 15 minutes

    // Create user
    await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, verification_code, verification_code_expires) VALUES ($1, $2, $3, $4, $5, $6)`,
      [email, passwordHash, firstName, lastName, codeHash, codeExpires]
    );

    //send plain text verification code to user's email
    await sendVerificationCode(email, verificationCode);
    res.status(201).json({
      message: 'User registered successfully.Please check your email for the verification code.'
      
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);//bcrypt.compare() hashes the given password with the stored salt, compares results.
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: 'User not verified. Please check your email for the verification code.', code: 'ACCOUNT_NOT_VERIFIED' });
      
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//VERIFY EMAIL ROUTE
router.post('/verify-email', async (req, res) => {
  try {
    const { error, value } = verifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { email, code } = value;

    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code or email.' });
      
    }
    const user = result.rows[0];
    if (user.is_verified) {
      return res.status(400).json({ error: 'User already verified.' });
      
    }
    if (new Date() > new Date(user.verification_code_expires)) {
      return res.status(400).json({ error: 'Verification code expired.Please request a new one' });
      
    }
    const isCodeValid = await bcrypt.compare(code, user.verification_code);
    if (!isCodeValid) {
      return res.status(400).json({ error: 'Invalid verification code or email.' });
    }

    // Update user to verified
    const updatedUserResult = await query(
      'UPDATE users SET is_verified = true, verification_code = NULL, verification_code_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, first_name, last_name',
      [user.id]);

    const updatedUser = updatedUserResult.rows[0];
    const token = generateToken(updatedUser);

    res.json({
      message: 'Account verified successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name
      },
      token
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//new resend code route
router.post('/resend-code', async (req, res) => {
  try {
    const { error, value } = resendCodeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }   
    const { email } = value;
    const result = await query(
      'SELECT id, email, is_verified FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User with this email not found' });
    }
    
    if (result.rows[0].is_verified) {
      return res.status(400).json({ error: 'User is already verified' });
    }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit code
    const codeHash = await bcrypt.hash(verificationCode, 10);
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // Code expires in 15 minutes
    await query(
      'UPDATE users SET verification_code = $1, verification_code_expires = $2 WHERE email = $3',
      [codeHash, codeExpires, email]
    );

    await sendVerificationCode(email, verificationCode);
    res.json({
      message: 'A new verification code has been sent to you. Please check your email.'
    });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
    
// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1',
      [req.user.id]
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
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
