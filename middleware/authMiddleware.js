/**
 * Authentication Middleware
 * 
 * PURPOSE: Verifies that the incoming request has a valid JWT token.
 * This is the FIRST layer of the tier access engine.
 * 
 * HOW IT WORKS:
 * ================================================
 * 1. Extracts JWT from the Authorization header (Bearer <token>)
 * 2. Verifies the token using the JWT_SECRET from .env
 * 3. Decodes the token to get user ID and role
 * 4. Attaches user info to req.user for downstream middleware
 * 5. If token is invalid/missing → 401 Unauthorized
 * ================================================
 * 
 * TIER ENGINE FLOW:
 * Request → [authMiddleware] → [expiryMiddleware] → [tierMiddleware] → Controller
 *            ↑ YOU ARE HERE
 */

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Step 1: Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Access denied. No token provided.',
                    action: 'Please log in to access this resource.'
                }
            });
        }

        // Step 2: Extract the token (remove "Bearer " prefix)
        const token = authHeader.split(' ')[1];

        // Step 3: Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Step 4: Attach decoded user data to request object
        // This makes user info available to all subsequent middleware and controllers
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };

        // Step 5: Pass control to the next middleware
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token has expired. Please log in again.',
                    code: 'TOKEN_EXPIRED'
                }
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid token. Please log in again.',
                    code: 'TOKEN_INVALID'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: { message: 'Authentication error.' }
        });
    }
};

module.exports = authMiddleware;
