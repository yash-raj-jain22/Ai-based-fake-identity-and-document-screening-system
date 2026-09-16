const jwt = require('jsonwebtoken');
const User = require('../modules/auth/user.model');
const { JWT_SECRET } = require('../modules/auth/auth.service');

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access denied. No authentication token provided.',
        },
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'User belonging to this token no longer exists.',
          },
        });
      }

      req.user = user;
      next();
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token.',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Optional auth middleware (doesn't reject if unauthenticated, but attaches req.user if valid)
const optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) req.user = user;
      } catch {
        // Continue unauthenticated
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
