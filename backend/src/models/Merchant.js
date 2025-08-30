const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  businessType: {
    type: String,
    required: true,
    enum: [
      'retail',
      'ecommerce',
      'restaurant',
      'services',
      'technology',
      'healthcare',
      'education',
      'entertainment',
      'finance',
      'real_estate',
      'nonprofit',
      'other'
    ]
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  logo: String,
  contactEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPhone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspended'],
    default: 'pending'
  },
  verificationData: {
    documents: [{
      type: {
        type: String,
        enum: ['business_license', 'tax_id', 'identity', 'address_proof', 'bank_statement']
      },
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      verified: {
        type: Boolean,
        default: false
      }
    }],
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    rejectionReason: String,
    notes: String
  },
  businessDetails: {
    registrationNumber: String,
    taxId: String,
    vatNumber: String,
    foundedYear: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear()
    },
    employeeCount: {
      type: String,
      enum: ['1', '2-10', '11-50', '51-200', '201-1000', '1000+']
    },
    annualRevenue: {
      type: String,
      enum: ['<10k', '10k-100k', '100k-1M', '1M-10M', '10M+']
    },
    industry: String,
    businessModel: {
      type: String,
      enum: ['b2b', 'b2c', 'b2b2c', 'marketplace', 'saas', 'other']
    }
  },
  paymentSettings: {
    acceptedCurrencies: [{
      type: String,
      enum: ['ETH', 'CPX']
    }],
    autoAcceptPayments: {
      type: Boolean,
      default: true
    },
    paymentTerms: {
      type: String,
      maxlength: 500
    },
    refundPolicy: {
      type: String,
      maxlength: 1000
    },
    minimumAmount: {
      type: String,
      default: '0.001'
    },
    maximumAmount: {
      type: String,
      default: '1000'
    },
    processingFee: {
      type: Number,
      min: 0,
      max: 10,
      default: 1 // 1% default fee
    }
  },
  apiAccess: {
    apiKey: String,
    apiSecret: String,
    webhookUrl: String,
    allowedOrigins: [String],
    rateLimits: {
      requestsPerMinute: {
        type: Number,
        default: 60
      },
      requestsPerHour: {
        type: Number,
        default: 1000
      },
      requestsPerDay: {
        type: Number,
        default: 10000
      }
    }
  },
  statistics: {
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalVolume: {
      ETH: {
        type: String,
        default: '0'
      },
      CPX: {
        type: String,
        default: '0'
      }
    },
    successfulTransactions: {
      type: Number,
      default: 0
    },
    failedTransactions: {
      type: Number,
      default: 0
    },
    averageTransactionAmount: {
      type: String,
      default: '0'
    },
    lastTransactionAt: Date,
    monthlyVolume: [{
      month: String, // YYYY-MM format
      volume: {
        ETH: String,
        CPX: String
      },
      transactionCount: Number
    }]
  },
  compliance: {
    kycCompleted: {
      type: Boolean,
      default: false
    },
    amlChecked: {
      type: Boolean,
      default: false
    },
    sanctionsChecked: {
      type: Boolean,
      default: false
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    lastComplianceCheck: Date,
    complianceNotes: String
  },
  registrationTxHash: String,
  socialMedia: {
    twitter: String,
    facebook: String,
    linkedin: String,
    instagram: String
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
merchantSchema.index({ user: 1 });
merchantSchema.index({ walletAddress: 1 });
merchantSchema.index({ businessName: 'text', description: 'text' });
merchantSchema.index({ businessType: 1, isActive: 1 });
merchantSchema.index({ verificationStatus: 1 });
merchantSchema.index({ createdAt: -1 });
merchantSchema.index({ 'statistics.totalVolume.ETH': -1 });
merchantSchema.index({ 'statistics.totalTransactions': -1 });

// Virtual for full business address
merchantSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const addr = this.address;
  return [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
    .filter(Boolean)
    .join(', ');
});

// Virtual for verification status display
merchantSchema.virtual('verificationDisplay').get(function() {
  const statusMap = {
    pending: 'Pending Verification',
    verified: 'Verified',
    rejected: 'Verification Rejected',
    suspended: 'Account Suspended'
  };
  return statusMap[this.verificationStatus] || 'Unknown Status';
});

// Virtual for success rate
merchantSchema.virtual('successRate').get(function() {
  const total = this.statistics.totalTransactions;
  const successful = this.statistics.successfulTransactions;
  return total > 0 ? ((successful / total) * 100).toFixed(2) : 0;
});

// Instance method to check if merchant can accept payments
merchantSchema.methods.canAcceptPayments = function() {
  return this.isActive && 
         this.verificationStatus === 'verified' && 
         this.paymentSettings.acceptedCurrencies.length > 0;
};

// Instance method to generate API credentials
merchantSchema.methods.generateApiCredentials = function() {
  const crypto = require('crypto');
  
  this.apiAccess.apiKey = 'cpx_' + crypto.randomBytes(16).toString('hex');
  this.apiAccess.apiSecret = crypto.randomBytes(32).toString('hex');
  
  return {
    apiKey: this.apiAccess.apiKey,
    apiSecret: this.apiAccess.apiSecret
  };
};

// Instance method to update transaction statistics
merchantSchema.methods.updateTransactionStats = async function(transaction) {
  this.statistics.totalTransactions += 1;
  this.statistics.lastTransactionAt = new Date();
  
  const amount = parseFloat(transaction.amount) || 0;
  const currency = transaction.currency;
  
  if (transaction.status === 'confirmed') {
    this.statistics.successfulTransactions += 1;
    
    // Update volume
    const currentVolume = parseFloat(this.statistics.totalVolume[currency]) || 0;
    this.statistics.totalVolume[currency] = (currentVolume + amount).toString();
    
    // Update average
    const avgAmount = parseFloat(this.statistics.averageTransactionAmount) || 0;
    const totalSuccess = this.statistics.successfulTransactions;
    this.statistics.averageTransactionAmount = 
      ((avgAmount * (totalSuccess - 1)) + amount) / totalSuccess;
  } else if (transaction.status === 'failed') {
    this.statistics.failedTransactions += 1;
  }
  
  // Update monthly volume
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  let monthlyRecord = this.statistics.monthlyVolume.find(m => m.month === month);
  
  if (!monthlyRecord) {
    monthlyRecord = {
      month,
      volume: { ETH: '0', CPX: '0' },
      transactionCount: 0
    };
    this.statistics.monthlyVolume.push(monthlyRecord);
  }
  
  monthlyRecord.transactionCount += 1;
  if (transaction.status === 'confirmed') {
    const currentMonthlyVolume = parseFloat(monthlyRecord.volume[currency]) || 0;
    monthlyRecord.volume[currency] = (currentMonthlyVolume + amount).toString();
  }
  
  // Keep only last 12 months
  this.statistics.monthlyVolume = this.statistics.monthlyVolume
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
  
  await this.save();
};

// Instance method to get merchant rating/score
merchantSchema.methods.getMerchantScore = function() {
  let score = 0;
  
  // Base score for verification
  if (this.verificationStatus === 'verified') score += 30;
  
  // Score for transaction volume
  const totalVolume = parseFloat(this.statistics.totalVolume.ETH) + 
                     parseFloat(this.statistics.totalVolume.CPX);
  if (totalVolume > 1000) score += 25;
  else if (totalVolume > 100) score += 15;
  else if (totalVolume > 10) score += 10;
  else if (totalVolume > 1) score += 5;
  
  // Score for success rate
  const successRate = parseFloat(this.successRate);
  if (successRate >= 95) score += 25;
  else if (successRate >= 90) score += 20;
  else if (successRate >= 85) score += 15;
  else if (successRate >= 80) score += 10;
  
  // Score for transaction count
  const txCount = this.statistics.totalTransactions;
  if (txCount > 1000) score += 15;
  else if (txCount > 100) score += 10;
  else if (txCount > 10) score += 5;
  
  // Score for compliance
  if (this.compliance.kycCompleted) score += 5;
  if (this.compliance.amlChecked) score += 5;
  
  return Math.min(100, score);
};

// Static method to find top merchants
merchantSchema.statics.findTopMerchants = function(limit = 10, criteria = 'volume') {
  const sortBy = criteria === 'volume' 
    ? { 'statistics.totalVolume.ETH': -1 }
    : { 'statistics.totalTransactions': -1 };
    
  return this.find({
    isActive: true,
    verificationStatus: 'verified'
  })
  .sort(sortBy)
  .limit(limit)
  .populate('user', 'firstName lastName email');
};

// Static method to get merchant statistics
merchantSchema.statics.getMerchantStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalMerchants: { $sum: 1 },
        activeMerchants: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        verifiedMerchants: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] }
        },
        totalTransactions: { $sum: '$statistics.totalTransactions' },
        totalVolumeETH: { $sum: { $toDouble: '$statistics.totalVolume.ETH' } },
        totalVolumeCPX: { $sum: { $toDouble: '$statistics.totalVolume.CPX' } }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalMerchants: 0,
    activeMerchants: 0,
    verifiedMerchants: 0,
    totalTransactions: 0,
    totalVolumeETH: 0,
    totalVolumeCPX: 0
  };
};

// Pre-save middleware to set default values
merchantSchema.pre('save', function(next) {
  // Set default accepted currencies
  if (this.isNew && (!this.paymentSettings.acceptedCurrencies || this.paymentSettings.acceptedCurrencies.length === 0)) {
    this.paymentSettings.acceptedCurrencies = ['ETH', 'CPX'];
  }
  
  // Generate API credentials if not present
  if (this.isNew && !this.apiAccess.apiKey) {
    this.generateApiCredentials();
  }
  
  next();
});

// Post-save middleware for verification updates
merchantSchema.post('save', function(doc) {
  // Send notification when verification status changes
  if (doc.isModified('verificationStatus')) {
    // Here you would integrate with notification service
    logger.info(`Merchant ${doc.businessName} verification status changed to ${doc.verificationStatus}`);
  }
});

module.exports = mongoose.model('Merchant', merchantSchema);