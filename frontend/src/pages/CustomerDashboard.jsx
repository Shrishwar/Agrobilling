import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText, Download, Receipt } from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCustomerData = async () => {
      try {
        setLoading(true);

        // Fetch customer-specific invoices
        const invoicesRes = await axios.get(`/invoices/customer/${user.id}`);

        const customerInvoices = invoicesRes.data.data || [];

        // Calculate outstanding balance
        const outstandingBalance = customerInvoices
          .filter(invoice => invoice.status !== 'paid')
          .reduce((total, invoice) => total + (invoice.balance || 0), 0);

        setInvoices(customerInvoices);
        setBalance(outstandingBalance);
      } catch (err) {
        console.error('Error fetching customer data:', err);
        toast.error('Failed to load your data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [user]);

  const downloadInvoice = async (invoiceId) => {
    try {
      // Open PDF in new tab
      window.open(`http://localhost:5000/api/invoices/${invoiceId}/download`, '_blank');
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Failed to download invoice');
    }
  };

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: (value) => value || 'N/A' },
    { key: 'invoiceDate', label: 'Date', render: (value) => new Date(value).toLocaleDateString() },
    { key: 'total', label: 'Amount', render: (value) => `₹${value?.toLocaleString() || 0}` },
    { key: 'status', label: 'Status', render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === 'paid' ? 'bg-success/10 text-success' :
        value === 'partially_paid' ? 'bg-warning/10 text-warning' :
        'bg-destructive/10 text-destructive'
      }`}>
        {value?.replace('_', ' ').toUpperCase() || 'PENDING'}
      </span>
    )},
    { key: 'balance', label: 'Balance', render: (value) => `₹${value?.toLocaleString() || 0}` },
  ];

  const invoiceActions = [
    {
      label: 'Download',
      onClick: (invoice) => downloadInvoice(invoice._id),
      icon: Download,
      variant: 'ghost'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading your dashboard...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Customer Portal</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
          </div>
        </div>

        {/* Balance Stat Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <StatCard
            title="Outstanding Balance"
            value={`₹${balance.toLocaleString()}`}
            icon={DollarSign}
            trend={0}
            trendType="neutral"
          />
          <StatCard
            title="Total Invoices"
            value={invoices.length}
            icon={FileText}
            trend={0}
            trendType="neutral"
          />
          <StatCard
            title="Paid Invoices"
            value={invoices.filter(inv => inv.status === 'paid').length}
            icon={Receipt}
            trend={0}
            trendType="neutral"
          />
        </motion.div>

        {/* Invoice History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-modern"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
            <p className="text-sm text-gray-600 mt-1">
              View and download your invoices
            </p>
          </div>
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            searchPlaceholder="Search invoices..."
            emptyMessage="No invoices found"
            actions={invoiceActions}
          />
        </motion.div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;
