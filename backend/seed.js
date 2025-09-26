const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Customer = require('./models/Customer');
const Invoice = require('./models/Invoice');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agroshop');
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
        email: 'admin@agroshop.com',
        password: 'admin123', // hashed in controller
        role: 'admin',
        phone: '9876543210'
      },
      {
        name: 'Staff User',
        email: 'staff@agroshop.com',
        password: 'staff123',
        role: 'staff',
        phone: '9876543211'
      },
      {
        name: 'Customer User',
        email: 'customer@agroshop.com',
        password: 'customer123',
        role: 'customer',
        phone: '9876543212'
      },
    ]);

    // Seed Products
    const products = await Product.insertMany([
      {
        name: 'Hybrid Tomato Seeds',
        description: 'High yield hybrid tomato seeds suitable for all seasons',
        sku: 'SEED001',
        category: 'Seeds',
        price: 150,
        costPrice: 120,
        mrp: 180,
        taxRate: 5,
        unit: 'packet',
        stock: 50,
        minStockLevel: 10,
        batchNumber: 'BATCH001',
        expiryDate: new Date('2025-12-31'),
        hsnCode: '1209',
        manufacturer: 'AgroSeeds Ltd',
        createdBy: users[0]._id, // admin
      },
      {
        name: 'NPK Fertilizer 10:26:26',
        description: 'Balanced NPK fertilizer for all crops',
        sku: 'FERT001',
        category: 'Fertilizers',
        price: 850,
        costPrice: 700,
        mrp: 950,
        taxRate: 5,
        unit: 'kg',
        stock: 100,
        minStockLevel: 20,
        batchNumber: 'BATCH002',
        expiryDate: new Date('2025-06-30'),
        hsnCode: '3105',
        manufacturer: 'FertCorp India',
        createdBy: users[0]._id,
      },
      {
        name: 'Chlorpyrifos 20% EC',
        description: 'Broad spectrum insecticide for crop protection',
        sku: 'PEST001',
        category: 'Pesticides',
        price: 320,
        costPrice: 250,
        mrp: 380,
        taxRate: 5,
        unit: 'litre',
        stock: 30,
        minStockLevel: 5,
        batchNumber: 'BATCH003',
        expiryDate: new Date('2025-09-30'),
        hsnCode: '3808',
        manufacturer: 'CropCare Solutions',
        createdBy: users[0]._id,
      },
      {
        name: 'Organic Neem Oil',
        description: 'Pure neem oil for organic pest control',
        sku: 'ORG001',
        category: 'Medicines',
        price: 180,
        costPrice: 140,
        mrp: 220,
        taxRate: 0,
        unit: 'bottle',
        stock: 40,
        minStockLevel: 8,
        batchNumber: 'BATCH004',
        expiryDate: new Date('2025-08-31'),
        hsnCode: '1515',
        manufacturer: 'Organic Solutions',
        createdBy: users[0]._id,
      },
      {
        name: 'Wheat Seeds (HD-2967)',
        description: 'High yielding wheat variety suitable for irrigated conditions',
        sku: 'SEED002',
        category: 'Seeds',
        price: 45,
        costPrice: 35,
        mrp: 55,
        taxRate: 0,
        unit: 'kg',
        stock: 200,
        minStockLevel: 50,
        batchNumber: 'BATCH005',
        expiryDate: new Date('2025-11-30'),
        hsnCode: '1001',
        manufacturer: 'National Seeds Corp',
        createdBy: users[0]._id,
      },
    ]);

    // Seed Customers
    const customers = await Customer.insertMany([
      {
        name: 'Ramesh Patil',
        email: 'ramesh.patil@example.com',
        phone: '9876543210',
        address: {
          street: 'Village Shirur, Tal. Shirur',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '412210'
        },
        gstin: '27ABCDE1234F1Z5',
        farmDetails: {
          farmSize: 5,
          farmSizeUnit: 'acres',
          crops: ['Wheat', 'Tomato', 'Onion']
        },
        creditLimit: 50000,
        createdBy: users[0]._id,
      },
      {
        name: 'Sunita Sharma',
        email: 'sunita.sharma@example.com',
        phone: '9812345678',
        address: {
          street: 'Gat No. 45, Village Baramati',
          city: 'Baramati',
          state: 'Maharashtra',
          pincode: '413102'
        },
        gstin: '27FGHIJ5678K2Z5',
        farmDetails: {
          farmSize: 3,
          farmSizeUnit: 'acres',
          crops: ['Cotton', 'Sugarcane']
        },
        creditLimit: 30000,
        createdBy: users[0]._id,
      },
    ]);

    // Seed Invoices
    const invoices = await Invoice.insertMany([
      {
        invoiceNumber: 'INV-20240115-0001',
        customer: customers[0]._id,
        customerDetails: {
          name: customers[0].name,
          phone: customers[0].phone,
          email: customers[0].email,
          address: `${customers[0].address.street}, ${customers[0].address.city}`,
          gstin: customers[0].gstin
        },
        items: [
          {
            product: products[0]._id,
            name: products[0].name,
            hsnCode: products[0].hsnCode,
            quantity: 2,
            unit: products[0].unit,
            price: products[0].price,
            discount: 0,
            taxRate: products[0].taxRate,
            total: products[0].price * 2,
          },
        ],
        subtotal: products[0].price * 2,
        taxAmount: (products[0].price * 2 * products[0].taxRate) / 100,
        total: products[0].price * 2 + ((products[0].price * 2 * products[0].taxRate) / 100),
        finalTotal: Math.round(products[0].price * 2 + ((products[0].price * 2 * products[0].taxRate) / 100)),
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        createdBy: users[1]._id, // staff
      },
      {
        invoiceNumber: 'INV-20240115-0002',
        customer: customers[1]._id,
        customerDetails: {
          name: customers[1].name,
          phone: customers[1].phone,
          email: customers[1].email,
          address: `${customers[1].address.street}, ${customers[1].address.city}`,
          gstin: customers[1].gstin
        },
        items: [
          {
            product: products[1]._id,
            name: products[1].name,
            hsnCode: products[1].hsnCode,
            quantity: 1,
            unit: products[1].unit,
            price: products[1].price,
            discount: 0,
            taxRate: products[1].taxRate,
            total: products[1].price,
          },
        ],
        subtotal: products[1].price,
        taxAmount: (products[1].price * products[1].taxRate) / 100,
        total: products[1].price + ((products[1].price * products[1].taxRate) / 100),
        finalTotal: Math.round(products[1].price + ((products[1].price * products[1].taxRate) / 100)),
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
