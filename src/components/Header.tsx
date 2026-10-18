import React from 'react';
import { ArrowDownToLine, ShieldCheck, Smartphone } from 'lucide-react';

interface HeaderProps {
  totalDone: number;
  onDownloadAllZip: () => void;
  isDownloadingZip: boolean;
  onOpenAndroidModal: () => void;
  isInstalled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalDone,
  onDownloadAllZip,
  isDownloadingZip,
  onOpenAndroidModal,
  isInstalled,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm tracking-tighter">
            JPG
          </div>
          <span className="text-base font-semibold tracking-tight text-neutral-100">
            WebP to JPG
          </span>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <a
            href="#converter"
            className="text-neutral-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Конвертер
          </a>
          <a
            href="#settings"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Настройки
          </a>
          <button
            type="button"
            onClick={onOpenAndroidModal}
            className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer text-neutral-300"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Установка на Android</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 whitespace-nowrap shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Офлайн & Приватно</span>
          </div>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAndroidModal}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Скачать APK</span>
          </button>

          <button
            type="button"
            onClick={onDownloadAllZip}
            disabled={totalDone === 0 || isDownloadingZip}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              totalDone > 0
                ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 active:scale-95 shadow-sm'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>{isDownloadingZip ? 'Сборка архива...' : `Скачать все (${totalDone})`}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
