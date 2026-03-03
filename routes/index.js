const express = require('express');
const router = express.Router();
const Controller = require('../controllers');
const Middleware = require('../middleware');

// =========================================================
// AUTH
// =========================================================
router.post('/auth/register', Controller.register);
router.post('/auth/login', Controller.login);
router.get('/auth/profile', Middleware.authenticate, Controller.getProfile);

// =========================================================
// SUBSCRIPTIONS (User-facing)
// =========================================================
router.get('/subscriptions/plans', Controller.getPlans);
router.get('/subscriptions/my-subscription', Middleware.authenticate, Controller.getMySubscription);
router.post('/subscriptions/subscribe', Middleware.authenticate, Controller.subscribe);
router.put('/subscriptions/change-plan', Middleware.authenticate, Controller.changePlan);
router.post('/subscriptions/renew', Middleware.authenticate, Controller.renew);

// =========================================================
// ADMIN — Dashboard & Lists
// =========================================================
router.get('/admin/dashboard', Middleware.authenticate, Middleware.isAdmin, Controller.getAdminDashboard);
router.get('/admin/users', Middleware.authenticate, Middleware.isAdmin, Controller.getAdminUsers);
router.get('/admin/subscriptions', Middleware.authenticate, Middleware.isAdmin, Controller.getAdminSubscriptions);

// =========================================================
// ADMIN — Plan CRUD
// =========================================================
router.post('/admin/plans', Middleware.authenticate, Middleware.isAdmin, Controller.createPlan);
router.put('/admin/plans/:id', Middleware.authenticate, Middleware.isAdmin, Controller.updatePlan);
router.delete('/admin/plans/:id', Middleware.authenticate, Middleware.isAdmin, Controller.deletePlan);

// =========================================================
// ADMIN — Subscription Management
// =========================================================
router.patch('/admin/subscriptions/:id/expire', Middleware.authenticate, Middleware.isAdmin, Controller.expireSubscription);
router.post('/admin/expire-overdue', Middleware.authenticate, Middleware.isAdmin, Controller.expireAllOverdue);

// =========================================================
// CONTENT (Tier-protected)
// =========================================================
router.get('/subscriptions/basic-content', Middleware.authenticate, Middleware.checkTier(1), Controller.getContent(1));
router.get('/subscriptions/premium-content', Middleware.authenticate, Middleware.checkTier(2), Controller.getContent(2));
router.get('/subscriptions/enterprise-content', Middleware.authenticate, Middleware.checkTier(3), Controller.getContent(3));

module.exports = router;
