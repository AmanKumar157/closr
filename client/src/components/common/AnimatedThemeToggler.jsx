import React, { useRef, useState, useEffect, useContext } from 'react';
import { flushSync } from 'react-dom';
import { Sun, Moon } from 'lucide-react';
import ThemeContext, { applyThemeToDOM } from '../../context/ThemeContext.jsx';

/**
 * AnimatedThemeToggler Component (Magic UI)
 *
 * Utilizes the native View Transitions API (document.startViewTransition)
 * with an expanding circular clip-path mask to smoothly reveal the new theme
 * radiating outwards from the button or click coordinates.
 *
 * @param {string} variant - Clip shape: 'circle' | 'square' | 'diamond' | 'star' (default: 'circle')
 * @param {number} duration - Transition duration in milliseconds (default: 500)
 * @param {boolean} fromCenter - Whether the expansion starts from the viewport center instead of the button (default: false)
 * @param {function} onToggle - Optional callback receiving the next theme state (boolean isDark)
 * @param {string} className - Additional CSS classes
 */
export const AnimatedThemeToggler = ({
  variant = 'circle',
  duration = 500,
  fromCenter = false,
  onToggle,
  className = '',
  ...props
}) => {
  const context = useContext(ThemeContext);
  const buttonRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // Determine dark state: prioritize ThemeContext, fallback to DOM state
  const [internalDark, setInternalDark] = useState(() => {
    if (context) return context.isDark;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const isDark = context ? context.isDark : internalDark;

  useEffect(() => {
    if (context) {
      setInternalDark(context.isDark);
    }
  }, [context?.isDark]);

  const getClipPathKeyframes = (x, y, maxRadius) => {
    switch (variant) {
      case 'square':
        return [
          `polygon(${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px)`,
          `polygon(0 0, 100vw 0, 100vw 100vh, 0 100vh)`,
        ];
      case 'diamond':
        return [
          `polygon(${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px)`,
          `polygon(${x}px ${y - maxRadius}px, ${x + maxRadius}px ${y}px, ${x}px ${y + maxRadius}px, ${x - maxRadius}px ${y}px)`,
        ];
      case 'star':
      case 'circle':
      default:
        return [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ];
    }
  };

  const handleToggle = async (e) => {
    if (isTransitioningRef.current) return;

    const nextIsDark = !isDark;
    const nextMode = nextIsDark ? 'dark' : 'light';

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Direct toggle if View Transitions API is unsupported or user prefers reduced motion
    if (
      typeof document === 'undefined' ||
      !document.startViewTransition ||
      prefersReducedMotion
    ) {
      if (context) {
        context.toggleTheme();
      } else {
        applyThemeToDOM(nextMode);
        setInternalDark(nextIsDark);
      }
      if (onToggle) onToggle(nextIsDark);
      return;
    }

    isTransitioningRef.current = true;

    // Calculate animation origin coordinates
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (!fromCenter && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if (!fromCenter && e && typeof e.clientX === 'number') {
      x = e.clientX;
      y = e.clientY;
    }

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          if (context) {
            context.toggleTheme();
          } else {
            applyThemeToDOM(nextMode);
            setInternalDark(nextIsDark);
          }
          if (onToggle) onToggle(nextIsDark);
        });
      });

      await transition.ready;

      const keyframes = getClipPathKeyframes(x, y, maxRadius);

      const animation = document.documentElement.animate(
        {
          clipPath: keyframes,
        },
        {
          duration,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );

      await animation.finished;
    } catch (_) {
      // In case transition was aborted or interrupted
    } finally {
      isTransitioningRef.current = false;
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleToggle}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring select-none ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      {...props}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (Rotates and scales in when dark mode is active) */}
        <Sun
          className={`w-4 h-4 text-amber-400 absolute transition-all duration-300 transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0 pointer-events-none'
          }`}
        />
        {/* Moon Icon (Rotates and scales in when light mode is active) */}
        <Moon
          className={`w-4 h-4 text-foreground absolute transition-all duration-300 transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 pointer-events-none'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
      </div>
    </button>
  );
};

export default AnimatedThemeToggler;

