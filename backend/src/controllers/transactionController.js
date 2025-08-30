const { validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const logger = require('../utils/logger');
const contractService = require('../utils/contractService');
const Web3 = require('web3');

const web3 = new Web3(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:7545');

// Get all transactions for authenticated user
const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, currency } = req.query;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build query
    const query = {
      $or: [
        { fromAddress: user.walletAddress.toLowerCase() },
        { toAddress: user.walletAddress.toLowerCase() }
      ]
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (currency) query.currency = currency;

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

    // Calculate summary statistics
    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSent: {
            $sum: {
              $cond: [
                { $eq: ['$fromAddress', user.walletAddress.toLowerCase()] },
                { $toDouble: '$amount' },
                0
              ]
            }
          },
          totalReceived: {
            $sum: {
              $cond: [
                { $eq: ['$toAddress', user.walletAddress.toLowerCase()] },
                { $toDouble: '$amount' },
                0
              ]
            }
          },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: stats[0] || {
          totalSent: 0,
          totalReceived: 0,
          totalTransactions: 0
        }
      }
    });

  } catch (error) {
    logger.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions'
    });
  }
};

// Execute blockchain transaction
const executeTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { privateKey, gasPrice } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify transaction belongs to user
    const user = await User.findById(req.user.userId);
    if (transaction.fromAddress !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized transaction'
      });
    }

    // Check if transaction is already processed
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transaction already processed'
      });
    }

    try {
      let txHash;
      
      // Update transaction status to processing
      transaction.status = 'processing';
      transaction.gasPrice = gasPrice || transaction.gasPrice;
      await transaction.save();

      // Execute based on currency type
      if (transaction.currency === 'ETH') {
        txHash = await executeEthTransaction(transaction, privateKey);
      } else if (transaction.currency === 'CPX') {
        txHash = await executeTokenTransaction(transaction, privateKey);
      } else {
        throw new Error('Unsupported currency');
      }

      // Update transaction with hash
      transaction.transactionHash = txHash;
      transaction.status = 'confirmed';
      transaction.executedAt = new Date();
      await transaction.save();

      logger.info(`Transaction executed successfully: ${transactionId}, Hash: ${txHash}`);

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`user-${user._id}`).emit('transaction-executed', {
        transactionId: transaction._id,
        transactionHash: txHash,
        status: 'confirmed'
      });

      res.json({
        success: true,
        message: 'Transaction executed successfully',
        data: {
          transactionHash: txHash,
          transactionId: transaction._id,
          status: 'confirmed'
        }
      });

    } catch (executionError) {
      // Update transaction status to failed
      transaction.status = 'failed';
      transaction.errorMessage = executionError.message;
      await transaction.save();

      logger.error(`Transaction execution failed: ${transactionId}`, executionError);

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`user-${user._id}`).emit('transaction-failed', {
        transactionId: transaction._id,
        error: executionError.message
      });

      throw executionError;
    }

  } catch (error) {
    logger.error('Execute transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute transaction'
    });
  }
};

// Helper function to execute ETH transaction
const executeEthTransaction = async (transaction, privateKey) => {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  
  const txObject = {
    from: transaction.fromAddress,
    to: transaction.toAddress,
    value: web3.utils.toWei(transaction.amount, 'ether'),
    gas: 21000,
    gasPrice: web3.utils.toWei(transaction.gasPrice, 'gwei')
  };

  const signedTx = await account.signTransaction(txObject);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  
  return receipt.transactionHash;
};

// Helper function to execute token transaction
const executeTokenTransaction = async (transaction, privateKey) => {
  return await contractService.executeTokenTransfer(
    transaction.fromAddress,
    transaction.toAddress,
    web3.utils.toWei(transaction.amount, 'ether'),
    privateKey,
    transaction.gasPrice
  );
};

// Create payment request
const createPaymentRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, currency, description, expiresAt } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const paymentRequest = new PaymentRequest({
      requester: user._id,
      amount: amount.toString(),
      currency,
      description,
      recipientAddress: user.walletAddress.toLowerCase(),
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
      status: 'pending'
    });

    await paymentRequest.save();

    // Add to user's payment requests
    user.paymentRequests.push(paymentRequest._id);
    await user.save();

    logger.info(`Payment request created: ${paymentRequest._id} by user ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Payment request created successfully',
      data: {
        paymentRequest: {
          id: paymentRequest._id,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          description: paymentRequest.description,
          recipientAddress: paymentRequest.recipientAddress,
          status: paymentRequest.status,
          expiresAt: paymentRequest.expiresAt,
          createdAt: paymentRequest.createdAt,
          paymentUrl: `${process.env.FRONTEND_URL}/pay/${paymentRequest._id}`
        }
      }
    });

  } catch (error) {
    logger.error('Create payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment request'
    });
  }
};

// Get payment request details
const getPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const paymentRequest = await PaymentRequest.findById(requestId)
      .populate('requester', 'firstName lastName email')
      .populate('payer', 'firstName lastName email')
      .populate('transaction');

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found'
      });
    }

    // Check if payment request has expired
    if (paymentRequest.expiresAt < new Date() && paymentRequest.status === 'pending') {
      paymentRequest.status = 'expired';
      await paymentRequest.save();
    }

    res.json({
      success: true,
      data: {
        paymentRequest
      }
    });

  } catch (error) {
    logger.error('Get payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment request'
    });
  }
};

// Process payment request
const processPaymentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { privateKey, gasPrice } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const paymentRequest = await PaymentRequest.findById(requestId)
      .populate('requester', 'firstName lastName email');

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found'
      });
    }

    // Validate payment request
    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment request is not available for payment'
      });
    }

    if (paymentRequest.expiresAt < new Date()) {
      paymentRequest.status = 'expired';
      await paymentRequest.save();
      return res.status(400).json({
        success: false,
        message: 'Payment request has expired'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      user: user._id,
      fromAddress: user.walletAddress.toLowerCase(),
      toAddress: paymentRequest.recipientAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      description: `Payment for: ${paymentRequest.description}`,
      type: 'payment',
      status: 'processing',
      gasPrice: gasPrice || '20',
      paymentRequest: paymentRequest._id
    });

    await transaction.save();

    try {
      let txHash;
      
      // Execute blockchain transaction
      if (paymentRequest.currency === 'ETH') {
        txHash = await executeEthTransaction(transaction, privateKey);
      } else if (paymentRequest.currency === 'CPX') {
        txHash = await executeTokenTransaction(transaction, privateKey);
      }

      // Update transaction and payment request
      transaction.transactionHash = txHash;
      transaction.status = 'confirmed';
      transaction.executedAt = new Date();
      await transaction.save();

      paymentRequest.status = 'completed';
      paymentRequest.payer = user._id;
      paymentRequest.transaction = transaction._id;
      paymentRequest.paidAt = new Date();
      await paymentRequest.save();

      logger.info(`Payment request fulfilled: ${requestId} by user ${user.email}`);

      // Emit real-time updates
      const io = req.app.get('io');
      io.to(`user-${user._id}`).emit('payment-sent', {
        paymentRequestId: requestId,
        transactionHash: txHash
      });
      io.to(`user-${paymentRequest.requester._id}`).emit('payment-received', {
        paymentRequestId: requestId,
        transactionHash: txHash,
        payer: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        }
      });

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionHash: txHash,
          transactionId: transaction._id,
          paymentRequestId: requestId
        }
      });

    } catch (executionError) {
      transaction.status = 'failed';
      transaction.errorMessage = executionError.message;
      await transaction.save();

      throw executionError;
    }

  } catch (error) {
    logger.error('Process payment request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment'
    });
  }
};

// Get transaction statistics
const getTransactionStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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

    const stats = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { fromAddress: user.walletAddress.toLowerCase() },
            { toAddress: user.walletAddress.toLowerCase() }
          ],
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSent: {
            $sum: {
              $cond: [
                { $eq: ['$fromAddress', user.walletAddress.toLowerCase()] },
                { $toDouble: '$amount' },
                0
              ]
            }
          },
          totalReceived: {
            $sum: {
              $cond: [
                { $eq: ['$toAddress', user.walletAddress.toLowerCase()] },
                { $toDouble: '$amount' },
                0
              ]
            }
          },
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0]
            }
          },
          failedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        stats: stats[0] || {
          totalSent: 0,
          totalReceived: 0,
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0
        }
      }
    });

  } catch (error) {
    logger.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction statistics'
    });
  }
};

module.exports = {
  getAllTransactions,
  executeTransaction,
  createPaymentRequest,
  getPaymentRequest,
  processPaymentRequest,
  getTransactionStats
};