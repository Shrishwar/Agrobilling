import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Package, Users, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    monthlyRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch invoice stats
        const invoiceRes = await axios.get('/invoices/stats/overview');
        const invoiceData = invoiceRes.data.data;

        // Fetch products count
        const productsRes = await axios.get('/products');
        const totalProducts = productsRes.data.data.length || 0;

        // Fetch customers count
        const customersRes = await axios.get('/customers');
        const totalCustomers = customersRes.data.data.length || 0;

        // Fetch recent invoices
        const invoicesRes = await axios.get('/invoices?limit=10');
        const recentInvoices = invoicesRes.data.data || [];

        // Calculate today and monthly sales from invoice data
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        const todayEnd = new Date(today.setHours(23, 59, 59, 999));
        const monthlyStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const todaySales = invoiceData.monthlySales?.find(sale => {
          const saleDate = new Date(sale._id);
          return saleDate >= todayStart && saleDate <= todayEnd;
        })?.total || 0;

        const monthlyRevenue = invoiceData.monthlySales?.reduce((sum, sale) => {
          const saleDate = new Date(sale._id);
          return saleDate >= monthlyStart ? sum + sale.total : sum;
        }, 0) || 0;

        // Prepare chart data (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date;
        });

        const chartData = last7Days.map(date => {
          const dayData = invoiceData.monthlySales?.find(sale => {
            const saleDate = new Date(sale._id);
            return saleDate.toDateString() === date.toDateString();
          });
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: dayData?.total || 0,
          };
        });

        setStats({
          todaySales,
          monthlyRevenue,
          totalProducts,
          totalCustomers,
        });
        setChartData(chartData);
        setInvoices(recentInvoices);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
    { key: 'customer', label: 'Customer', render: (value) => value?.name || 'N/A' },
    { key: 'total', label: 'Amount', render: (value) => `₹${value?.toLocaleString() || 0}` },
    { key: 'status', label: 'Status', render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === 'paid' ? 'bg-success/10 text-success' :
        value === 'pending' ? 'bg-warning/10 text-warning' :
        'bg-destructive/10 text-destructive'
      }`}>
        {value?.charAt(0).toUpperCase() + value?.slice(1) || 'Unknown'}
      </span>
    )},
    { key: 'createdAt', label: 'Date', render: (value) => new Date(value).toLocaleDateString() },
  ];

  const invoiceActions = [
    {
      label: 'View',
      onClick: (invoice) => {
        // Handle view invoice
        console.log('View invoice:', invoice);
      },
      icon: FileText,
      variant: 'ghost'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <Button>
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Today's Sales"
            value={`₹${stats.todaySales.toLocaleString()}`}
            icon={DollarSign}
            trend={12}
            trendType="up"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
            icon={TrendingUp}
            trend={8}
            trendType="up"
          />
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Package}
            trend={5}
            trendType="up"
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            trend={15}
            trendType="up"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-modern p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-modern p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                <Bar dataKey="sales" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-modern"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
          </div>
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            searchPlaceholder="Search invoices..."
            emptyMessage="No invoices found"
            actions={invoiceActions}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-modern p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-16 text-base" onClick={() => window.location.href = '/admin/products'}>
              <Package className="w-5 h-5 mr-2" />
              Manage Products
            </Button>
            <Button variant="outline" className="h-16 text-base" onClick={() => window.location.href = '/admin/reports'}>
              <BarChart3 className="w-5 h-5 mr-2" />
              View Reports
            </Button>
            <Button variant="outline" className="h-16 text-base" onClick={() => window.location.href = '/admin/staff'}>
              <Users className="w-5 h-5 mr-2" />
              Manage Staff
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
