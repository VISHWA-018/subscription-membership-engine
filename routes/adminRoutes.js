/**
 * Admin Routes
 * 
 * All routes require: authMiddleware + adminMiddleware
 * Only users with role='admin' can access these endpoints.
 * 
 * GET    /api/admin/dashboard              - Dashboard statistics
 * GET    /api/admin/users                  - List all users
 * GET    /api/admin/subscriptions          - List all subscriptions
 * POST   /api/admin/plans                  - Create a new plan
 * PUT    /api/admin/plans/:id              - Update a plan
 * DELETE /api/admin/plans/:id              - Delete a plan
 * PATCH  /api/admin/subscriptions/:id/expire - Manually expire subscription
 * POST   /api/admin/expire-overdue         - Batch expire all overdue
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AdminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Validation rules for plan creation/update
const planValidation = [
    body('plan_name')
        .trim()
        .notEmpty().withMessage('Plan name is required')
        .isLength({ max: 50 }).withMessage('Plan name must be under 50 characters'),
    body('price')
        .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('max_download_limit')
        .isInt({ min: 0 }).withMessage('Download limit must be a non-negative integer'),
    body('priority_support')
        .isBoolean().withMessage('Priority support must be true or false'),
    body('access_level')
        .isInt({ min: 1, max: 10 }).withMessage('Access level must be between 1 and 10')
];

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);

// User management
router.get('/users', AdminController.getAllUsers);

// Plan management (CRUD)
router.post('/plans', planValidation, AdminController.createPlan);
router.put('/plans/:id', planValidation, AdminController.updatePlan);
router.delete('/plans/:id', AdminController.deletePlan);

// Subscription management
router.get('/subscriptions', AdminController.getAllSubscriptions);
router.patch('/subscriptions/:id/expire', AdminController.expireSubscription);
router.post('/expire-overdue', AdminController.expireAllOverdue);

module.exports = router;
