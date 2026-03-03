const jwt = require('jsonwebtoken');

/**
 * Combined Middleware for Auth, Admin, and Tier Checks
 */
const middleware = {
    // 1. Authenticate JWT Token
    authenticate: (req, res, next) => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
        }
    },

    // 2. Admin Role Check
    isAdmin: (req, res, next) => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
        }
        next();
    },

    // 3. Simple Tier Access Check
    checkTier: (requiredLevel) => (req, res, next) => {
        // Higher tiers inherit access to all lower tiers
        if (!req.user || req.user.access_level < requiredLevel) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Insufficient subscription tier',
                    action: 'Upgrade your plan to unlock this content.'
                }
            });
        }
        next();
    }
};

module.exports = middleware;
