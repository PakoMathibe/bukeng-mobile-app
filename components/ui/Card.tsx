// components/ui/Card.tsx
'use client';

import { forwardRef, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = 'default', padding = 'md', children, ...props },
    ref
  ) => {
    const variants = {
      default: 'bg-white shadow-sm',
      gradient: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${
          className || ''
        }`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
