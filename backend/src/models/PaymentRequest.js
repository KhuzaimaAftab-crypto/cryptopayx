const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  description: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  recipientAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum address']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Expiration date must be in the future'
    }
  },
  paidAt: Date,
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  metadata: {
    invoice: {
      invoiceNumber: String,
      items: [{
        name: String,
        description: String,
        quantity: {
          type: Number,
          min: 1
        },
        unitPrice: String,
        totalPrice: String
      }],
      subtotal: String,
      tax: String,
      discount: String,
      total: String
    },
    merchant: {
      businessName: String,
      contactEmail: String,
      website: String
    },
    customer: {
      name: String,
      email: String,
      address: String
    },
    orderDetails: {
      orderId: String,
      productId: String,
      serviceType: String,
      deliveryMethod: String,
      notes: String
    }
  },
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    remindersSent: {
      type: Number,
      default: 0,
      max: 3
    },
    lastReminderAt: Date
  },
  security: {
    accessCode: String,
    requiresVerification: {
      type: Boolean,
      default: false
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    lockedUntil: Date
  },
  tags: [String],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1,
      max: 12
    },
    endDate: Date,
    nextPaymentDate: Date,
    totalPayments: Number,
    completedPayments: {
      type: Number,
      default: 0
    }
  },
  qrCode: String,
  paymentUrl: String,
  customFields: [{
    name: String,
    value: String,
    type: {
      type: String,
      enum: ['text', 'number', 'email', 'url', 'date'],
      default: 'text'
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
paymentRequestSchema.index({ requester: 1, createdAt: -1 });
paymentRequestSchema.index({ recipientAddress: 1, status: 1 });
paymentRequestSchema.index({ status: 1, expiresAt: 1 });
paymentRequestSchema.index({ payer: 1, createdAt: -1 });
paymentRequestSchema.index({ 'metadata.invoice.invoiceNumber': 1 });
paymentRequestSchema.index({ tags: 1 });

// Virtual for formatted amount
paymentRequestSchema.virtual('amountFormatted').get(function() {
  if (!this.amount) return '0';
  const num = parseFloat(this.amount);
  return num.toFixed(6).replace(/\.?0+$/, '');
});

// Virtual to check if payment request is active
paymentRequestSchema.virtual('isActive').get(function() {
  return this.status === 'pending' && this.expiresAt > new Date();
});

// Virtual to check if payment request is expired
paymentRequestSchema.virtual('isExpired').get(function() {
  return this.expiresAt <= new Date() && this.status === 'pending';
});

// Virtual for time remaining
paymentRequestSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending') return 0;
  const now = new Date();
  if (this.expiresAt <= now) return 0;
  return Math.max(0, this.expiresAt.getTime() - now.getTime());
});

// Virtual for days remaining
paymentRequestSchema.virtual('daysRemaining').get(function() {
  const timeRemaining = this.timeRemaining;
  return Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
});

// Instance method to check if payment request can be paid
paymentRequestSchema.methods.canBePaid = function() {
  return this.status === 'pending' && 
         this.expiresAt > new Date() && 
         (!this.security.lockedUntil || this.security.lockedUntil <= new Date());
};

// Instance method to generate payment URL
paymentRequestSchema.methods.generatePaymentUrl = function(baseUrl) {
  if (!baseUrl) baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/pay/${this._id}`;
};

// Instance method to generate QR code data
paymentRequestSchema.methods.generateQRData = function() {
  return {
    type: 'payment_request',
    id: this._id.toString(),
    amount: this.amount,
    currency: this.currency,
    description: this.description,
    recipient: this.recipientAddress,
    expires: this.expiresAt.toISOString()
  };
};

// Instance method to increment attempt count
paymentRequestSchema.methods.incrementAttempts = function() {
  this.security.attemptCount += 1;
  
  // Lock if max attempts reached
  if (this.security.attemptCount >= this.security.maxAttempts) {
    this.security.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // Lock for 1 hour
  }
  
  return this.save();
};

// Instance method to check if payment request is locked
paymentRequestSchema.methods.isLocked = function() {
  return this.security.lockedUntil && this.security.lockedUntil > new Date();
};

// Instance method to send reminder
paymentRequestSchema.methods.sendReminder = async function() {
  if (this.notifications.remindersSent >= 3) {
    return false; // Max reminders reached
  }
  
  this.notifications.remindersSent += 1;
  this.notifications.lastReminderAt = new Date();
  
  await this.save();
  
  // Here you would integrate with email service
  // await emailService.sendPaymentReminder(this);
  
  return true;
};

// Static method to find expired payment requests
paymentRequestSchema.statics.findExpired = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lte: new Date() }
  });
};

// Static method to get payment request statistics
paymentRequestSchema.statics.getPaymentRequestStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } },
        completedRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        expiredRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
        },
        cancelledRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        averageAmount: { $avg: { $toDouble: '$amount' } }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalRequests: 0,
    totalAmount: 0,
    completedRequests: 0,
    pendingRequests: 0,
    expiredRequests: 0,
    cancelledRequests: 0,
    averageAmount: 0
  };
};

// Static method to get payment success rate
paymentRequestSchema.statics.getSuccessRate = async function(filters = {}) {
  const stats = await this.getPaymentRequestStats(filters);
  const total = stats.totalRequests;
  const completed = stats.completedRequests;
  
  return total > 0 ? (completed / total * 100).toFixed(2) : 0;
};

// Pre-save middleware to set payment URL
paymentRequestSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('_id')) {
    this.paymentUrl = this.generatePaymentUrl();
  }
  next();
});

// Pre-save middleware to handle status changes
paymentRequestSchema.pre('save', function(next) {
  // Set paidAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  // Handle recurring payments
  if (this.isModified('status') && this.status === 'completed' && this.isRecurring) {
    this.recurringDetails.completedPayments += 1;
    
    // Calculate next payment date
    if (this.recurringDetails.completedPayments < this.recurringDetails.totalPayments) {
      const nextDate = new Date(this.recurringDetails.nextPaymentDate);
      
      switch (this.recurringDetails.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + this.recurringDetails.interval);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + (this.recurringDetails.interval * 7));
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + this.recurringDetails.interval);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + this.recurringDetails.interval);
          break;
      }
      
      this.recurringDetails.nextPaymentDate = nextDate;
    }
  }
  
  next();
});

// Post-save middleware to handle expired requests
paymentRequestSchema.post('save', async function(doc) {
  // Auto-expire if past expiration date
  if (doc.status === 'pending' && doc.expiresAt <= new Date()) {
    doc.status = 'expired';
    await doc.save();
  }
});

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);