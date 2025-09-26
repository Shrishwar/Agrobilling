const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth, adminAuth: admin } = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
// const ExcelJS = require('exceljs'); // Commented out as not installed
const PDFGenerator = require('../utils/pdfGenerator');

// @route   GET /api/reports/sales
// @desc    Generate sales report
// @access  Private
router.get('/sales', [
  auth,
  [
    check('startDate', 'Start date is required').isISO8601(),
    check('endDate', 'End date is required').isISO8601(),
    check('format', 'Invalid format').optional().isIn(['json', 'excel', 'pdf'])
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
    const { startDate, endDate, format = 'json', customer, status } = req.query;
    
    // Build query
    const query = { 
      user: req.user.userId,
      invoiceDate: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    };

    if (customer) {
      query.customer = customer;
    }

    if (status) {
      query.status = status;
    }

    // Get invoices with customer and product details
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name sku')
      .sort('invoiceDate');

    // Calculate summary
    const summary = {
      totalInvoices: invoices.length,
      totalAmount: 0,
      totalTax: 0,
      totalDiscount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      byStatus: {},
      byCustomer: {},
      byProduct: {}
    };

    // Process invoices
    invoices.forEach(invoice => {
      // Update status summary
      summary.byStatus[invoice.status] = (summary.byStatus[invoice.status] || 0) + 1;
      
      // Update customer summary
      if (invoice.customer) {
        const customerId = invoice.customer._id.toString();
        if (!summary.byCustomer[customerId]) {
          summary.byCustomer[customerId] = {
            customer: invoice.customer,
            count: 0,
            amount: 0
          };
        }
        summary.byCustomer[customerId].count += 1;
        summary.byCustomer[customerId].amount += invoice.total;
      }
      
      // Update product summary
      invoice.items.forEach(item => {
        const productId = item.product?._id?.toString() || 'unknown';
        if (!summary.byProduct[productId]) {
          summary.byProduct[productId] = {
            product: item.product || { _id: 'unknown', name: 'Unknown Product' },
            quantity: 0,
            amount: 0
          };
        }
        summary.byProduct[productId].quantity += item.quantity;
        summary.byProduct[productId].amount += (item.price * item.quantity);
      });
      
      // Update totals
      summary.totalAmount += invoice.total;
      summary.totalTax += invoice.tax || 0;
      summary.totalDiscount += invoice.discount || 0;
      summary.totalPaid += invoice.amountPaid || 0;
      summary.totalOutstanding += invoice.balance || 0;
    });

    // Convert objects to arrays
    summary.byStatus = Object.entries(summary.byStatus).map(([status, count]) => ({
      status,
      count,
      percentage: (count / summary.totalInvoices) * 100
    }));

    summary.byCustomer = Object.values(summary.byCustomer).sort((a, b) => b.amount - a.amount);
    summary.byProduct = Object.values(summary.byProduct).sort((a, b) => b.amount - a.amount);

    // Prepare response data
    const reportData = {
      summary,
      invoices,
      dateRange: {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      generatedAt: new Date()
    };

    // Return in requested format
    if (format === 'excel') {
      return generateExcelReport(reportData, res);
    } else if (format === 'pdf') {
      return generatePdfReport(reportData, 'Sales Report', res);
    }
    
    // Default to JSON
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate sales report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/reports/inventory
// @desc    Generate inventory report
// @access  Private
router.get('/inventory', [
  auth,
  [
    check('format', 'Invalid format').optional().isIn(['json', 'excel', 'pdf'])
  ]
], async (req, res) => {
  try {
    const { format = 'json', category, lowStockOnly } = req.query;
    
    // Build query
    const query = { user: req.user.userId };
    
    if (category) {
      query.category = category;
    }
    
    if (lowStockOnly === 'true') {
      query.$expr = { $lte: ['$stock', '$minStockLevel'] };
    }
    
    // Get products with category details
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort('name');
    
    // Calculate summary
    const summary = {
      totalProducts: products.length,
      totalInStock: 0,
      totalValue: 0,
      outOfStock: 0,
      lowStock: 0,
      byCategory: {}
    };
    
    // Process products
    products.forEach(product => {
      const productValue = product.stock * (product.price || 0);
      
      // Update category summary
      const categoryId = product.category?._id?.toString() || 'uncategorized';
      if (!summary.byCategory[categoryId]) {
        summary.byCategory[categoryId] = {
          category: product.category || { name: 'Uncategorized' },
          count: 0,
          value: 0,
          items: []
        };
      }
      
      summary.byCategory[categoryId].count += 1;
      summary.byCategory[categoryId].value += productValue;
      summary.byCategory[categoryId].items.push({
        id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        price: product.price,
        value: productValue,
        minStockLevel: product.minStockLevel || 0,
        status: product.stock === 0 ? 'out' : (product.stock <= (product.minStockLevel || 0) ? 'low' : 'normal')
      });
      
      // Update totals
      summary.totalInStock += product.stock;
      summary.totalValue += productValue;
      
      if (product.stock === 0) {
        summary.outOfStock += 1;
      } else if (product.stock <= (product.minStockLevel || 0)) {
        summary.lowStock += 1;
      }
    });
    
    // Convert objects to arrays
    summary.byCategory = Object.values(summary.byCategory).map(cat => ({
      ...cat,
      percentage: (cat.count / summary.totalProducts) * 100
    }));
    
    // Sort categories by value
    summary.byCategory.sort((a, b) => b.value - a.value);
    
    // Prepare response data
    const reportData = {
      summary,
      products,
      generatedAt: new Date()
    };
    
    // Return in requested format
    if (format === 'excel') {
      return generateExcelReport(reportData, res, 'Inventory');
    } else if (format === 'pdf') {
      return generatePdfReport(reportData, 'Inventory Report', res);
    }
    
    // Default to JSON
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate inventory report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/reports/profit-loss
// @desc    Generate profit and loss report
// @access  Private
router.get('/profit-loss', [
  auth,
  [
    check('startDate', 'Start date is required').isISO8601(),
    check('endDate', 'End date is required').isISO8601(),
    check('format', 'Invalid format').optional().isIn(['json', 'excel', 'pdf'])
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
    const { startDate, endDate, format = 'json' } = req.query;
    
    // Get date range for the entire period
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get all invoices in the date range
    const invoices = await Invoice.find({
      user: req.user.userId,
      invoiceDate: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }
    });
    
    // Get all expenses in the date range
    const expenses = await Expense.find({
      user: req.user.userId,
      date: { $gte: start, $lte: end },
      status: 'paid'
    });
    
    // Calculate revenue
    const revenue = invoices.reduce((total, invoice) => total + (invoice.total || 0), 0);
    
    // Calculate cost of goods sold (COGS)
    // Note: In a real app, you would calculate this based on your inventory costs
    const cogs = invoices.reduce((total, invoice) => {
      const invoiceCogs = invoice.items.reduce((itemTotal, item) => {
        // This is a simplified calculation - in reality, you'd use the actual cost of each item
        const costPrice = (item.costPrice || item.price * 0.6); // Assuming 60% cost
        return itemTotal + (costPrice * item.quantity);
      }, 0);
      return total + invoiceCogs;
    }, 0);
    
    // Calculate gross profit
    const grossProfit = revenue - cogs;
    
    // Categorize expenses
    const expenseCategories = {};
    let totalExpenses = 0;
    
    expenses.forEach(expense => {
      const category = expense.category?.toString() || 'uncategorized';
      if (!expenseCategories[category]) {
        expenseCategories[category] = {
          category: expense.category,
          amount: 0
        };
      }
      expenseCategories[category].amount += expense.amount;
      totalExpenses += expense.amount;
    });
    
    // Calculate net profit
    const netProfit = grossProfit - totalExpenses;
    
    // Prepare report data
    const reportData = {
      dateRange: { start, end },
      revenue: {
        total: revenue,
        cogs: cogs,
        grossProfit: grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0
      },
      expenses: {
        categories: Object.values(expenseCategories),
        total: totalExpenses
      },
      netProfit: {
        amount: netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0
      },
      invoices: {
        count: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        outstanding: invoices.filter(i => ['sent', 'partial'].includes(i.status)).length
      },
      generatedAt: new Date()
    };
    
    // Return in requested format
    if (format === 'excel') {
      return generateExcelReport(reportData, res, 'ProfitAndLoss');
    } else if (format === 'pdf') {
      return generatePdfReport(reportData, 'Profit & Loss Report', res);
    }
    
    // Default to JSON
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate profit and loss report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/reports/customers
// @desc    Generate customer report
// @access  Private
router.get('/customers', [
  auth,
  [
    check('format', 'Invalid format').optional().isIn(['json', 'excel', 'pdf'])
  ]
], async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    // Get all customers with their invoices
    const customers = await Customer.find({ user: req.user.userId })
      .sort('-totalPurchases')
      .lean();
    
    // Get all invoices for these customers
    const customerIds = customers.map(c => c._id);
    const invoices = await Invoice.aggregate([
      {
        $match: {
          customer: { $in: customerIds }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$total' },
          totalInvoices: { $sum: 1 },
          lastPurchase: { $max: '$invoiceDate' },
          averageOrderValue: { $avg: '$total' },
          outstandingBalance: { $sum: '$balance' }
        }
      }
    ]);
    
    // Create a map of customerId to invoice stats
    const invoiceStats = {};
    invoices.forEach(stat => {
      invoiceStats[stat._id.toString()] = {
        totalSpent: stat.totalSpent,
        totalInvoices: stat.totalInvoices,
        lastPurchase: stat.lastPurchase,
        averageOrderValue: stat.averageOrderValue,
        outstandingBalance: stat.outstandingBalance
      };
    });
    
    // Enrich customer data with invoice stats
    const customerData = customers.map(customer => ({
      ...customer,
      ...(invoiceStats[customer._id.toString()] || {
        totalSpent: 0,
        totalInvoices: 0,
        lastPurchase: null,
        averageOrderValue: 0,
        outstandingBalance: 0
      })
    }));
    
    // Calculate summary
    const summary = {
      totalCustomers: customerData.length,
      activeCustomers: customerData.filter(c => c.totalInvoices > 0).length,
      totalRevenue: customerData.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
      totalOutstanding: customerData.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),
      averageCustomerValue: customerData.length > 0 
        ? customerData.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customerData.length 
        : 0,
      topCustomers: [...customerData]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 5)
        .map(c => ({
          id: c._id,
          name: c.name,
          totalSpent: c.totalSpent,
          totalInvoices: c.totalInvoices
        }))
    };
    
    // Prepare response data
    const reportData = {
      summary,
      customers: customerData,
      generatedAt: new Date()
    };
    
    // Return in requested format
    if (format === 'excel') {
      return generateExcelReport(reportData, res, 'Customers');
    } else if (format === 'pdf') {
      return generatePdfReport(reportData, 'Customer Report', res);
    }
    
    // Default to JSON
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate customer report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Helper function to generate Excel report
async function generateExcelReport(data, res, reportType = 'Report') {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    
    // Add headers
    worksheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    
    // Add data based on report type
    if (reportType === 'Sales') {
      // Add summary data
      worksheet.addRow(['Sales Report Summary', '']);
      worksheet.addRow(['Total Invoices', data.summary.totalInvoices]);
      worksheet.addRow(['Total Amount', data.summary.totalAmount]);
      worksheet.addRow(['Total Tax', data.summary.totalTax]);
      worksheet.addRow(['Total Paid', data.summary.totalPaid]);
      worksheet.addRow(['Total Outstanding', data.summary.totalOutstanding]);
      
      // Add status breakdown
      worksheet.addRow([]);
      worksheet.addRow(['Status Breakdown', '']);
      data.summary.byStatus.forEach(status => {
        worksheet.addRow([status.status, `${status.count} (${status.percentage.toFixed(2)}%)`]);
      });
      
      // Add top customers
      worksheet.addRow([]);
      worksheet.addRow(['Top Customers', '']);
      data.summary.byCustomer.slice(0, 5).forEach(customer => {
        worksheet.addRow([
          customer.customer.name, 
          `$${customer.amount.toFixed(2)} (${customer.count} invoices)`
        ]);
      });
      
      // Add top products
      worksheet.addRow([]);
      worksheet.addRow(['Top Products', '']);
      data.summary.byProduct.slice(0, 5).forEach(product => {
        worksheet.addRow([
          product.product.name, 
          `$${product.amount.toFixed(2)} (${product.quantity} units)`
        ]);
      });
      
    } else if (reportType === 'Inventory') {
      // Add summary data
      worksheet.addRow(['Inventory Report Summary', '']);
      worksheet.addRow(['Total Products', data.summary.totalProducts]);
      worksheet.addRow(['Total Value', `$${data.summary.totalValue.toFixed(2)}`]);
      worksheet.addRow(['Out of Stock', data.summary.outOfStock]);
      worksheet.addRow(['Low Stock', data.summary.lowStock]);
      
      // Add category breakdown
      worksheet.addRow([]);
      worksheet.addRow(['Category Breakdown', '']);
      data.summary.byCategory.forEach(category => {
        worksheet.addRow([
          category.category.name, 
          `${category.count} products (${((category.count / data.summary.totalProducts) * 100).toFixed(2)}%)`
        ]);
      });
      
      // Add low stock items
      const lowStockItems = data.products.filter(p => p.stock <= (p.minStockLevel || 0));
      if (lowStockItems.length > 0) {
        worksheet.addRow([]);
        worksheet.addRow(['Low/Out of Stock Items', '']);
        lowStockItems.forEach(item => {
          worksheet.addRow([
            item.name,
            `Stock: ${item.stock} (Min: ${item.minStockLevel || 0})`
          ]);
        });
      }
      
    } else if (reportType === 'ProfitAndLoss') {
      // Add summary data
      worksheet.addRow(['Profit & Loss Report', '']);
      worksheet.addRow(['Date Range', `${data.dateRange.start.toDateString()} to ${data.dateRange.end.toDateString()}`]);
      worksheet.addRow(['Generated At', data.generatedAt.toISOString()]);
      
      // Add revenue section
      worksheet.addRow([]);
      worksheet.addRow(['Revenue', '']);
      worksheet.addRow(['Total Revenue', `$${data.revenue.total.toFixed(2)}`]);
      worksheet.addRow(['Cost of Goods Sold', `$${data.revenue.cogs.toFixed(2)}`]);
      worksheet.addRow(['Gross Profit', `$${data.revenue.grossProfit.toFixed(2)}`]);
      worksheet.addRow(['Gross Margin', `${data.revenue.grossMargin.toFixed(2)}%`]);
      
      // Add expenses section
      worksheet.addRow([]);
      worksheet.addRow(['Expenses', '']);
      data.expenses.categories.forEach(expense => {
        worksheet.addRow([expense.category?.name || 'Uncategorized', `$${expense.amount.toFixed(2)}`]);
      });
      worksheet.addRow(['Total Expenses', `$${data.expenses.total.toFixed(2)}`]);
      
      // Add net profit section
      worksheet.addRow([]);
      worksheet.addRow(['Net Profit', `$${data.netProfit.amount.toFixed(2)}`]);
      worksheet.addRow(['Net Margin', `${data.netProfit.margin.toFixed(2)}%`]);
      
    } else if (reportType === 'Customers') {
      // Add summary data
      worksheet.addRow(['Customer Report', '']);
      worksheet.addRow(['Total Customers', data.summary.totalCustomers]);
      worksheet.addRow(['Active Customers', data.summary.activeCustomers]);
      worksheet.addRow(['Total Revenue', `$${data.summary.totalRevenue.toFixed(2)}`]);
      worksheet.addRow(['Total Outstanding', `$${data.summary.totalOutstanding.toFixed(2)}`]);
      worksheet.addRow(['Average Customer Value', `$${data.summary.averageCustomerValue.toFixed(2)}`]);
      
      // Add top customers
      worksheet.addRow([]);
      worksheet.addRow(['Top Customers by Revenue', '']);
      data.summary.topCustomers.forEach(customer => {
        worksheet.addRow([
          customer.name, 
          `$${customer.totalSpent.toFixed(2)} (${customer.totalInvoices} invoices)`
        ]);
      });
      
      // Add customer list
      worksheet.addRow([]);
      worksheet.addRow(['All Customers', '']);
      worksheet.addRow(['Name', 'Email', 'Phone', 'Total Spent', 'Invoices', 'Outstanding']);
      data.customers.forEach(customer => {
        worksheet.addRow([
          customer.name,
          customer.email || '',
          customer.phone || '',
          customer.totalSpent || 0,
          customer.totalInvoices || 0,
          customer.outstandingBalance || 0
        ]);
      });
    }
    
    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportType}_${new Date().toISOString().split('T')[0]}.xlsx"`
    );
    
    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Generate Excel report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating Excel report' 
    });
  }
}

// Helper function to generate PDF report
async function generatePdfReport(data, title, res) {
  try {
    // In a real app, you would use a PDF generation library like PDFKit or pdfmake
    // This is a simplified example that returns a JSON response
    
    // For demonstration, we'll just return a success response with the data
    // In a real app, you would generate the PDF and stream it to the response
    
    res.json({
      success: true,
      message: 'PDF generation would happen here in a real implementation',
      data: {
        title,
        ...data,
        // Omit large data that's not needed for the response
        invoices: data.invoices ? '[...]' : undefined,
        products: data.products ? '[...]' : undefined,
        customers: data.customers ? '[...]' : undefined
      }
    });
    
    // In a real implementation, you would do something like this:
    /*
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    
    // Add report content based on the data
    // ...
    
    // Finalize the PDF and end the response
    doc.end();
    */
    
  } catch (error) {
    console.error('Generate PDF report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF report' 
    });
  }
}

module.exports = router;
