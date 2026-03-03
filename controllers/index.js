const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Model = require('../models');

const Controller = {

    // =========================================================
    // AUTH
    // =========================================================

    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            await Model.User.create(name, email, hashedPassword);
            res.json({ success: true, message: 'User registered' });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await Model.User.findByEmail(email);
            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
            }

            const sub = await Model.Subscription.findActiveByUserId(user.id);
            const token = jwt.sign(
                { id: user.id, role: user.role, access_level: sub?.access_level || 0 },
                process.env.JWT_SECRET
            );

            res.json({
                success: true,
                data: {
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
                    subscription: sub
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    getProfile: async (req, res) => {
        try {
            const user = await Model.User.findById(req.user.id);
            const sub = await Model.Subscription.findActiveByUserId(req.user.id);
            res.json({
                success: true,
                data: { user, activeSubscription: sub, subscriptionHistory: sub ? [sub] : [] }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // =========================================================
    // SUBSCRIPTIONS (User-facing)
    // =========================================================

    // GET /api/subscriptions/plans
    // FIXED: now returns { data: { plans: [...] } } so plans.html can read data.plans
    getPlans: async (req, res) => {
        try {
            const plans = await Model.Plan.findAll();
            res.json({ success: true, data: { plans } });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // GET /api/subscriptions/my-subscription
    getMySubscription: async (req, res) => {
        try {
            const active = await Model.Subscription.findActiveByUserId(req.user.id);
            res.json({ success: true, data: { active: active || null } });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // POST /api/subscriptions/subscribe
    subscribe: async (req, res) => {
        try {
            await Model.Subscription.create(req.user.id, req.body.planId);
            res.json({ success: true, message: 'Subscribed successfully' });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // PUT /api/subscriptions/change-plan
    changePlan: async (req, res) => {
        try {
            const { newPlanId } = req.body;
            if (!newPlanId) {
                return res.status(400).json({ success: false, error: { message: 'newPlanId is required' } });
            }
            const plan = await Model.Plan.findById(newPlanId);
            if (!plan) {
                return res.status(404).json({ success: false, error: { message: 'Plan not found' } });
            }
            await Model.Subscription.changePlan(req.user.id, newPlanId);
            res.json({ success: true, message: `Plan changed to ${plan.plan_name} successfully` });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    renew: async (req, res) => {
        res.json({ success: true, message: 'Subscription renewed (simulated)' });
    },

    // =========================================================
    // ADMIN — Dashboard & List views
    // =========================================================

    getAdminDashboard: async (req, res) => {
        try {
            const users = await Model.User.findAll();
            const subs = await Model.Subscription.findAll();
            const plans = await Model.Plan.findAll();

            res.json({
                success: true,
                data: {
                    totalUsers: users.length,
                    activeSubscriptions: subs.filter(s => s.status === 'active').length,
                    expiredSubscriptions: subs.filter(s => s.status === 'expired').length,
                    estimatedMonthlyRevenue: subs.reduce((acc, curr) => acc + (curr.status === 'active' ? 29 : 0), 0),
                    plans
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    getAdminUsers: async (req, res) => {
        try {
            const users = await Model.User.findAll();
            res.json({ success: true, data: { users } });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    getAdminSubscriptions: async (req, res) => {
        try {
            const subs = await Model.Subscription.findAll();
            res.json({ success: true, data: { subscriptions: subs } });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // =========================================================
    // ADMIN — Plan CRUD
    // =========================================================

    // POST /api/admin/plans
    createPlan: async (req, res) => {
        try {
            const { plan_name, price, max_download_limit, priority_support, access_level } = req.body;
            if (!plan_name || price === undefined || max_download_limit === undefined || access_level === undefined) {
                return res.status(400).json({ success: false, error: { message: 'Missing required fields: plan_name, price, max_download_limit, access_level' } });
            }
            await Model.Plan.create({ plan_name, price, max_download_limit, priority_support, access_level });
            res.json({ success: true, message: `Plan "${plan_name}" created successfully` });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // PUT /api/admin/plans/:id
    updatePlan: async (req, res) => {
        try {
            const { id } = req.params;
            const { plan_name, price, max_download_limit, priority_support, access_level } = req.body;
            const existing = await Model.Plan.findById(id);
            if (!existing) {
                return res.status(404).json({ success: false, error: { message: 'Plan not found' } });
            }
            await Model.Plan.update(id, { plan_name, price, max_download_limit, priority_support, access_level });
            res.json({ success: true, message: `Plan "${plan_name}" updated successfully` });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // DELETE /api/admin/plans/:id
    deletePlan: async (req, res) => {
        try {
            const { id } = req.params;
            const existing = await Model.Plan.findById(id);
            if (!existing) {
                return res.status(404).json({ success: false, error: { message: 'Plan not found' } });
            }
            await Model.Plan.delete(id);
            res.json({ success: true, message: 'Plan deleted successfully' });
        } catch (err) {
            // MySQL FK constraint violation — plan still has subscribers
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ success: false, error: { message: 'Cannot delete: plan has active subscriptions' } });
            }
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // =========================================================
    // ADMIN — Subscription Management
    // =========================================================

    // PATCH /api/admin/subscriptions/:id/expire
    expireSubscription: async (req, res) => {
        try {
            const { id } = req.params;
            await Model.Subscription.updateStatus(id, 'expired');
            res.json({ success: true, message: `Subscription #${id} marked as expired` });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // POST /api/admin/expire-overdue
    expireAllOverdue: async (req, res) => {
        try {
            const result = await Model.Subscription.expireOverdue();
            res.json({ success: true, message: `${result.affectedRows} overdue subscription(s) expired` });
        } catch (err) {
            res.status(500).json({ success: false, error: { message: err.message } });
        }
    },

    // =========================================================
    // CONTENT (Tier-protected)
    // =========================================================

    getContent: (level) => (req, res) => {
        const tiers = { 1: 'Basic', 2: 'Premium', 3: 'Enterprise' };
        res.json({
            success: true,
            data: {
                title: `${tiers[level]} Tier Resource`,
                tier: tiers[level],
                downloads_used: 0,
                resources: [
                    { name: `Guide to ${tiers[level]} Access`, type: 'PDF', size: '1.2MB' },
                    { name: `Template for ${tiers[level]} Projects`, type: 'ZIP', size: '5.4MB' }
                ]
            }
        });
    }
};

module.exports = Controller;
