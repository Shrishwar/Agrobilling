const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { createSendToken } = require('../utils/auth');
const { BadRequestError, NotFoundError, ValidationError } = require('../utils/errorResponse');
const { validate } = require('../utils/validation');
const { body } = require('express-validator');
const APIFeatures = require('../utils/apiFeatures');
const fs = require('fs').promises;
const path = require('path');
const upload = require('../utils/upload');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(
    User.find().select('-password'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;
  const total = await User.countDocuments(features.query._conditions);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    data: users,
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new NotFoundError(`User not found with id of ${req.params.id}`));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = [
  // Validation middleware
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'staff', 'customer']),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const { name, email, password, role, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new BadRequestError('User already exists with this email'));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      phone,
      createdBy: req.user.id,
    });

    // Remove password from output
    user.password = undefined;

    // Create token
    createSendToken(user, 201, res);
  }),
];

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { name, email, role, isActive, phone } = req.body;
  const userId = req.params.id;

  let user = await User.findById(userId);

  if (!user) {
    return next(new NotFoundError(`User not found with id of ${userId}`));
  }

  // Check if email is already taken by another user
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new BadRequestError('Email already in use'));
    }
  }

  // Update user fields
  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (role) updateFields.role = role;
  if (typeof isActive !== 'undefined') updateFields.isActive = isActive;
  if (phone) updateFields.phone = phone;

  user = await User.findByIdAndUpdate(userId, updateFields, {
    new: true,
    runValidators: true,
  }).select('-password');

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new NotFoundError(`User not found with id of ${req.params.id}`));
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user.id) {
    return next(new BadRequestError('You cannot delete your own account'));
  }

  await user.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update current logged in user details
// @route   PUT /api/v1/users/me/update-details
// @access  Private
exports.updateMe = [
  // Upload profile photo
  upload.single('photo'),
  
  // Validation
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('phone')
      .optional()
      .matches(/^[0-9]{10}$/)
      .withMessage('Please provide a valid 10-digit phone number'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const { name, email, phone } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;

    // Handle file upload
    if (req.file) {
      // Delete old photo if exists
      if (req.user.photo && req.user.photo !== 'default.jpg') {
        const oldPhotoPath = path.join(
          __dirname,
          `../public/uploads/users/${req.user.photo}`
        );
        try {
          await fs.unlink(oldPhotoPath);
        } catch (err) {
          console.error('Error deleting old photo:', err);
        }
      }

      updateFields.photo = req.file.filename;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateFields, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      success: true,
      data: user,
    });
  }),
];

// @desc    Update password
// @route   PUT /api/v1/users/me/update-password
// @access  Private
exports.updatePassword = [
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ]),
  asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return next(new BadRequestError('Current password is incorrect'));
    }

    user.password = req.body.newPassword;
    await user.save();

    createSendToken(user, 200, res);
  }),
];

// @desc    Deactivate current user
// @route   PUT /api/v1/users/me/deactivate
// @access  Private
exports.deactivateMe = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { isActive: false },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get user stats
// @route   GET /api/v1/users/stats
// @access  Private/Admin
exports.getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Get total users
  const totalUsers = await User.countDocuments();

  // Get active users
  const activeUsers = await User.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    data: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: stats,
    },
  });
});
