import React from 'react';
import {
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Columns,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { ConvertedItem } from '../types';
import { formatBytes, downloadFile } from '../utils/converter';

interface FileQueueProps {
  items: ConvertedItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onOpenCompare: (item: ConvertedItem) => void;
  onDownloadAllZip: () => void;
  isDownloadingZip: boolean;
  preserveExif: boolean;
}

export const FileQueue: React.FC<FileQueueProps> = ({
  items,
  onRemoveItem,
  onClearAll,
  onOpenCompare,
  onDownloadAllZip,
  isDownloadingZip,
  preserveExif,
}) => {
  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden mb-10">
      {/* Queue Header */}
      <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/90">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-neutral-200">Очередь файлов</h3>
          <span className="text-xs text-neutral-400 font-mono tabular-nums">
            {doneCount} из {items.length} готово
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-200 px-2.5 py-1.5 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Очистить все
          </button>

          <button
            type="button"
            onClick={onDownloadAllZip}
            disabled={doneCount === 0 || isDownloadingZip}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingZip ? 'Архивация...' : 'Скачать ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-neutral-800/80">
        {items.map((item) => {
          const isDone = item.status === 'done';
          const isConverting = item.status === 'converting';
          const isError = item.status === 'error';

          const targetName = item.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const sizeDiff = item.convertedSize
            ? item.convertedSize - item.originalSize
            : 0;
          const percentChange = item.convertedSize
            ? Math.round((sizeDiff / item.originalSize) * 100)
            : 0;

          return (
            <div
              key={item.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-850/50 transition-colors"
            >
              {/* Left: Thumbnail & details */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Thumbnail */}
                <div
                  onClick={() => isDone && onOpenCompare(item)}
                  className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-neutral-800 relative bg-neutral-950 flex items-center justify-center ${
                    isDone ? 'cursor-pointer hover:border-amber-500/50 group' : ''
                  }`}
                  title={isDone ? 'Нажмите для сравнения До/После' : ''}
                >
                  <img
                    src={item.originalPreviewUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {isConverting && (
                    <div className="absolute inset-0 bg-neutral-950/70 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    </div>
                  )}
                  {isDone && (
                    <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                      <Columns className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-neutral-100 truncate max-w-xs sm:max-w-md">
                      {item.name}
                    </span>
                    <ArrowRight className="w-3 h-3 text-neutral-600 shrink-0" />
                    <span className="text-xs font-mono text-amber-400 shrink-0">
                      .jpg
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-400 font-mono tabular-nums">
                    <span>{formatBytes(item.originalSize)}</span>
                    <span className="text-neutral-600">·</span>
                    <span>
                      {item.originalWidth}×{item.originalHeight} px
                    </span>

                    {isDone && item.convertedSize && (
                      <>
                        <span className="text-neutral-600">→</span>
                        <span className="text-neutral-200 font-semibold">
                          {formatBytes(item.convertedSize)}
                        </span>
                        <span
                          className={`text-[11px] ${
                            percentChange <= 0 ? 'text-emerald-400' : 'text-neutral-400'
                          }`}
                        >
                          ({percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`})
                        </span>
                      </>
                    )}

                    {item.hasAlpha && (
                      <>
                        <span className="text-neutral-600">·</span>
                        <span className="text-neutral-400 flex items-center gap-1 text-[11px]">
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>Прозрачность залита</span>
                        </span>
                      </>
                    )}

                    {item.hasExif && (
                      <>
                        <span className="text-neutral-600">·</span>
                        {preserveExif ? (
                          <span
                            className="text-amber-400/90 flex items-center gap-1 text-[11px]"
                            title={item.exifTags?.join(', ')}
                          >
                            <FileText className="w-3 h-3 text-amber-400" />
                            <span>EXIF сохранен</span>
                          </span>
                        ) : (
                          <span
                            className="text-emerald-400/90 flex items-center gap-1 text-[11px]"
                            title="Личные данные (GPS, модель камеры) удалены"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>EXIF очищен (приватно)</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {isError && (
                    <div className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{item.errorMessage || 'Ошибка конвертации'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                {isConverting && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Конвертация...</span>
                  </div>
                )}

                {isDone && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenCompare(item)}
                      className="px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Интерактивное сравнение До / После"
                    >
                      <Columns className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Сравнить</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => item.convertedBlob && downloadFile(item.convertedBlob, targetName)}
                      className="px-3 py-1.5 text-xs font-medium text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Скачать JPG"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JPG</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  title="Удалить из списка"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
