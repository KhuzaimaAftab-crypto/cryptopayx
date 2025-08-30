const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address']
  },
  toAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address']
  },
  amount: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d+(\.\d+)?$/.test(v) && parseFloat(v) > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  currency: {
    type: String,
    required: true,
    enum: ['ETH', 'CPX'],
    default: 'ETH'
  },
  type: {
    type: String,
    required: true,
    enum: ['send', 'receive', 'payment', 'transfer'],
    default: 'send'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'confirmed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  transactionHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Please enter a valid transaction hash']
  },
  blockNumber: {
    type: Number,
    min: 0
  },
  blockHash: {
    type: String,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Please enter a valid block hash']
  },
  gasPrice: {
    type: String,
    default: '20', // in gwei
    validate: {
      validator: function(v) {
        return /^\d+(\.\d+)?$/.test(v) && parseFloat(v) > 0;
      },
      message: 'Gas price must be a positive number'
    }
  },
  gasUsed: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || (/^\d+$/.test(v) && parseInt(v) > 0);
      },
      message: 'Gas used must be a positive integer'
    }
  },
  gasFee: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || (/^\d+(\.\d+)?$/.test(v) && parseFloat(v) >= 0);
      },
      message: 'Gas fee must be a non-negative number'
    }
  },
  nonce: {
    type: Number,
    min: 0
  },
  confirmations: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentRequest'
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    geolocation: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    deviceInfo: {
      type: String,
      browser: String,
      os: String
    }
  },
  fees: {
    networkFee: {
      type: String,
      default: '0'
    },
    platformFee: {
      type: String,
      default: '0'
    },
    totalFee: {
      type: String,
      default: '0'
    }
  },
  executedAt: Date,
  confirmedAt: Date,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  tags: [String],
  isInternal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ fromAddress: 1, createdAt: -1 });
transactionSchema.index({ toAddress: 1, createdAt: -1 });
transactionSchema.index({ transactionHash: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ currency: 1, status: 1 });
transactionSchema.index({ type: 1, createdAt: -1 });

// Compound indexes
transactionSchema.index({ fromAddress: 1, toAddress: 1, createdAt: -1 });
transactionSchema.index({ user: 1, status: 1, type: 1 });

// Virtual for amount in wei (for ETH calculations)
transactionSchema.virtual('amountWei').get(function() {
  return this.amount ? (parseFloat(this.amount) * Math.pow(10, 18)).toString() : '0';
});

// Virtual for formatted amount
transactionSchema.virtual('amountFormatted').get(function() {
  if (!this.amount) return '0';
  const num = parseFloat(this.amount);
  return num.toFixed(6).replace(/\.?0+$/, '');
});

// Virtual to check if transaction is completed
transactionSchema.virtual('isCompleted').get(function() {
  return ['confirmed', 'failed', 'cancelled'].includes(this.status);
});

// Virtual to check if transaction is successful
transactionSchema.virtual('isSuccessful').get(function() {
  return this.status === 'confirmed';
});

// Virtual for transaction direction (for a specific user)
transactionSchema.methods.getDirection = function(userWalletAddress) {
  if (!userWalletAddress) return 'unknown';
  
  const userAddress = userWalletAddress.toLowerCase();
  const fromAddress = this.fromAddress.toLowerCase();
  const toAddress = this.toAddress.toLowerCase();
  
  if (fromAddress === userAddress && toAddress === userAddress) {
    return 'self';
  } else if (fromAddress === userAddress) {
    return 'outgoing';
  } else if (toAddress === userAddress) {
    return 'incoming';
  }
  
  return 'unknown';
};

// Instance method to calculate total cost (amount + fees)
transactionSchema.methods.getTotalCost = function() {
  const amount = parseFloat(this.amount) || 0;
  const totalFee = parseFloat(this.fees.totalFee) || 0;
  return (amount + totalFee).toString();
};

// Instance method to update confirmation count
transactionSchema.methods.updateConfirmations = function(blockNumber) {
  if (this.blockNumber && blockNumber) {
    this.confirmations = Math.max(0, blockNumber - this.blockNumber + 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get transaction statistics
transactionSchema.statics.getTransactionStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalVolume: { $sum: { $toDouble: '$amount' } },
        averageAmount: { $avg: { $toDouble: '$amount' } },
        successfulTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        pendingTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalTransactions: 0,
    totalVolume: 0,
    averageAmount: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    pendingTransactions: 0
  };
};

// Static method to get transaction volume by currency
transactionSchema.statics.getVolumeByCurrency = async function(filters = {}) {
  const pipeline = [
    { $match: { ...filters, status: 'confirmed' } },
    {
      $group: {
        _id: '$currency',
        totalVolume: { $sum: { $toDouble: '$amount' } },
        transactionCount: { $sum: 1 },
        averageAmount: { $avg: { $toDouble: '$amount' } }
      }
    },
    { $sort: { totalVolume: -1 } }
  ];

  return await this.aggregate(pipeline);
};

// Static method to get daily transaction volume
transactionSchema.statics.getDailyVolume = async function(days = 30, filters = {}) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        ...filters,
        status: 'confirmed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          currency: '$currency'
        },
        volume: { $sum: { $toDouble: '$amount' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ];

  return await this.aggregate(pipeline);
};

// Pre-save middleware to set default values
transactionSchema.pre('save', function(next) {
  // Set executed timestamp when status changes to processing
  if (this.isModified('status') && this.status === 'processing' && !this.executedAt) {
    this.executedAt = new Date();
  }
  
  // Set confirmed timestamp when status changes to confirmed
  if (this.isModified('status') && this.status === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  
  next();
});

// Post-save middleware for notifications
transactionSchema.post('save', function(doc) {
  // Emit events for real-time updates
  // This would typically integrate with socket.io or other real-time systems
  if (doc.isModified('status')) {
    // Emit status change event
    logger.info(`Transaction ${doc._id} status changed to ${doc.status}`);
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);