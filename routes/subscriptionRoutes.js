/**
 * Subscription Routes
 * 
 * TIER ENGINE ROUTE PROTECTION:
 * ================================================
 * Each tier-protected route uses a middleware chain:
 *   authMiddleware → expiryMiddleware → tierMiddleware(level) → controller
 * 
 * This chain ensures:
 * 1. User is authenticated (valid JWT)
 * 2. Subscription hasn't expired (auto-expire if overdue)
 * 3. User's plan tier meets the route's minimum requirement
 * ================================================
 * 
 * GET  /api/subscriptions/plans             - List all plans (public)
 * GET  /api/subscriptions/my-subscription   - Get user's subscription (auth)
 * POST /api/subscriptions/subscribe         - Subscribe to a plan (auth)
 * PUT  /api/subscriptions/change-plan       - Upgrade/downgrade (auth)
 * POST /api/subscriptions/renew             - Renew subscription (auth)
 * GET  /api/subscriptions/basic-content     - Basic tier content (tier 1+)
 * GET  /api/subscriptions/premium-content   - Premium tier content (tier 2+)
 * GET  /api/subscriptions/enterprise-content - Enterprise content (tier 3)
 */

const express = require('express');
const router = express.Router();
const SubscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');
const expiryMiddleware = require('../middleware/expiryMiddleware');
const tierMiddleware = require('../middleware/tierMiddleware');

// ===== PUBLIC ROUTES =====
router.get('/plans', SubscriptionController.getPlans);

// ===== AUTHENTICATED ROUTES (require valid JWT only) =====
router.get('/my-subscription', authMiddleware, SubscriptionController.getMySubscription);
router.post('/subscribe', authMiddleware, SubscriptionController.subscribe);
router.put('/change-plan', authMiddleware, SubscriptionController.changePlan);
router.post('/renew', authMiddleware, SubscriptionController.renew);

// ===== TIER-PROTECTED ROUTES =====
// These demonstrate the full tier access engine:
//   auth → expiry check → tier level check → content

// Basic content: Requires access_level >= 1 (all tiers can access)
router.get('/basic-content',
    authMiddleware,
    expiryMiddleware,
    tierMiddleware(1),  // Level 1 = Basic and above
    SubscriptionController.basicContent
);

// Premium content: Requires access_level >= 2 (Premium and Enterprise only)
router.get('/premium-content',
    authMiddleware,
    expiryMiddleware,
    tierMiddleware(2),  // Level 2 = Premium and above
    SubscriptionController.premiumContent
);

// Enterprise content: Requires access_level >= 3 (Enterprise only)
router.get('/enterprise-content',
    authMiddleware,
    expiryMiddleware,
    tierMiddleware(3),  // Level 3 = Enterprise only
    SubscriptionController.enterpriseContent
);

module.exports = router;
