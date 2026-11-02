import React from 'react';

export const Card = ({ children, className = '', title, subtitle, footer, ...props }) => {
  return (
    <div
      className={`bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden transition-all ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-border">
          {title && <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-3 bg-muted/40 border-t border-border">{footer}</div>}
    </div>
  );
};

export default Card;
