import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  height?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max, 
  height = 8, 
  variant = 'primary',
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const variantClasses = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    danger: 'bg-red-500'
  };
  
  const backgroundClasses = {
    primary: 'bg-blue-100',
    success: 'bg-green-100', 
    warning: 'bg-orange-100',
    danger: 'bg-red-100'
  };
  
  return (
    <div 
      className={`w-full rounded-full overflow-hidden ${backgroundClasses[variant]} ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${variantClasses[variant]} relative`}
        style={{ width: `${percentage}%` }}
      >
        {/* Shimmer effect for active progress */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  );
};

export default ProgressBar;