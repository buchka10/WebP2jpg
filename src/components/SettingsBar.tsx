import React from 'react';
import { Sliders, RotateCcw, Palette, Maximize2, ShieldCheck, FileText } from 'lucide-react';
import { ConversionSettings } from '../types';

interface SettingsBarProps {
  settings: ConversionSettings;
  onChange: (newSettings: ConversionSettings) => void;
  onReconvertAll: () => void;
  hasItems: boolean;
  isConverting: boolean;
}

const PRESETS = [
  { label: '100% Макс.', value: 1.0, hint: 'Без компромиссов' },
  { label: '92% Высокое', value: 0.92, hint: 'Рекомендовано' },
  { label: '80% Веб', value: 0.8, hint: 'Баланс качества' },
  { label: '65% Эконом', value: 0.65, hint: 'Минимальный размер' },
];

const BG_PRESETS = [
  { label: 'Белый', value: '#ffffff' },
  { label: 'Черный', value: '#000000' },
  { label: 'Светло-серый', value: '#f3f4f6' },
  { label: 'Темно-серый', value: '#18181b' },
];

export const SettingsBar: React.FC<SettingsBarProps> = ({
  settings,
  onChange,
  onReconvertAll,
  hasItems,
  isConverting,
}) => {
  const currentQualityPercent = Math.round(settings.quality * 100);

  return (
    <section id="settings" className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">Параметры конвертации JPG</h2>
          <span className="text-xs text-neutral-500 font-mono">
            Качество {currentQualityPercent}% · Масштаб {Math.round(settings.scale * 100)}% · EXIF:{' '}
            {settings.preserveExif ? 'Сохранять' : 'Удалять'}
          </span>
        </div>

        {hasItems && (
          <button
            type="button"
            onClick={onReconvertAll}
            disabled={isConverting}
            className="self-start lg:self-auto text-xs font-medium text-amber-400 hover:text-amber-300 disabled:text-neutral-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
            <span>Применить новые настройки к очереди</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-5">
        {/* 1. Quality Slider & Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium">Качество сжатия JPEG</span>
            <span className="font-mono tabular-nums text-amber-400 font-semibold bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700/50">
              {currentQualityPercent}%
            </span>
          </div>

          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={currentQualityPercent}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) / 100;
              onChange({ ...settings, quality: val });
            }}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => {
              const isActive = Math.abs(settings.quality - p.value) < 0.02;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ ...settings, quality: p.value })}
                  className={`text-[11px] py-1 px-1.5 rounded text-center transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                      : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800'
                  }`}
                  title={p.hint}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Transparency Background Fill */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-neutral-400" />
              <span>Заливка прозрачности</span>
            </span>
            <span className="text-[11px] text-neutral-500">JPG без альфа-канала</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              {BG_PRESETS.map((bg) => {
                const isSelected = settings.backgroundColor.toLowerCase() === bg.value.toLowerCase();
                return (
                  <button
                    key={bg.value}
                    type="button"
                    onClick={() => onChange({ ...settings, backgroundColor: bg.value })}
                    className={`flex-1 py-1.5 px-2 text-xs rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'border-amber-500/70 bg-amber-500/10 text-neutral-100 font-medium'
                        : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-neutral-600/60 shrink-0"
                      style={{ backgroundColor: bg.value }}
                    />
                    <span className="text-[11px] truncate">{bg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <label className="relative cursor-pointer shrink-0" title="Выбрать свой цвет">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => onChange({ ...settings, backgroundColor: e.target.value })}
                className="sr-only"
              />
              <div
                className="w-8 h-8 rounded border border-neutral-700 hover:border-neutral-500 transition-colors"
                style={{ backgroundColor: settings.backgroundColor }}
              />
            </label>
          </div>

          <p className="text-[11px] text-neutral-500 leading-tight">
            Прозрачные области WebP будут заполнены выбранным цветом (по умолчанию белый).
          </p>
        </div>

        {/* 3. Resizing / Scale */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Разрешение / Масштаб</span>
            </span>
            <span className="font-mono tabular-nums text-xs text-neutral-400">
              {Math.round(settings.scale * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '100%', scale: 1.0 },
              { label: '75%', scale: 0.75 },
              { label: '50%', scale: 0.5 },
              { label: '25%', scale: 0.25 },
            ].map((s) => {
              const isSelected = Math.abs(settings.scale - s.scale) < 0.01;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onChange({ ...settings, scale: s.scale })}
                  className={`text-xs py-1.5 rounded text-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                      : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-500 leading-tight">
            Уменьшение масштаба ускоряет обработку и существенно снижает итоговый вес JPG.
          </p>
        </div>

        {/* 4. EXIF Metadata Setting (Privacy & Security) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Метаданные (EXIF)</span>
            </span>
            <span
              className={`text-[11px] font-medium font-mono ${
                settings.preserveExif ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {settings.preserveExif ? 'Сохраняются' : 'Очищаются'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => onChange({ ...settings, preserveExif: false })}
              className={`py-1.5 px-2 text-xs rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                !settings.preserveExif
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 border border-transparent'
              }`}
              title="Удалить личные данные (геолокация, камера, дата) для полной приватности"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Удалять (Приватно)</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...settings, preserveExif: true })}
              className={`py-1.5 px-2 text-xs rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                settings.preserveExif
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 border border-transparent'
              }`}
              title="Сохранить оригинальные теги съемки (камера, дата, экспозиция) в выходной JPG"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Сохранять</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 leading-tight">
            {!settings.preserveExif
              ? 'Очищает GPS-координаты, дату съемки и модель камеры для защиты приватности.'
              : 'Переносит существующие теги камеры, экспозицию и метаданные в итоговый JPG.'}
          </p>
        </div>
      </div>
    </section>
  );
};
