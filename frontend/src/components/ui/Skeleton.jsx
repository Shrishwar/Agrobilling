import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const Skeleton = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    square: 'h-10 w-10',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    button: 'h-10 w-24',
    card: 'h-32 w-full',
    table: 'h-12 w-full'
  };

  return (
    <motion.div
      className={cn(
        'bg-gray-200 rounded animate-pulse',
        variants[variant] || variants.default,
        className
      )}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
};

// Pre-built skeleton components
export const SkeletonCard = ({ className = '' }) => (
  <div className={cn('bg-white p-6 rounded-lg shadow-modern', className)}>
    <Skeleton variant="title" className="mb-4" />
    <Skeleton variant="text" className="mb-2" />
    <Skeleton variant="text" className="w-1/2" />
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={cn('bg-white rounded-lg shadow-modern', className)}>
    {/* Header */}
    <div className="p-4 border-b border-gray-200">
      <Skeleton variant="text" className="w-1/4" />
    </div>
    {/* Rows */}
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} variant="table" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonForm = ({ fields = 4, className = '' }) => (
  <div className={cn('bg-white p-6 rounded-lg shadow-modern space-y-4', className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton variant="text" className="w-1/4" />
        <Skeleton variant="button" />
      </div>
    ))}
  </div>
);

export default Skeleton;
