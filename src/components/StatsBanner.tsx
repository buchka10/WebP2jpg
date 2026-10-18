import React from 'react';
import { ConvertedItem } from '../types';
import { formatBytes } from '../utils/converter';

interface StatsBannerProps {
  items: ConvertedItem[];
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ items }) => {
  if (items.length === 0) return null;

  const totalFiles = items.length;
  const doneItems = items.filter((i) => i.status === 'done');
  const doneCount = doneItems.length;

  const totalOriginalBytes = doneItems.reduce((acc, i) => acc + i.originalSize, 0);
  const totalConvertedBytes = doneItems.reduce((acc, i) => acc + (i.convertedSize || 0), 0);

  const deltaBytes = totalConvertedBytes - totalOriginalBytes;
  const percentChange =
    totalOriginalBytes > 0
      ? Math.round(((totalConvertedBytes - totalOriginalBytes) / totalOriginalBytes) * 100)
      : 0;

  const avgDuration =
    doneCount > 0
      ? Math.round(doneItems.reduce((acc, i) => acc + (i.durationMs || 0), 0) / doneCount)
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
      <div>
        <div className="text-[11px] text-neutral-400 font-medium mb-1">Обработано</div>
        <div className="text-lg font-bold text-neutral-100 font-mono tabular-nums">
          {doneCount} <span className="text-xs text-neutral-500 font-normal">из {totalFiles}</span>
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-400 font-medium mb-1">Исходный объем</div>
        <div className="text-lg font-bold text-neutral-200 font-mono tabular-nums">
          {formatBytes(totalOriginalBytes)}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-400 font-medium mb-1">Итоговый объем (JPG)</div>
        <div className="text-lg font-bold text-amber-400 font-mono tabular-nums">
          {formatBytes(totalConvertedBytes)}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-neutral-400 font-medium mb-1">Дельта размера</div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              percentChange <= 0 ? 'text-emerald-400' : 'text-neutral-300'
            }`}
          >
            {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">
            ({avgDuration} мс/файл)
          </span>
        </div>
      </div>
    </div>
  );
};
