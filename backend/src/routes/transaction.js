const express = require('express');
const {
  getAllTransactions,
  executeTransaction,
  createPaymentRequest,
  getPaymentRequest,
  processPaymentRequest,
  getTransactionStats
} = require('../controllers/transactionController');
const { protect, optionalAuth, logAuthEvent } = require('../middleware/auth');
const {
  validateTransactionExecution,
  validatePaymentRequest,
  validatePaymentRequestProcess,
  validatePagination,
  validateTransactionFilters,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// Get all transactions for authenticated user
router.get(
  '/',
  protect,
  validatePagination,
  validateTransactionFilters,
  logAuthEvent('transactions_viewed'),
  getAllTransactions
);

// Execute a pending transaction
router.post(
  '/:transactionId/execute',
  protect,
  validateTransactionExecution,
  logAuthEvent('transaction_executed'),
  executeTransaction
);

// Get transaction statistics
router.get(
  '/stats',
  protect,
  logAuthEvent('transaction_stats_viewed'),
  getTransactionStats
);

// Payment request routes
router.post(
  '/payment-requests',
  protect,
  validatePaymentRequest,
  logAuthEvent('payment_request_created'),
  createPaymentRequest
);

// Get payment request details (public route for payment links)
router.get(
  '/payment-requests/:requestId',
  optionalAuth,
  validateObjectId('requestId'),
  getPaymentRequest
);

// Process payment request
router.post(
  '/payment-requests/:requestId/pay',
  protect,
  validatePaymentRequestProcess,
  logAuthEvent('payment_request_processed'),
  processPaymentRequest
);

module.exports = router;