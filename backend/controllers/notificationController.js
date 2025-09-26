const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errorResponse');
const { validate } = require('../utils/validation');
const { body } = require('express-validator');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Get all notifications
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  // Build query
  const features = new APIFeatures(
    Notification.find({
      $or: [
        { targetUser: req.user.id },
        { targetRole: req.user.role },
        { targetUser: { $exists: false }, targetRole: { $exists: false } },
      ],
    }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const notifications = await features.query;
  const total = await Notification.countDocuments(features.query._conditions);
  const unreadCount = await Notification.countDocuments({
    ...features.query._conditions,
    read: false,
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    data: notifications,
  });
});

// @desc    Get single notification
// @route   GET /api/v1/notifications/:id
// @access  Private
exports.getNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    $or: [
      { targetUser: req.user.id },
      { targetRole: req.user.role },
      { targetUser: { $exists: false }, targetRole: { $exists: false } },
    ],
  });

  if (!notification) {
    return next(
      new NotFoundError(`Notification not found with id of ${req.params.id}`)
    );
  }

  // Mark as read if it's not already read
  if (!notification.read) {
    notification.read = true;
    notification.readAt = Date.now();
    await notification.save();
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Create new notification
// @route   POST /api/v1/notifications
// @access  Private/Admin
exports.createNotification = [
  // Validation
  validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('type')
      .optional()
      .isIn(['info', 'success', 'warning', 'error', 'system'])
      .withMessage('Invalid notification type'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    body('targetUser').optional().isMongoId(),
    body('targetRole')
      .optional()
      .isIn(['admin', 'staff', 'customer'])
      .withMessage('Invalid target role'),
    body('expiresAt').optional().isISO8601().toDate(),
    body('actionUrl').optional().isURL().withMessage('Invalid action URL'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    // Add createdBy field
    req.body.createdBy = req.user.id;

    // Set default type and priority if not provided
    if (!req.body.type) req.body.type = 'info';
    if (!req.body.priority) req.body.priority = 'medium';

    const notification = await Notification.create(req.body);

    // Emit real-time notification (implement with your WebSocket/Socket.io setup)
    // io.to(notification.targetUser || notification.targetRole || 'all').emit('new-notification', notification);

    res.status(201).json({
      success: true,
      data: notification,
    });
  }),
];

// @desc    Update notification
// @route   PUT /api/v1/notifications/:id
// @access  Private/Admin
exports.updateNotification = [
  // Validation
  validate([
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('message').optional().trim().notEmpty().withMessage('Message cannot be empty'),
    body('type')
      .optional()
      .isIn(['info', 'success', 'warning', 'error', 'system'])
      .withMessage('Invalid notification type'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    body('targetUser').optional().isMongoId(),
    body('targetRole')
      .optional()
      .isIn(['admin', 'staff', 'customer'])
      .withMessage('Invalid target role'),
    body('expiresAt').optional().isISO8601().toDate(),
    body('actionUrl').optional().isURL().withMessage('Invalid action URL'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    let notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(
        new NotFoundError(`Notification not found with id of ${req.params.id}`)
      );
    }

    // Prevent certain fields from being updated
    const { read, readAt, createdBy, createdAt, ...updateData } = req.body;

    notification = await Notification.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: notification,
    });
  }),
];

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private/Admin
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new NotFoundError(`Notification not found with id of ${req.params.id}`)
    );
  }

  await notification.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    $or: [
      { targetUser: req.user.id },
      { targetRole: req.user.role },
      { targetUser: { $exists: false }, targetRole: { $exists: false } },
    ],
  });

  if (!notification) {
    return next(
      new NotFoundError(`Notification not found with id of ${req.params.id}`)
    );
  }

  if (!notification.read) {
    notification.read = true;
    notification.readAt = Date.now();
    await notification.save();
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    {
      $or: [
        { targetUser: req.user.id, read: false },
        { targetRole: req.user.role, read: false },
      ],
    },
    {
      $set: {
        read: true,
        readAt: Date.now(),
      },
    }
  );

  // Get updated counts
  const total = await Notification.countDocuments({
    $or: [
      { targetUser: req.user.id },
      { targetRole: req.user.role },
      { targetUser: { $exists: false }, targetRole: { $exists: false } },
    ],
  });

  const unreadCount = await Notification.countDocuments({
    $or: [
      { targetUser: req.user.id, read: false },
      { targetRole: req.user.role, read: false },
    ],
  });

  res.status(200).json({
    success: true,
    data: {
      total,
      unreadCount,
      message: 'All notifications marked as read',
    },
  });
});

// @desc    Get notification stats
// @route   GET /api/v1/notifications/stats
// @access  Private
exports.getNotificationStats = asyncHandler(async (req, res, next) => {
  const stats = await Notification.aggregate([
    {
      $match: {
        $or: [
          { targetUser: req.user._id },
          { targetRole: req.user.role },
          { targetUser: { $exists: false }, targetRole: { $exists: false } },
        ],
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$read', false] }, 1, 0],
          },
        },
      },
    },
  ]);

  // Get total counts
  const total = await Notification.countDocuments({
    $or: [
      { targetUser: req.user._id },
      { targetRole: req.user.role },
      { targetUser: { $exists: false }, targetRole: { $exists: false } },
    ],
  });

  const unreadCount = await Notification.countDocuments({
    $or: [
      { targetUser: req.user._id, read: false },
      { targetRole: req.user.role, read: false },
    ],
  });

  res.status(200).json({
    success: true,
    data: {
      total,
      unreadCount,
      byType: stats,
    },
  });
});

// @desc    Get recent notifications
// @route   GET /api/v1/notifications/recent
// @access  Private
exports.getRecentNotifications = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 5;

  const notifications = await Notification.find({
    $or: [
      { targetUser: req.user.id },
      { targetRole: req.user.role },
      { targetUser: { $exists: false }, targetRole: { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

// @desc    Clear all notifications
// @route   DELETE /api/v1/notifications/clear
// @access  Private
exports.clearAllNotifications = asyncHandler(async (req, res, next) => {
  await Notification.deleteMany({
    $or: [
      { targetUser: req.user.id },
      { targetRole: req.user.role },
      { targetUser: { $exists: false }, targetRole: { $exists: false } },
    ],
  });

  res.status(200).json({
    success: true,
    data: {},
    message: 'All notifications cleared',
  });
});
