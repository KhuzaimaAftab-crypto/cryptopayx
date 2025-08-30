const express = require('express');
const {
  registerMerchant,
  getMerchantProfile,
  updateMerchantProfile,
  getMerchantTransactions,
  getMerchantPaymentRequests,
  getMerchantDashboard,
  searchMerchants
} = require('../controllers/merchantController');
const { protect, requireMerchant, logAuthEvent } = require('../middleware/auth');
const {
  validateMerchantRegistration,
  validateMerchantUpdate,
  validatePagination
} = require('../middleware/validation');

const router = express.Router();

// Public routes
// Search merchants (public)
router.get('/search', validatePagination, searchMerchants);

// Protected routes
router.use(protect); // All routes below require authentication

// Register as merchant
router.post(
  '/register',
  validateMerchantRegistration,
  logAuthEvent('merchant_registration_attempted'),
  registerMerchant
);

// Merchant-only routes
router.use(requireMerchant); // All routes below require merchant status

// Get merchant profile
router.get(
  '/profile',
  logAuthEvent('merchant_profile_viewed'),
  getMerchantProfile
);

// Update merchant profile
router.put(
  '/profile',
  validateMerchantUpdate,
  logAuthEvent('merchant_profile_updated'),
  updateMerchantProfile
);

// Get merchant transactions
router.get(
  '/transactions',
  validatePagination,
  logAuthEvent('merchant_transactions_viewed'),
  getMerchantTransactions
);

// Get merchant payment requests
router.get(
  '/payment-requests',
  validatePagination,
  logAuthEvent('merchant_payment_requests_viewed'),
  getMerchantPaymentRequests
);

// Get merchant dashboard data
router.get(
  '/dashboard',
  logAuthEvent('merchant_dashboard_viewed'),
  getMerchantDashboard
);

module.exports = router;