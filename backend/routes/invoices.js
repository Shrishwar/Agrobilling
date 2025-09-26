const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, adminAuth: admin } = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const PDFGenerator = require('../utils/pdfGenerator');

// @route   GET /api/invoices
// @desc    Get all invoices
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Build query object
    const queryObj = { ...req.query, user: req.user.userId };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = Invoice.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-invoiceDate');
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
    const total = await Invoice.countDocuments({ ...JSON.parse(queryStr), user: req.user.userId });
    
    query = query.skip(skip).limit(limit);

    // Populate related data
    query = query
      .populate('customer', 'name phone email')
      .populate('items.product', 'name sku price gstRate');

    // Execute query
    const invoices = await query;

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: invoices.length,
      page,
      totalPages,
      total,
      data: invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    })
    .populate('customer', 'name phone email address gstin')
    .populate('items.product', 'name sku price gstRate hsnCode unit')
    .populate('createdBy', 'name');
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/invoices/customer/:customerId
// @desc    Get invoices for a specific customer (customer role only)
// @access  Private (Customer)
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.params.customerId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const invoices = await Invoice.find({ customer: req.params.customerId })
      .populate('customer', 'name phone email')
      .populate('items.product', 'name sku price gstRate')
      .sort('-invoiceDate');

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Get customer invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/invoices
// @desc    Create an invoice
// @access  Private
router.post('/', [
  auth,
  [
    check('customer', 'Customer is required').not().isEmpty(),
    check('invoiceDate', 'Invoice date is required').isISO8601(),
    check('dueDate', 'Due date is required').isISO8601(),
    check('items', 'Invoice items are required').isArray({ min: 1 }),
    check('items.*.product', 'Product ID is required').not().isEmpty(),
    check('items.*.quantity', 'Quantity is required and must be greater than 0').isFloat({ min: 0.01 }),
    check('items.*.price', 'Price is required and must be a positive number').isFloat({ min: 0 }),
    check('paymentTerms', 'Payment terms are required').isIn(['cod', '7days', '15days', '30days', '60days', '90days']),
    check('taxInclusive', 'Tax inclusive flag is required').isBoolean(),
    check('notes', 'Notes must be a string').optional().isString(),
    check('terms', 'Terms must be a string').optional().isString()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const session = await Invoice.startSession();
  session.startTransaction();

  try {
    const { customer, items, ...invoiceData } = req.body;
    const userId = req.user.userId;

    // Check if customer exists and belongs to user
    const customerExists = await Customer.findOne({
      _id: customer,
      user: userId
    }).session(session);

    if (!customerExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Process invoice items and validate products
    let subtotal = 0;
    let totalTax = 0;
    let totalAmount = 0;
    const processedItems = [];
    const productUpdates = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      // Check if product has sufficient stock
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`,
          product: {
            id: product._id,
            name: product.name,
            availableStock: product.stock
          }
        });
      }

      // Calculate item total with discount, then tax
      const discount = item.discount || 0;
      const itemTotal = item.quantity * item.price * (1 - discount / 100);
      const itemTax = (itemTotal * (product.gstRate || 0)) / 100;

      subtotal += itemTotal;
      totalTax += itemTax;
      totalAmount += itemTotal + itemTax;

      // Add to processed items
      processedItems.push({
        product: product._id,
        name: product.name,
        hsnCode: product.hsnCode,
        quantity: item.quantity,
        price: item.price,
        discount: discount,
        gstRate: product.gstRate || 0,
        unit: product.unit,
        total: itemTotal,
        tax: itemTax
      });

      // Prepare product stock update
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $inc: { stock: -item.quantity, sold: item.quantity }
          }
        }
      });
    }

    // Update products stock
    if (productUpdates.length > 0) {
      await Product.bulkWrite(productUpdates, { session });
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Invoice.countDocuments({
      user: userId,
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
      }
    }).session(session);
    
    const invoiceNumber = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // Create invoice
    const invoice = new Invoice({
      ...invoiceData,
      invoiceNumber,
      customer,
      items: processedItems,
      subtotal,
      tax: totalTax,
      total: totalAmount,
      balance: totalAmount - (invoiceData.amountPaid || 0),
      user: userId,
      createdBy: userId
    });

    await invoice.save({ session });

    // Update customer's outstanding balance
    await Customer.findByIdAndUpdate(
      customer,
      { 
        $inc: { 
          outstandingBalance: totalAmount,
          totalPurchases: 1
        },
        $set: { lastPurchaseDate: new Date() }
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Populate the created invoice for response
    const savedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone email')
      .populate('items.product', 'name sku');

    // Send email notification (in background)
    try {
      // In a real app, you would send an email here
      // await sendInvoiceEmail(savedInvoice);
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: savedInvoice
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Create invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/invoices/:id/status
// @desc    Update invoice status
// @access  Private
router.put('/:id/status', [
  auth,
  [
    check('status', 'Status is required').isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded']),
    check('paymentDate', 'Payment date is required if status is paid').if(
      (value, { req }) => req.body.status === 'paid'
    ).isISO8601()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const session = await Invoice.startSession();
  session.startTransaction();

  try {
    const { status, paymentDate, paymentMethod, notes } = req.body;
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).session(session);
    
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // If marking as paid, update payment details
    if (status === 'paid') {
      invoice.paymentDate = paymentDate || new Date();
      invoice.paymentMethod = paymentMethod || invoice.paymentMethod || 'cash';
      invoice.amountPaid = invoice.total;
      invoice.balance = 0;
      
      // Update customer's outstanding balance
      await Customer.findByIdAndUpdate(
        invoice.customer,
        { $inc: { outstandingBalance: -invoice.total } },
        { session }
      );
    }
    
    // Update status and notes
    invoice.status = status;
    if (notes) {
      invoice.notes = notes;
    }
    
    await invoice.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Invoice marked as ${status}`,
      data: invoice
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Update invoice status error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/invoices/:id/payment
// @desc    Record payment for an invoice
// @access  Private
router.put('/:id/payment', [
  auth,
  [
    check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
    check('paymentDate', 'Payment date is required').isISO8601(),
    check('paymentMethod', 'Payment method is required').isIn(['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other']),
    check('reference', 'Reference must be a string').optional().isString(),
    check('notes', 'Notes must be a string').optional().isString()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const session = await Invoice.startSession();
  session.startTransaction();

  try {
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body;
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).session(session);
    
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check if payment amount is valid
    if (amount > (invoice.total - invoice.amountPaid)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds remaining balance'
      });
    }

    // Update invoice payment
    invoice.amountPaid += amount;
    invoice.balance = invoice.total - invoice.amountPaid;
    
    if (invoice.balance <= 0) {
      invoice.status = 'paid';
      invoice.paymentDate = paymentDate;
    } else {
      invoice.status = 'partially_paid';
    }

    // Add payment to history
    const payment = {
      amount,
      date: paymentDate,
      method: paymentMethod,
      reference: reference || '',
      notes: notes || '',
      recordedBy: req.user.userId
    };

    invoice.payments = invoice.payments || [];
    invoice.payments.push(payment);
    
    await invoice.save({ session });

    // Update customer's outstanding balance
    await Customer.findByIdAndUpdate(
      invoice.customer,
      { $inc: { outstandingBalance: -amount } },
      { session }
    );
    
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        invoice: invoice._id,
        amountPaid: amount,
        remainingBalance: invoice.balance,
        status: invoice.status
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Record payment error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete an invoice
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  const session = await Invoice.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).session(session);
    
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check if invoice has payments
    if (invoice.amountPaid > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice with payments. Please issue a refund first.'
      });
    }

    // Restore product stock
    const productUpdates = [];
    for (const item of invoice.items) {
      productUpdates.push({
        updateOne: {
          filter: { _id: item.product },
          update: { 
            $inc: { 
              stock: item.quantity,
              sold: -item.quantity
            } 
          }
        }
      });
    }

    if (productUpdates.length > 0) {
      await Product.bulkWrite(productUpdates, { session });
    }

    // Update customer's outstanding balance if needed
    if (invoice.status !== 'paid' && invoice.balance > 0) {
      await Customer.findByIdAndUpdate(
        invoice.customer,
        { $inc: { outstandingBalance: -invoice.balance } },
        { session }
      );
    }

    // Delete the invoice
    await Invoice.deleteOne({ _id: invoice._id }).session(session);
    
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Delete invoice error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/invoices/:id/download
// @desc    Download invoice as PDF
// @access  Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.userId
    })
    .populate('customer', 'name phone email address gstin')
    .populate('items.product', 'name sku price gstRate hsnCode unit');
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generateInvoicePDF(invoice);

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download invoice error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF' 
    });
  }
});

// @route   GET /api/invoices/stats/overview
// @desc    Get invoice statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get total invoices count
    const totalInvoices = await Invoice.countDocuments({ user: req.user.userId });
    
    // Get total sales amount
    const totalSales = await Invoice.aggregate([
      { $match: { user: req.user.userId } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Get monthly sales
    const monthlySales = await Invoice.aggregate([
      { 
        $match: { 
          user: req.user.userId,
          invoiceDate: { $gte: startOfMonth }
        } 
      },
      { 
        $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Get yearly sales by month
    const yearlySales = await Invoice.aggregate([
      { 
        $match: { 
          user: req.user.userId,
          invoiceDate: { $gte: startOfYear }
        } 
      },
      { 
        $group: { 
          _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Get sales by status
    const salesByStatus = await Invoice.aggregate([
      { $match: { user: req.user.userId } },
      { 
        $group: { 
          _id: '$status',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        } 
      },
      { 
        $project: {
          _id: 0,
          status: '$_id',
          total: 1,
          count: 1
        }
      }
    ]);

    // Get top customers
    const topCustomers = await Invoice.aggregate([
      { $match: { user: req.user.userId } },
      {
        $group: {
          _id: '$customer',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          customer: '$customer.name',
          email: '$customer.email',
          phone: '$customer.phone',
          total: 1,
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalInvoices,
        totalSales: totalSales[0]?.total || 0,
        monthlySales,
        yearlySales,
        salesByStatus,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/invoices/export
// @desc    Export invoices to Excel/CSV
// @access  Private/Admin
router.get('/export', [auth, admin], async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    // Build query
    const query = { user: req.user.userId };
    
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = end;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get invoices with customer details
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email phone')
      .sort('-invoiceDate');
    
    // In a real app, you would use a library like exceljs or json2csv
    // to generate the export file. Here we'll just return the data.
    
    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error('Export invoices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
