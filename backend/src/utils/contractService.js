const Web3 = require('web3');
const logger = require('./logger');

// Import contract ABIs (would be generated after compilation)
const TokenABI = require('../../build/contracts/CryptoPayXToken.json');
const PaymentGatewayABI = require('../../build/contracts/PaymentGateway.json');

class ContractService {
  constructor() {
    // Initialize Web3
    this.web3 = new Web3(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:7545');
    
    // Contract addresses (would be set after deployment)
    this.tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    this.paymentGatewayAddress = process.env.PAYMENT_GATEWAY_CONTRACT_ADDRESS;
    
    // Initialize contracts
    this.tokenContract = null;
    this.paymentGatewayContract = null;
    
    this.initializeContracts();
  }

  async initializeContracts() {
    try {
      if (this.tokenAddress) {
        this.tokenContract = new this.web3.eth.Contract(
          TokenABI.abi,
          this.tokenAddress
        );
        logger.info(`Token contract initialized at ${this.tokenAddress}`);
      }

      if (this.paymentGatewayAddress) {
        this.paymentGatewayContract = new this.web3.eth.Contract(
          PaymentGatewayABI.abi,
          this.paymentGatewayAddress
        );
        logger.info(`Payment Gateway contract initialized at ${this.paymentGatewayAddress}`);
      }
    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
    }
  }

  // Token Contract Methods
  async getTokenBalance(walletAddress) {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      const balanceWei = await this.tokenContract.methods.balanceOf(walletAddress).call();
      const balanceEther = this.web3.utils.fromWei(balanceWei, 'ether');

      return {
        wei: balanceWei,
        ether: balanceEther
      };
    } catch (error) {
      logger.error('Error getting token balance:', error);
      throw error;
    }
  }

  async getTokenInfo() {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.tokenContract.methods.name().call(),
        this.tokenContract.methods.symbol().call(),
        this.tokenContract.methods.decimals().call(),
        this.tokenContract.methods.totalSupply().call()
      ]);

      return {
        name,
        symbol,
        decimals: parseInt(decimals),
        totalSupply: {
          wei: totalSupply,
          ether: this.web3.utils.fromWei(totalSupply, 'ether')
        }
      };
    } catch (error) {
      logger.error('Error getting token info:', error);
      throw error;
    }
  }

  async executeTokenTransfer(fromAddress, toAddress, amount, privateKey, gasPrice = '20') {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      // Create account from private key
      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      // Prepare transaction
      const transferMethod = this.tokenContract.methods.transfer(toAddress, amount);
      
      const gasEstimate = await transferMethod.estimateGas({ from: fromAddress });
      const gasPriceWei = this.web3.utils.toWei(gasPrice, 'gwei');

      const txObject = {
        from: fromAddress,
        to: this.tokenAddress,
        data: transferMethod.encodeABI(),
        gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
        gasPrice: gasPriceWei
      };

      // Sign and send transaction
      const signedTx = await account.signTransaction(txObject);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      logger.logBlockchainEvent('token_transfer', {
        transactionHash: receipt.transactionHash,
        from: fromAddress,
        to: toAddress,
        amount: this.web3.utils.fromWei(amount, 'ether'),
        gasUsed: receipt.gasUsed
      });

      return receipt.transactionHash;
    } catch (error) {
      logger.error('Error executing token transfer:', error);
      throw error;
    } finally {
      // Clean up wallet
      this.web3.eth.accounts.wallet.clear();
    }
  }

  async estimateTokenTransferGas(fromAddress, toAddress, amount) {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      const gasEstimate = await this.tokenContract.methods
        .transfer(toAddress, amount)
        .estimateGas({ from: fromAddress });

      return gasEstimate;
    } catch (error) {
      logger.error('Error estimating token transfer gas:', error);
      throw error;
    }
  }

  async approveTokenSpending(ownerAddress, spenderAddress, amount, privateKey, gasPrice = '20') {
    try {
      if (!this.tokenContract) {
        throw new Error('Token contract not initialized');
      }

      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const approveMethod = this.tokenContract.methods.approve(spenderAddress, amount);
      
      const gasEstimate = await approveMethod.estimateGas({ from: ownerAddress });
      const gasPriceWei = this.web3.utils.toWei(gasPrice, 'gwei');

      const txObject = {
        from: ownerAddress,
        to: this.tokenAddress,
        data: approveMethod.encodeABI(),
        gas: Math.floor(gasEstimate * 1.2),
        gasPrice: gasPriceWei
      };

      const signedTx = await account.signTransaction(txObject);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      return receipt.transactionHash;
    } catch (error) {
      logger.error('Error approving token spending:', error);
      throw error;
    } finally {
      this.web3.eth.accounts.wallet.clear();
    }
  }

  // Payment Gateway Contract Methods
  async registerMerchant(walletAddress, businessName, email) {
    try {
      if (!this.paymentGatewayContract) {
        throw new Error('Payment Gateway contract not initialized');
      }

      // This would typically be called by the contract owner or through a different mechanism
      const registerMethod = this.paymentGatewayContract.methods
        .registerMerchant(businessName, email);

      // Gas estimation for development environment
      const gasEstimate = await registerMethod.estimateGas({ from: walletAddress });
      
      logger.logBlockchainEvent('merchant_registration', {
        walletAddress,
        businessName,
        email,
        estimatedGas: gasEstimate
      });

      // In a real implementation, this would execute the transaction
      return '0x' + Math.random().toString(16).substr(2, 64); // Development transaction hash
    } catch (error) {
      logger.error('Error registering merchant:', error);
      throw error;
    }
  }

  async createPayment(fromAddress, toAddress, amount, description, privateKey, gasPrice = '20') {
    try {
      if (!this.paymentGatewayContract) {
        throw new Error('Payment Gateway contract not initialized');
      }

      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const createPaymentMethod = this.paymentGatewayContract.methods
        .createPayment(toAddress, amount, description);

      const gasEstimate = await createPaymentMethod.estimateGas({ from: fromAddress });
      const gasPriceWei = this.web3.utils.toWei(gasPrice, 'gwei');

      const txObject = {
        from: fromAddress,
        to: this.paymentGatewayAddress,
        data: createPaymentMethod.encodeABI(),
        gas: Math.floor(gasEstimate * 1.2),
        gasPrice: gasPriceWei
      };

      const signedTx = await account.signTransaction(txObject);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      // Parse payment ID from transaction logs
      const paymentCreatedEvent = receipt.logs.find(log => 
        log.topics[0] === this.web3.utils.keccak256('PaymentCreated(bytes32,address,address,uint256,string)')
      );

      let paymentId = null;
      if (paymentCreatedEvent) {
        paymentId = paymentCreatedEvent.topics[1];
      }

      logger.logBlockchainEvent('payment_created', {
        transactionHash: receipt.transactionHash,
        paymentId,
        from: fromAddress,
        to: toAddress,
        amount: this.web3.utils.fromWei(amount, 'ether')
      });

      return {
        transactionHash: receipt.transactionHash,
        paymentId
      };
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    } finally {
      this.web3.eth.accounts.wallet.clear();
    }
  }

  async executePayment(paymentId, fromAddress, privateKey, gasPrice = '20') {
    try {
      if (!this.paymentGatewayContract) {
        throw new Error('Payment Gateway contract not initialized');
      }

      const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(account);

      const executePaymentMethod = this.paymentGatewayContract.methods
        .executePayment(paymentId);

      const gasEstimate = await executePaymentMethod.estimateGas({ from: fromAddress });
      const gasPriceWei = this.web3.utils.toWei(gasPrice, 'gwei');

      const txObject = {
        from: fromAddress,
        to: this.paymentGatewayAddress,
        data: executePaymentMethod.encodeABI(),
        gas: Math.floor(gasEstimate * 1.2),
        gasPrice: gasPriceWei
      };

      const signedTx = await account.signTransaction(txObject);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      logger.logBlockchainEvent('payment_executed', {
        transactionHash: receipt.transactionHash,
        paymentId,
        from: fromAddress
      });

      return receipt.transactionHash;
    } catch (error) {
      logger.error('Error executing payment:', error);
      throw error;
    } finally {
      this.web3.eth.accounts.wallet.clear();
    }
  }

  async getPaymentDetails(paymentId) {
    try {
      if (!this.paymentGatewayContract) {
        throw new Error('Payment Gateway contract not initialized');
      }

      const paymentDetails = await this.paymentGatewayContract.methods
        .getPaymentDetails(paymentId)
        .call();

      return {
        from: paymentDetails.from,
        to: paymentDetails.to,
        amount: {
          wei: paymentDetails.amount,
          ether: this.web3.utils.fromWei(paymentDetails.amount, 'ether')
        },
        fee: {
          wei: paymentDetails.fee,
          ether: this.web3.utils.fromWei(paymentDetails.fee, 'ether')
        },
        timestamp: new Date(parseInt(paymentDetails.timestamp) * 1000),
        description: paymentDetails.description,
        completed: paymentDetails.completed
      };
    } catch (error) {
      logger.error('Error getting payment details:', error);
      throw error;
    }
  }

  // Utility Methods
  async getCurrentGasPrice() {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      return {
        wei: gasPrice,
        gwei: this.web3.utils.fromWei(gasPrice, 'gwei'),
        ether: this.web3.utils.fromWei(gasPrice, 'ether')
      };
    } catch (error) {
      logger.error('Error getting gas price:', error);
      throw error;
    }
  }

  async getBlockNumber() {
    try {
      return await this.web3.eth.getBlockNumber();
    } catch (error) {
      logger.error('Error getting block number:', error);
      throw error;
    }
  }

  async getTransactionReceipt(transactionHash) {
    try {
      return await this.web3.eth.getTransactionReceipt(transactionHash);
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  async waitForTransaction(transactionHash, confirmations = 1) {
    try {
      let receipt = null;
      let currentBlock = await this.getBlockNumber();

      // Wait for transaction to be mined
      while (!receipt) {
        receipt = await this.getTransactionReceipt(transactionHash);
        if (!receipt) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Wait for required confirmations
      while (currentBlock - receipt.blockNumber < confirmations) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentBlock = await this.getBlockNumber();
      }

      return receipt;
    } catch (error) {
      logger.error('Error waiting for transaction:', error);
      throw error;
    }
  }

  // Event listening methods
  setupEventListeners() {
    try {
      if (this.tokenContract) {
        // Listen to Transfer events
        this.tokenContract.events.Transfer({
          fromBlock: 'latest'
        })
        .on('data', (event) => {
          logger.logBlockchainEvent('token_transfer_event', {
            from: event.returnValues.from,
            to: event.returnValues.to,
            value: this.web3.utils.fromWei(event.returnValues.value, 'ether'),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        })
        .on('error', (error) => {
          logger.error('Token Transfer event error:', error);
        });
      }

      if (this.paymentGatewayContract) {
        // Listen to PaymentCreated events
        this.paymentGatewayContract.events.PaymentCreated({
          fromBlock: 'latest'
        })
        .on('data', (event) => {
          logger.logBlockchainEvent('payment_created_event', {
            paymentId: event.returnValues.paymentId,
            from: event.returnValues.from,
            to: event.returnValues.to,
            amount: this.web3.utils.fromWei(event.returnValues.amount, 'ether'),
            description: event.returnValues.description,
            transactionHash: event.transactionHash
          });
        })
        .on('error', (error) => {
          logger.error('PaymentCreated event error:', error);
        });

        // Listen to PaymentCompleted events
        this.paymentGatewayContract.events.PaymentCompleted({
          fromBlock: 'latest'
        })
        .on('data', (event) => {
          logger.logBlockchainEvent('payment_completed_event', {
            paymentId: event.returnValues.paymentId,
            from: event.returnValues.from,
            to: event.returnValues.to,
            amount: this.web3.utils.fromWei(event.returnValues.amount, 'ether'),
            fee: this.web3.utils.fromWei(event.returnValues.fee, 'ether'),
            transactionHash: event.transactionHash
          });
        })
        .on('error', (error) => {
          logger.error('PaymentCompleted event error:', error);
        });
      }

      logger.info('Blockchain event listeners set up successfully');
    } catch (error) {
      logger.error('Error setting up event listeners:', error);
    }
  }
}

// Create singleton instance
const contractService = new ContractService();

module.exports = contractService;