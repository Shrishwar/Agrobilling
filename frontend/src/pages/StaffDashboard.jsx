import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, User, Package, Plus, Receipt, BarChart3, FileText, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const [invoicesRes, productsRes] = await Promise.all([
        axios.get('/invoices/stats/overview'),
        axios.get('/products/stats/low-stock')
      ]);

      const invoiceData = invoicesRes.data.data || {};
      const lowStockData = productsRes.data.data || [];

      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = invoiceData.monthlySales?.find(sale => 
        sale._id === today
      )?.count || 0;
      
      const todaySales = invoiceData.monthlySales?.find(sale => 
        sale._id === today
      )?.total || 0;

      setStats({
        todaySales,
        todayOrders,
        pendingOrders: invoiceData.salesByStatus?.find(s => s.status === 'pending')?.count || 0,
        lowStockItems: lowStockData.length || 0,
      });

      // Mock recent orders
      setRecentOrders([
        { id: 'INV-001', customer: 'John Doe', amount: 1250, status: 'completed', time: '10:30 AM' },
        { id: 'INV-002', customer: 'Jane Smith', amount: 850, status: 'pending', time: '11:15 AM' },
        { id: 'INV-003', customer: 'Bob Johnson', amount: 2100, status: 'completed', time: '12:00 PM' },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <Link to="/pos">
            <Button>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Open POS
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Today's Sales"
            value={`₹${stats.todaySales.toLocaleString()}`}
            icon={TrendingUp}
            trend={12}
            trendType="up"
          />
          <StatCard
            title="Today's Orders"
            value={stats.todayOrders}
            icon={ShoppingCart}
            trend={8}
            trendType="up"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={FileText}
            trend={-5}
            trendType="down"
          />
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={Package}
            trend={0}
            trendType="neutral"
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Link to="/pos">
            <Card className="hover:shadow-modern-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <ShoppingCart size={48} className="text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">POS Billing</h3>
                <p className="text-gray-600">Quick billing and invoice generation</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/staff/products">
            <Card className="hover:shadow-modern-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <Package size={48} className="text-secondary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Products</h3>
                <p className="text-gray-600">View and update product inventory</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/staff/customers">
            <Card className="hover:shadow-modern-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <User size={48} className="text-accent mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Customers</h3>
                <p className="text-gray-600">Add and manage customer information</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Receipt className="mr-2" size={20} />
                  Recent Orders
                </span>
                <Link to="/staff/invoices">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                      <p className="text-xs text-gray-500">{order.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">₹{order.amount.toLocaleString()}</p>
                      <Badge variant={order.status === 'completed' ? 'success' : 'warning'}>
                        {order.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default StaffDashboard;