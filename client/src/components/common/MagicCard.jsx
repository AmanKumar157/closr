import React, { useState, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * MagicCard Component (inspired by Magic UI)
 * Features dynamic mouse-tracking spotlight gradient for card surface and illuminated border glow.
 */
export const MagicCard = ({
  children,
  className = '',
  gradientSize = 260,
  gradientColor,
  gradientOpacity = 0.85,
  ...props
}) => {
  const { isDark } = useTheme();
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: -gradientSize, y: -gradientSize });
  const [isHovered, setIsHovered] = useState(false);

  // Default gradient color calibrated for Japan Blues light/dark palette
  const activeGradient =
    gradientColor ||
    (isDark ? 'rgba(144, 170, 225, 0.22)' : 'rgba(90, 125, 175, 0.16)');

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-2xl border border-border bg-card text-card-foreground overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Glow Layer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${position.x}px ${position.y}px, ${activeGradient}, transparent 75%)`,
          opacity: isHovered ? gradientOpacity : 0,
          zIndex: 2,
        }}
      />

      {/* Card Content Layer - z-index ensures all form fields are completely clear and accessible */}
      <div className="relative z-10 size-full">{children}</div>
    </div>
  );
};

export default MagicCard;
