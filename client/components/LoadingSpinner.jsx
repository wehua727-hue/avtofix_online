import React from 'react';
import { Wrench, Users, Package, Store } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'rose', 
  className = '', 
  type = 'spinner',
  text = '',
  icon = null 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-20 w-20'
  };

  const colorClasses = {
    rose: 'border-rose-200 dark:border-rose-500/30 border-t-rose-600 dark:border-t-rose-500',
    blue: 'border-blue-200 dark:border-blue-500/30 border-t-blue-600 dark:border-t-blue-500',
    emerald: 'border-emerald-200 dark:border-emerald-500/30 border-t-emerald-600 dark:border-t-emerald-500',
    teal: 'border-teal-200 dark:border-teal-500/30 border-t-teal-600 dark:border-t-teal-500',
    purple: 'border-purple-200 dark:border-purple-500/30 border-t-purple-600 dark:border-t-purple-500',
    orange: 'border-orange-200 dark:border-orange-500/30 border-t-orange-600 dark:border-t-orange-500',
    gray: 'border-gray-300 dark:border-gray-500/30 border-t-gray-600 dark:border-t-gray-500'
  };

  const iconColorClasses = {
    rose: 'text-rose-600 dark:text-rose-500',
    blue: 'text-blue-600 dark:text-blue-500',
    emerald: 'text-emerald-600 dark:text-emerald-500',
    teal: 'text-teal-600 dark:text-teal-500',
    purple: 'text-purple-600 dark:text-purple-500',
    orange: 'text-orange-600 dark:text-orange-500',
    gray: 'text-gray-600 dark:text-gray-500'
  };

  const textColorClasses = {
    rose: 'text-rose-700 dark:text-rose-400',
    blue: 'text-blue-700 dark:text-blue-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    teal: 'text-teal-700 dark:text-teal-400',
    purple: 'text-purple-700 dark:text-purple-400',
    orange: 'text-orange-700 dark:text-orange-400',
    gray: 'text-gray-700 dark:text-gray-400'
  };

  const bgGradientClasses = {
    rose: 'bg-gradient-to-r from-rose-500 to-rose-600',
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    teal: 'bg-gradient-to-r from-teal-500 to-teal-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
    orange: 'bg-gradient-to-r from-orange-500 to-orange-600',
    gray: 'bg-gradient-to-r from-gray-500 to-gray-600'
  };

  const dotBgClasses = {
    rose: 'bg-rose-600 dark:bg-rose-500',
    blue: 'bg-blue-600 dark:bg-blue-500',
    emerald: 'bg-emerald-600 dark:bg-emerald-500',
    teal: 'bg-teal-600 dark:bg-teal-500',
    purple: 'bg-purple-600 dark:bg-purple-500',
    orange: 'bg-orange-600 dark:bg-orange-500',
    gray: 'bg-gray-600 dark:bg-gray-500'
  };

  const iconSizeClasses = {
    xs: 'h-2 w-2',
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
    xl: 'h-9 w-9',
    '2xl': 'h-11 w-11'
  };

  const getDefaultIcon = () => {
    const icons = [Wrench, Users, Package, Store];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  const IconComponent = icon || getDefaultIcon();

  if (type === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full ${bgGradientClasses[color]} flex items-center justify-center animate-pulse-glow shadow-lg shadow-${color}-500/30`}>
          <IconComponent className={`${iconSizeClasses[size]} text-white`} />
        </div>
        {text && (
          <p className={`text-sm font-medium ${textColorClasses[color]} animate-pulse`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${sizeClasses.sm} rounded-full ${dotBgClasses[color]} animate-bounce`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        {text && (
          <p className={`text-sm font-medium ${textColorClasses[color]}`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  // Default spinner type
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} rounded-full animate-spin`} />
        {(size === 'lg' || size === 'xl' || size === '2xl') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <IconComponent className={`${iconSizeClasses[size]} ${iconColorClasses[color]} animate-pulse`} />
          </div>
        )}
      </div>
      {text && (
        <p className={`text-sm font-medium ${textColorClasses[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;