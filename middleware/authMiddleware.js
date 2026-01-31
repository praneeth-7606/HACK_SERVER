const { verifyAccessToken } = require('../utils/tokenUtils');
const User = require('../models/User');

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check for token in cookies (alternative)
        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token.'
            });
        }

        // Get user from token
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account has been deactivated.'
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route.`
            });
        }
        next();
    };
};

const optionalProtect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (token) {
            const decoded = verifyAccessToken(token);
            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user && user.isActive) {
                    req.user = user;
                }
            }
        }
        next();
    } catch (error) {
        // If optional auth fails, just proceed as guest
        next();
    }
};

module.exports = { protect, authorize, optionalProtect };
