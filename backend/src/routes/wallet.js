const express = require('express');
const {
  getBalance,
  getTransactionHistory,
  createTransaction,
  getTransactionDetails,
  estimateGas,
  validateAddress
} = require('../controllers/walletController');
const { protect, requireWalletOwnership, logAuthEvent } = require('../middleware/auth');
const {
  validateWalletAddress,
  validateAddress: validateAddressParam,
  validateTransaction,
  validateGasEstimation,
  validatePagination,
  validateTransactionFilters,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// All wallet routes require authentication
router.use(protect);

// Get wallet balance
router.get(
  '/balance/:walletAddress',
  validateWalletAddress,
  requireWalletOwnership,
  logAuthEvent('balance_viewed'),
  getBalance
);

// Get transaction history for a wallet
router.get(
  '/history/:walletAddress',
  validateWalletAddress,
  validatePagination,
  validateTransactionFilters,
  requireWalletOwnership,
  logAuthEvent('transaction_history_viewed'),
  getTransactionHistory
);

// Create new transaction
router.post(
  '/transaction',
  validateTransaction,
  logAuthEvent('transaction_created'),
  createTransaction
);

// Get specific transaction details
router.get(
  '/transaction/:transactionId',
  validateObjectId('transactionId'),
  logAuthEvent('transaction_details_viewed'),
  getTransactionDetails
);

// Estimate gas for transaction
router.post(
  '/estimate-gas',
  validateGasEstimation,
  logAuthEvent('gas_estimated'),
  estimateGas
);

// Validate wallet address
router.get(
  '/validate/:address',
  validateAddressParam,
  validateAddress
);

module.exports = router;