const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError } = require('../utils/errorResponse');
const { format } = require('date-fns');
const ExcelJS = require('exceljs');
const PDFGenerator = require('../utils/pdfGenerator');

// @desc    Get sales report
// @route   GET /api/v1/reports/sales
// @access  Private
exports.getSalesReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, groupBy = 'day', customer, status } = req.query;

  // Set default date range (last 30 days)
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  // Parse dates from query or use defaults
  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new BadRequestError('Invalid date format. Use YYYY-MM-DD'));
  }

  // Build match query
  const matchQuery = {
    user: req.user._id,
    invoiceDate: {
      $gte: start,
      $lte: end,
    },
  };

  // Add customer filter if provided
  if (customer) {
    matchQuery.customer = customer;
  }

  // Add status filter if provided
  if (status) {
    matchQuery.status = status;
  }

  // Group by time period
  let groupByFormat;
  let dateGroupFormat;

  switch (groupBy) {
    case 'day':
      groupByFormat = '%Y-%m-%d';
      dateGroupFormat = {
        year: { $year: '$invoiceDate' },
        month: { $month: '$invoiceDate' },
        day: { $dayOfMonth: '$invoiceDate' },
      };
      break;
    case 'week':
      groupByFormat = '%Y-%U';
      dateGroupFormat = {
        year: { $year: '$invoiceDate' },
        week: { $week: '$invoiceDate' },
      };
      break;
    case 'month':
      groupByFormat = '%Y-%m';
      dateGroupFormat = {
        year: { $year: '$invoiceDate' },
        month: { $month: '$invoiceDate' },
      };
      break;
    case 'quarter':
      groupByFormat = '%Y-Q%q';
      dateGroupFormat = {
        year: { $year: '$invoiceDate' },
        quarter: {
          $ceil: { $divide: [{ $month: '$invoiceDate' }, 3] },
        },
      };
      break;
    case 'year':
      groupByFormat = '%Y';
      dateGroupFormat = {
        year: { $year: '$invoiceDate' },
      };
      break;
    default:
      return next(new BadRequestError('Invalid groupBy parameter'));
  }

  // Aggregate sales data
  const salesData = await Invoice.aggregate([
    {
      $match: matchQuery,
    },
    {
      $group: {
        _id: dateGroupFormat,
        invoiceCount: { $sum: 1 },
        totalSales: { $sum: '$total' },
        totalTax: { $sum: '$taxAmount' },
        totalDiscount: { $sum: '$discount' },
        totalShipping: { $sum: '$shipping' },
        avgOrderValue: { $avg: '$total' },
        invoices: { $push: '$$ROOT' },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 },
    },
  ]);

  // Format the response
  const formattedData = salesData.map((item) => {
    let period;
    let date;

    if (groupBy === 'day') {
      period = format(
        new Date(item._id.year, item._id.month - 1, item._id.day),
        'MMM dd, yyyy'
      );
      date = new Date(item._id.year, item._id.month - 1, item._id.day);
    } else if (groupBy === 'week') {
      period = `Week ${item._id.week}, ${item._id.year}`;
      date = new Date(item._id.year, 0, 1 + (item._id.week - 1) * 7);
    } else if (groupBy === 'month') {
      period = format(new Date(item._id.year, item._id.month - 1), 'MMM yyyy');
      date = new Date(item._id.year, item._id.month - 1);
    } else if (groupBy === 'quarter') {
      period = `Q${item._id.quarter} ${item._id.year}`;
      date = new Date(item._id.year, (item._id.quarter - 1) * 3);
    } else if (groupBy === 'year') {
      period = item._id.year.toString();
      date = new Date(item._id.year, 0);
    }

    return {
      period,
      date,
      invoiceCount: item.invoiceCount,
      totalSales: item.totalSales,
      totalTax: item.totalTax,
      totalDiscount: item.totalDiscount,
      totalShipping: item.totalShipping,
      avgOrderValue: item.avgOrderValue,
    };
  });

  // Calculate summary
  const summary = {
    totalInvoices: formattedData.reduce((sum, item) => sum + item.invoiceCount, 0),
    totalSales: formattedData.reduce((sum, item) => sum + item.totalSales, 0),
    totalTax: formattedData.reduce((sum, item) => sum + item.totalTax, 0),
    totalDiscount: formattedData.reduce((sum, item) => sum + item.totalDiscount, 0),
    totalShipping: formattedData.reduce((sum, item) => sum + item.totalShipping, 0),
    avgOrderValue: formattedData.length > 0
      ? formattedData.reduce((sum, item) => sum + item.avgOrderValue, 0) / formattedData.length
      : 0,
  };

  // Get top customers
  const topCustomers = await Invoice.aggregate([
    {
      $match: matchQuery,
    },
    {
      $group: {
        _id: '$customer',
        totalSpent: { $sum: '$total' },
        invoiceCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    {
      $unwind: '$customer',
    },
    {
      $project: {
        _id: 0,
        customerId: '$_id',
        customerName: '$customer.name',
        customerEmail: '$customer.email',
        totalSpent: 1,
        invoiceCount: 1,
      },
    },
    {
      $sort: { totalSpent: -1 },
    },
    {
      $limit: 5,
    },
  ]);

  // Get top products
  const topProducts = await Invoice.aggregate([
    {
      $match: matchQuery,
    },
    {
      $unwind: '$items',
    },
    {
      $group: {
        _id: '$items.product',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $unwind: '$product',
    },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        productName: '$product.name',
        productSku: '$product.sku',
        totalQuantity: 1,
        totalRevenue: 1,
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
    {
      $limit: 10,
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: {
        start: start,
        end: end,
        groupBy,
      },
      summary,
      salesData: formattedData,
      topCustomers,
      topProducts,
    },
  });
});

// @desc    Get profit and loss report
// @route   GET /api/v1/reports/profit-and-loss
// @access  Private
exports.getProfitAndLossReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Set default date range (current month)
  const defaultEndDate = new Date();
  const defaultStartDate = new Date(
    defaultEndDate.getFullYear(),
    defaultEndDate.getMonth(),
    1
  );

  // Parse dates from query or use defaults
  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new BadRequestError('Invalid date format. Use YYYY-MM-DD'));
  }

  // Get total revenue from invoices
  const revenueData = await Invoice.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'cancelled' },
        invoiceDate: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalTax: { $sum: '$taxAmount' },
        totalDiscount: { $sum: '$discount' },
        totalShipping: { $sum: '$shipping' },
        invoiceCount: { $sum: 1 },
      },
    },
  ]);

  // Get total cost of goods sold (COGS)
  const cogsData = await Invoice.aggregate([
    {
      $match: {
        user: req.user._id,
        status: { $ne: 'cancelled' },
        invoiceDate: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $unwind: '$items',
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $unwind: '$product',
    },
    {
      $group: {
        _id: null,
        totalCOGS: {
          $sum: {
            $multiply: [
              '$items.quantity',
              { $ifNull: ['$product.costPrice', 0] },
            ],
          },
        },
      },
    },
  ]);

  // Get total expenses
  const expenseData = await Expense.aggregate([
    {
      $match: {
        user: req.user._id,
        status: 'paid',
        date: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  // Calculate totals
  const totalRevenue = revenueData[0]?.totalRevenue || 0;
  const totalTax = revenueData[0]?.totalTax || 0;
  const totalDiscount = revenueData[0]?.totalDiscount || 0;
  const totalShipping = revenueData[0]?.totalShipping || 0;
  const totalCOGS = cogsData[0]?.totalCOGS || 0;
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.total, 0);

  // Calculate gross profit and net profit
  const grossProfit = totalRevenue - totalCOGS;
  const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netProfit = grossProfit - totalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Prepare response
  const report = {
    period: {
      start,
      end,
    },
    revenue: {
      total: totalRevenue,
      tax: totalTax,
      discount: totalDiscount,
      shipping: totalShipping,
      invoiceCount: revenueData[0]?.invoiceCount || 0,
    },
    costOfGoodsSold: {
      total: totalCOGS,
      items: [], // Could be expanded with itemized COGS if needed
    },
    grossProfit: {
      amount: grossProfit,
      margin: grossProfitMargin,
    },
    expenses: {
      total: totalExpenses,
      byCategory: expenseData,
    },
    netProfit: {
      amount: netProfit,
      margin: netProfitMargin,
    },
  };

  res.status(200).json({
    success: true,
    data: report,
  });
});

// @desc    Get inventory report
// @route   GET /api/v1/reports/inventory
// @access  Private
exports.getInventoryReport = asyncHandler(async (req, res, next) => {
  const { category, minStock, maxStock, sortBy = 'name', sortOrder = 'asc' } = req.query;

  // Build query
  const query = { user: req.user._id };

  // Add category filter
  if (category) {
    query.category = category;
  }

  // Add stock range filter
  if (minStock || maxStock) {
    query.stock = {};
    if (minStock) query.stock.$gte = parseInt(minStock, 10);
    if (maxStock) query.stock.$lte = parseInt(maxStock, 10);
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Get products
  const products = await Product.find(query)
    .sort(sort)
    .select('name sku category stock price costPrice')
    .lean();

  // Calculate inventory value and other metrics
  let totalInventoryValue = 0;
  let totalItems = 0;
  let outOfStockItems = 0;
  let lowStockItems = 0;
  const categories = new Set();

  const processedProducts = products.map((product) => {
    const value = product.stock * (product.costPrice || 0);
    totalInventoryValue += value;
    totalItems += product.stock;
    categories.add(product.category);

    // Check stock status
    let stockStatus = 'in-stock';
    if (product.stock === 0) {
      stockStatus = 'out-of-stock';
      outOfStockItems++;
    } else if (product.stock <= 10) {
      // Assuming 10 is the threshold for low stock
      stockStatus = 'low-stock';
      lowStockItems++;
    }

    return {
      ...product,
      inventoryValue: value,
      profitMargin: product.costPrice
        ? ((product.price - product.costPrice) / product.costPrice) * 100
        : 0,
      stockStatus,
    };
  });

  // Get inventory by category
  const inventoryByCategory = await Product.aggregate([
    {
      $match: query,
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalValue: {
          $sum: { $multiply: ['$stock', { $ifNull: ['$costPrice', 0] }] },
        },
      },
    },
    {
      $sort: { totalValue: -1 },
    },
  ]);

  // Get slow moving items (sold less than 5 in the last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const slowMovingItems = await Product.aggregate([
    {
      $match: {
        user: req.user._id,
      },
    },
    {
      $lookup: {
        from: 'invoices',
        let: { productId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$user', req.user._id] },
                  { $gte: ['$invoiceDate', thirtyDaysAgo] },
                  {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: '$items',
                            as: 'item',
                            cond: { $eq: ['$$item.product', '$$productId'] },
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          {
            $unwind: '$items',
          },
          {
            $match: {
              $expr: { $eq: ['$items.product', '$$productId'] },
            },
          },
          {
            $group: {
              _id: null,
              totalSold: { $sum: '$items.quantity' },
            },
          },
        ],
        as: 'sales',
      },
    },
    {
      $addFields: {
        totalSold: { $ifNull: [{ $arrayElemAt: ['$sales.totalSold', 0] }, 0] },
      },
    },
    {
      $match: {
        $or: [
          { totalSold: { $lt: 5 } }, // Less than 5 items sold in the last 30 days
          { sales: { $eq: [] } }, // No sales in the last 30 days
        ],
      },
    },
    {
      $project: {
        name: 1,
        sku: 1,
        category: 1,
        stock: 1,
        price: 1,
        costPrice: 1,
        totalSold: 1,
      },
    },
    {
      $sort: { totalSold: 1 },
    },
    {
      $limit: 10,
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalProducts: products.length,
        totalInventoryValue,
        totalItems,
        outOfStockItems,
        lowStockItems,
        categoryCount: categories.size,
      },
      products: processedProducts,
      inventoryByCategory,
      slowMovingItems,
    },
  });
});

// @desc    Export report to Excel
// @route   GET /api/v1/reports/export/:type
// @access  Private
exports.exportReport = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const { format = 'excel', ...queryParams } = req.query;

  // Call the appropriate report function based on type
  let reportData;
  switch (type) {
    case 'sales':
      reportData = await getSalesReportData(queryParams, req.user._id);
      break;
    case 'profit-and-loss':
      reportData = await getProfitAndLossReportData(queryParams, req.user._id);
      break;
    case 'inventory':
      reportData = await getInventoryReportData(queryParams, req.user._id);
      break;
    default:
      return next(new BadRequestError(`Invalid report type: ${type}`));
  }

  // Generate Excel file
  if (format === 'excel') {
    return exportToExcel(res, type, reportData);
  }
  // Generate PDF
  else if (format === 'pdf') {
    return exportToPdf(res, type, reportData);
  } else {
    return next(new BadRequestError(`Invalid format: ${format}. Use 'excel' or 'pdf'`));
  }
});

// Helper function to export report to Excel
async function exportToExcel(res, reportType, data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add report title
  worksheet.addRow([`${reportType.toUpperCase()} REPORT`]);
  worksheet.addRow([]); // Empty row

  // Add data based on report type
  switch (reportType) {
    case 'sales':
      addSalesDataToWorksheet(worksheet, data);
      break;
    case 'profit-and-loss':
      addProfitAndLossDataToWorksheet(worksheet, data);
      break;
    case 'inventory':
      addInventoryDataToWorksheet(worksheet, data);
      break;
  }

  // Set headers for Excel file download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`
  );

  // Write the workbook to the response
  await workbook.xlsx.write(res);
  res.end();
}

// Helper function to export report to PDF
async function exportToPdf(res, reportType, data) {
  try {
    const pdfBuffer = await PDFGenerator.generateReport(reportType, data);
    
    // Set headers for PDF file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`
    );
    
    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}

// Helper functions to format data for Excel worksheets
function addSalesDataToWorksheet(worksheet, data) {
  // Add period info
  worksheet.addRow(['Period', `${data.period.start} to ${data.period.end}`]);
  worksheet.addRow(['Grouped By', data.period.groupBy]);
  worksheet.addRow([]);

  // Add summary section
  worksheet.addRow(['SUMMARY']);
  worksheet.addRow([
    'Total Invoices',
    'Total Sales',
    'Total Tax',
    'Total Discount',
    'Total Shipping',
    'Avg. Order Value',
  ]);
  worksheet.addRow([
    data.summary.totalInvoices,
    data.summary.totalSales,
    data.summary.totalTax,
    data.summary.totalDiscount,
    data.summary.totalShipping,
    data.summary.avgOrderValue,
  ]);
  worksheet.addRow([]);

  // Add sales data section
  worksheet.addRow(['SALES DATA']);
  worksheet.addRow([
    'Period',
    'Invoices',
    'Total Sales',
    'Tax',
    'Discount',
    'Shipping',
    'Avg. Order Value',
  ]);

  data.salesData.forEach((item) => {
    worksheet.addRow([
      item.period,
      item.invoiceCount,
      item.totalSales,
      item.totalTax,
      item.totalDiscount,
      item.totalShipping,
      item.avgOrderValue,
    ]);
  });

  // Add top customers section
  if (data.topCustomers && data.topCustomers.length > 0) {
    worksheet.addRow([]);
    worksheet.addRow(['TOP CUSTOMERS']);
    worksheet.addRow(['Customer', 'Total Spent', 'Invoices']);
    
    data.topCustomers.forEach((customer) => {
      worksheet.addRow([
        customer.customerName,
        customer.totalSpent,
        customer.invoiceCount,
      ]);
    });
  }

  // Add top products section
  if (data.topProducts && data.topProducts.length > 0) {
    worksheet.addRow([]);
    worksheet.addRow(['TOP PRODUCTS']);
    worksheet.addRow(['Product', 'SKU', 'Quantity Sold', 'Total Revenue']);
    
    data.topProducts.forEach((product) => {
      worksheet.addRow([
        product.productName,
        product.productSku,
        product.totalQuantity,
        product.totalRevenue,
      ]);
    });
  }
}

function addProfitAndLossDataToWorksheet(worksheet, data) {
  // Add period info
  worksheet.addRow(['Period', `${data.period.start} to ${data.period.end}`]);
  worksheet.addRow([]);

  // Add revenue section
  worksheet.addRow(['REVENUE']);
  worksheet.addRow(['Total Revenue', data.revenue.total]);
  worksheet.addRow(['Tax', data.revenue.tax]);
  worksheet.addRow(['Discount', data.revenue.discount]);
  worksheet.addRow(['Shipping', data.revenue.shipping]);
  worksheet.addRow(['Total Invoices', data.revenue.invoiceCount]);
  worksheet.addRow([]);

  // Add COGS section
  worksheet.addRow(['COST OF GOODS SOLD']);
  worksheet.addRow(['Total COGS', data.costOfGoodsSold.total]);
  worksheet.addRow([]);

  // Add gross profit section
  worksheet.addRow(['GROSS PROFIT']);
  worksheet.addRow(['Amount', data.grossProfit.amount]);
  worksheet.addRow(['Margin', `${data.grossProfit.margin.toFixed(2)}%`]);
  worksheet.addRow([]);

  // Add expenses section
  worksheet.addRow(['EXPENSES']);
  worksheet.addRow(['Category', 'Amount']);
  
  data.expenses.byCategory.forEach((expense) => {
    worksheet.addRow([expense._id, expense.total]);
  });
  
  worksheet.addRow(['Total Expenses', data.expenses.total]);
  worksheet.addRow([]);

  // Add net profit section
  worksheet.addRow(['NET PROFIT']);
  worksheet.addRow(['Amount', data.netProfit.amount]);
  worksheet.addRow(['Margin', `${data.netProfit.margin.toFixed(2)}%`]);
}

function addInventoryDataToWorksheet(worksheet, data) {
  // Add summary section
  worksheet.addRow(['INVENTORY SUMMARY']);
  worksheet.addRow(['Total Products', data.summary.totalProducts]);
  worksheet.addRow(['Total Inventory Value', data.summary.totalInventoryValue]);
  worksheet.addRow(['Total Items in Stock', data.summary.totalItems]);
  worksheet.addRow(['Out of Stock Items', data.summary.outOfStockItems]);
  worksheet.addRow(['Low Stock Items', data.summary.lowStockItems]);
  worksheet.addRow(['Categories', data.summary.categoryCount]);
  worksheet.addRow([]);

  // Add inventory by category section
  if (data.inventoryByCategory && data.inventoryByCategory.length > 0) {
    worksheet.addRow(['INVENTORY BY CATEGORY']);
    worksheet.addRow(['Category', 'Products', 'Total Stock', 'Total Value']);
    
    data.inventoryByCategory.forEach((item) => {
      worksheet.addRow([
        item._id,
        item.count,
        item.totalStock,
        item.totalValue,
      ]);
    });
    
    worksheet.addRow([]);
  }

  // Add products section
  if (data.products && data.products.length > 0) {
    worksheet.addRow(['PRODUCTS']);
    worksheet.addRow([
      'Name',
      'SKU',
      'Category',
      'Stock',
      'Price',
      'Cost Price',
      'Inventory Value',
      'Profit Margin',
      'Status',
    ]);
    
    data.products.forEach((product) => {
      worksheet.addRow([
        product.name,
        product.sku,
        product.category,
        product.stock,
        product.price,
        product.costPrice || 0,
        product.inventoryValue,
        `${product.profitMargin.toFixed(2)}%`,
        product.stockStatus,
      ]);
    });
  }

  // Add slow moving items section
  if (data.slowMovingItems && data.slowMovingItems.length > 0) {
    worksheet.addRow([]);
    worksheet.addRow(['SLOW MOVING ITEMS (Last 30 Days)']);
    worksheet.addRow(['Name', 'SKU', 'Category', 'Stock', 'Sold', 'Price']);
    
    data.slowMovingItems.forEach((item) => {
      worksheet.addRow([
        item.name,
        item.sku,
        item.category,
        item.stock,
        item.totalSold || 0,
        item.price,
      ]);
    });
  }
}

// Helper functions to get report data
async function getSalesReportData(params, userId) {
  const { startDate, endDate, groupBy = 'day', customer, status } = params;
  
  // This is a simplified version - in a real app, you would call your existing report function
  // with the appropriate parameters and return the result
  return {
    period: {
      start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
      end: endDate || new Date(),
      groupBy,
    },
    summary: {
      totalInvoices: 0,
      totalSales: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalShipping: 0,
      avgOrderValue: 0,
    },
    salesData: [],
    topCustomers: [],
    topProducts: [],
  };
}

async function getProfitAndLossReportData(params, userId) {
  const { startDate, endDate } = params;
  
  // This is a simplified version - in a real app, you would call your existing report function
  // with the appropriate parameters and return the result
  return {
    period: {
      start: startDate || new Date(new Date().getFullYear(), 0, 1),
      end: endDate || new Date(),
    },
    revenue: {
      total: 0,
      tax: 0,
      discount: 0,
      shipping: 0,
      invoiceCount: 0,
    },
    costOfGoodsSold: {
      total: 0,
    },
    grossProfit: {
      amount: 0,
      margin: 0,
    },
    expenses: {
      total: 0,
      byCategory: [],
    },
    netProfit: {
      amount: 0,
      margin: 0,
    },
  };
}

async function getInventoryReportData(params, userId) {
  const { category, minStock, maxStock } = params;
  
  // This is a simplified version - in a real app, you would call your existing report function
  // with the appropriate parameters and return the result
  return {
    summary: {
      totalProducts: 0,
      totalInventoryValue: 0,
      totalItems: 0,
      outOfStockItems: 0,
      lowStockItems: 0,
      categoryCount: 0,
    },
    products: [],
    inventoryByCategory: [],
    slowMovingItems: [],
  };
}
