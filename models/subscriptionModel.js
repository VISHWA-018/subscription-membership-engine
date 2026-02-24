/**
 * Subscription Model
 * 
 * Handles all database operations for user subscriptions.
 * 
 * SUBSCRIPTION LIFECYCLE:
 * ================================================
 * 1. User subscribes to a plan → status = 'active'
 * 2. On each access, expiryMiddleware checks end_date
 * 3. If end_date < today → status auto-updated to 'expired'
 * 4. User can renew → new start_date/end_date, status = 'active'
 * 5. User can upgrade/downgrade → plan_id changes, download_count resets
 * 6. Admin can manually cancel → status = 'cancelled'
 * ================================================
 */

const { pool } = require('../config/db');

const SubscriptionModel = {
    /**
     * Create a new subscription for a user
     * Default duration: 30 days from now
     * @param {number} userId - User ID
     * @param {number} planId - Plan ID to subscribe to
     * @returns {object} Insert result
     */
    create: async (userId, planId) => {
        const sql = `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, download_count) 
                 VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'active', 0)`;
        const [result] = await pool.execute(sql, [userId, planId]);
        return result;
    },

    /**
     * Find the active subscription for a user
     * Joins with plans table to get plan details alongside subscription info
     * 
     * TIER LOGIC: This is the key query used by tierMiddleware.
     * It returns the user's current plan access_level and download limits,
     * which are then compared against route requirements.
     * 
     * @param {number} userId - User ID
     * @returns {object|null} Subscription with plan details
     */
    findActiveByUserId: async (userId) => {
        const sql = `
      SELECT s.*, p.plan_name, p.price, p.max_download_limit, 
             p.priority_support, p.access_level
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.start_date DESC
      LIMIT 1
    `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows[0] || null;
    },

    /**
     * Find all subscriptions for a user (including expired/cancelled)
     * @param {number} userId 
     * @returns {Array} List of all user subscriptions
     */
    findAllByUserId: async (userId) => {
        const sql = `
      SELECT s.*, p.plan_name, p.price, p.access_level
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = ?
      ORDER BY s.start_date DESC
    `;
        const [rows] = await pool.execute(sql, [userId]);
        return rows;
    },

    /**
     * Find a subscription by its ID
     * @param {number} id - Subscription ID
     * @returns {object|null}
     */
    findById: async (id) => {
        const sql = `
      SELECT s.*, p.plan_name, p.price, p.max_download_limit, 
             p.priority_support, p.access_level
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `;
        const [rows] = await pool.execute(sql, [id]);
        return rows[0] || null;
    },

    /**
     * Update subscription status
     * Used by expiryMiddleware to auto-expire and by admin to cancel
     * @param {number} id - Subscription ID
     * @param {string} status - 'active', 'expired', or 'cancelled'
     */
    updateStatus: async (id, status) => {
        const sql = `UPDATE subscriptions SET status = ? WHERE id = ?`;
        const [result] = await pool.execute(sql, [status, id]);
        return result;
    },

    /**
     * Increment the download counter for a subscription
     * Called when user accesses a downloadable resource
     * 
     * TIER LOGIC: Each plan has a max_download_limit.
     * Before incrementing, tierMiddleware checks:
     *   download_count < max_download_limit
     * If limit reached, access is denied with upgrade suggestion.
     * 
     * @param {number} id - Subscription ID
     */
    incrementDownload: async (id) => {
        const sql = `UPDATE subscriptions SET download_count = download_count + 1 WHERE id = ?`;
        const [result] = await pool.execute(sql, [id]);
        return result;
    },

    /**
     * Upgrade or downgrade a subscription to a different plan
     * Resets download_count and extends the end_date by 30 days from today
     * 
     * @param {number} subscriptionId - Subscription ID
     * @param {number} newPlanId - New Plan ID
     */
    changePlan: async (subscriptionId, newPlanId) => {
        const sql = `
      UPDATE subscriptions 
      SET plan_id = ?, 
          start_date = CURDATE(), 
          end_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY),
          download_count = 0,
          status = 'active'
      WHERE id = ?
    `;
        const [result] = await pool.execute(sql, [newPlanId, subscriptionId]);
        return result;
    },

    /**
     * Renew an existing subscription
     * Extends end_date by 30 days from today and resets download count
     * @param {number} id - Subscription ID
     */
    renew: async (id) => {
        const sql = `
      UPDATE subscriptions 
      SET start_date = CURDATE(),
          end_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY),
          status = 'active',
          download_count = 0
      WHERE id = ?
    `;
        const [result] = await pool.execute(sql, [id]);
        return result;
    },

    /**
     * Get all subscriptions (admin function)
     * Joins with users and plans for complete data
     * @returns {Array} All subscriptions with user/plan info
     */
    findAll: async () => {
        const sql = `
      SELECT s.*, u.name AS user_name, u.email AS user_email, 
             p.plan_name, p.price, p.access_level
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      ORDER BY s.start_date DESC
    `;
        const [rows] = await pool.execute(sql);
        return rows;
    },

    /**
     * Expire all subscriptions that have passed their end_date
     * Can be run as a scheduled job or on-demand by admin
     */
    expireOverdue: async () => {
        const sql = `UPDATE subscriptions SET status = 'expired' WHERE end_date < CURDATE() AND status = 'active'`;
        const [result] = await pool.execute(sql);
        return result;
    }
};

module.exports = SubscriptionModel;
