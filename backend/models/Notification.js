const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'promotion', 'reminder'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'admin', 'staff', 'customer', 'specific'],
    default: 'all'
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    invoiceId: mongoose.Schema.Types.ObjectId,
    productId: mongoose.Schema.Types.ObjectId,
    customerId: mongoose.Schema.Types.ObjectId,
    actionUrl: String,
    imageUrl: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ targetAudience: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ isActive: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for read status
notificationSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.some(read => read.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId });
  }
  return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function(userId) {
  this.readBy = this.readBy.filter(read => read.user.toString() !== userId.toString());
  return this.save();
};

// Static method to get unread notifications for a user
notificationSchema.statics.getUnreadForUser = function(userId) {
  return this.find({
    $or: [
      { targetAudience: 'all' },
      { targetUsers: userId }
    ],
    isActive: true,
    'readBy.user': { $ne: userId }
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get notifications for admin dashboard
notificationSchema.statics.getForAdmin = function() {
  return this.find({
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'admin' }
    ],
    isActive: true
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Notification', notificationSchema);
