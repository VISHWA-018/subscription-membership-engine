/**
 * Plan Model
 * 
 * Handles all database operations related to subscription plans.
 * Plans define the tier structure: Basic, Premium, Enterprise.
 * 
 * TIER LOGIC EXPLANATION:
 * ================================================
 * Each plan has an `access_level` (integer 1-3):
 *   - Basic      = access_level 1
 *   - Premium    = access_level 2
 *   - Enterprise = access_level 3
 * 
 * Routes requiring a certain tier check if the user's plan
 * access_level >= required level. For example:
 *   - /basic-content requires access_level >= 1 (all tiers)
 *   - /premium-content requires access_level >= 2 (Premium, Enterprise)
 *   - /enterprise-content requires access_level >= 3 (Enterprise only)
 * 
 * This means higher tiers inherit access to lower-tier content.
 * ================================================
 */

const { pool } = require('../config/db');

const PlanModel = {
    /**
     * Get all available subscription plans
     * @returns {Array} List of all plans sorted by access_level
     */
    findAll: async () => {
        const sql = `SELECT * FROM plans ORDER BY access_level ASC`;
        const [rows] = await pool.execute(sql);
        return rows;
    },

    /**
     * Find a specific plan by its ID
     * @param {number} id - Plan ID
     * @returns {object|null} Plan record or null
     */
    findById: async (id) => {
        const sql = `SELECT * FROM plans WHERE id = ?`;
        const [rows] = await pool.execute(sql, [id]);
        return rows[0] || null;
    },

    /**
     * Create a new subscription plan (admin only)
     * @param {object} planData - { plan_name, price, max_download_limit, priority_support, access_level }
     * @returns {object} Insert result
     */
    create: async (planData) => {
        const { plan_name, price, max_download_limit, priority_support, access_level } = planData;
        const sql = `INSERT INTO plans (plan_name, price, max_download_limit, priority_support, access_level) 
                 VALUES (?, ?, ?, ?, ?)`;
        const [result] = await pool.execute(sql, [
            plan_name, price, max_download_limit, priority_support, access_level
        ]);
        return result;
    },

    /**
     * Update an existing plan (admin only)
     * @param {number} id - Plan ID to update
     * @param {object} planData - Fields to update
     * @returns {object} Update result
     */
    update: async (id, planData) => {
        const { plan_name, price, max_download_limit, priority_support, access_level } = planData;
        const sql = `UPDATE plans SET plan_name = ?, price = ?, max_download_limit = ?, 
                 priority_support = ?, access_level = ? WHERE id = ?`;
        const [result] = await pool.execute(sql, [
            plan_name, price, max_download_limit, priority_support, access_level, id
        ]);
        return result;
    },

    /**
     * Delete a plan (admin only)
     * Note: Should check for active subscriptions before deleting
     * @param {number} id - Plan ID to delete
     * @returns {object} Delete result
     */
    delete: async (id) => {
        const sql = `DELETE FROM plans WHERE id = ?`;
        const [result] = await pool.execute(sql, [id]);
        return result;
    }
};

module.exports = PlanModel;
