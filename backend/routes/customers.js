const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, adminAuth: admin } = require('../middleware/auth');
const Customer = require('../models/Customer');

// @route   GET /api/customers
// @desc    Get all customers
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
    
    let query = Customer.find(JSON.parse(queryStr));

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
    const total = await Customer.countDocuments({ ...JSON.parse(queryStr), user: req.user.userId });
    
    query = query.skip(skip).limit(limit);

    // Populate related data
    query = query.populate('user', 'name email');

    // Execute query
    const customers = await query;

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: customers.length,
      page,
      totalPages,
      total,
      data: customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/customers/me
// @desc    Get logged-in customer's profile (customer role only)
// @access  Private (Customer)
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const customer = await Customer.findOne({ _id: req.user.userId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/customers
// @desc    Create a customer
// @access  Private
router.post('/', [
  auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('phone', 'Phone number is required').matches(/^[6-9]\d{9}$/),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('gstin', 'Please provide a valid GSTIN').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
    check('address.street', 'Street address is required').optional().notEmpty(),
    check('address.city', 'City is required').optional().notEmpty(),
    check('address.state', 'State is required').optional().notEmpty(),
    check('address.pincode', 'Pincode is required').optional().notEmpty(),
    check('address.country', 'Country is required').optional().notEmpty(),
    check('creditLimit', 'Credit limit must be a positive number').optional().isFloat({ min: 0 })
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
    // Check if customer with same phone or email already exists
    const existingCustomer = await Customer.findOne({
      $or: [
        { phone: req.body.phone, user: req.user.userId },
        { email: req.body.email, user: req.user.userId, email: { $ne: null } }
      ]
    });

    if (existingCustomer) {
      const field = existingCustomer.phone === req.body.phone ? 'phone' : 'email';
      return res.status(400).json({ 
        success: false, 
        message: `Customer with this ${field} already exists` 
      });
    }

    // Create new customer
    const customer = new Customer({
      ...req.body,
      user: req.user.userId,
      createdBy: req.user.userId
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update a customer
// @access  Private
router.put('/:id', [
  auth,
  [
    check('name', 'Name is required').optional().notEmpty(),
    check('phone', 'Please provide a valid phone number').optional().matches(/^[6-9]\d{9}$/),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('gstin', 'Please provide a valid GSTIN').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
    check('creditLimit', 'Credit limit must be a positive number').optional().isFloat({ min: 0 })
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
    let customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    // Check if phone or email is being updated and if it already exists
    if (req.body.phone || req.body.email) {
      const existingCustomer = await Customer.findOne({
        $and: [
          { _id: { $ne: req.params.id } },
          { user: req.user.userId },
          {
            $or: [
              { phone: req.body.phone || customer.phone },
              { email: req.body.email || customer.email, email: { $ne: null } }
            ]
          }
        ]
      });

      if (existingCustomer) {
        const field = existingCustomer.phone === (req.body.phone || customer.phone) ? 'phone' : 'email';
        return res.status(400).json({ 
          success: false, 
          message: `Another customer with this ${field} already exists` 
        });
      }
    }

    // Update customer
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'name', 'email', 'phone', 'gstin', 'pan', 'address', 'shippingAddress',
      'creditLimit', 'outstandingBalance', 'totalPurchases', 'lastPurchaseDate',
      'isActive', 'notes', 'tags'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid updates' 
      });
    }

    updates.forEach(update => customer[update] = req.body[update]);
    customer.updatedBy = req.user.userId;
    
    await customer.save();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete a customer
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    // Check if customer has any invoices
    // const hasInvoices = await Invoice.exists({ customer: req.params.id });
    // if (hasInvoices) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Cannot delete customer with existing invoices'
    //   });
    // }

    await customer.remove();

    res.json({
      success: true,
      message: 'Customer removed successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/customers/search/suggestions
// @desc    Get customer search suggestions
// @access  Private
router.get('/search/suggestions', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const customers = await Customer.find({
      user: req.user.userId,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name phone email address')
    .limit(10);

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/customers/:id/invoices
// @desc    Get customer invoices
// @access  Private
router.get('/:id/invoices', auth, async (req, res) => {
  try {
    // Check if customer exists and belongs to user
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }

    // In a real app, you would fetch invoices for this customer
    // const invoices = await Invoice.find({ 
    //   customer: req.params.id,
    //   user: req.user.userId 
    // }).sort('-invoiceDate');

    res.json({
      success: true,
      data: [] // Return empty array for now
    });
  } catch (error) {
    console.error('Get customer invoices error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/customers/stats/overview
// @desc    Get customer statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments({ user: req.user.userId });
    const activeCustomers = await Customer.countDocuments({ 
      user: req.user.userId, 
      isActive: true 
    });
    
    // Get customers with outstanding balance
    const customersWithBalance = await Customer.countDocuments({ 
      user: req.user.userId,
      outstandingBalance: { $gt: 0 }
    });

    // Get customers by type (if applicable)
    const customersByType = await Customer.aggregate([
      { $match: { user: req.user.userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } }
    ]);

    // Get recent customers
    const recentCustomers = await Customer.find({ user: req.user.userId })
      .sort('-createdAt')
      .limit(5)
      .select('name email phone createdAt');

    res.json({
      success: true,
      data: {
        total: totalCustomers,
        active: activeCustomers,
        withBalance: customersWithBalance,
        byType: customersByType,
        recent: recentCustomers
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/customers/export
// @desc    Export customers to CSV/Excel
// @access  Private/Admin
router.get('/export', [auth, admin], async (req, res) => {
  try {
    const customers = await Customer.find({ user: req.user.userId })
      .select('name email phone gstin address createdAt')
      .sort('name');

    // In a real app, you would use a library like exceljs or json2csv
    // to generate the export file. Here we'll just return the data.
    
    res.json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
