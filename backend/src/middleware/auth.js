const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Check if user account is locked
      if (user.isLocked) {
        return res.status(401).json({
          success: false,
          message: 'User account is temporarily locked'
        });
      }

      // Add user to request object
      req.user = {
        userId: user._id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        isVerified: user.isVerified,
        isMerchant: user.isMerchant
      };

      logger.debug(`User authenticated: ${user.email}`);
      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else {
        throw error;
      }
    }

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Optional authentication - don't require token but add user if present
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive && !user.isLocked) {
          req.user = {
            userId: user._id,
            email: user.email,
            walletAddress: user.walletAddress,
            role: user.role,
            isVerified: user.isVerified,
            isMerchant: user.isMerchant
          };
        }
      } catch (error) {
        // Silently ignore token errors for optional auth
        logger.debug('Optional auth token error:', error.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Require verified email
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required to access this route'
    });
  }

  next();
};

// Require merchant status
const requireMerchant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!req.user.isMerchant) {
      return res.status(403).json({
        success: false,
        message: 'Merchant status required to access this route'
      });
    }

    // Additional check to ensure merchant profile exists and is active
    const Merchant = require('../models/Merchant');
    const merchant = await Merchant.findOne({ user: req.user.userId });
    
    if (!merchant || !merchant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Active merchant profile required to access this route'
      });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    logger.error('Merchant authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during merchant authorization'
    });
  }
};

// Check wallet ownership
const requireWalletOwnership = (req, res, next) => {
  const { walletAddress } = req.params;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (walletAddress && walletAddress.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this wallet'
    });
  }

  next();
};

// Log authentication events
const logAuthEvent = (event) => {
  return (req, res, next) => {
    if (req.user) {
      logger.logUserAction(req.user.userId, event, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
    }
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  requireVerified,
  requireMerchant,
  requireWalletOwnership,
  logAuthEvent
};