/**
 * Admin Controller
 * 
 * Handles all admin-only operations:
 * - Plan management (CRUD)
 * - User management (view, role changes)
 * - Subscription management (view all, manual expiry)
 * 
 * All routes must be protected by authMiddleware + adminMiddleware
 */

const PlanModel = require('../models/planModel');
const UserModel = require('../models/userModel');
const SubscriptionModel = require('../models/subscriptionModel');
const { validationResult } = require('express-validator');

const AdminController = {
    // ================================================
    // PLAN MANAGEMENT
    // ================================================

    /**
     * POST /api/admin/plans
     * Create a new subscription plan
     */
    createPlan: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { plan_name, price, max_download_limit, priority_support, access_level } = req.body;

            const result = await PlanModel.create({
                plan_name, price, max_download_limit, priority_support, access_level
            });

            const newPlan = await PlanModel.findById(result.insertId);

            res.status(201).json({
                success: true,
                message: `Plan "${plan_name}" created successfully.`,
                data: { plan: newPlan }
            });
        } catch (error) {
            console.error('Create Plan Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to create plan.' }
            });
        }
    },

    /**
     * PUT /api/admin/plans/:id
     * Update an existing plan
     */
    updatePlan: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const planId = parseInt(req.params.id);
            const existingPlan = await PlanModel.findById(planId);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Plan not found.' }
                });
            }

            const { plan_name, price, max_download_limit, priority_support, access_level } = req.body;

            await PlanModel.update(planId, {
                plan_name, price, max_download_limit, priority_support, access_level
            });

            const updatedPlan = await PlanModel.findById(planId);

            res.status(200).json({
                success: true,
                message: `Plan "${plan_name}" updated successfully.`,
                data: { plan: updatedPlan }
            });
        } catch (error) {
            console.error('Update Plan Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to update plan.' }
            });
        }
    },

    /**
     * DELETE /api/admin/plans/:id
     * Delete a plan
     * Note: Should be careful of existing subscriptions referencing this plan
     */
    deletePlan: async (req, res) => {
        try {
            const planId = parseInt(req.params.id);
            const existingPlan = await PlanModel.findById(planId);
            if (!existingPlan) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Plan not found.' }
                });
            }

            await PlanModel.delete(planId);

            res.status(200).json({
                success: true,
                message: `Plan "${existingPlan.plan_name}" deleted successfully.`
            });
        } catch (error) {
            console.error('Delete Plan Error:', error.message);
            // Handle foreign key constraint errors
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({
                    success: false,
                    error: { message: 'Cannot delete plan with active subscriptions. Cancel subscriptions first.' }
                });
            }
            res.status(500).json({
                success: false,
                error: { message: 'Failed to delete plan.' }
            });
        }
    },

    // ================================================
    // USER MANAGEMENT
    // ================================================

    /**
     * GET /api/admin/users
     * Get all users
     */
    getAllUsers: async (req, res) => {
        try {
            const users = await UserModel.findAll();
            res.status(200).json({
                success: true,
                data: { users, total: users.length }
            });
        } catch (error) {
            console.error('Get Users Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch users.' }
            });
        }
    },

    // ================================================
    // SUBSCRIPTION MANAGEMENT
    // ================================================

    /**
     * GET /api/admin/subscriptions
     * Get all subscriptions with user and plan info
     */
    getAllSubscriptions: async (req, res) => {
        try {
            const subscriptions = await SubscriptionModel.findAll();
            res.status(200).json({
                success: true,
                data: { subscriptions, total: subscriptions.length }
            });
        } catch (error) {
            console.error('Get Subscriptions Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch subscriptions.' }
            });
        }
    },

    /**
     * PATCH /api/admin/subscriptions/:id/expire
     * Manually expire a subscription (admin override)
     */
    expireSubscription: async (req, res) => {
        try {
            const subId = parseInt(req.params.id);
            const subscription = await SubscriptionModel.findById(subId);

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Subscription not found.' }
                });
            }

            if (subscription.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    error: { message: `Subscription is already ${subscription.status}.` }
                });
            }

            await SubscriptionModel.updateStatus(subId, 'expired');

            res.status(200).json({
                success: true,
                message: `Subscription #${subId} has been manually expired.`,
                data: { subscription_id: subId, new_status: 'expired' }
            });
        } catch (error) {
            console.error('Expire Subscription Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to expire subscription.' }
            });
        }
    },

    /**
     * POST /api/admin/expire-overdue
     * Batch expire all overdue subscriptions
     */
    expireAllOverdue: async (req, res) => {
        try {
            const result = await SubscriptionModel.expireOverdue();
            res.status(200).json({
                success: true,
                message: `${result.affectedRows} overdue subscription(s) expired.`,
                data: { affected: result.affectedRows }
            });
        } catch (error) {
            console.error('Batch Expire Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to expire overdue subscriptions.' }
            });
        }
    },

    /**
     * GET /api/admin/dashboard
     * Get admin dashboard statistics
     */
    getDashboardStats: async (req, res) => {
        try {
            const users = await UserModel.findAll();
            const subscriptions = await SubscriptionModel.findAll();
            const plans = await PlanModel.findAll();

            const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
            const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired');

            // Calculate monthly revenue (from active subscriptions)
            const monthlyRevenue = activeSubscriptions.reduce((sum, s) => sum + parseFloat(s.price), 0);

            res.status(200).json({
                success: true,
                data: {
                    totalUsers: users.length,
                    totalSubscriptions: subscriptions.length,
                    activeSubscriptions: activeSubscriptions.length,
                    expiredSubscriptions: expiredSubscriptions.length,
                    totalPlans: plans.length,
                    estimatedMonthlyRevenue: monthlyRevenue.toFixed(2),
                    plans
                }
            });
        } catch (error) {
            console.error('Dashboard Stats Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Failed to fetch dashboard stats.' }
            });
        }
    }
};

module.exports = AdminController;
