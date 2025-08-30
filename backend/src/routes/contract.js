const express = require('express');
const contractService = require('../utils/contractService');
const { protect, authorize, logAuthEvent } = require('../middleware/auth');
const { validateAddress, validateObjectId } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Get token information (public)
router.get('/token/info', async (req, res) => {
  try {
    const tokenInfo = await contractService.getTokenInfo();
    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (error) {
    logger.error('Get token info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve token information'
    });
  }
});

// Get current gas price (public)
router.get('/gas-price', async (req, res) => {
  try {
    const gasPrice = await contractService.getCurrentGasPrice();
    res.json({
      success: true,
      data: gasPrice
    });
  } catch (error) {
    logger.error('Get gas price error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gas price'
    });
  }
});

// Get current block number (public)
router.get('/block-number', async (req, res) => {
  try {
    const blockNumber = await contractService.getBlockNumber();
    res.json({
      success: true,
      data: { blockNumber }
    });
  } catch (error) {
    logger.error('Get block number error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve block number'
    });
  }
});

// Protected routes
router.use(protect);

// Get token balance for address
router.get(
  '/token/balance/:address',
  validateAddress,
  logAuthEvent('token_balance_viewed'),
  async (req, res) => {
    try {
      const { address } = req.params;
      const balance = await contractService.getTokenBalance(address);
      
      res.json({
        success: true,
        data: {
          address,
          balance
        }
      });
    } catch (error) {
      logger.error('Get token balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve token balance'
      });
    }
  }
);

// Get payment details from smart contract
router.get(
  '/payment/:paymentId',
  logAuthEvent('contract_payment_viewed'),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const paymentDetails = await contractService.getPaymentDetails(paymentId);
      
      res.json({
        success: true,
        data: paymentDetails
      });
    } catch (error) {
      logger.error('Get payment details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment details'
      });
    }
  }
);

// Get transaction receipt
router.get(
  '/transaction/:transactionHash/receipt',
  logAuthEvent('transaction_receipt_viewed'),
  async (req, res) => {
    try {
      const { transactionHash } = req.params;
      
      if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction hash format'
        });
      }
      
      const receipt = await contractService.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      logger.error('Get transaction receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transaction receipt'
      });
    }
  }
);

// Wait for transaction confirmation
router.post(
  '/transaction/:transactionHash/wait',
  logAuthEvent('transaction_wait_requested'),
  async (req, res) => {
    try {
      const { transactionHash } = req.params;
      const { confirmations = 1 } = req.body;
      
      if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction hash format'
        });
      }
      
      if (confirmations < 1 || confirmations > 20) {
        return res.status(400).json({
          success: false,
          message: 'Confirmations must be between 1 and 20'
        });
      }
      
      // Set timeout for waiting (max 5 minutes)
      const timeout = 5 * 60 * 1000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction wait timeout')), timeout);
      });
      
      const waitPromise = contractService.waitForTransaction(transactionHash, confirmations);
      
      const receipt = await Promise.race([waitPromise, timeoutPromise]);
      
      res.json({
        success: true,
        data: {
          transactionHash,
          confirmations,
          receipt
        }
      });
    } catch (error) {
      if (error.message === 'Transaction wait timeout') {
        res.status(408).json({
          success: false,
          message: 'Transaction confirmation timeout'
        });
      } else {
        logger.error('Wait for transaction error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to wait for transaction confirmation'
        });
      }
    }
  }
);

// Admin routes (for contract management)
router.use(authorize('admin'));

// Get contract addresses and configuration
router.get('/config', logAuthEvent('contract_config_viewed'), (req, res) => {
  res.json({
    success: true,
    data: {
      tokenAddress: contractService.tokenAddress,
      paymentGatewayAddress: contractService.paymentGatewayAddress,
      networkUrl: process.env.BLOCKCHAIN_RPC_URL,
      networkId: process.env.NETWORK_ID
    }
  });
});

// Update contract addresses (admin only)
router.post('/config', logAuthEvent('contract_config_updated'), (req, res) => {
  try {
    const { tokenAddress, paymentGatewayAddress } = req.body;
    
    if (tokenAddress) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token contract address'
        });
      }
      contractService.tokenAddress = tokenAddress;
      process.env.TOKEN_CONTRACT_ADDRESS = tokenAddress;
    }
    
    if (paymentGatewayAddress) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(paymentGatewayAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment gateway contract address'
        });
      }
      contractService.paymentGatewayAddress = paymentGatewayAddress;
      process.env.PAYMENT_GATEWAY_CONTRACT_ADDRESS = paymentGatewayAddress;
    }
    
    // Reinitialize contracts with new addresses
    contractService.initializeContracts();
    
    logger.info('Contract configuration updated', {
      tokenAddress,
      paymentGatewayAddress,
      updatedBy: req.user.userId
    });
    
    res.json({
      success: true,
      message: 'Contract configuration updated successfully',
      data: {
        tokenAddress: contractService.tokenAddress,
        paymentGatewayAddress: contractService.paymentGatewayAddress
      }
    });
  } catch (error) {
    logger.error('Update contract config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contract configuration'
    });
  }
});

module.exports = router;