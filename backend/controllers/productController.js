const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const { validate } = require('../utils/validation');
const { body } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const upload = require('../utils/upload');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
  // For nested GET reviews on product
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = Product.find(JSON.parse(queryStr));

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Product.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const products = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: products.length,
    pagination,
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new NotFoundError(`Product not found with id of ${req.params.id}`)
    );
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = [
  // Upload product image
  upload.single('image'),
  
  // Validation
  validate([
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('description').optional().trim(),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('costPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost price must be a positive number'),
    body('stock')
      .isInt({ min: 0 })
      .withMessage('Stock must be a positive integer'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('barcode').optional().trim(),
    body('weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number'),
    body('dimensions').optional().trim(),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    // Add user to req.body
    req.body.user = req.user.id;

    // Handle file upload
    if (req.file) {
      req.body.image = req.file.filename;
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  })
];

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = [
  // Upload product image
  upload.single('image'),
  
  // Validation
  validate([
    body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('costPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost price must be a positive number'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a positive integer'),
  ]),

  // Request handler
  asyncHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new NotFoundError(`Product not found with id of ${req.params.id}`)
      );
    }

    // Make sure user is product owner or admin
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new UnauthorizedError(
          `User ${req.user.id} is not authorized to update this product`
        )
      );
    }

    // Handle file upload
    if (req.file) {
      // Delete old image if exists
      if (product.image) {
        const imagePath = path.join(
          __dirname,
          `../public/uploads/products/${product.image}`
        );
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      req.body.image = req.file.filename;
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  })
];

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new NotFoundError(`Product not found with id of ${req.params.id}`)
    );
  }

  // Make sure user is product owner or admin
  if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new UnauthorizedError(
        `User ${req.user.id} is not authorized to delete this product`
      )
    );
  }

  // Delete product image if exists
  if (product.image) {
    const imagePath = path.join(
      __dirname,
      `../public/uploads/products/${product.image}`
    );
    try {
      await fs.unlink(imagePath);
    } catch (err) {
      console.error('Error deleting product image:', err);
    }
  }

  await product.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get products by category
// @route   GET /api/v1/products/category/:category
// @access  Public
exports.getProductsByCategory = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ category: req.params.category });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Upload product image
// @route   PUT /api/v1/products/:id/image
// @access  Private/Admin
exports.uploadProductImage = [
  upload.single('image'),
  asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new NotFoundError(`Product not found with id of ${req.params.id}`)
      );
    }

    // Make sure user is product owner or admin
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new UnauthorizedError(
          `User ${req.user.id} is not authorized to update this product`
        )
      );
    }

    if (!req.file) {
      return next(new BadRequestError('Please upload a file'));
    }

    // Delete old image if exists
    if (product.image) {
      const oldImagePath = path.join(
        __dirname,
        `../public/uploads/products/${product.image}`
      );
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.error('Error deleting old image:', err);
      }
    }

    product.image = req.file.filename;
    await product.save();

    res.status(200).json({
      success: true,
      data: product.image
    });
  })
];

// @desc    Get product stats
// @route   GET /api/v1/products/stats
// @access  Private/Admin
exports.getProductStats = asyncHandler(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Private/Admin
exports.getLowStockProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    stock: { $lte: 10 }, // Products with stock less than or equal to 10
  }).sort({ stock: 1 });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});
