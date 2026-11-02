import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  Crop,
  Sparkles
} from 'lucide-react';
import Button from './Button.jsx';

/**
 * ImageCropModal
 * Zero-dependency, high-performance circular image cropper using CSS transforms + HTML5 Canvas export.
 *
 * @param {boolean} isOpen
 * @param {string} imageSrc - Base64 or object URL of the uploaded image
 * @param {function} onClose
 * @param {function} onCropComplete - Called with base64 cropped 1:1 circular/square image
 */
export const ImageCropModal = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const CROP_SIZE = 280; // Size of the circular crop viewport in pixels
  const OUTPUT_SIZE = 512; // High-res output canvas size

  // Reset state whenever a new image is provided
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setLoaded(false);

      const img = new Image();
      img.onload = () => {
        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Handle Drag to Pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Perform precise Canvas export matching current viewport
  const handleSaveCrop = () => {
    if (!imgDimensions.width || !imgDimensions.height) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const k = OUTPUT_SIZE / CROP_SIZE;
    const baseScale = Math.max(
      CROP_SIZE / imgDimensions.width,
      CROP_SIZE / imgDimensions.height
    );
    const currentScale = baseScale * zoom;

    // Center origin on canvas
    ctx.translate(OUTPUT_SIZE / 2 + pan.x * k, OUTPUT_SIZE / 2 + pan.y * k);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale * k, currentScale * k);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        -imgDimensions.width / 2,
        -imgDimensions.height / 2,
        imgDimensions.width,
        imgDimensions.height
      );

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
      onCropComplete(croppedBase64);
      onClose();
    };
    img.src = imageSrc;
  };

  if (!isOpen) return null;

  const baseScale =
    imgDimensions.width && imgDimensions.height
      ? Math.max(CROP_SIZE / imgDimensions.width, CROP_SIZE / imgDimensions.height)
      : 1;

  const displayWidth = imgDimensions.width * baseScale;
  const displayHeight = imgDimensions.height * baseScale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-md overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Crop Profile Photo</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Drag to reposition & zoom to frame your face</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport Area */}
        <div
          className="relative bg-slate-900 flex items-center justify-center overflow-hidden select-none py-8"
          style={{ minHeight: '340px' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Circular Crop Mask Aperture */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] ring-4 ring-indigo-500/80 cursor-grab active:cursor-grabbing"
            style={{
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {imageSrc && loaded ? (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                className="absolute pointer-events-none select-none max-w-none transition-transform duration-75 ease-out"
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom}) rotate(${rotation}deg)`
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Loading photo...
              </div>
            )}

            {/* Subtle alignment crosshair center guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-full h-px border-b border-dashed border-white/60" />
              <div className="h-full w-px border-r border-dashed border-white/60 absolute" />
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 space-y-3">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.15).toFixed(2)))}
              className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)))}
              className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Quick Actions (Rotate & Reset) */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
                title="Reset crop"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic">Square 1:1 circle export</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveCrop}
            disabled={!loaded}
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply & Crop Photo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;

