const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GSTIN']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit pincode']
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  farmDetails: {
    farmSize: {
      type: Number,
      min: [0, 'Farm size cannot be negative']
    },
    farmSizeUnit: {
      type: String,
      enum: ['acres', 'hectares', 'sq.meter'],
      default: 'acres'
    },
    crops: [{
      type: String,
      trim: true
    }]
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    min: [0, 'Outstanding balance cannot be negative']
  },
  totalPurchases: {
    type: Number,
    default: 0,
    min: [0, 'Total purchases cannot be negative']
  },
  lastPurchaseDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
customerSchema.index({ name: 'text', email: 'text' });
customerSchema.index({ phone: 1 });
customerSchema.index({ gstin: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ outstandingBalance: -1 });
customerSchema.index({ totalPurchases: -1 });

// Virtual for customer status based on outstanding balance
customerSchema.virtual('status').get(function() {
  if (this.outstandingBalance <= 0) return 'Paid';
  if (this.outstandingBalance > this.creditLimit) return 'Overdue';
  return 'Pending';
});

// Instance method to update outstanding balance
customerSchema.methods.updateOutstandingBalance = function(amount) {
  this.outstandingBalance += amount;
  if (this.outstandingBalance < 0) this.outstandingBalance = 0;
  return this.save();
};

// Instance method to record purchase
customerSchema.methods.recordPurchase = function(amount, invoiceId) {
  this.totalPurchases += amount;
  this.lastPurchaseDate = new Date();
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
