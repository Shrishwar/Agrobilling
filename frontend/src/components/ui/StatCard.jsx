import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend = null, 
  trendType = 'up', // 'up' or 'down'
  className = '' 
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card p-6 shadow-modern hover:shadow-modern-lg',
        className
      )}
    >
      {/* Icon */}
      <div className="absolute -top-2 -right-2 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="relative">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </p>
        <p className="text-3xl font-bold text-foreground">
          {value}
        </p>

        {/* Trend */}
        {trend !== null && (
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              trendType === 'up' ? 'text-success' : 'text-destructive'
            }`}>
              {trendType === 'up' ? '+' : ''}{trend}%
            </span>
            <motion.div
              animate={{ rotate: trendType === 'up' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
              className="ml-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
