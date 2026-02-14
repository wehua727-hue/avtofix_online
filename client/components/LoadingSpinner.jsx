import React from 'react';
import { Wrench, Users, Package, Store } from 'lucide-react';
import FancyLoader from './FancyLoader';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'emerald', 
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
    rose: 'border-rose-500/30 border-t-rose-500',
    blue: 'border-blue-500/30 border-t-blue-500',
    emerald: 'border-emerald-500/30 border-t-emerald-500',
    teal: 'border-teal-500/30 border-t-teal-500',
    purple: 'border-purple-500/30 border-t-purple-500',
    orange: 'border-orange-500/30 border-t-orange-500',
    gray: 'border-gray-500/30 border-t-gray-500'
  };

  const iconColorClasses = {
    rose: 'text-rose-500',
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    teal: 'text-teal-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    gray: 'text-gray-500'
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

  if (type === 'fancy') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <FancyLoader text={text || 'Yuklanmoqda'} />
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-${color}-500 to-${color}-600 flex items-center justify-center animate-pulse-glow shadow-lg shadow-${color}-500/30`}>
          <IconComponent className={`${iconSizeClasses[size]} text-white`} />
        </div>
        {text && (
          <p className={`text-sm font-medium ${iconColorClasses[color]} animate-pulse`}>
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
              className={`${sizeClasses.sm} rounded-full bg-${color}-500 animate-bounce`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        {text && (
          <p className={`text-sm font-medium ${iconColorClasses[color]}`}>
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
        <p className={`text-sm font-medium ${iconColorClasses[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;