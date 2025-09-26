const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, adminAuth: admin } = require('../middleware/auth');
const Product = require('../models/Product');

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Build query object
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = Product.find(JSON.parse(queryStr));

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
    const total = await Product.countDocuments(JSON.parse(queryStr));
    
    query = query.skip(skip).limit(limit);

    // Execute query
    const products = await query;

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: products.length,
      page,
      totalPages,
      total,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/products
// @desc    Create a product
// @access  Private/Admin
router.post('/', [
  auth, 
  admin,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
    check('price', 'Price is required and must be a positive number').isFloat({ min: 0 }),
    check('stock', 'Stock must be a positive integer').optional().isInt({ min: 0 }),
    check('sku', 'SKU is required').not().isEmpty(),
    check('hsnCode', 'HSN code is required').not().isEmpty(),
    check('gstRate', 'GST rate is required and must be a number').isNumeric(),
    check('mrp', 'MRP is required and must be a positive number').isFloat({ min: 0 }),
    check('unit', 'Unit is required').not().isEmpty()
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
    // Check if product with same SKU already exists
    const existingProduct = await Product.findOne({ sku: req.body.sku });
    if (existingProduct) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product with this SKU already exists' 
      });
    }

    // Create new product
    const product = new Product({
      ...req.body,
      user: req.user.userId
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private/Admin
router.put('/:id', [
  auth, 
  admin,
  [
    check('name', 'Name is required').optional().not().isEmpty(),
    check('price', 'Price must be a positive number').optional().isFloat({ min: 0 }),
    check('stock', 'Stock must be a positive integer').optional().isInt({ min: 0 }),
    check('gstRate', 'GST rate must be a number').optional().isNumeric(),
    check('mrp', 'MRP must be a positive number').optional().isFloat({ min: 0 })
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
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Check if SKU is being updated and if it already exists
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku });
      if (existingProduct) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product with this SKU already exists' 
        });
      }
    }

    // Update product
    const updates = Object.keys(req.body);
    const allowedUpdates = [
      'name', 'description', 'category', 'price', 'costPrice', 'stock', 
      'sku', 'barcode', 'hsnCode', 'gstRate', 'mrp', 'unit', 'minStockLevel',
      'manufacturer', 'brand', 'weight', 'dimensions', 'isActive', 'tags'
    ];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid updates' 
      });
    }

    updates.forEach(update => product[update] = req.body[update]);
    product.updatedBy = req.user.userId;
    
    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private/Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Check if product is in any invoice
    // const isInInvoice = await Invoice.exists({ 'items.product': req.params.id });
    // if (isInInvoice) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Cannot delete product that exists in invoices'
    //   });
    // }

    await product.remove();

    res.json({
      success: true,
      message: 'Product removed successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/products/stats/low-stock
// @desc    Get low stock products
// @access  Private/Admin
router.get('/stats/low-stock', [auth, admin], async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$minStockLevel'] },
      isActive: true
    }).sort({ stock: 1 });
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/products/stats/out-of-stock
// @desc    Get out of stock products
// @access  Private/Admin
router.get('/stats/out-of-stock', [auth, admin], async (req, res) => {
  try {
    const products = await Product.find({
      stock: { $lte: 0 },
      isActive: true
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get out of stock products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/products/stats/top-selling
// @desc    Get top selling products
// @access  Private/Admin
router.get('/stats/top-selling', [auth, admin], async (req, res) => {
  try {
    // This is a simplified version - in a real app, you would aggregate from order items
    const limit = parseInt(req.query.limit, 10) || 10;
    
    const products = await Product.find({ isActive: true })
      .sort({ sold: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get top selling products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/products/import
// @desc    Import products from Excel/CSV
// @access  Private/Admin
router.post('/import', [auth, admin], async (req, res) => {
  try {
    // In a real app, you would handle file upload and parsing here
    // This is a simplified version
    const { products } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No products to import'
      });
    }

    // Validate each product
    const validatedProducts = [];
    const errors = [];
    
    for (const [index, product] of products.entries()) {
      try {
        // Basic validation
        if (!product.name || !product.sku || !product.price) {
          errors.push(`Row ${index + 1}: Missing required fields`);
          continue;
        }
        
        // Check if product with same SKU already exists
        const existingProduct = await Product.findOne({ sku: product.sku });
        if (existingProduct) {
          await Product.updateOne(
            { _id: existingProduct._id },
            { 
              $set: { 
                ...product,
                updatedBy: req.user.userId 
              } 
            }
          );
        } else {
          // Create new product
          validatedProducts.push({
            ...product,
            user: req.user.userId,
            createdBy: req.user.userId
          });
        }
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
      }
    }

    // Insert validated products
    if (validatedProducts.length > 0) {
      await Product.insertMany(validatedProducts);
    }

    res.json({
      success: true,
      imported: validatedProducts.length,
      updated: products.length - validatedProducts.length - errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${validatedProducts.length} products, updated ${products.length - validatedProducts.length - errors.length} products`
    });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during import' 
    });
  }
});

module.exports = router;
