import React, { forwardRef, useId } from 'react';

/**
 * Animated Splash Checkbox Component (inspired by uiverse.io / checkbox-wrapper-12)
 *
 * Features:
 * - Fluid radial particle splash animation upon being checked
 * - Animated SVG checkmark path draw (`stroke-dashoffset: 0`)
 * - Works both standalone and seamlessly with React Hook Form
 * - Full accessibility with native keyboard and focus states
 */
export const Checkbox = forwardRef(
  (
    {
      id,
      label,
      children,
      className = '',
      wrapperClassName = '',
      checked,
      onChange,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id || autoId;
    const labelContent = label || children;

    return (
      <div className={`checkbox-wrapper-12 inline-flex items-center gap-2.5 select-none ${wrapperClassName}`}>
        <div className="cbx relative shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={`cursor-pointer ${className}`}
            {...props}
          />
          <label htmlFor={inputId} className="cursor-pointer" />
          <svg
            width="15"
            height="14"
            viewBox="0 0 15 14"
            fill="none"
            className="pointer-events-none"
            aria-hidden="true"
          >
            <path d="M2 8.36364L6.23077 12L13 2" />
          </svg>
        </div>

        {labelContent && (
          <label
            htmlFor={inputId}
            className={`text-xs sm:text-sm cursor-pointer transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'text-foreground'
            }`}
          >
            {labelContent}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;

