const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errorResponse');
const { validate } = require('../utils/validation');
const { body } = require('express-validator');
const APIFeatures = require('../utils/apiFeatures');
const PDFGenerator = require('../utils/pdfGenerator');
const Email = require('../utils/email');
const fs = require('fs').promises;
const path = require('path');

// @desc    Get all invoices
// @route   GET /api/v1/invoices
// @access  Private
exports.getInvoices = asyncHandler(async (req, res, next) => {
  // For nested GET customer and user details
  const features = new APIFeatures(
    Invoice.find({ user: req.user.id })
      .populate('customer', 'name phone email')
      .populate('user', 'name'),
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

// @desc    Get single invoice
// @route   GET /api/v1/invoices/:id
// @access  Private
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    user: req.user.id,
  })
    .populate('customer', 'name phone email address gstin')
    .populate('user', 'name')
    .populate('items.product', 'name description price hsnCode');

  if (!invoice) {
    return next(new NotFoundError(`Invoice not found with id of ${req.params.id}`));
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

// @desc    Create new invoice
// @route   POST /api/v1/invoices
// @access  Private
exports.createInvoice = [
  // Validation
  validate([
    body('customer').notEmpty().withMessage('Customer ID is required').isMongoId(),
    body('invoiceDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format. Use YYYY-MM-DD'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format. Use YYYY-MM-DD'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.product')
      .notEmpty()
      .withMessage('Product ID is required')
      .isMongoId()
      .withMessage('Invalid product ID'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
    body('items.*.price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('discount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Discount must be a positive number'),
    body('taxRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Tax rate must be between 0 and 100'),
    body('shipping')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Shipping must be a positive number'),
    body('notes').optional().trim(),
    body('terms').optional().trim(),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const {
      customer: customerId,
      items: invoiceItems,
      invoiceDate = new Date(),
      dueDate,
      discount = 0,
      taxRate = 0,
      shipping = 0,
      notes,
      terms,
    } = req.body;

    // 1) Check if customer exists and belongs to user
    const customer = await Customer.findOne({
      _id: customerId,
      user: req.user.id,
    });

    if (!customer) {
      return next(new BadRequestError('Invalid customer'));
    }

    // 2) Check if products exist and have sufficient stock
    const productIds = invoiceItems.map((item) => item.product);
    const products = await Product.find({
      _id: { $in: productIds },
      user: req.user.id,
    });

    if (products.length !== productIds.length) {
      return next(new BadRequestError('One or more products not found'));
    }

    // 3) Check stock and prepare items
    const items = [];
    let subtotal = 0;
    const productUpdates = [];

    for (const item of invoiceItems) {
      const product = products.find((p) => p._id.toString() === item.product);

      if (product.stock < item.quantity) {
        return next(
          new BadRequestError(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`
          )
        );
      }

      const itemTotal = item.quantity * item.price;
      subtotal += itemTotal;

      items.push({
        product: product._id,
        name: product.name,
        description: product.description,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal,
        hsnCode: product.hsnCode,
        unit: product.unit || 'pcs',
      });

      // Prepare product stock update
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { stock: -item.quantity } },
        },
      });
    }

    // 4) Calculate totals
    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + taxAmount + shipping;

    // 5) Create invoice
    const invoice = await Invoice.create({
      user: req.user.id,
      customer: customer._id,
      invoiceNumber: await generateInvoiceNumber(),
      invoiceDate,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      items,
      subtotal,
      discount,
      taxRate,
      taxAmount,
      shipping,
      total,
      notes,
      terms,
      status: 'unpaid',
    });

    // 6) Update product stock
    if (productUpdates.length > 0) {
      await Product.bulkWrite(productUpdates);
    }

    // 7) Update customer's total purchases and outstanding balance
    customer.totalPurchases += total;
    customer.outstandingBalance += total;
    customer.lastPurchaseDate = new Date();
    await customer.save();

    // 8) Populate the invoice for response
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone email')
      .populate('user', 'name');

    // 9) Send invoice to customer (async)
    try {
      await sendInvoiceEmail(populatedInvoice, req);
    } catch (err) {
      console.error('Error sending invoice email:', err);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      data: populatedInvoice,
    });
  }),
];

// @desc    Update invoice status
// @route   PUT /api/v1/invoices/:id/status
// @access  Private
exports.updateInvoiceStatus = [
  // Validation
  validate([
    body('status')
      .isIn(['draft', 'unpaid', 'partial', 'paid', 'cancelled'])
      .withMessage('Invalid status'),
    body('paymentDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format. Use YYYY-MM-DD'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'card', 'bank_transfer', 'upi', 'other'])
      .withMessage('Invalid payment method'),
    body('amountPaid')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('notes').optional().trim(),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    const { status, paymentDate, paymentMethod, amountPaid, notes } = req.body;

    // 1) Get invoice
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!invoice) {
      return next(
        new NotFoundError(`Invoice not found with id of ${req.params.id}`)
      );
    }

    // 2) Check if invoice can be updated
    if (invoice.status === 'cancelled') {
      return next(new BadRequestError('Cannot update a cancelled invoice'));
    }

    // 3) Handle status update
    let payment = null;
    const updates = { status };

    if (['paid', 'partial'].includes(status)) {
      if (!paymentMethod) {
        return next(new BadRequestError('Payment method is required'));
      }

      payment = {
        date: paymentDate || new Date(),
        amount: amountPaid || invoice.total - (invoice.paidAmount || 0),
        method: paymentMethod,
        notes,
      };

      updates.paidAmount = (invoice.paidAmount || 0) + payment.amount;
      updates.paymentStatus =
        updates.paidAmount >= invoice.total ? 'paid' : 'partial';
      updates.payments = [...(invoice.payments || []), payment];
    } else if (status === 'cancelled') {
      // Restore product stock if invoice is cancelled
      const restoreStockOperations = invoice.items.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: item.quantity } },
        },
      }));

      if (restoreStockOperations.length > 0) {
        await Product.bulkWrite(restoreStockOperations);
      }

      // Refund any payments
      if (invoice.paidAmount > 0) {
        // In a real app, you would process a refund here
        updates.refundedAmount = invoice.paidAmount;
      }
    }

    // 4) Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('customer', 'name phone email')
      .populate('user', 'name');

    // 5) Update customer's outstanding balance if payment was made
    if (payment) {
      const customer = await Customer.findById(invoice.customer);
      if (customer) {
        customer.outstandingBalance = Math.max(
          0,
          customer.outstandingBalance - payment.amount
        );
        await customer.save();
      }

      // Send payment confirmation (async)
      try {
        await sendPaymentConfirmation(updatedInvoice, payment, req);
      } catch (err) {
        console.error('Error sending payment confirmation:', err);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      data: updatedInvoice,
    });
  }),
];

// @desc    Delete invoice
// @route   DELETE /api/v1/invoices/:id
// @access  Private
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!invoice) {
    return next(
      new NotFoundError(`Invoice not found with id of ${req.params.id}`)
    );
  }

  // Check if invoice is already paid
  if (invoice.status === 'paid' || invoice.paidAmount > 0) {
    return next(
      new BadRequestError('Cannot delete a paid or partially paid invoice')
    );
  }

  // Restore product stock
  const restoreStockOperations = invoice.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity } },
    },
  }));

  if (restoreStockOperations.length > 0) {
    await Product.bulkWrite(restoreStockOperations);
  }

  await invoice.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Send invoice to customer
// @route   POST /api/v1/invoices/:id/send
// @access  Private
exports.sendInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    user: req.user.id,
  })
    .populate('customer', 'name email')
    .populate('user', 'name email');

  if (!invoice) {
    return next(new NotFoundError(`Invoice not found with id of ${req.params.id}`));
  }

  try {
    await sendInvoiceEmail(invoice, req);
    
    res.status(200).json({
      success: true,
      message: 'Invoice sent successfully',
    });
  } catch (error) {
    return next(new Error('Failed to send invoice email'));
  }
});

// @desc    Download invoice as PDF
// @route   GET /api/v1/invoices/:id/download
// @access  Private
exports.downloadInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    user: req.user.id,
  })
    .populate('customer', 'name email phone address gstin')
    .populate('user', 'name email phone address')
    .populate('items.product', 'name description hsnCode');

  if (!invoice) {
    return next(new NotFoundError(`Invoice not found with id of ${req.params.id}`));
  }

  try {
    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateInvoice(invoice);

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return next(new Error('Failed to generate PDF'));
  }
});

// @desc    Get invoice stats
// @route   GET /api/v1/invoices/stats
// @access  Private
exports.getInvoiceStats = asyncHandler(async (req, res, next) => {
  const stats = await Invoice.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        totalPaid: { $sum: '$paidAmount' },
        pendingAmount: {
          $sum: { $subtract: ['$total', { $ifNull: ['$paidAmount', 0] }] },
        },
        avgInvoiceValue: { $avg: '$total' },
      },
    },
  ]);

  const monthlyStats = await Invoice.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'cancelled' },
        invoiceDate: {
          $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$invoiceDate' },
        count: { $sum: 1 },
        total: { $sum: '$total' },
      },
    },
    { $sort: { '_id': 1 } },
  ]);

  const statusStats = await Invoice.aggregate([
    {
      $match: {
        user: req.user._id,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$total' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...(stats[0] || {
        totalInvoices: 0,
        totalRevenue: 0,
        totalPaid: 0,
        pendingAmount: 0,
        avgInvoiceValue: 0,
      }),
      monthlyStats,
      statusStats,
    },
  });
});

// Helper function to generate invoice number
async function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Find the latest invoice for this month
  const latestInvoice = await Invoice.findOne({
    invoiceNumber: new RegExp(`^INV-${year}${month}-`),
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (latestInvoice) {
    const parts = latestInvoice.invoiceNumber.split('-');
    sequence = parseInt(parts[2], 10) + 1;
  }

  return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

// Helper function to send invoice email
async function sendInvoiceEmail(invoice, req) {
  try {
    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateInvoice(invoice);
    
    // Create email
    const email = new Email(
      invoice.customer,
      `${process.env.APP_NAME} - Invoice #${invoice.invoiceNumber}`,
      {
        name: invoice.customer.name,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate.toLocaleDateString(),
        total: invoice.total.toFixed(2),
        dueDate: invoice.dueDate.toLocaleDateString(),
        status: invoice.status,
        downloadUrl: `${process.env.FRONTEND_URL}/invoices/${invoice._id}/download`,
      },
      'invoice'
    );

    // Attach PDF
    await email.attach({
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });

    // Send email
    await email.send();
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    throw error;
  }
}

// Helper function to send payment confirmation
async function sendPaymentConfirmation(invoice, payment, req) {
  try {
    const email = new Email(
      invoice.customer,
      `${process.env.APP_NAME} - Payment Confirmation for Invoice #${invoice.invoiceNumber}`,
      {
        name: invoice.customer.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: payment.amount.toFixed(2),
        date: new Date(payment.date).toLocaleDateString(),
        paymentMethod: payment.method,
        reference: payment.referenceNumber || 'N/A',
        remainingBalance: Math.max(0, invoice.total - (invoice.paidAmount || 0)).toFixed(2),
      },
      'paymentConfirmation'
    );

    await email.send();
  } catch (error) {
    console.error('Error in sendPaymentConfirmation:', error);
    throw error;
  }
}
