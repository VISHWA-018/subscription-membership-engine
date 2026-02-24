/**
 * Tier Middleware
 * 
 * PURPOSE: Enforces tier-based access control on protected routes.
 * This is the THIRD and FINAL layer of the tier access engine.
 * 
 * HOW IT WORKS:
 * ================================================
 * The middleware is a factory function that accepts a `requiredLevel` parameter.
 * It returns a middleware function that checks whether the user's plan
 * access_level meets or exceeds the required level for the route.
 * 
 * ACCESS LEVEL HIERARCHY:
 *   Level 1 = Basic    → Can access: /basic-content
 *   Level 2 = Premium  → Can access: /basic-content, /premium-content
 *   Level 3 = Enterprise → Can access: ALL content
 * 
 * Higher tiers automatically inherit access to lower-tier content.
 * This is achieved by using >= comparison:
 *   user.access_level >= route.requiredLevel
 * 
 * DOWNLOAD LIMIT CHECK:
 * After verifying tier access, this middleware also checks if the user
 * has exceeded their plan's max_download_limit. If so, access is denied
 * with an upgrade suggestion.
 * ================================================
 * 
 * TIER ENGINE FLOW:
 * Request → [authMiddleware] → [expiryMiddleware] → [tierMiddleware] → Controller
 *                                                     ↑ YOU ARE HERE
 * 
 * USAGE EXAMPLE:
 *   router.get('/premium-content', authMiddleware, expiryMiddleware, tierMiddleware(2), controller);
 *   // The '2' means: requires Premium (level 2) or higher
 */

/**
 * Factory function that creates tier-checking middleware
 * @param {number} requiredLevel - Minimum access_level required (1=Basic, 2=Premium, 3=Enterprise)
 * @returns {Function} Express middleware function
 */
const tierMiddleware = (requiredLevel) => {
    return (req, res, next) => {
        try {
            // req.subscription is set by expiryMiddleware (previous layer)
            const subscription = req.subscription;

            // TIER CHECK: Compare user's plan access_level against required level
            // access_level is an integer: Basic=1, Premium=2, Enterprise=3
            // Using >= allows higher tiers to access lower-tier content
            if (subscription.access_level < requiredLevel) {
                // Determine what tier name the user needs
                const tierNames = { 1: 'Basic', 2: 'Premium', 3: 'Enterprise' };
                const requiredTier = tierNames[requiredLevel] || `Level ${requiredLevel}`;
                const currentTier = tierNames[subscription.access_level] || subscription.plan_name;

                return res.status(403).json({
                    success: false,
                    error: {
                        message: `This content requires ${requiredTier} tier or higher.`,
                        current_plan: currentTier,
                        current_level: subscription.access_level,
                        required_level: requiredLevel,
                        action: `Upgrade to ${requiredTier} plan to access this content.`,
                        upgrade_url: '/plans',
                        code: 'INSUFFICIENT_TIER'
                    }
                });
            }

            // DOWNLOAD LIMIT CHECK: Verify user hasn't exceeded their plan's download limit
            // max_download_limit of 0 or null means unlimited downloads
            if (subscription.max_download_limit > 0 &&
                subscription.download_count >= subscription.max_download_limit) {
                return res.status(429).json({
                    success: false,
                    error: {
                        message: 'Download limit reached for your current plan.',
                        current_downloads: subscription.download_count,
                        max_downloads: subscription.max_download_limit,
                        plan: subscription.plan_name,
                        action: 'Upgrade your plan for a higher download limit.',
                        upgrade_url: '/plans',
                        code: 'DOWNLOAD_LIMIT_REACHED'
                    }
                });
            }

            // All tier checks passed - proceed to the controller
            next();
        } catch (error) {
            console.error('Tier Middleware Error:', error.message);
            return res.status(500).json({
                success: false,
                error: { message: 'Error checking tier access.' }
            });
        }
    };
};

module.exports = tierMiddleware;
