import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Package,
  FileText,
  BarChart3,
  CreditCard,
  Bell,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  ShoppingCart,
  Camera,
  Sun
} from 'lucide-react';

const getMenuItems = (role) => {
  const baseItems = [
    { icon: Home, label: 'Dashboard', path: role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/customer', roles: ['admin', 'staff', 'customer'] },
  ];

  const adminItems = [
    { icon: Package, label: 'Products', path: '/admin/products', roles: ['admin'] },
    { icon: Users, label: 'Customers', path: '/admin/customers', roles: ['admin'] },
    { icon: FileText, label: 'Invoices', path: '/admin/invoices', roles: ['admin'] },
    { icon: ShoppingCart, label: 'POS Billing', path: '/pos', roles: ['admin'] },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports', roles: ['admin'] },
    { icon: CreditCard, label: 'Expenses', path: '/admin/expenses', roles: ['admin'] },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications', roles: ['admin'] },
    { icon: Settings, label: 'Settings', path: '/admin/settings', roles: ['admin'] },
  ];

  const staffItems = [
    { icon: ShoppingCart, label: 'POS Billing', path: '/pos', roles: ['staff'] },
    { icon: Package, label: 'Products', path: '/staff/products', roles: ['staff'] },
    { icon: Users, label: 'Customers', path: '/staff/customers', roles: ['staff'] },
    { icon: FileText, label: 'Invoices', path: '/staff/invoices', roles: ['staff'] },
    { icon: Bell, label: 'Notifications', path: '/staff/notifications', roles: ['staff'] },
  ];

  const customerItems = [
    { icon: FileText, label: 'My Orders', path: '/customer/orders', roles: ['customer'] },
    { icon: Bell, label: 'Notifications', path: '/customer/notifications', roles: ['customer'] },
    { icon: User, label: 'Profile', path: '/customer/profile', roles: ['customer'] },
  ];

  if (role === 'admin') return [...baseItems, ...adminItems];
  if (role === 'staff') return [...baseItems, ...staffItems];
  if (role === 'customer') return [...baseItems, ...customerItems];
  return baseItems;
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = getMenuItems(user?.role);
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="fixed left-0 top-0 h-full bg-white shadow-modern-lg z-40 lg:z-0 lg:relative lg:shadow-none"
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-semibold text-primary"
              >
                AgroShop
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={onClose || (() => setCollapsed(!collapsed))}
          className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-120px)]">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-modern'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
              }`}
              onClick={onClose}
            >
              <Icon size={20} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="min-w-0 flex-1"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={handleLogout}
            className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-200"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Sidebar;
