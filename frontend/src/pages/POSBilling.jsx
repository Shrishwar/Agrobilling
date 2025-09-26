import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Search, 
  Receipt, 
  Printer,
  Calculator,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Dialog from '../components/ui/Dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const POSBilling = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal states
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, customersRes] = await Promise.all([
        axios.get('/products'),
        axios.get('/customers')
      ]);

      setProducts(productsRes.data.data || []);
      setCustomers(customersRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm)
  );

  const addToCart = (product, quantity = 1) => {
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }

    const existingItem = cart.find(item => item.product._id === product._id);
    if (existingItem) {
      updateCartQuantity(product._id, existingItem.quantity + quantity);
    } else {
      setCart([...cart, {
        product,
        quantity,
        price: product.price,
        discount: 0
      }]);
    }
    toast.success('Added to cart');
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find(item => item.product._id === productId);
    if (item && newQuantity > item.product.stock) {
      toast.error(`Only ${item.product.stock} items available`);
      return;
    }

    setCart(cart.map(item =>
      item.product._id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product._id !== productId));
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.price * item.quantity;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const gstAmount = afterDiscount * ((item.product.taxRate || 0) / 100);
    return afterDiscount + gstAmount;
  };

  const calculateCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
    const afterDiscount = subtotal - totalDiscount - (subtotal * discount / 100);
    const gstAmount = cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity * (1 - item.discount / 100);
      return sum + (itemSubtotal * ((item.product.taxRate || 0) / 100));
    }, 0);
    const total = afterDiscount + gstAmount;

    return {
      subtotal,
      totalDiscount: totalDiscount + (subtotal * discount / 100),
      gstAmount,
      total: Math.round(total)
    };
  };

  const processPayment = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setProcessing(true);

      const totals = calculateCartTotals();
      const invoiceData = {
        customer: selectedCustomer._id,
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount
        })),
        discount,
        paymentMethod,
        total: totals.total,
        notes: 'POS Sale'
      };

      const response = await axios.post('/invoices', invoiceData);
      
      toast.success('Payment processed successfully!');
      
      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setCheckoutModalOpen(false);

      // Print/Download invoice
      if (response.data.data?._id) {
        window.open(`http://localhost:5000/api/invoices/${response.data.data._id}/download`, '_blank');
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateCartTotals();

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
            <h1 className="text-3xl font-bold text-gray-900">POS Billing</h1>
            <p className="text-gray-600 mt-1">Quick billing and invoice generation</p>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Cart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ShoppingCart className="mr-2" size={20} />
                    Cart ({cart.length} items)
                  </span>
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCart([])}
                    >
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Cart is empty</h3>
                    <p className="text-gray-600">Add products to start billing</p>
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
                            ₹{item.price} each | GST: {item.product.taxRate || 0}%
                          </p>
                          <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateCartQuantity(item.product._id, item.quantity - 1)}
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="w-12 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateCartQuantity(item.product._id, item.quantity + 1)}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>

                          {/* Item Total */}
                          <div className="text-right min-w-[80px]">
                            <p className="font-semibold">₹{calculateItemTotal(item).toFixed(2)}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.product._id)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Billing Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Customer Info */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                    {selectedCustomer.gstin && (
                      <p className="text-sm text-gray-600">GSTIN: {selectedCustomer.gstin}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bill Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="mr-2" size={20} />
                  Bill Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>₹{totals.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>₹{totals.total}</span>
                  </div>
                </div>

                {/* Discount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Overall Discount (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center space-x-2">
                          <Banknote size={16} />
                          <span>Cash</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center space-x-2">
                          <CreditCard size={16} />
                          <span>Card</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="upi">
                        <div className="flex items-center space-x-2">
                          <Smartphone size={16} />
                          <span>UPI</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => setCheckoutModalOpen(true)}
                    className="w-full"
                    disabled={!selectedCustomer || cart.length === 0}
                  >
                    <Receipt className="mr-2" size={16} />
                    Proceed to Checkout
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Printer className="mr-1" size={14} />
                      Print
                    </Button>
                    <Button variant="outline" size="sm">
                      Hold Bill
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Customer Selection Modal */}
        <Dialog
          isOpen={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          title="Select Customer"
          size="lg"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder="Search customers by name or phone..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredCustomers.map((customer) => (
                <motion.div
                  key={customer._id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setCustomerModalOpen(false);
                    setCustomerSearchTerm('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{customer.name}</h4>
                      <p className="text-sm text-gray-600">{customer.phone}</p>
                      <p className="text-sm text-gray-600">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className="font-medium text-primary">₹{customer.outstandingBalance || 0}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8">
                <User size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No customers found</p>
              </div>
            )}
          </div>
        </Dialog>

        {/* Product Selection Modal */}
        <Dialog
          isOpen={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          title="Add Product"
          size="xl"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product._id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    addToCart(product);
                    setProductModalOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={product.image || 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=100'}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{product.name}</h4>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-primary">₹{product.price}</span>
                        <Badge variant={product.stock > 10 ? 'default' : 'destructive'}>
                          Stock: {product.stock}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <Search size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No products found</p>
              </div>
            )}
          </div>
        </Dialog>

        {/* Checkout Modal */}
        <Dialog
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          title="Checkout"
          size="lg"
        >
          <div className="space-y-6">
            {/* Customer Info */}
            {selectedCustomer && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Customer</h4>
                <p className="text-blue-800">{selectedCustomer.name}</p>
                <p className="text-sm text-blue-700">{selectedCustomer.phone}</p>
              </div>
            )}

            {/* Bill Summary */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Bill Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal ({cart.length} items):</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>₹{totals.gstAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Total Amount:</span>
                  <span>₹{totals.total}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash', label: 'Cash', icon: Banknote },
                  { value: 'card', label: 'Card', icon: CreditCard },
                  { value: 'upi', label: 'UPI', icon: Smartphone }
                ].map((method) => (
                  <Button
                    key={method.value}
                    variant={paymentMethod === method.value ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method.value)}
                    className="flex flex-col items-center space-y-1 h-16"
                  >
                    <method.icon size={20} />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setCheckoutModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={processPayment}
                loading={processing}
                className="flex-1"
              >
                {processing ? 'Processing...' : `Pay ₹${totals.total}`}
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
};

export default POSBilling;