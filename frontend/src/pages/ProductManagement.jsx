import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search, 
  Filter,
  Download,
  Upload,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Dialog from '../components/ui/Dialog';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Form, FormField, FormSelect, FormTextarea } from '../components/ui/Form';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().min(1, 'SKU is required'),
  hsnCode: z.string().min(1, 'HSN code is required'),
  price: z.number().min(0, 'Price must be positive'),
  costPrice: z.number().min(0, 'Cost price must be positive').optional(),
  mrp: z.number().min(0, 'MRP must be positive').optional(),
  stock: z.number().min(0, 'Stock must be positive'),
  minStockLevel: z.number().min(0, 'Minimum stock level must be positive').optional(),
  unit: z.string().min(1, 'Unit is required'),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0-100'),
  manufacturer: z.string().optional(),
  batchNumber: z.string().optional(),
});

const ProductManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      
      if (editingProduct) {
        await axios.put(`/products/${editingProduct._id}`, data);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/products', data);
        toast.success('Product created successfully');
      }
      
      setProductModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`/products/${productToDelete._id}`);
      toast.success('Product deleted successfully');
      setDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'Seeds', label: 'Seeds' },
    { value: 'Fertilizers', label: 'Fertilizers' },
    { value: 'Pesticides', label: 'Pesticides' },
    { value: 'Medicines', label: 'Medicines' },
    { value: 'Tools', label: 'Tools' },
    { value: 'Equipment', label: 'Equipment' },
    { value: 'Other', label: 'Other' },
  ];

  const unitOptions = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'litre', label: 'Litre (L)' },
    { value: 'ml', label: 'Millilitre (ml)' },
    { value: 'packet', label: 'Packet' },
    { value: 'box', label: 'Box' },
    { value: 'piece', label: 'Piece' },
    { value: 'meter', label: 'Meter' },
    { value: 'bottle', label: 'Bottle' },
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productColumns = [
    { 
      key: 'name', 
      label: 'Product Name', 
      sortable: true,
      render: (value, product) => (
        <div className="flex items-center space-x-3">
          <img
            src={product.image || 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=100'}
            alt={value}
            className="w-10 h-10 object-cover rounded-lg"
          />
          <div>
            <p className="font-medium">{value}</p>
            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
          </div>
        </div>
      )
    },
    { key: 'category', label: 'Category', sortable: true },
    { 
      key: 'price', 
      label: 'Price', 
      sortable: true,
      render: (value) => `₹${value?.toLocaleString() || 0}`
    },
    { 
      key: 'stock', 
      label: 'Stock', 
      sortable: true,
      render: (value, product) => (
        <div className="flex items-center space-x-2">
          <span>{value}</span>
          {value <= (product.minStockLevel || 10) && (
            <AlertTriangle size={16} className="text-yellow-500" />
          )}
        </div>
      )
    },
    { 
      key: 'stockStatus', 
      label: 'Status',
      render: (_, product) => {
        const status = product.stock <= 0 ? 'out' : 
                     product.stock <= (product.minStockLevel || 10) ? 'low' : 'good';
        return (
          <Badge variant={
            status === 'out' ? 'destructive' : 
            status === 'low' ? 'warning' : 
            'success'
          }>
            {status === 'out' ? 'Out of Stock' : 
             status === 'low' ? 'Low Stock' : 
             'In Stock'}
          </Badge>
        );
      }
    },
  ];

  const productActions = [
    {
      label: 'Edit',
      onClick: handleEdit,
      icon: Edit,
      variant: 'ghost'
    },
    {
      label: 'Delete',
      onClick: openDeleteModal,
      icon: Trash2,
      variant: 'ghost'
    }
  ];

  // Calculate stats
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= (p.minStockLevel || 10)).length;
  const outOfStockProducts = products.filter(p => p.stock <= 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1">Manage your product inventory</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Upload size={16} className="mr-2" />
              Import
            </Button>
            <Button onClick={() => {
              setEditingProduct(null);
              setProductModalOpen(true);
            }}>
              <Plus size={16} className="mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
                  </div>
                  <Package className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-3xl font-bold text-yellow-600">{lowStockProducts}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-3xl font-bold text-red-600">{outOfStockProducts}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Value</p>
                    <p className="text-3xl font-bold text-green-600">₹{totalValue.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <Button variant="outline">
                  <Filter size={16} className="mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <DataTable
            columns={productColumns}
            data={filteredProducts}
            searchPlaceholder="Search products..."
            emptyMessage="No products found"
            actions={productActions}
          />
        </motion.div>

        {/* Add/Edit Product Modal */}
        <Dialog
          isOpen={productModalOpen}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          size="xl"
        >
          <Form
            schema={productSchema}
            onSubmit={handleSubmit}
            defaultValues={editingProduct || {
              category: 'Seeds',
              unit: 'kg',
              taxRate: 5,
              stock: 0,
              minStockLevel: 10
            }}
            submitLabel={editingProduct ? 'Update Product' : 'Add Product'}
            loading={submitting}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  name="name"
                  label="Product Name"
                  placeholder="Enter product name"
                  required
                />
                
                <FormTextarea
                  name="description"
                  label="Description"
                  placeholder="Enter product description"
                  rows={3}
                />

                <FormSelect
                  name="category"
                  label="Category"
                  options={categories.slice(1)} // Remove 'all' option
                  required
                />

                <FormField
                  name="sku"
                  label="SKU"
                  placeholder="Enter SKU"
                  required
                />

                <FormField
                  name="hsnCode"
                  label="HSN Code"
                  placeholder="Enter HSN code"
                  required
                />

                <FormField
                  name="manufacturer"
                  label="Manufacturer"
                  placeholder="Enter manufacturer name"
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="price"
                    label="Selling Price"
                    type="number"
                    placeholder="0"
                    required
                  />
                  
                  <FormField
                    name="costPrice"
                    label="Cost Price"
                    type="number"
                    placeholder="0"
                  />
                </div>

                <FormField
                  name="mrp"
                  label="MRP"
                  type="number"
                  placeholder="0"
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    name="stock"
                    label="Current Stock"
                    type="number"
                    placeholder="0"
                    required
                  />
                  
                  <FormField
                    name="minStockLevel"
                    label="Min Stock Level"
                    type="number"
                    placeholder="10"
                  />
                </div>

                <FormSelect
                  name="unit"
                  label="Unit"
                  options={unitOptions}
                  required
                />

                <FormField
                  name="taxRate"
                  label="Tax Rate (%)"
                  type="number"
                  placeholder="5"
                  required
                />

                <FormField
                  name="batchNumber"
                  label="Batch Number"
                  placeholder="Enter batch number"
                />
              </div>
            </div>
          </Form>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setProductToDelete(null);
          }}
          title="Delete Product"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <AlertTriangle size={24} className="text-red-600" />
              <div>
                <p className="font-medium text-red-900">Are you sure?</p>
                <p className="text-sm text-red-700">This action cannot be undone.</p>
              </div>
            </div>
            {productToDelete && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="font-medium text-gray-900">{productToDelete.name}</p>
                <p className="text-sm text-gray-600">SKU: {productToDelete.sku}</p>
                <p className="text-sm text-gray-600">Stock: {productToDelete.stock}</p>
              </div>
            )}
          </div>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ProductManagement;