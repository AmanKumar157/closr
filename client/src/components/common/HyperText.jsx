import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_CHARACTER_SET = Object.freeze(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')
);

/**
 * HyperText Component (Magic UI)
 *
 * Scrambles text characters rapidly with random letters before decoding
 * and locking each letter into place from left to right.
 *
 * @param {string} children - Target text to display and animate
 * @param {string} className - Additional CSS classes
 * @param {number} duration - Total scramble duration in ms (default: 800)
 * @param {number} delay - Delay in ms before animation starts (default: 0)
 * @param {React.ElementType} as - HTML element or component to render (default: 'span')
 * @param {boolean} animateOnHover - Trigger scramble again on mouse hover (default: true)
 * @param {string[]} characterSet - Array of characters to pick scrambles from
 */
export const HyperText = ({
  children,
  className = '',
  duration = 800,
  delay = 0,
  as: Component = 'span',
  animateOnHover = true,
  characterSet = DEFAULT_CHARACTER_SET,
  ...props
}) => {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef(null);

  const triggerAnimation = () => {
    if (!text || text.length === 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsAnimating(true);
    let step = 0;
    const totalSteps = text.length;
    // Advance half-step per tick to give a fluid scramble feel
    const stepIncrement = 0.5;
    const tickInterval = Math.max(25, Math.floor(duration / (totalSteps / stepIncrement)));

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < step) {
              return text[index];
            }
            return characterSet[Math.floor(Math.random() * characterSet.length)];
          })
          .join('')
      );

      step += stepIncrement;

      if (step >= totalSteps) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setDisplayText(text);
        setIsAnimating(false);
      }
    }, tickInterval);
  };

  useEffect(() => {
    setDisplayText(text);
    if (!text) return;

    let timeoutId = null;
    if (delay > 0) {
      timeoutId = setTimeout(() => {
        triggerAnimation();
      }, delay);
    } else {
      triggerAnimation();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, duration, delay]);

  const handleMouseEnter = () => {
    if (animateOnHover && !isAnimating) {
      triggerAnimation();
    }
  };

  return (
    <Component
      onMouseEnter={handleMouseEnter}
      className={`inline-block cursor-pointer select-none transition-colors ${className}`}
      {...props}
    >
      {displayText}
    </Component>
  );
};

export default HyperText;

