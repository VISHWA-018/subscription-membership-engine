/**
 * User Model
 * 
 * Handles all database operations related to users.
 * Uses parameterized queries to prevent SQL injection.
 * Passwords are hashed using bcrypt before storage.
 */

const { pool } = require('../config/db');

const UserModel = {
    /**
     * Create a new user in the database
     * @param {string} name - User's full name
     * @param {string} email - User's email (must be unique)
     * @param {string} hashedPassword - Bcrypt-hashed password
     * @param {string} role - User role: 'user' or 'admin'
     * @returns {object} Insert result with insertId
     */
    create: async (name, email, hashedPassword, role = 'user') => {
        const sql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
        const [result] = await pool.execute(sql, [name, email, hashedPassword, role]);
        return result;
    },

    /**
     * Find a user by their email address
     * Used during login to verify credentials
     * @param {string} email 
     * @returns {object|null} User record or null
     */
    findByEmail: async (email) => {
        const sql = `SELECT * FROM users WHERE email = ?`;
        const [rows] = await pool.execute(sql, [email]);
        return rows[0] || null;
    },

    /**
     * Find a user by their ID
     * Used after JWT verification to load user data
     * @param {number} id 
     * @returns {object|null} User record (without password) or null
     */
    findById: async (id) => {
        const sql = `SELECT id, name, email, role, created_at FROM users WHERE id = ?`;
        const [rows] = await pool.execute(sql, [id]);
        return rows[0] || null;
    },

    /**
     * Get all users (admin function)
     * Excludes password field for security
     * @returns {Array} List of all users
     */
    findAll: async () => {
        const sql = `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`;
        const [rows] = await pool.execute(sql);
        return rows;
    },

    /**
     * Update user's role
     * @param {number} id - User ID
     * @param {string} role - New role ('user' or 'admin')
     */
    updateRole: async (id, role) => {
        const sql = `UPDATE users SET role = ? WHERE id = ?`;
        const [result] = await pool.execute(sql, [role, id]);
        return result;
    }
};

module.exports = UserModel;
