const Web3 = require('web3');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const contractService = require('../utils/contractService');

// Initialize Web3
const web3 = new Web3(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:7545');

// Get wallet balance
const getBalance = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!web3.utils.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // Get ETH balance
    const ethBalance = await web3.eth.getBalance(walletAddress);
    const ethBalanceFormatted = web3.utils.fromWei(ethBalance, 'ether');

    // Get CPX token balance
    const tokenBalance = await contractService.getTokenBalance(walletAddress);

    // Get recent transactions
    const recentTransactions = await Transaction.find({
      $or: [
        { fromAddress: walletAddress.toLowerCase() },
        { toAddress: walletAddress.toLowerCase() }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'firstName lastName email');

    logger.info(`Balance requested for wallet: ${walletAddress}`);

    res.json({
      success: true,
      data: {
        walletAddress,
        balances: {
          eth: {
            wei: ethBalance,
            ether: ethBalanceFormatted
          },
          cpx: {
            wei: tokenBalance.wei,
            ether: tokenBalance.ether
          }
        },
        recentTransactions
      }
    });

  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet balance'
    });
  }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { page = 1, limit = 20, type, status } = req.query;

    if (!web3.utils.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // Build query
    const query = {
      $or: [
        { fromAddress: walletAddress.toLowerCase() },
        { toAddress: walletAddress.toLowerCase() }
      ]
    };

    if (type) query.type = type;
    if (status) query.status = status;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName email');

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
    logger.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history'
    });
  }
};

// Create new transaction
const createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { toAddress, amount, currency, description, gasPrice } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate addresses
    if (!web3.utils.isAddress(user.walletAddress) || !web3.utils.isAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // Check if user has sufficient balance
    let balance;
    if (currency === 'ETH') {
      const ethBalance = await web3.eth.getBalance(user.walletAddress);
      balance = web3.utils.fromWei(ethBalance, 'ether');
    } else if (currency === 'CPX') {
      const tokenBalance = await contractService.getTokenBalance(user.walletAddress);
      balance = tokenBalance.ether;
    }

    if (parseFloat(balance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      user: user._id,
      fromAddress: user.walletAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      amount: amount.toString(),
      currency,
      description,
      type: 'send',
      status: 'pending',
      gasPrice: gasPrice || '20',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    await transaction.save();

    // Add transaction to user's transactions
    user.transactions.push(transaction._id);
    await user.save();

    logger.info(`Transaction created: ${transaction._id} from ${user.walletAddress} to ${toAddress}`);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user-${user._id}`).emit('transaction-created', {
      transactionId: transaction._id,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        transaction: {
          id: transaction._id,
          fromAddress: transaction.fromAddress,
          toAddress: transaction.toAddress,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction'
    });
  }
};

// Get transaction details
const getTransactionDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate('user', 'firstName lastName email walletAddress');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user has access to this transaction
    const user = await User.findById(req.user.userId);
    if (transaction.fromAddress !== user.walletAddress.toLowerCase() && 
        transaction.toAddress !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get blockchain transaction details if hash exists
    let blockchainData = null;
    if (transaction.transactionHash) {
      try {
        blockchainData = await web3.eth.getTransaction(transaction.transactionHash);
        if (blockchainData) {
          const receipt = await web3.eth.getTransactionReceipt(transaction.transactionHash);
          blockchainData.receipt = receipt;
        }
      } catch (error) {
        logger.warn(`Failed to get blockchain data for transaction ${transactionId}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        transaction,
        blockchainData
      }
    });

  } catch (error) {
    logger.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction details'
    });
  }
};

// Estimate gas for transaction
const estimateGas = async (req, res) => {
  try {
    const { toAddress, amount, currency } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let gasEstimate;
    let gasPrice = await web3.eth.getGasPrice();

    if (currency === 'ETH') {
      // Estimate gas for ETH transfer
      gasEstimate = await web3.eth.estimateGas({
        from: user.walletAddress,
        to: toAddress,
        value: web3.utils.toWei(amount.toString(), 'ether')
      });
    } else if (currency === 'CPX') {
      // Estimate gas for token transfer
      gasEstimate = await contractService.estimateTokenTransferGas(
        user.walletAddress,
        toAddress,
        web3.utils.toWei(amount.toString(), 'ether')
      );
    }

    const gasCost = web3.utils.toBN(gasEstimate).mul(web3.utils.toBN(gasPrice));
    const gasCostEth = web3.utils.fromWei(gasCost, 'ether');

    res.json({
      success: true,
      data: {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        gasCost: {
          wei: gasCost.toString(),
          ether: gasCostEth
        },
        total: {
          amount: amount.toString(),
          currency,
          gasCostEth
        }
      }
    });

  } catch (error) {
    logger.error('Gas estimation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate gas'
    });
  }
};

// Validate wallet address
const validateAddress = async (req, res) => {
  try {
    const { address } = req.params;

    const isValid = web3.utils.isAddress(address);
    
    let addressInfo = null;
    if (isValid) {
      // Check if address belongs to a registered user
      const user = await User.findOne({ 
        walletAddress: address.toLowerCase() 
      }, 'firstName lastName email');

      if (user) {
        addressInfo = {
          isRegistered: true,
          userName: `${user.firstName} ${user.lastName}`,
          email: user.email
        };
      } else {
        addressInfo = {
          isRegistered: false
        };
      }
    }

    res.json({
      success: true,
      data: {
        address,
        isValid,
        addressInfo
      }
    });

  } catch (error) {
    logger.error('Address validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate address'
    });
  }
};

module.exports = {
  getBalance,
  getTransactionHistory,
  createTransaction,
  getTransactionDetails,
  estimateGas,
  validateAddress
};