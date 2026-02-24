/**
 * Subscription Controller
 * 
 * Handles plan browsing, subscribing, upgrading/downgrading,
 * renewing, and tier-protected content access.
 * 
 * TIER LOGIC FLOW FOR CONTENT ACCESS:
 * ================================================
 * 1. Request hits route (e.g., GET /api/subscriptions/premium-content)
 * 2. authMiddleware verifies JWT → sets req.user
 * 3. expiryMiddleware checks/updates subscription expiry → sets req.subscription
 * 4. tierMiddleware(2) checks access_level >= 2 → allows/denies
 * 5. Controller serves the content
 * ================================================
 */

const PlanModel = require('../models/planModel');
const SubscriptionModel = require('../models/subscriptionModel');

const SubscriptionController = {
    /**
     * GET /api/subscriptions/plans
     * Get all available subscription plans
     * Public route - no auth required
     */
    getPlans: async (req, res) => {
        try {
            const plans = await PlanModel.findAll();
            res.status(200).json({
                success: true,
                data: { plans }
            });
        } catch (error) {
            console.error('Get Plans Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Error fetching plans.' }
            });
        }
    },

    /**
     * POST /api/subscriptions/subscribe
     * Subscribe to a plan
     * Requires: authMiddleware
     * 
     * SIMULATED PAYMENT: In production, this would integrate with
     * Stripe/PayPal. Here we simulate payment success.
     */
    subscribe: async (req, res) => {
        try {
            const { planId } = req.body;
            const userId = req.user.id;

            // Validate plan exists
            const plan = await PlanModel.findById(planId);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Plan not found.' }
                });
            }

            // Check if user already has an active subscription
            const existingSub = await SubscriptionModel.findActiveByUserId(userId);
            if (existingSub) {
                return res.status(409).json({
                    success: false,
                    error: {
                        message: 'You already have an active subscription.',
                        current_plan: existingSub.plan_name,
                        action: 'Use the upgrade/downgrade endpoint to change plans.',
                        code: 'ALREADY_SUBSCRIBED'
                    }
                });
            }

            // SIMULATED PAYMENT PROCESSING
            // In production, integrate with payment gateway here
            const paymentSimulation = {
                status: 'success',
                amount: plan.price,
                currency: 'USD',
                transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            // Create the subscription (30-day duration)
            const result = await SubscriptionModel.create(userId, planId);

            // Fetch the newly created subscription
            const newSubscription = await SubscriptionModel.findById(result.insertId);

            res.status(201).json({
                success: true,
                message: `Successfully subscribed to ${plan.plan_name} plan!`,
                data: {
                    subscription: newSubscription,
                    payment: paymentSimulation
                }
            });
        } catch (error) {
            console.error('Subscribe Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Subscription failed. Please try again.' }
            });
        }
    },

    /**
     * PUT /api/subscriptions/change-plan
     * Upgrade or downgrade subscription
     * Requires: authMiddleware
     * 
     * TIER LOGIC:
     * - Changing to a higher access_level = Upgrade
     * - Changing to a lower access_level = Downgrade
     * - On change: reset download_count, extend end_date by 30 days
     */
    changePlan: async (req, res) => {
        try {
            const { newPlanId } = req.body;
            const userId = req.user.id;

            // Validate new plan exists
            const newPlan = await PlanModel.findById(newPlanId);
            if (!newPlan) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Plan not found.' }
                });
            }

            // Get current active subscription
            const currentSub = await SubscriptionModel.findActiveByUserId(userId);
            if (!currentSub) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'No active subscription found.',
                        action: 'Please subscribe to a plan first.'
                    }
                });
            }

            // Prevent changing to the same plan
            if (currentSub.plan_id === newPlanId) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'You are already on this plan.' }
                });
            }

            // Determine if this is an upgrade or downgrade
            const isUpgrade = newPlan.access_level > currentSub.access_level;
            const changeType = isUpgrade ? 'upgrade' : 'downgrade';

            // SIMULATED PAYMENT for upgrade (price difference)
            let paymentSimulation = null;
            if (isUpgrade) {
                const priceDifference = newPlan.price - currentSub.price;
                paymentSimulation = {
                    status: 'success',
                    amount: priceDifference > 0 ? priceDifference : 0,
                    type: 'upgrade_charge',
                    transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };
            }

            // Change the plan - resets download_count and extends subscription
            await SubscriptionModel.changePlan(currentSub.id, newPlanId);

            // Fetch updated subscription
            const updatedSub = await SubscriptionModel.findById(currentSub.id);

            res.status(200).json({
                success: true,
                message: `Plan ${changeType}d successfully to ${newPlan.plan_name}!`,
                data: {
                    change_type: changeType,
                    previous_plan: currentSub.plan_name,
                    new_plan: newPlan.plan_name,
                    subscription: updatedSub,
                    payment: paymentSimulation
                }
            });
        } catch (error) {
            console.error('Change Plan Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Plan change failed. Please try again.' }
            });
        }
    },

    /**
     * POST /api/subscriptions/renew
     * Renew an expired or active subscription
     * Requires: authMiddleware
     */
    renew: async (req, res) => {
        try {
            const userId = req.user.id;

            // Find user's most recent subscription (active or expired)
            const allSubs = await SubscriptionModel.findAllByUserId(userId);
            if (allSubs.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'No subscription found to renew.',
                        action: 'Please subscribe to a plan first.'
                    }
                });
            }

            const latestSub = allSubs[0]; // Most recent subscription

            // SIMULATED PAYMENT
            const plan = await PlanModel.findById(latestSub.plan_id);
            const paymentSimulation = {
                status: 'success',
                amount: plan.price,
                type: 'renewal',
                transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };

            // Renew the subscription
            await SubscriptionModel.renew(latestSub.id);

            const renewedSub = await SubscriptionModel.findById(latestSub.id);

            res.status(200).json({
                success: true,
                message: `Subscription renewed successfully for ${plan.plan_name} plan!`,
                data: {
                    subscription: renewedSub,
                    payment: paymentSimulation
                }
            });
        } catch (error) {
            console.error('Renew Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Renewal failed. Please try again.' }
            });
        }
    },

    /**
     * GET /api/subscriptions/my-subscription
     * Get current user's subscription details
     * Requires: authMiddleware
     */
    getMySubscription: async (req, res) => {
        try {
            const activeSubscription = await SubscriptionModel.findActiveByUserId(req.user.id);
            const allSubscriptions = await SubscriptionModel.findAllByUserId(req.user.id);

            res.status(200).json({
                success: true,
                data: {
                    active: activeSubscription || null,
                    history: allSubscriptions
                }
            });
        } catch (error) {
            console.error('Get Subscription Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Error fetching subscription info.' }
            });
        }
    },

    // ================================================
    // TIER-PROTECTED CONTENT ENDPOINTS
    // These endpoints demonstrate the tier access engine.
    // Each is protected by authMiddleware + expiryMiddleware + tierMiddleware(level)
    // ================================================

    /**
     * GET /api/subscriptions/basic-content
     * Accessible by: Basic (1), Premium (2), Enterprise (3)
     * Tier requirement: access_level >= 1
     */
    basicContent: async (req, res) => {
        try {
            // Increment download counter for usage tracking
            await SubscriptionModel.incrementDownload(req.subscription.id);

            res.status(200).json({
                success: true,
                data: {
                    title: 'Basic Content Library',
                    content: 'Welcome to the Basic content tier! You have access to our starter resources.',
                    resources: [
                        { id: 1, name: 'Getting Started Guide', type: 'PDF', size: '2.4 MB' },
                        { id: 2, name: 'Basic Templates Pack', type: 'ZIP', size: '15 MB' },
                        { id: 3, name: 'Community Forum Access', type: 'LINK', url: '/forum' },
                        { id: 4, name: 'Standard Documentation', type: 'HTML', url: '/docs' }
                    ],
                    tier: 'Basic',
                    downloads_used: req.subscription.download_count + 1,
                    downloads_remaining: req.subscription.max_download_limit > 0
                        ? req.subscription.max_download_limit - (req.subscription.download_count + 1)
                        : 'Unlimited'
                }
            });
        } catch (error) {
            console.error('Basic Content Error:', error.message);
            res.status(500).json({ success: false, error: { message: 'Error loading content.' } });
        }
    },

    /**
     * GET /api/subscriptions/premium-content
     * Accessible by: Premium (2), Enterprise (3)
     * Tier requirement: access_level >= 2
     */
    premiumContent: async (req, res) => {
        try {
            await SubscriptionModel.incrementDownload(req.subscription.id);

            res.status(200).json({
                success: true,
                data: {
                    title: 'Premium Content Library',
                    content: 'Welcome to Premium! Enjoy advanced resources and priority support.',
                    resources: [
                        { id: 5, name: 'Advanced Analytics Dashboard', type: 'APP', url: '/analytics' },
                        { id: 6, name: 'Premium Templates Suite', type: 'ZIP', size: '85 MB' },
                        { id: 7, name: 'Video Training Course', type: 'VIDEO', duration: '12 hours' },
                        { id: 8, name: 'Priority Support Channel', type: 'LINK', url: '/support/priority' },
                        { id: 9, name: 'API Access Keys', type: 'TOKEN', renewable: true }
                    ],
                    tier: 'Premium',
                    priority_support: true,
                    downloads_used: req.subscription.download_count + 1,
                    downloads_remaining: req.subscription.max_download_limit > 0
                        ? req.subscription.max_download_limit - (req.subscription.download_count + 1)
                        : 'Unlimited'
                }
            });
        } catch (error) {
            console.error('Premium Content Error:', error.message);
            res.status(500).json({ success: false, error: { message: 'Error loading content.' } });
        }
    },

    /**
     * GET /api/subscriptions/enterprise-content
     * Accessible by: Enterprise (3) ONLY
     * Tier requirement: access_level >= 3
     */
    enterpriseContent: async (req, res) => {
        try {
            await SubscriptionModel.incrementDownload(req.subscription.id);

            res.status(200).json({
                success: true,
                data: {
                    title: 'Enterprise Content Library',
                    content: 'Welcome to Enterprise! Full access to all resources with unlimited capabilities.',
                    resources: [
                        { id: 10, name: 'Custom Integration Suite', type: 'SDK', version: '3.0' },
                        { id: 11, name: 'Enterprise Data Export', type: 'API', format: 'CSV/JSON/XML' },
                        { id: 12, name: 'White-Label Solutions', type: 'PACKAGE', customizable: true },
                        { id: 13, name: 'Dedicated Account Manager', type: 'SERVICE', response: '< 1 hour' },
                        { id: 14, name: 'SLA 99.99% Uptime Guarantee', type: 'DOCUMENT', url: '/sla' },
                        { id: 15, name: 'Custom AI/ML Models', type: 'SERVICE', on_demand: true }
                    ],
                    tier: 'Enterprise',
                    priority_support: true,
                    dedicated_support: true,
                    downloads_used: req.subscription.download_count + 1,
                    downloads_remaining: 'Unlimited'
                }
            });
        } catch (error) {
            console.error('Enterprise Content Error:', error.message);
            res.status(500).json({ success: false, error: { message: 'Error loading content.' } });
        }
    }
};

module.exports = SubscriptionController;
