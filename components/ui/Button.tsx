// components/ui/Button.tsx
'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[48px]';

    const variants = {
      primary:
        'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-md',
      secondary:
        'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800',
      outline:
        'border-2 border-teal-600 text-teal-600 hover:bg-teal-50 active:bg-teal-100',
      danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
      ghost: 'hover:bg-gray-100 active:bg-gray-200 text-gray-700',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm rounded-lg min-h-[40px]',
      md: 'px-5 py-3 text-base',
      lg: 'px-7 py-4 text-lg',
    };

    const width = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variants[variant]} ${
          sizes[size]
        } ${width} ${className || ''}`}
        {...props}
      >
        {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
