const { pool } = require('../config/db');

const Model = {
    // --- USER MODELS ---
    User: {
        create: async (name, email, password, role = 'user') => {
            const [result] = await pool.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, role]);
            return result;
        },
        findByEmail: async (email) => {
            const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        },
        findById: async (id) => {
            const [rows] = await pool.execute('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
            return rows[0];
        },
        findAll: async () => {
            const [rows] = await pool.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
            return rows;
        }
    },

    // --- PLAN MODELS ---
    Plan: {
        findAll: async () => {
            const [rows] = await pool.execute('SELECT * FROM plans ORDER BY access_level ASC');
            return rows;
        },
        findById: async (id) => {
            const [rows] = await pool.execute('SELECT * FROM plans WHERE id = ?', [id]);
            return rows[0];
        },
        create: async ({ plan_name, price, max_download_limit, priority_support, access_level }) => {
            const [result] = await pool.execute(
                'INSERT INTO plans (plan_name, price, max_download_limit, priority_support, access_level) VALUES (?, ?, ?, ?, ?)',
                [plan_name, price, max_download_limit, priority_support ? 1 : 0, access_level]
            );
            return result;
        },
        update: async (id, { plan_name, price, max_download_limit, priority_support, access_level }) => {
            const [result] = await pool.execute(
                'UPDATE plans SET plan_name = ?, price = ?, max_download_limit = ?, priority_support = ?, access_level = ? WHERE id = ?',
                [plan_name, price, max_download_limit, priority_support ? 1 : 0, access_level, id]
            );
            return result;
        },
        delete: async (id) => {
            const [result] = await pool.execute('DELETE FROM plans WHERE id = ?', [id]);
            return result;
        }
    },

    // --- SUBSCRIPTION MODELS ---
    Subscription: {
        create: async (userId, planId) => {
            const sql = `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status) 
                         VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active')`;
            const [result] = await pool.execute(sql, [userId, planId]);
            return result;
        },
        findActiveByUserId: async (userId) => {
            const sql = `SELECT s.*, p.plan_name, p.access_level, p.price, p.priority_support FROM subscriptions s 
                         JOIN plans p ON s.plan_id = p.id 
                         WHERE s.user_id = ? AND s.status = 'active' LIMIT 1`;
            const [rows] = await pool.execute(sql, [userId]);
            return rows[0];
        },
        findAll: async () => {
            const sql = `SELECT s.*, u.name as user_name, u.email as user_email, p.plan_name 
                         FROM subscriptions s 
                         JOIN users u ON s.user_id = u.id 
                         JOIN plans p ON s.plan_id = p.id 
                         ORDER BY s.start_date DESC`;
            const [rows] = await pool.execute(sql);
            return rows;
        },
        updateStatus: async (id, status) => {
            await pool.execute('UPDATE subscriptions SET status = ? WHERE id = ?', [status, id]);
        },
        changePlan: async (userId, newPlanId) => {
            const sql = `UPDATE subscriptions SET plan_id = ?, start_date = CURDATE(), end_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY), download_count = 0
                         WHERE user_id = ? AND status = 'active'`;
            const [result] = await pool.execute(sql, [newPlanId, userId]);
            return result;
        },
        expireOverdue: async () => {
            const sql = `UPDATE subscriptions SET status = 'expired' WHERE status = 'active' AND end_date < CURDATE()`;
            const [result] = await pool.execute(sql);
            return result;
        }
    }
};

module.exports = Model;
