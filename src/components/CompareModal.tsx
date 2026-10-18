import React, { useState, useRef, useEffect } from 'react';
import { X, Download, SlidersHorizontal, ZoomIn, ZoomOut, RotateCcw, ShieldCheck, FileText } from 'lucide-react';
import { ConvertedItem } from '../types';
import { formatBytes, downloadFile } from '../utils/converter';

interface CompareModalProps {
  item: ConvertedItem | null;
  onClose: () => void;
  preserveExif?: boolean;
}

export const CompareModal: React.FC<CompareModalProps> = ({ item, onClose, preserveExif = false }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item || !item.convertedUrl) return null;

  const targetName = item.name.replace(/\.[^/.]+$/, '') + '.jpg';
  const sizeDiff = (item.convertedSize || 0) - item.originalSize;
  const percentChange = Math.round((sizeDiff / item.originalSize) * 100);

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900">
          <div>
            <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>Сравнение качества: {item.name}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Сравните исходный WebP и результат конвертации в JPG
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-neutral-800/80 rounded-lg border border-neutral-700/50">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  viewMode === 'slider'
                    ? 'bg-amber-500/20 text-amber-300 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Слайдер
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  viewMode === 'side-by-side'
                    ? 'bg-amber-500/20 text-amber-300 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Рядом
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-neutral-800/80 rounded-lg p-1 border border-neutral-700/50 text-neutral-400">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                disabled={zoom <= 1}
                className="p-1 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Уменьшить"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono tabular-nums px-1.5">{zoom}x</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                disabled={zoom >= 3}
                className="p-1 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Увеличить"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1 hover:text-amber-400 cursor-pointer"
                  title="Сбросить масштаб"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className="flex-1 min-h-[350px] max-h-[60vh] bg-neutral-950 p-4 overflow-auto flex items-center justify-center relative select-none"
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onMouseMove={handleMouseMove}
        >
          {viewMode === 'slider' ? (
            <div
              ref={containerRef}
              className="relative max-w-full max-h-full overflow-hidden rounded-lg border border-neutral-800 bg-transparency-grid cursor-ew-resize"
              style={{
                width: `${(item.originalWidth || 600) * zoom}px`,
                maxWidth: '100%',
              }}
              onMouseDown={() => setIsDragging(true)}
              onTouchMove={handleTouchMove}
            >
              {/* Converted JPG (Background Layer) */}
              <img
                src={item.convertedUrl}
                alt="JPG converted"
                referrerPolicy="no-referrer"
                className="w-full h-auto block pointer-events-none"
                style={{ transformOrigin: 'top left' }}
              />

              {/* Original WebP (Clipped Overlay Layer) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={item.originalPreviewUrl}
                  alt="WebP original"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto block pointer-events-none"
                  style={{ transformOrigin: 'top left' }}
                />
              </div>

              {/* Slider Split Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 cursor-ew-resize shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-neutral-900 border-2 border-amber-400 shadow-md flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Watermark indicators in corners */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-neutral-900/80 backdrop-blur border border-neutral-700/60 rounded text-[11px] font-mono text-neutral-300 pointer-events-none">
                Оригинал: WebP
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 bg-amber-950/80 backdrop-blur border border-amber-600/60 rounded text-[11px] font-mono text-amber-300 pointer-events-none">
                Конвертировано: JPG
              </div>
            </div>
          ) : (
            /* Side-by-side view */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
              <div className="flex flex-col items-center">
                <div className="text-xs font-mono text-neutral-400 mb-2">Оригинал (WebP)</div>
                <div className="rounded-lg border border-neutral-800 bg-transparency-grid overflow-hidden max-h-[50vh] flex items-center justify-center p-2">
                  <img
                    src={item.originalPreviewUrl}
                    alt="WebP original"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-xs font-mono text-amber-400 mb-2">Результат (JPG)</div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden max-h-[50vh] flex items-center justify-center p-2">
                  <img
                    src={item.convertedUrl}
                    alt="JPG converted"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Stats & Download */}
        <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono tabular-nums text-neutral-300">
            <div>
              <span className="text-neutral-500 mr-1.5">WebP:</span>
              <span>{formatBytes(item.originalSize)}</span>
              <span className="text-neutral-500 ml-1">
                ({item.originalWidth}×{item.originalHeight})
              </span>
            </div>
            <div>
              <span className="text-neutral-500 mr-1.5">JPG:</span>
              <span className="text-amber-400 font-semibold">
                {formatBytes(item.convertedSize || 0)}
              </span>
              <span className="text-neutral-500 ml-1">
                ({item.convertedWidth}×{item.convertedHeight})
              </span>
            </div>
            <div
              className={`font-semibold ${
                percentChange <= 0 ? 'text-emerald-400' : 'text-neutral-400'
              }`}
            >
              {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}
            </div>

            {item.hasExif && (
              <div className="flex items-center gap-1.5">
                {preserveExif ? (
                  <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>EXIF сохранен</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>EXIF очищен (приватно)</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              Закрыть
            </button>
            <button
              type="button"
              onClick={() => item.convertedBlob && downloadFile(item.convertedBlob, targetName)}
              className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Скачать JPG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
