import React from 'react';
import { motion } from 'framer-motion';
import { FileX, Plus, Search } from 'lucide-react';
import { Button } from './button';

const EmptyState = ({
  icon: Icon = FileX,
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  action,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"
      >
        <Icon className="w-8 h-8 text-gray-400" />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-lg font-medium text-gray-900 mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-sm text-gray-500 mb-6 max-w-sm"
      >
        {description}
      </motion.p>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Button onClick={action.onClick} className="flex items-center space-x-2">
            {action.icon && <action.icon size={16} />}
            <span>{action.label}</span>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

// Pre-built empty states
export const EmptyInvoices = ({ onCreate }) => (
  <EmptyState
    icon={FileX}
    title="No invoices yet"
    description="Create your first invoice to get started with billing."
    action={onCreate ? { label: 'Create Invoice', icon: Plus, onClick: onCreate } : null}
  />
);

export const EmptyProducts = ({ onCreate }) => (
  <EmptyState
    icon={FileX}
    title="No products yet"
    description="Add products to your catalog to start selling."
    action={onCreate ? { label: 'Add Product', icon: Plus, onClick: onCreate } : null}
  />
);

export const EmptyCustomers = ({ onCreate }) => (
  <EmptyState
    icon={FileX}
    title="No customers yet"
    description="Add customers to start creating invoices."
    action={onCreate ? { label: 'Add Customer', icon: Plus, onClick: onCreate } : null}
  />
);

export const EmptySearch = ({ onClear }) => (
  <EmptyState
    icon={Search}
    title="No results found"
    description="Try adjusting your search terms or filters."
    action={onClear ? { label: 'Clear Search', onClick: onClear } : null}
  />
);

export default EmptyState;
