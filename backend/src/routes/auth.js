const express = require('express');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken
} = require('../controllers/authController');
const { protect, logAuthEvent } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateProfileUpdate
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/profile', logAuthEvent('profile_viewed'), getProfile);
router.put('/profile', validateProfileUpdate, logAuthEvent('profile_updated'), updateProfile);
router.put('/change-password', validatePasswordChange, logAuthEvent('password_changed'), changePassword);
router.get('/verify-token', verifyToken);

module.exports = router;