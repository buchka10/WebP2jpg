import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, Sparkles, FolderArchive } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  onLoadSamples: () => void;
  isLoadingSamples: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesAdded,
  onLoadSamples,
  isLoadingSamples,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesAdded(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesAdded(filesArray);
      e.target.value = '';
    }
  };

  return (
    <div
      id="converter"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center ${
        isDragOver
          ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
          : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".webp,image/webp,image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="max-w-xl mx-auto flex flex-col items-center">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-amber-400 hover:text-amber-300 hover:scale-105 transition-all mb-4 cursor-pointer shadow-inner"
        >
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg sm:text-xl font-semibold text-neutral-100 mb-2">
          Перетащите файлы WebP сюда
        </h3>

        <p className="text-sm text-neutral-400 mb-6 max-w-md">
          или выберите файлы с компьютера. Поддерживается множественная загрузка и вставка из буфера обмена (<kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs">Ctrl+V</kbd>).
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-sm rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileImage className="w-4 h-4" />
            <span>Выбрать файлы</span>
          </button>

          <button
            type="button"
            onClick={onLoadSamples}
            disabled={isLoadingSamples}
            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700/90 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isLoadingSamples ? 'Создание тестовых файлов...' : 'Загрузить 3 примера WebP'}</span>
          </button>
        </div>

        {/* Feature indicators */}
        <div className="mt-8 pt-6 border-t border-neutral-800/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-neutral-400 w-full max-w-lg">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Без ограничений по размеру</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Пакетная конвертация</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Экспорт в ZIP архив</span>
          </div>
        </div>
      </div>
    </div>
  );
};
