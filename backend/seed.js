const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Invoice = require('./models/Invoice');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agro-billing');
    console.log('MongoDB connected for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Invoice.deleteMany({});

    // Seed Users
    const users = await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@agrobilling.com',
        password: 'admin123', // hashed in controller
        role: 'admin',
        phone: '9876543210'
      },
      {
        name: 'Staff User',
        email: 'staff@agrobilling.com',
        password: 'staff123',
        role: 'staff',
        phone: '9876543211'
      },
      {
        name: 'Customer User',
        email: 'customer@agrobilling.com',
        password: 'customer123',
        role: 'customer',
        phone: '9876543212'
      },
    ]);

    // Seed Products
    const products = await Product.insertMany([
      {
        name: 'Organic Rice 1kg',
        sku: 'RICE001',
        category: 'Seeds',
        price: 50,
        costPrice: 40,
        taxRate: 5,
        unit: 'kg',
        stock: 100,
        batchNumber: 'BATCH001',
        expiryDate: new Date('2025-12-31'),
        hsnCode: '1001',
        createdBy: users[0]._id, // admin
      },
      {
        name: 'Wheat Flour 1kg',
        sku: 'WHEAT001',
        category: 'Seeds',
        price: 40,
        costPrice: 30,
        taxRate: 5,
        unit: 'kg',
        stock: 50,
        batchNumber: 'BATCH002',
        expiryDate: new Date('2025-06-30'),
        hsnCode: '1002',
        createdBy: users[0]._id,
      },
      {
        name: 'Sugar 1kg',
        sku: 'SUGAR001',
        category: 'Other',
        price: 45,
        costPrice: 35,
        taxRate: 5,
        unit: 'kg',
        stock: 75,
        batchNumber: 'BATCH003',
        expiryDate: new Date('2025-09-30'),
        hsnCode: '1003',
        createdBy: users[0]._id,
      },
    ]);

    // Seed Customers
    const customers = await Customer.insertMany([
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        address: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          pincode: '123456'
        },
        gstin: '27ABCDE1234F1Z5',
        createdBy: users[0]._id,
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '9812345678',
        address: {
          street: '456 Oak Ave',
          city: 'City',
          state: 'State',
          pincode: '123456'
        },
        gstin: '27FGHIJ5678K2Z5',
        createdBy: users[0]._id,
      },
    ]);

    // Seed Invoices
    const invoices = await Invoice.insertMany([
      {
        invoiceNumber: 'INV001',
        customer: customers[0]._id,
        items: [
          {
            product: products[0]._id,
            name: 'Organic Rice 1kg',
            hsnCode: '1001',
            quantity: 2,
            unit: 'kg',
            price: 50,
            discount: 0,
            taxRate: 5,
            total: 105,
          },
        ],
        subtotal: 100,
        taxAmount: 5,
        total: 105,
        finalTotal: 105,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        createdBy: users[1]._id, // staff
      },
      {
        invoiceNumber: 'INV002',
        customer: customers[1]._id,
        items: [
          {
            product: products[1]._id,
            name: 'Wheat Flour 1kg',
            hsnCode: '1002',
            quantity: 1,
            unit: 'kg',
            price: 40,
            discount: 10,
            taxRate: 5,
            total: 37.8,
          },
        ],
        subtotal: 36,
        taxAmount: 1.8,
        total: 37.8,
        finalTotal: 38,
        paymentStatus: 'pending',
        paymentMethod: 'upi',
        createdBy: users[1]._id,
      },
    ]);

    console.log('Seed data inserted successfully!');
    console.log('Users:', users.length);
    console.log('Products:', products.length);
    console.log('Customers:', customers.length);
    console.log('Invoices:', invoices.length);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
