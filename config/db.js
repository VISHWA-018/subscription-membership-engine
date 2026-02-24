/**
 * Database Configuration Module
 * 
 * Creates and exports a MySQL connection pool using mysql2/promise.
 * Connection pool is used for better performance and connection management.
 * All credentials are loaded from environment variables for security.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for efficient database access
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,       // Max simultaneous connections
  queueLimit: 0,             // Unlimited queue
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Test the database connection on startup
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
