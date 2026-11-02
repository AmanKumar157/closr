import React, { useId } from 'react';

/**
 * BorderBeam Component (Magic UI compatible)
 * Creates an animated luminous beam traveling strictly along the 1.5px border of any container on hover.
 * Uses 100% pure SVG stroke geometry so the interior of the card remains completely transparent with zero wash/bleed-through.
 *
 * @param {string} className - Additional CSS classes
 * @param {number} size - Percentage of the perimeter occupied by the glowing beam (default: 22)
 * @param {number} duration - Animation cycle duration in seconds (default: 6)
 * @param {number} borderWidth - Stroke width in px (default: 1.5)
 * @param {number} rx - Corner border radius in px (default: 16)
 * @param {string} colorFrom - Start color of beam gradient
 * @param {string} colorTo - End color of beam gradient
 * @param {boolean} hoverOnly - Whether to trigger only on hover (default: true)
 */
export const BorderBeam = ({
  className = '',
  size = 22,
  duration = 6,
  borderWidth = 1.5,
  rx = 16,
  colorFrom = '#38bdf8', // Luminous cyan
  colorTo = '#818cf8',   // Calm indigo
  delay = 0,
  hoverOnly = true,
  style,
  ...props
}) => {
  const gradientId = useId().replace(/:/g, '');

  return (
    <svg
      className={`absolute inset-0 size-full pointer-events-none overflow-visible rounded-[inherit] z-20 ${
        hoverOnly
          ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
          : 'opacity-100'
      } ${className}`}
      style={style}
      {...props}
    >
      <defs>
        <linearGradient id={`beam-grad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorFrom} stopOpacity={1} />
          <stop offset="100%" stopColor={colorTo} stopOpacity={1} />
        </linearGradient>
        <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x={borderWidth / 2}
        y={borderWidth / 2}
        width={`calc(100% - ${borderWidth}px)`}
        height={`calc(100% - ${borderWidth}px)`}
        rx={rx}
        fill="none"
        stroke={`url(#beam-grad-${gradientId})`}
        strokeWidth={borderWidth}
        pathLength={100}
        strokeDasharray={`${size} ${100 - size}`}
        filter={`url(#glow-${gradientId})`}
        style={{
          animation: `border-beam-svg ${duration}s linear infinite`,
          animationDelay: `-${delay}s`,
        }}
      />
    </svg>
  );
};

export default BorderBeam;
