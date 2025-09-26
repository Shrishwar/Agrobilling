const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errorResponse');
const { validate } = require('../utils/validation');
const { body } = require('express-validator');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Get all expenses
// @route   GET /api/v1/expenses
// @access  Private
exports.getExpenses = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(
    Expense.find({ user: req.user.id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const expenses = await features.query;
  const total = await Expense.countDocuments(features.query._conditions);

  res.status(200).json({
    success: true,
    count: expenses.length,
    total,
    data: expenses,
  });
});

// @desc    Get single expense
// @route   GET /api/v1/expenses/:id
// @access  Private
exports.getExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!expense) {
    return next(
      new NotFoundError(`Expense not found with id of ${req.params.id}`)
    );
  }

  res.status(200).json({
    success: true,
    data: expense,
  });
});

// @desc    Create new expense
// @route   POST /api/v1/expenses
// @access  Private
exports.createExpense = [
  // Validation
  validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('date').optional().isISO8601().toDate(),
    body('category')
      .optional()
      .isIn([
        'supplies',
        'utilities',
        'salaries',
        'rent',
        'maintenance',
        'transportation',
        'advertising',
        'insurance',
        'taxes',
        'other',
      ])
      .withMessage('Invalid category'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'card', 'bank_transfer', 'cheque', 'other'])
      .withMessage('Invalid payment method'),
    body('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected', 'paid'])
      .withMessage('Invalid status'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    // Add user to req.body
    req.body.user = req.user.id;
    
    // Set default status to pending if not provided
    if (!req.body.status) {
      req.body.status = 'pending';
    }

    const expense = await Expense.create(req.body);

    res.status(201).json({
      success: true,
      data: expense,
    });
  }),
];

// @desc    Update expense
// @route   PUT /api/v1/expenses/:id
// @access  Private
exports.updateExpense = [
  // Validation
  validate([
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('date').optional().isISO8601().toDate(),
    body('category')
      .optional()
      .isIn([
        'supplies',
        'utilities',
        'salaries',
        'rent',
        'maintenance',
        'transportation',
        'advertising',
        'insurance',
        'taxes',
        'other',
      ])
      .withMessage('Invalid category'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'card', 'bank_transfer', 'cheque', 'other'])
      .withMessage('Invalid payment method'),
    body('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected', 'paid'])
      .withMessage('Invalid status'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    let expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!expense) {
      return next(
        new NotFoundError(`Expense not found with id of ${req.params.id}`)
      );
    }

    // Check if expense is already paid and trying to modify amount or date
    if (
      expense.status === 'paid' &&
      (req.body.amount || req.body.date || req.body.paymentMethod)
    ) {
      return next(
        new BadRequestError('Cannot modify amount, date, or payment method of a paid expense')
      );
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: expense,
    });
  }),
];

// @desc    Delete expense
// @route   DELETE /api/v1/expenses/:id
// @access  Private
exports.deleteExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!expense) {
    return next(
      new NotFoundError(`Expense not found with id of ${req.params.id}`)
    );
  }

  // Prevent deletion of paid expenses
  if (expense.status === 'paid') {
    return next(
      new BadRequestError('Cannot delete a paid expense')
    );
  }

  await expense.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get expense stats
// @route   GET /api/v1/expenses/stats
// @access  Private
exports.getExpenseStats = asyncHandler(async (req, res, next) => {
  const stats = await Expense.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'rejected' },
      },
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);

  // Get total expenses
  const totalExpenses = await Expense.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'rejected' },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Get monthly expenses for the last 12 months
  const monthlyExpenses = await Expense.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'rejected' },
        date: {
          $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$date' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id': 1 } },
  ]);

  // Get expenses by status
  const expensesByStatus = await Expense.aggregate([
    {
      $match: {
        user: req.user._id,
      },
    },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      total: totalExpenses[0]?.total || 0,
      count: totalExpenses[0]?.count || 0,
      byCategory: stats,
      monthlyExpenses,
      byStatus: expensesByStatus,
    },
  });
});

// @desc    Approve expense
// @route   PUT /api/v1/expenses/:id/approve
// @access  Private/Admin
exports.approveExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    return next(
      new NotFoundError(`Expense not found with id of ${req.params.id}`)
    );
  }

  // Check if expense is already approved or paid
  if (expense.status === 'approved' || expense.status === 'paid') {
    return next(
      new BadRequestError(`Expense is already ${expense.status}`)
    );
  }

  expense.status = 'approved';
  expense.approvedBy = req.user.id;
  expense.approvedAt = new Date();
  
  await expense.save();

  res.status(200).json({
    success: true,
    data: expense,
  });
});

// @desc    Reject expense
// @route   PUT /api/v1/expenses/:id/reject
// @access  Private/Admin
exports.rejectExpense = [
  // Validation
  validate([
    body('rejectionReason')
      .trim()
      .notEmpty()
      .withMessage('Please provide a reason for rejection'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(
        new NotFoundError(`Expense not found with id of ${req.params.id}`)
      );
    }

    // Check if expense is already paid
    if (expense.status === 'paid') {
      return next(
        new BadRequestError('Cannot reject a paid expense')
      );
    }

    expense.status = 'rejected';
    expense.rejectionReason = req.body.rejectionReason;
    expense.rejectedBy = req.user.id;
    expense.rejectedAt = new Date();
    
    await expense.save();

    res.status(200).json({
      success: true,
      data: expense,
    });
  }),
];

// @desc    Mark expense as paid
// @route   PUT /api/v1/expenses/:id/mark-paid
// @access  Private/Admin
exports.markExpenseAsPaid = [
  // Validation
  validate([
    body('paymentDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format. Use YYYY-MM-DD'),
    body('paymentMethod')
      .isIn(['cash', 'card', 'bank_transfer', 'cheque', 'other'])
      .withMessage('Invalid payment method'),
    body('referenceNumber').optional().trim(),
    body('notes').optional().trim(),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(
        new NotFoundError(`Expense not found with id of ${req.params.id}`)
      );
    }

    // Check if expense is already paid
    if (expense.status === 'paid') {
      return next(
        new BadRequestError('Expense is already marked as paid')
      );
    }

    // Check if expense is approved
    if (expense.status !== 'approved') {
      return next(
        new BadRequestError('Only approved expenses can be marked as paid')
      );
    }

    expense.status = 'paid';
    expense.paidAt = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    expense.paymentMethod = req.body.paymentMethod;
    expense.referenceNumber = req.body.referenceNumber;
    expense.notes = req.body.notes;
    expense.paidBy = req.user.id;
    
    await expense.save();

    res.status(200).json({
      success: true,
      data: expense,
    });
  }),
];
