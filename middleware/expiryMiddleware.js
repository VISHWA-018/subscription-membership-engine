/**
 * Expiry Middleware
 * 
 * PURPOSE: Checks if the user's subscription has expired.
 * This is the SECOND layer of the tier access engine.
 * 
 * HOW IT WORKS:
 * ================================================
 * 1. Loads the user's active subscription from the database
 * 2. Compares today's date with the subscription's end_date
 * 3. If end_date < today:
 *    a. Automatically updates subscription status to 'expired'
 *    b. Returns 403 with message to renew
 * 4. If subscription is valid, attaches it to req.subscription
 * ================================================
 * 
 * AUTOMATIC EXPIRY:
 * This middleware acts as a "lazy expiry" system. Instead of running
 * a scheduled cron job, it checks and updates expiry on each request.
 * This ensures the subscription status is always accurate when accessed.
 * 
 * TIER ENGINE FLOW:
 * Request → [authMiddleware] → [expiryMiddleware] → [tierMiddleware] → Controller
 *                                ↑ YOU ARE HERE
 */

const SubscriptionModel = require('../models/subscriptionModel');

const expiryMiddleware = async (req, res, next) => {
    try {
        // Step 1: Get the user's active subscription
        const subscription = await SubscriptionModel.findActiveByUserId(req.user.id);

        // Step 2: Check if user has any active subscription
        if (!subscription) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'No active subscription found.',
                    action: 'Please subscribe to a plan to access this content.',
                    code: 'NO_SUBSCRIPTION'
                }
            });
        }

        // Step 3: Compare current date with subscription end_date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        const endDate = new Date(subscription.end_date);
        endDate.setHours(0, 0, 0, 0);

        if (today > endDate) {
            // AUTOMATIC EXPIRY: Update the subscription status in the database
            // This is the "lazy expiry" pattern - expire on access
            await SubscriptionModel.updateStatus(subscription.id, 'expired');

            return res.status(403).json({
                success: false,
                error: {
                    message: 'Subscription expired. Please renew.',
                    expired_on: subscription.end_date,
                    plan: subscription.plan_name,
                    action: 'Visit /plans to renew or upgrade your subscription.',
                    code: 'SUBSCRIPTION_EXPIRED'
                }
            });
        }

        // Step 4: Subscription is valid - attach to request for downstream use
        // tierMiddleware will use this to check access_level
        req.subscription = subscription;

        next();
    } catch (error) {
        console.error('Expiry Middleware Error:', error.message);
        return res.status(500).json({
            success: false,
            error: { message: 'Error checking subscription status.' }
        });
    }
};

module.exports = expiryMiddleware;
