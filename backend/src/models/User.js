const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isMerchant: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    bio: String,
    avatar: String,
    dateOfBirth: Date
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    transactionAlerts: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    preferredCurrency: {
      type: String,
      enum: ['ETH', 'CPX', 'USD'],
      default: 'ETH'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  security: {
    lastPasswordChange: {
      type: Date,
      default: Date.now
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    twoFactorSecret: String,
    backupCodes: [String]
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  paymentRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentRequest'
  }],
  merchantProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant'
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'merchant', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.security.twoFactorSecret;
      delete ret.security.backupCodes;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isVerified: 1, isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Pre-save middleware to update profile
userSchema.pre('save', function(next) {
  if (this.isModified('firstName') || this.isModified('lastName') || this.isModified('email')) {
    this.profile.firstName = this.firstName;
    this.profile.lastName = this.lastName;
    this.profile.email = this.email;
  }
  next();
});

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { 'security.loginAttempts': 1 },
      $unset: { 'security.lockUntil': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      'security.loginAttempts': 1,
      'security.lockUntil': 1
    },
    $set: {
      'lastLogin': new Date()
    }
  });
};

// Static method to find by email or wallet address
userSchema.statics.findByEmailOrWallet = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { walletAddress: identifier.toLowerCase() }
    ]
  });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const totalUsers = await this.countDocuments();
  const verifiedUsers = await this.countDocuments({ isVerified: true });
  const merchants = await this.countDocuments({ isMerchant: true });
  const activeUsers = await this.countDocuments({ 
    lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  return {
    totalUsers,
    verifiedUsers,
    merchants,
    activeUsers,
    verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
  };
};

module.exports = mongoose.model('User', userSchema);