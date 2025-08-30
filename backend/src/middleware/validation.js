const { body, param, query } = require('express-validator');

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Please provide a valid Ethereum address')
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters')
];

// Transaction validation rules
const validateTransaction = [
  body('toAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Please provide a valid Ethereum address'),
  body('amount')
    .isFloat({ min: 0.000001 })
    .withMessage('Amount must be a positive number greater than 0.000001'),
  body('currency')
    .isIn(['ETH', 'CPX'])
    .withMessage('Currency must be either ETH or CPX'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('gasPrice')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Gas price must be a positive number')
];

const validateTransactionExecution = [
  param('transactionId')
    .isMongoId()
    .withMessage('Invalid transaction ID'),
  body('privateKey')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid private key format'),
  body('gasPrice')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Gas price must be a positive number')
];

// Payment request validation rules
const validatePaymentRequest = [
  body('amount')
    .isFloat({ min: 0.000001 })
    .withMessage('Amount must be a positive number greater than 0.000001'),
  body('currency')
    .isIn(['ETH', 'CPX'])
    .withMessage('Currency must be either ETH or CPX'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description is required and must not exceed 500 characters'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    })
];

const validatePaymentRequestProcess = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid payment request ID'),
  body('privateKey')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid private key format'),
  body('gasPrice')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Gas price must be a positive number')
];

// Merchant validation rules
const validateMerchantRegistration = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('businessType')
    .isIn([
      'retail', 'ecommerce', 'restaurant', 'services', 'technology',
      'healthcare', 'education', 'entertainment', 'finance', 'real_estate',
      'nonprofit', 'other'
    ])
    .withMessage('Please select a valid business type'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('contactEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid contact email'),
  body('contactPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number')
];

const validateMerchantUpdate = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('businessType')
    .optional()
    .isIn([
      'retail', 'ecommerce', 'restaurant', 'services', 'technology',
      'healthcare', 'education', 'entertainment', 'finance', 'real_estate',
      'nonprofit', 'other'
    ])
    .withMessage('Please select a valid business type'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('contactEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid contact email'),
  body('contactPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number')
];

// Wallet validation rules
const validateWalletAddress = [
  param('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Please provide a valid Ethereum address')
];

const validateAddress = [
  param('address')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Please provide a valid Ethereum address')
];

// Gas estimation validation
const validateGasEstimation = [
  body('toAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Please provide a valid Ethereum address'),
  body('amount')
    .isFloat({ min: 0.000001 })
    .withMessage('Amount must be a positive number greater than 0.000001'),
  body('currency')
    .isIn(['ETH', 'CPX'])
    .withMessage('Currency must be either ETH or CPX')
];

// Query parameter validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
];

const validateTransactionFilters = [
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'confirmed', 'failed', 'cancelled'])
    .withMessage('Invalid status filter'),
  query('type')
    .optional()
    .isIn(['send', 'receive', 'payment', 'transfer'])
    .withMessage('Invalid type filter'),
  query('currency')
    .optional()
    .isIn(['ETH', 'CPX'])
    .withMessage('Invalid currency filter')
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && value <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`)
];

module.exports = {
  // User validations
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateProfileUpdate,

  // Transaction validations
  validateTransaction,
  validateTransactionExecution,

  // Payment request validations
  validatePaymentRequest,
  validatePaymentRequestProcess,

  // Merchant validations
  validateMerchantRegistration,
  validateMerchantUpdate,

  // Wallet validations
  validateWalletAddress,
  validateAddress,
  validateGasEstimation,

  // Query validations
  validatePagination,
  validateTransactionFilters,
  validateDateRange,

  // Generic validations
  validateObjectId
};