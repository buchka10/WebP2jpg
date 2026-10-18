import React from 'react';
import { ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-16 border-t border-neutral-800/80 bg-neutral-950 py-8 text-neutral-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-medium">WebP в JPG Конвертер</span>
          <span>·</span>
          <span>Все права защищены</span>
          <span>·</span>
          <span>Клиентская обработка данных</span>
        </div>

        <button
          type="button"
          onClick={scrollToTop}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <span>Наверх</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
