import React from 'react';
import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  height?: number;
  variant?: 'primary' | 'success' | 'danger' | 'warning';
  showLabel?: boolean;
  labelPosition?: 'inside' | 'top' | 'right';
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  height = 8,
  variant = 'primary',
  showLabel = false,
  labelPosition = 'right',
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const variantClasses = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    danger: 'bg-danger-600',
    warning: 'bg-warning-500',
  };

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between mb-1 text-sm">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      
      <div className="relative">
        <div 
          className="w-full rounded-full bg-gray-200 overflow-hidden"
          style={{ height: `${height}px` }}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          >
            {showLabel && labelPosition === 'inside' && percentage > 20 && (
              <span className="px-2 text-xs text-white font-medium">
                {value} / {max}
              </span>
            )}
          </div>
        </div>
        
        {showLabel && labelPosition === 'right' && (
          <span className="ml-2 text-sm text-gray-700">
            {value} / {max} ({percentage.toFixed(0)}%)
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;