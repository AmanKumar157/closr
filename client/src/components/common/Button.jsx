import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Animated Button Component (inspired by uiverse.io)
 *
 * Features:
 * - Smooth letter-spacing expansion on hover (1.2px -> 2.4px)
 * - Dynamic luminous box-shadow glow matching the theme's colors
 * - Tactile active press-down feel (translateY with 100ms transition)
 * - Pill-shaped border-radius (rounded-full)
 * - Retains original theme colors (primary, secondary, outline, danger)
 */
export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'uiverse-btn inline-flex items-center justify-center font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'uiverse-btn-primary bg-primary text-primary-foreground focus:ring-ring',
    secondary:
      'uiverse-btn-secondary bg-secondary text-secondary-foreground focus:ring-ring',
    outline:
      'uiverse-btn-outline border border-border hover:bg-muted text-foreground focus:ring-ring bg-card/60 backdrop-blur-xs',
    ghost:
      'text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring',
    danger:
      'uiverse-btn-danger bg-destructive text-destructive-foreground focus:ring-ring'
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3 gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
};

export default Button;
