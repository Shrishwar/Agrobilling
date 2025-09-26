const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, adminAuth: admin } = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Build query object
    const queryObj = { 
      ...req.query, 
      $or: [
        { recipient: req.user.userId },
        { recipientType: 'all' }
      ]
    };
    
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = Notification.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Count total documents
    const total = await Notification.countDocuments({
      $or: [
        { recipient: req.user.userId },
        { recipientType: 'all' }
      ]
    });
    
    query = query.skip(skip).limit(limit);

    // Populate related data
    query = query.populate('sender', 'name email');
    query = query.populate('recipient', 'name email');

    // Execute query
    const notifications = await query;

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: notifications.length,
      page,
      totalPages,
      total,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      $or: [
        { 
          recipient: req.user.userId,
          read: false 
        },
        { 
          recipientType: 'all',
          readBy: { $ne: req.user.userId }
        }
      ]
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/notifications/:id
// @desc    Get single notification
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [
        { recipient: req.user.userId },
        { recipientType: 'all' }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email');
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    // Mark as read if not already read
    if (!notification.read && notification.recipientType === 'user') {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    } else if (notification.recipientType === 'all' && 
              !notification.readBy.includes(req.user.userId)) {
      notification.readBy.push(req.user.userId);
      await notification.save();
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Get notification error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification
// @access  Private
router.post('/', [
  auth,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('message', 'Message is required').not().isEmpty(),
    check('type', 'Type is required').isIn(['info', 'success', 'warning', 'error', 'system']),
    check('recipientType', 'Recipient type is required').isIn(['user', 'role', 'all']),
    check('recipient', 'Recipient is required for user or role type').if(
      (value, { req }) => ['user', 'role'].includes(req.body.recipientType)
    ).notEmpty(),
    check('actionUrl', 'Action URL must be a valid URL').optional().isURL(),
    check('priority', 'Priority must be a number between 1 and 5').optional().isInt({ min: 1, max: 5 })
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { 
      title, 
      message, 
      type, 
      recipientType, 
      recipient, 
      actionUrl, 
      priority, 
      expiresAt 
    } = req.body;

    // Create notification
    const notification = new Notification({
      title,
      message,
      type,
      recipientType,
      sender: req.user.userId,
      actionUrl,
      priority: priority || 3,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
    });

    // Set recipient based on recipientType
    if (recipientType === 'user') {
      notification.recipient = recipient;
    } else if (recipientType === 'role') {
      notification.role = recipient;
    }

    await notification.save();

    // In a real app, you would emit a socket event here to notify the recipient in real-time
    // io.to(recipient).emit('new-notification', notification);

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [
        { recipient: req.user.userId },
        { recipientType: 'all' }
      ]
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    // Update read status based on recipient type
    if (notification.recipientType === 'user') {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        await notification.save();
      }
    } else if (notification.recipientType === 'all') {
      if (!notification.readBy.includes(req.user.userId)) {
        notification.readBy.push(req.user.userId);
        await notification.save();
      }
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, async (req, res) => {
  const session = await Notification.startSession();
  session.startTransaction();

  try {
    // Mark user-specific notifications as read
    await Notification.updateMany(
      { 
        recipient: req.user.userId,
        read: false 
      },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        } 
      },
      { session }
    );

    // Add user to readBy for all general notifications they haven't read
    const unreadGeneralNotifications = await Notification.find({
      recipientType: 'all',
      readBy: { $ne: req.user.userId }
    }).session(session);

    for (const notification of unreadGeneralNotifications) {
      notification.readBy.push(req.user.userId);
      await notification.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only allow users to delete their own notifications
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { recipient: req.user.userId },
        { sender: req.user.userId } // Allow senders to delete their own notifications
      ]
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found or not authorized' 
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/notifications
// @desc    Delete all read notifications for the authenticated user
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    // Delete user's read notifications
    await Notification.deleteMany({
      $or: [
        { 
          recipient: req.user.userId,
          read: true 
        },
        { 
          recipientType: 'all',
          readBy: { $in: [req.user.userId] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'All read notifications deleted successfully'
    });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/notifications/stats/overview
// @desc    Get notification statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Get total notifications count
    const totalCount = await Notification.countDocuments({
      $or: [
        { recipient: req.user.userId },
        { recipientType: 'all' }
      ]
    });

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      $or: [
        { 
          recipient: req.user.userId,
          read: false 
        },
        { 
          recipientType: 'all',
          readBy: { $ne: req.user.userId }
        }
      ]
    });

    // Get notifications by type
    const byType = await Notification.aggregate([
      {
        $match: {
          $or: [
            { recipient: req.user.userId },
            { recipientType: 'all' }
          ]
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          count: 1
        }
      }
    ]);

    // Get recent notifications
    const recent = await Notification.find({
      $or: [
        { recipient: req.user.userId },
        { recipientType: 'all' }
      ]
    })
    .sort('-createdAt')
    .limit(5)
    .select('title type read readAt createdAt')
    .lean();

    // Mark read status for each notification
    for (const notif of recent) {
      if (notif.recipientType === 'all') {
        notif.read = notif.readBy && notif.readBy.includes(req.user.userId);
      }
    }

    res.json({
      success: true,
      data: {
        total: totalCount,
        unread: unreadCount,
        byType,
        recent
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
