import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  showPasswordToggle?: boolean; // New prop to enable password toggle
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, fullWidth = false, showPasswordToggle = false, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const inputClasses = clsx(
      'block rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm',
      leftIcon ? 'pl-10' : '',
      rightIcon || showPasswordToggle ? 'pr-10' : '',
      error ? 'border-danger-300' : 'border-gray-300',
      fullWidth ? 'w-full' : '',
      'bg-white',
      'border-2',
      'py-2',
      className
    );

    const handleTogglePassword = () => {
      setShowPassword((prev) => !prev);
    };

    const inputType = showPasswordToggle && showPassword ? 'text' : type;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            type={inputType}
            {...props}
          />
          {showPasswordToggle ? (
            <div
              className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400"
              onClick={handleTogglePassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          ) : (
            rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;