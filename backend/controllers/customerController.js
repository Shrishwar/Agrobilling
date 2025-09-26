const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errorResponse');
const { validate } = require('../utils/validation');
const { body } = require('express-validator');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Get all customers
// @route   GET /api/v1/customers
// @access  Private
exports.getCustomers = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(
    Customer.find({ user: req.user.id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const customers = await features.query;
  const total = await Customer.countDocuments(features.query._conditions);

  res.status(200).json({
    success: true,
    count: customers.length,
    total,
    data: customers,
  });
});

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private
exports.getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!customer) {
    return next(
      new NotFoundError(`Customer not found with id of ${req.params.id}`)
    );
  }

  res.status(200).json({
    success: true,
    data: customer,
  });
});

// @desc    Create new customer
// @route   POST /api/v1/customers
// @access  Private
exports.createCustomer = [
  // Validation
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('phone')
      .matches(/^[0-9]{10}$/)
      .withMessage('Please provide a valid 10-digit phone number'),
    body('address').optional().trim(),
    body('gstin')
      .optional()
      .matches(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      )
      .withMessage('Please provide a valid GSTIN'),
    body('creditLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    // Add user to req.body
    req.body.user = req.user.id;

    // Check if customer with same phone or email already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ phone: req.body.phone }, { email: req.body.email }],
      user: req.user.id,
    });

    if (existingCustomer) {
      return next(
        new BadRequestError('Customer with this phone or email already exists')
      );
    }

    const customer = await Customer.create(req.body);

    res.status(201).json({
      success: true,
      data: customer,
    });
  }),
];

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
// @access  Private
exports.updateCustomer = [
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
    body('gstin')
      .optional()
      .matches(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      )
      .withMessage('Please provide a valid GSTIN'),
    body('creditLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    let customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!customer) {
      return next(
        new NotFoundError(`Customer not found with id of ${req.params.id}`)
      );
    }

    // Check if email or phone is being updated and if it's already taken
    if (req.body.email || req.body.phone) {
      const existingCustomer = await Customer.findOne({
        $or: [
          { email: req.body.email, _id: { $ne: req.params.id } },
          { phone: req.body.phone, _id: { $ne: req.params.id } },
        ],
        user: req.user.id,
      });

      if (existingCustomer) {
        return next(
          new BadRequestError('Email or phone number already in use by another customer')
        );
      }
    }

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: customer,
    });
  }),
];

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!customer) {
    return next(
      new NotFoundError(`Customer not found with id of ${req.params.id}`)
    );
  }

  // Check if customer has any invoices
  const invoiceCount = await Invoice.countDocuments({ customer: customer._id });
  if (invoiceCount > 0) {
    return next(
      new BadRequestError(
        `Cannot delete customer with ${invoiceCount} associated invoices`
      )
    );
  }

  await customer.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get customer stats
// @route   GET /api/v1/customers/stats
// @access  Private
exports.getCustomerStats = asyncHandler(async (req, res, next) => {
  const stats = await Customer.aggregate([
    {
      $match: { user: req.user._id },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalOutstanding: { $sum: '$outstandingBalance' },
        avgOutstanding: { $avg: '$outstandingBalance' },
      },
    },
  ]);

  // Get total customers
  const totalCustomers = await Customer.countDocuments({ user: req.user._id });

  // Get customers with outstanding balance
  const customersWithBalance = await Customer.countDocuments({
    user: req.user._id,
    outstandingBalance: { $gt: 0 },
  });

  res.status(200).json({
    success: true,
    data: {
      total: totalCustomers,
      withOutstandingBalance: customersWithBalance,
      byType: stats,
    },
  });
});

// @desc    Get customer's invoices
// @route   GET /api/v1/customers/:id/invoices
// @access  Private
exports.getCustomerInvoices = asyncHandler(async (req, res, next) => {
  // Check if customer exists and belongs to user
  const customer = await Customer.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!customer) {
    return next(
      new NotFoundError(`Customer not found with id of ${req.params.id}`)
    );
  }

  const features = new APIFeatures(
    Invoice.find({ customer: req.params.id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const invoices = await features.query;
  const total = await Invoice.countDocuments(features.query._conditions);

  res.status(200).json({
    success: true,
    count: invoices.length,
    total,
    data: invoices,
  });
});

// @desc    Get customer's outstanding balance
// @route   GET /api/v1/customers/:id/balance
// @access  Private
exports.getCustomerBalance = asyncHandler(async (req, res, next) => {
  // Check if customer exists and belongs to user
  const customer = await Customer.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!customer) {
    return next(
      new NotFoundError(`Customer not found with id of ${req.params.id}`)
    );
  }

  // Get all unpaid or partially paid invoices
  const invoices = await Invoice.find({
    customer: customer._id,
    paymentStatus: { $in: ['pending', 'partial'] },
  });

  // Calculate total outstanding amount
  const totalOutstanding = invoices.reduce(
    (sum, invoice) => sum + (invoice.total - (invoice.paidAmount || 0)),
    0
  );

  res.status(200).json({
    success: true,
    data: {
      customer: customer._id,
      customerName: customer.name,
      outstandingBalance: totalOutstanding,
      pendingInvoices: invoices.length,
      creditLimit: customer.creditLimit,
      availableCredit: customer.creditLimit - totalOutstanding,
    },
  });
});

// @desc    Update customer's credit limit
// @route   PUT /api/v1/customers/:id/credit-limit
// @access  Private
exports.updateCustomerCreditLimit = [
  // Validation
  validate([
    body('creditLimit')
      .isFloat({ min: 0 })
      .withMessage('Credit limit must be a positive number'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!customer) {
      return next(
        new NotFoundError(`Customer not found with id of ${req.params.id}`)
      );
    }

    customer.creditLimit = req.body.creditLimit;
    await customer.save();

    res.status(200).json({
      success: true,
      data: {
        customer: customer._id,
        customerName: customer.name,
        creditLimit: customer.creditLimit,
      },
    });
  }),
];

// @desc    Record customer payment
// @route   POST /api/v1/customers/:id/payments
// @access  Private
exports.recordCustomerPayment = [
  // Validation
  validate([
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
      .isIn(['cash', 'card', 'bank_transfer', 'upi', 'other'])
      .withMessage('Invalid payment method'),
    body('paymentDate').optional().isISO8601().toDate(),
    body('referenceNumber').optional().trim(),
    body('notes').optional().trim(),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!customer) {
      return next(
        new NotFoundError(`Customer not found with id of ${req.params.id}`)
      );
    }

    // Create payment record
    const payment = {
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      paymentDate: req.body.paymentDate || Date.now(),
      referenceNumber: req.body.referenceNumber,
      notes: req.body.notes,
      recordedBy: req.user.id,
    };

    // Add payment to customer's payment history
    customer.paymentHistory.push(payment);

    // Update customer's outstanding balance
    customer.outstandingBalance = Math.max(
      0,
      customer.outstandingBalance - req.body.amount
    );

    await customer.save();

    res.status(201).json({
      success: true,
      data: {
        customer: customer._id,
        customerName: customer.name,
        payment,
        newOutstandingBalance: customer.outstandingBalance,
      },
    });
  }),
];
