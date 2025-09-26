const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  hsnCode: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.001, 'Quantity must be greater than 0']
  },
  unit: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerDetails: {
    name: String,
    phone: String,
    email: String,
    address: String,
    gstin: String
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  roundOff: {
    type: Number,
    default: 0
  },
  finalTotal: {
    type: Number,
    required: true,
    min: [0, 'Final total cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'partial'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'credit'],
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  dueDate: {
    type: Date,
    default: function() {
      // Default due date is 30 days from invoice date
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'returned'],
    default: 'active'
  },
  pdfUrl: {
    type: String
  },
  sharedVia: [{
    method: {
      type: String,
      enum: ['whatsapp', 'email', 'sms']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    recipient: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ createdBy: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Virtual for amount in words
invoiceSchema.virtual('amountInWords').get(function() {
  return numberToWords(this.finalTotal);
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (this.paymentStatus === 'paid' || !this.dueDate) return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  if (today <= dueDate) return 0;
  return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    const itemTotal = (item.price * item.quantity) - item.discount;
    const taxAmount = (itemTotal * item.taxRate) / 100;
    item.total = itemTotal + taxAmount;
  });

  // Calculate invoice totals
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.taxAmount = this.items.reduce((sum, item) => {
    const itemTotal = (item.price * item.quantity) - item.discount;
    return sum + ((itemTotal * item.taxRate) / 100);
  }, 0);

  const totalBeforeRoundOff = this.subtotal - this.discount + this.taxAmount;
  this.roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
  this.finalTotal = Math.round(totalBeforeRoundOff);

  next();
});

// Helper function to convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  let words = '';

  // Handle crores
  if (num >= 10000000) {
    words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  // Handle lakhs
  if (num >= 100000) {
    words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }

  // Handle thousands
  if (num >= 1000) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  // Handle hundreds
  if (num >= 100) {
    words += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }

  // Handle tens and ones
  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    if (num % 10 > 0) {
      words += ' ' + ones[num % 10];
    }
  } else if (num >= 10) {
    words += teens[num - 10];
  } else if (num > 0) {
    words += ones[num];
  }

  return words.trim();
}

module.exports = mongoose.model('Invoice', invoiceSchema);
