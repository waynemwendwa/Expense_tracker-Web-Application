const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'expense_tracker',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database initialization
async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await createTables();
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function createTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        verification_code TEXT,
        verification_code_expires TIMESTAMP,
        preferred_currency VARCHAR(3) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_number VARCHAR(255) NOT NULL,
        card_type VARCHAR(50) NOT NULL,
        expiry_date VARCHAR(10) NOT NULL,
        cvv_hash VARCHAR(255) NOT NULL,
        card_holder_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Budgets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        spent_amount DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Handle categories separately to avoid transaction issues
  const categoryClient = await pool.connect();
  try {
    // Add unique constraint if it doesn't exist
    try {
      await categoryClient.query(`
        ALTER TABLE categories ADD CONSTRAINT categories_name_unique UNIQUE (name)
      `);
    } catch (error) {
      // Constraint might already exist, ignore the error
      console.log('Unique constraint on categories.name might already exist');
    }

    // Insert default categories with conflict handling
    const defaultCategories = [
      { name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B' },
      { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
      { name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
      { name: 'Entertainment', icon: '🎬', color: '#96CEB4' },
      { name: 'Healthcare', icon: '🏥', color: '#FFEAA7' },
      { name: 'Utilities', icon: '💡', color: '#DDA0DD' },
      { name: 'Education', icon: '📚', color: '#98D8C8' },
      { name: 'Travel', icon: '✈️', color: '#F7DC6F' },
      { name: 'Gifts', icon: '🎁', color: '#BB8FCE' },
      { name: 'Other', icon: '📦', color: '#A9A9A9' }
    ];

    for (const category of defaultCategories) {
      try {
        await categoryClient.query(`
          INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3)
        `, [category.name, category.icon, category.color]);
      } catch (error) {
        // Category might already exist, continue
        console.log(`Category ${category.name} might already exist`);
      }
    }
  } finally {
    categoryClient.release();
  }

  // Create remaining tables in a new transaction
  const tableClient = await pool.connect();
  try {
    await tableClient.query('BEGIN');

    // Transactions table
    await tableClient.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        transaction_type VARCHAR(20) DEFAULT 'expense',
        receipt_url VARCHAR(500),
        location VARCHAR(255),
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Receipts table
    await tableClient.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        extracted_text TEXT,
        merchant_name VARCHAR(255),
        total_amount DECIMAL(10,2),
        transaction_date DATE,
        items JSONB,
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await tableClient.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await tableClient.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    `);

    await tableClient.query('COMMIT');
  } catch (error) {
    await tableClient.query('ROLLBACK');
    throw error;
  } finally {
    tableClient.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  query: (text, params) => pool.query(text, params)
};
