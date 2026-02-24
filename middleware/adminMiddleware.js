/**
 * Admin Middleware
 * 
 * PURPOSE: Restricts access to admin-only routes.
 * Must be used AFTER authMiddleware (requires req.user to be set).
 * 
 * HOW IT WORKS:
 * ================================================
 * 1. Checks req.user.role (set by authMiddleware from JWT payload)
 * 2. If role === 'admin' → allow access
 * 3. If role !== 'admin' → 403 Forbidden
 * ================================================
 * 
 * USAGE:
 *   router.get('/admin/users', authMiddleware, adminMiddleware, controller);
 */

const adminMiddleware = (req, res, next) => {
    try {
        // Check if user has admin role (set by authMiddleware from JWT)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Access denied. Admin privileges required.',
                    code: 'ADMIN_REQUIRED'
                }
            });
        }

        // User is admin - proceed
        next();
    } catch (error) {
        console.error('Admin Middleware Error:', error.message);
        return res.status(500).json({
            success: false,
            error: { message: 'Error checking admin access.' }
        });
    }
};

module.exports = adminMiddleware;
