import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  title, 
  subtitle, 
  icon, 
  actions,
  className 
}) => {
  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden', className)}>
      {(title || actions) && (
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {title && (
            <div className="flex items-center">
              {icon && <span className="mr-2 text-gray-500">{icon}</span>}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900">{title}</h3>
                {subtitle && <p className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</p>}
              </div>
            </div>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </div>
  );
};

export default Card;