const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, adminAuth: admin } = require('../middleware/auth');
const Expense = require('../models/Expense');

// @route   GET /api/expenses
// @desc    Get all expenses
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
    
    let query = Expense.find(JSON.parse(queryStr));

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-date');
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
    const total = await Expense.countDocuments({ ...JSON.parse(queryStr), user: req.user.userId });
    
    query = query.skip(skip).limit(limit);

    // Populate related data
    query = query.populate('category', 'name');
    query = query.populate('approvedBy', 'name');
    query = query.populate('paidBy', 'name');

    // Execute query
    const expenses = await query;

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: expenses.length,
      page,
      totalPages,
      total,
      data: expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.userId
    })
    .populate('category', 'name')
    .populate('approvedBy', 'name')
    .populate('paidBy', 'name');
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/expenses
// @desc    Create an expense
// @access  Private
router.post('/', [
  auth,
  [
    check('description', 'Description is required').not().isEmpty(),
    check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
    check('date', 'Date is required').isISO8601(),
    check('category', 'Category is required').not().isEmpty(),
    check('paymentMethod', 'Payment method is required').isIn(['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other']),
    check('status', 'Status is required').isIn(['pending', 'approved', 'rejected', 'paid']),
    check('receipt', 'Receipt must be a valid URL').optional().isURL(),
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

  try {
    // Create new expense
    const expense = new Expense({
      ...req.body,
      user: req.user.userId,
      submittedBy: req.user.userId
    });

    await expense.save();

    // Populate the created expense for response
    const savedExpense = await Expense.findById(expense._id)
      .populate('category', 'name')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: savedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', [
  auth,
  [
    check('description', 'Description is required').optional().notEmpty(),
    check('amount', 'Amount must be a positive number').optional().isFloat({ min: 0.01 }),
    check('date', 'Date must be a valid date').optional().isISO8601(),
    check('category', 'Category is required').optional().notEmpty(),
    check('paymentMethod', 'Invalid payment method').optional().isIn(['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other']),
    check('status', 'Invalid status').optional().isIn(['pending', 'approved', 'rejected', 'paid']),
    check('receipt', 'Receipt must be a valid URL').optional().isURL(),
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

  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    // Check if expense is already paid and trying to modify
    if (expense.status === 'paid' && req.body.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a paid expense'
      });
    }

    // Update expense
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'description', 'amount', 'date', 'category', 'paymentMethod',
      'status', 'receipt', 'notes', 'approvedBy', 'approvedAt',
      'paidBy', 'paidAt', 'rejectionReason'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid updates' 
      });
    }

    // Handle status changes
    if (req.body.status === 'approved' && expense.status !== 'approved') {
      req.body.approvedBy = req.user.userId;
      req.body.approvedAt = new Date();
    } else if (req.body.status === 'paid' && expense.status !== 'paid') {
      req.body.paidBy = req.user.userId;
      req.body.paidAt = new Date();
    }

    updates.forEach(update => expense[update] = req.body[update]);
    
    await expense.save();

    // Populate the updated expense for response
    const updatedExpense = await Expense.findById(expense._id)
      .populate('category', 'name')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name');

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    // Check if expense is already paid
    if (expense.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a paid expense'
      });
    }

    await expense.remove();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/expenses/:id/approve
// @desc    Approve an expense
// @access  Private/Admin
router.put('/:id/approve', [auth, admin], async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.userId,
      status: 'pending'
    });
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pending expense not found' 
      });
    }

    expense.status = 'approved';
    expense.approvedBy = req.user.userId;
    expense.approvedAt = new Date();
    
    if (req.body.notes) {
      expense.notes = req.body.notes;
    }
    
    await expense.save();

    // Populate the approved expense for response
    const approvedExpense = await Expense.findById(expense._id)
      .populate('category', 'name')
      .populate('approvedBy', 'name');

    res.json({
      success: true,
      message: 'Expense approved successfully',
      data: approvedExpense
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/expenses/:id/reject
// @desc    Reject an expense
// @access  Private/Admin
router.put('/:id/reject', [
  auth,
  admin,
  [
    check('rejectionReason', 'Rejection reason is required').not().isEmpty()
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
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.userId,
      status: 'pending'
    });
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pending expense not found' 
      });
    }

    expense.status = 'rejected';
    expense.rejectionReason = req.body.rejectionReason;
    expense.approvedBy = req.user.userId;
    expense.approvedAt = new Date();
    
    await expense.save();

    res.json({
      success: true,
      message: 'Expense rejected successfully',
      data: expense
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/expenses/:id/mark-paid
// @desc    Mark an expense as paid
// @access  Private/Admin
router.put('/:id/mark-paid', [auth, admin], async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user.userId,
      status: 'approved'
    });
    
    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Approved expense not found' 
      });
    }

    expense.status = 'paid';
    expense.paidBy = req.user.userId;
    expense.paidAt = new Date();
    
    if (req.body.paymentMethod) {
      expense.paymentMethod = req.body.paymentMethod;
    }
    
    if (req.body.notes) {
      expense.notes = req.body.notes;
    }
    
    await expense.save();

    // Populate the paid expense for response
    const paidExpense = await Expense.findById(expense._id)
      .populate('category', 'name')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name');

    res.json({
      success: true,
      message: 'Expense marked as paid successfully',
      data: paidExpense
    });
  } catch (error) {
    console.error('Mark expense as paid error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/expenses/stats/overview
// @desc    Get expense statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get total expenses count and amount
    const totalExpenses = await Expense.aggregate([
      { $match: { user: req.user.userId } },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      }
    ]);

    // Get monthly expenses
    const monthlyExpenses = await Expense.aggregate([
      { 
        $match: { 
          user: req.user.userId,
          date: { $gte: startOfMonth }
        } 
      },
      { 
        $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Get yearly expenses by month
    const yearlyExpenses = await Expense.aggregate([
      { 
        $match: { 
          user: req.user.userId,
          date: { $gte: startOfYear }
        } 
      },
      { 
        $group: { 
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Get expenses by status
    const expensesByStatus = await Expense.aggregate([
      { $match: { user: req.user.userId } },
      { 
        $group: { 
          _id: '$status',
          total: { $sum: '$amount' },
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

    // Get expenses by category
    const expensesByCategory = await Expense.aggregate([
      { $match: { user: req.user.userId } },
      {
        $lookup: {
          from: 'expensecategories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryInfo.name' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          categoryName: 1,
          total: 1,
          count: 1
        }
      }
    ]);

    // Get recent expenses
    const recentExpenses = await Expense.find({ user: req.user.userId })
      .sort('-date')
      .limit(5)
      .populate('category', 'name')
      .select('description amount date status');

    res.json({
      success: true,
      data: {
        totalExpenses: totalExpenses[0]?.total || 0,
        totalCount: totalExpenses[0]?.count || 0,
        monthlyExpenses,
        yearlyExpenses,
        expensesByStatus,
        expensesByCategory,
        recentExpenses
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/expenses/export
// @desc    Export expenses to Excel/CSV
// @access  Private/Admin
router.get('/export', [auth, admin], async (req, res) => {
  try {
    const { startDate, endDate, status, category } = req.query;
    
    // Build query
    const query = { user: req.user.userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    // Get expenses with category details
    const expenses = await Expense.find(query)
      .populate('category', 'name')
      .populate('approvedBy', 'name')
      .populate('paidBy', 'name')
      .sort('-date');
    
    // In a real app, you would use a library like exceljs or json2csv
    // to generate the export file. Here we'll just return the data.
    
    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
