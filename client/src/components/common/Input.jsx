import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';

/**
 * Animated Input Component (inspired by uiverse.io by @satyamchaudharydev)
 *
 * Features:
 * - Dynamic border-radius transition on focus-within (smooth rounded-2xl -> rounded-md)
 * - Animated expanding center-outward bottom accent border line on focus
 * - Integrated left icon support
 * - Interactive reset / clear button displayed automatically when text is present
 */
export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      className = '',
      containerClassName = '',
      type = 'text',
      placeholder = ' ',
      allowClear,
      onClear,
      ...props
    },
    ref
  ) => {
    const internalInputRef = useRef(null);
    useImperativeHandle(ref, () => internalInputRef.current);

    // Default allowClear to true for text/email/search inputs, but false for password fields
    const isPasswordField = type === 'password';
    const shouldAllowClear = allowClear !== undefined ? allowClear : !isPasswordField;

    const handleClear = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (internalInputRef.current) {
        internalInputRef.current.value = '';
        // Synchronously trigger React Hook Form and synthetic onChange listeners
        const tracker = internalInputRef.current._valueTracker;
        if (tracker) tracker.setValue('');
        const inputEvent = new Event('input', { bubbles: true });
        internalInputRef.current.dispatchEvent(inputEvent);
        const changeEvent = new Event('change', { bubbles: true });
        internalInputRef.current.dispatchEvent(changeEvent);
        internalInputRef.current.focus();
      }
      if (onClear) onClear();
    };

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <div
          className={`uiverse-input-wrapper relative flex items-center w-full transition-all ${
            error ? 'has-error' : ''
          }`}
        >
          {Icon && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => internalInputRef.current?.focus()}
              className="uiverse-icon-btn pl-3.5 pr-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none shrink-0"
              aria-hidden="true"
            >
              <Icon className="w-4 h-4" />
            </button>
          )}

          <input
            ref={internalInputRef}
            type={type}
            placeholder={placeholder || ' '}
            className={`uiverse-input w-full bg-transparent text-sm py-2.5 ${
              Icon ? 'pl-2' : 'pl-3.5'
            } ${shouldAllowClear ? 'pr-9' : 'pr-3.5'} text-foreground placeholder:text-muted-foreground focus:outline-none ${className}`}
            {...props}
          />

          {shouldAllowClear && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="uiverse-reset absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-all cursor-pointer focus:outline-none"
              title="Clear text"
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
