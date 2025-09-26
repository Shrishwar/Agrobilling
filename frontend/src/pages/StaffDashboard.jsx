import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, User, Package, Plus, Minus, Trash2, Receipt, Search } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Dialog from '../components/ui/Dialog';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Form, FormField } from '../components/ui/Form';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Modal states
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, customersRes] = await Promise.all([
          axios.get('/products'),
          axios.get('/customers')
        ]);

        setProducts(productsRes.data.data || []);
        setCustomers(customersRes.data.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load products and customers');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm)
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const addToCart = (product, quantity = 1, discount = 0) => {
    if (!product || quantity <= 0) return;

    // Check stock availability
    if (quantity > product.stock) {
      toast.error(`Insufficient stock. Available: ${product.stock}`);
      return;
    }

    const existingItem = cart.find(item => item.product._id === product._id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product._id === product._id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        quantity,
        discount: discount || 0,
        price: product.price
      }]);
    }
    setProductModalOpen(false);
    setProductSearchTerm('');
    toast.success('Added to cart');
  };

  const updateCartItem = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find(item => item.product._id === productId);
    if (item && quantity > item.product.stock) {
      toast.error(`Insufficient stock. Available: ${item.product.stock}`);
      return;
    }

    setCart(cart.map(item =>
      item.product._id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product._id !== productId));
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.price * item.quantity * (1 - item.discount / 100);
    const gst = subtotal * ((item.product.gstRate || 0) / 100);
    return subtotal + gst;
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const generateInvoice = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setGeneratingInvoice(true);

      const invoiceData = {
        customer: selectedCustomer._id,
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount
        })),
        paymentMethod: 'cash',
        notes: 'Generated from POS'
      };

      const response = await axios.post('/invoices', invoiceData);

      toast.success('Invoice generated successfully!');
      setCart([]);
      setSelectedCustomer(null);

      // Open PDF
      if (response.data.data && response.data.data._id) {
        window.open(`http://localhost:5000/api/invoices/${response.data.data._id}/download`, '_blank');
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const customerColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
  ];

  const customerActions = [
    {
      label: 'Select',
      onClick: (customer) => {
        setSelectedCustomer(customer);
        setCustomerModalOpen(false);
        setCustomerSearchTerm('');
      },
      variant: 'default'
    }
  ];

  const productColumns = [
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: 'Price', render: (value) => `₹${value}` },
    { key: 'stock', label: 'Stock' },
  ];

  const productActions = [
    {
      label: 'Add to Cart',
      onClick: (product) => {
        addToCart(product);
      },
      variant: 'default'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading POS system...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-gray-600 mt-1">Manage sales and generate invoices</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCustomerModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <User size={16} />
              <span>{selectedCustomer ? selectedCustomer.name : 'Select Customer'}</span>
            </Button>
            <Button
              onClick={() => setProductModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white rounded-lg shadow-modern"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Cart ({cart.length} items)
                </h2>
                {cart.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCart([])}
                  >
                    Clear Cart
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cart is empty</h3>
                  <p className="text-gray-600">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <motion.div
                      key={item.product._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          ₹{item.price} each | GST: {item.product.gstRate || 0}%
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateCartItem(item.product._id, item.quantity - 1)}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateCartItem(item.product._id, item.quantity + 1)}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>

                        <div className="text-right">
                          <p className="font-medium">₹{calculateItemTotal(item).toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-modern p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

            {selectedCustomer && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Customer:</strong> {selectedCustomer.name}
                </p>
                <p className="text-sm text-blue-600">{selectedCustomer.phone}</p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{cart.reduce((sum, item) => sum + (item.price * item.quantity * (1 - item.discount / 100)), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST:</span>
                <span>₹{cart.reduce((sum, item) => sum + (item.price * item.quantity * (1 - item.discount / 100) * ((item.product.gstRate || 0) / 100)), 0).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={generateInvoice}
              className="w-full flex items-center justify-center space-x-2"
              disabled={generatingInvoice || !selectedCustomer || cart.length === 0}
              loading={generatingInvoice}
            >
              <Receipt size={16} />
              <span>{generatingInvoice ? 'Generating...' : 'Generate Invoice'}</span>
            </Button>

            {(!selectedCustomer || cart.length === 0) && (
              <p className="text-sm text-red-600 mt-2 text-center">
                {!selectedCustomer ? 'Select a customer' : 'Add items to cart'}
              </p>
            )}
          </motion.div>
        </div>

        {/* Customer Selection Modal */}
        <Dialog
          isOpen={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          title="Select Customer"
          size="xl"
        >
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search customers..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="mb-4"
            />
            <DataTable
              columns={customerColumns}
              data={filteredCustomers}
              searchPlaceholder="Search customers..."
              emptyMessage="No customers found"
              actions={customerActions}
            />
          </div>
        </Dialog>

        {/* Product Selection Modal */}
        <Dialog
          isOpen={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          title="Add Product to Cart"
          size="xl"
        >
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search products..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="mb-4"
            />
            <DataTable
              columns={productColumns}
              data={filteredProducts}
              searchPlaceholder="Search products..."
              emptyMessage="No products found"
              actions={productActions}
            />
          </div>
        </Dialog>
      </div>
    </Layout>
  );
};

export default StaffDashboard;
