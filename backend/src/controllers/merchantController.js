const { validationResult } = require('express-validator');
const Merchant = require('../models/Merchant');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const PaymentRequest = require('../models/PaymentRequest');
const logger = require('../utils/logger');
const contractService = require('../utils/contractService');

// Register as merchant
const registerMerchant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      businessName,
      businessType,
      description,
      website,
      contactEmail,
      contactPhone,
      address
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a merchant
    const existingMerchant = await Merchant.findOne({ user: user._id });
    if (existingMerchant) {
      return res.status(409).json({
        success: false,
        message: 'User is already registered as a merchant'
      });
    }

    // Register merchant on blockchain
    try {
      const blockchainTxHash = await contractService.registerMerchant(
        user.walletAddress,
        businessName,
        contactEmail
      );

      const merchant = new Merchant({
        user: user._id,
        businessName,
        businessType,
        description,
        website,
        contactEmail,
        contactPhone,
        address,
        walletAddress: user.walletAddress.toLowerCase(),
        registrationTxHash: blockchainTxHash,
        isActive: true,
        verificationStatus: 'pending'
      });

      await merchant.save();

      // Update user to indicate merchant status
      user.isMerchant = true;
      user.merchantProfile = merchant._id;
      await user.save();

      logger.info(`Merchant registered: ${businessName} by user ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Merchant registration successful',
        data: {
          merchant: {
            id: merchant._id,
            businessName: merchant.businessName,
            businessType: merchant.businessType,
            description: merchant.description,
            isActive: merchant.isActive,
            verificationStatus: merchant.verificationStatus,
            registrationTxHash: blockchainTxHash,
            createdAt: merchant.createdAt
          }
        }
      });

    } catch (blockchainError) {
      logger.error('Blockchain merchant registration failed:', blockchainError);
      res.status(500).json({
        success: false,
        message: 'Failed to register merchant on blockchain'
      });
    }

  } catch (error) {
    logger.error('Merchant registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register merchant'
    });
  }
};

// Get merchant profile
const getMerchantProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    const merchant = await Merchant.findOne({ user: user._id })
      .populate('user', 'firstName lastName email walletAddress');

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // Get merchant statistics
    const stats = await getMerchantStats(merchant._id);

    res.json({
      success: true,
      data: {
        merchant,
        stats
      }
    });

  } catch (error) {
    logger.error('Get merchant profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve merchant profile'
    });
  }
};

// Update merchant profile
const updateMerchantProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      businessName,
      businessType,
      description,
      website,
      contactEmail,
      contactPhone,
      address
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user || !user.isMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    const merchant = await Merchant.findOne({ user: user._id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // Update merchant fields
    if (businessName) merchant.businessName = businessName;
    if (businessType) merchant.businessType = businessType;
    if (description) merchant.description = description;
    if (website) merchant.website = website;
    if (contactEmail) merchant.contactEmail = contactEmail;
    if (contactPhone) merchant.contactPhone = contactPhone;
    if (address) merchant.address = address;

    merchant.updatedAt = new Date();
    await merchant.save();

    logger.info(`Merchant profile updated: ${merchant.businessName}`);

    res.json({
      success: true,
      message: 'Merchant profile updated successfully',
      data: {
        merchant
      }
    });

  } catch (error) {
    logger.error('Update merchant profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update merchant profile'
    });
  }
};

// Get merchant transactions
const getMerchantTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, currency } = req.query;
    const user = await User.findById(req.user.userId);

    if (!user || !user.isMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    const merchant = await Merchant.findOne({ user: user._id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // Build query for transactions received by merchant
    const query = {
      toAddress: merchant.walletAddress,
      type: { $in: ['payment', 'receive'] }
    };

    if (status) query.status = status;
    if (currency) query.currency = currency;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName email')
      .populate('paymentRequest', 'description');

    // Get total count
    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get merchant transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve merchant transactions'
    });
  }
};

// Get merchant payment requests
const getMerchantPaymentRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const user = await User.findById(req.user.userId);

    if (!user || !user.isMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // Build query
    const query = { requester: user._id };
    if (status) query.status = status;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get payment requests
    const paymentRequests = await PaymentRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('payer', 'firstName lastName email')
      .populate('transaction');

    // Get total count
    const total = await PaymentRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        paymentRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get merchant payment requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment requests'
    });
  }
};

// Get merchant dashboard data
const getMerchantDashboard = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const user = await User.findById(req.user.userId);

    if (!user || !user.isMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    const merchant = await Merchant.findOne({ user: user._id });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // Calculate date range
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get transaction statistics
    const transactionStats = await Transaction.aggregate([
      {
        $match: {
          toAddress: merchant.walletAddress,
          status: 'confirmed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            currency: '$currency',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          totalAmount: { $sum: { $toDouble: '$amount' } },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.currency',
          totalAmount: { $sum: '$totalAmount' },
          totalTransactions: { $sum: '$transactionCount' },
          dailyData: {
            $push: {
              date: '$_id.date',
              amount: '$totalAmount',
              count: '$transactionCount'
            }
          }
        }
      }
    ]);

    // Get payment request statistics
    const paymentRequestStats = await PaymentRequest.aggregate([
      {
        $match: {
          requester: user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$amount' } }
        }
      }
    ]);

    // Get recent activity
    const recentTransactions = await Transaction.find({
      toAddress: merchant.walletAddress,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        merchant,
        period,
        transactionStats,
        paymentRequestStats,
        recentTransactions
      }
    });

  } catch (error) {
    logger.error('Get merchant dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve merchant dashboard data'
    });
  }
};

// Helper function to get merchant statistics
const getMerchantStats = async (merchantId) => {
  try {
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) return null;

    const stats = await Transaction.aggregate([
      {
        $match: {
          toAddress: merchant.walletAddress,
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: '$currency',
          totalAmount: { $sum: { $toDouble: '$amount' } },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const paymentRequestCount = await PaymentRequest.countDocuments({
      requester: merchant.user
    });

    return {
      totalTransactions: stats.reduce((sum, stat) => sum + stat.transactionCount, 0),
      totalVolumeByToken: stats,
      totalPaymentRequests: paymentRequestCount,
      verificationStatus: merchant.verificationStatus,
      isActive: merchant.isActive
    };
  } catch (error) {
    logger.error('Get merchant stats error:', error);
    return null;
  }
};

// Search merchants
const searchMerchants = async (req, res) => {
  try {
    const { query, businessType, page = 1, limit = 20 } = req.query;

    // Build search query
    const searchQuery = {
      isActive: true,
      verificationStatus: 'verified'
    };

    if (query) {
      searchQuery.$or = [
        { businessName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (businessType) {
      searchQuery.businessType = businessType;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get merchants
    const merchants = await Merchant.find(searchQuery)
      .select('businessName businessType description website walletAddress createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Merchant.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        merchants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Search merchants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search merchants'
    });
  }
};

module.exports = {
  registerMerchant,
  getMerchantProfile,
  updateMerchantProfile,
  getMerchantTransactions,
  getMerchantPaymentRequests,
  getMerchantDashboard,
  searchMerchants
};