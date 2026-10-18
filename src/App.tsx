import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { SettingsBar } from './components/SettingsBar';
import { StatsBanner } from './components/StatsBanner';
import { FileQueue } from './components/FileQueue';
import { CompareModal } from './components/CompareModal';
import { InfoSection } from './components/InfoSection';
import { Footer } from './components/Footer';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';
import { ConvertedItem, ConversionSettings } from './types';
import {
  analyzeImage,
  convertWebpToJpg,
  downloadZip,
  generateSampleWebpFiles,
} from './utils/converter';
import { Smartphone, Download, QrCode } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<ConvertedItem[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>({
    quality: 0.92,
    backgroundColor: '#ffffff',
    scale: 1.0,
    maintainAspectRatio: true,
    preserveExif: false, // Default: strip EXIF for privacy
  });
  const [selectedCompareItem, setSelectedCompareItem] = useState<ConvertedItem | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();

  // Keep a ref to current settings for async handlers
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Process a batch of files
  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Filter to images
    const imageFiles = files.filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.name.toLowerCase().endsWith('.webp') ||
        f.name.toLowerCase().endsWith('.png') ||
        f.name.toLowerCase().endsWith('.jpeg') ||
        f.name.toLowerCase().endsWith('.jpg')
    );

    if (imageFiles.length === 0) return;

    setIsConverting(true);

    for (const file of imageFiles) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      try {
        const analyzed = await analyzeImage(file);

        const initialItem: ConvertedItem = {
          id,
          file,
          name: file.name,
          originalSize: file.size,
          originalWidth: analyzed.width,
          originalHeight: analyzed.height,
          originalPreviewUrl: analyzed.previewUrl,
          hasAlpha: analyzed.hasAlpha,
          hasExif: analyzed.hasExif,
          exifTags: analyzed.exifTags,
          status: 'converting',
        };

        setItems((prev) => [initialItem, ...prev]);

        // Convert immediately with current settings
        try {
          const result = await convertWebpToJpg(file, settingsRef.current);
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'done',
                    convertedBlob: result.blob,
                    convertedUrl: result.url,
                    convertedSize: result.blob.size,
                    convertedWidth: result.width,
                    convertedHeight: result.height,
                    durationMs: result.durationMs,
                  }
                : item
            )
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'error',
                    errorMessage: err instanceof Error ? err.message : 'Ошибка конвертации',
                  }
                : item
            )
          );
        }
      } catch (err) {
        // If image analysis itself fails
        const errorItem: ConvertedItem = {
          id,
          file,
          name: file.name,
          originalSize: file.size,
          originalWidth: 0,
          originalHeight: 0,
          originalPreviewUrl: '',
          hasAlpha: false,
          status: 'error',
          errorMessage:
            err instanceof Error ? err.message : 'Не удалось открыть файл как изображение',
        };
        setItems((prev) => [errorItem, ...prev]);
      }
    }

    setIsConverting(false);
  }, []);

  // Re-run conversion with updated settings on all existing items
  const handleReconvertAll = useCallback(async () => {
    if (items.length === 0 || isConverting) return;
    setIsConverting(true);

    const activeSettings = settingsRef.current;

    setItems((prev) =>
      prev.map((item) => (item.status === 'done' ? { ...item, status: 'converting' } : item))
    );

    for (const item of items) {
      try {
        const result = await convertWebpToJpg(item.file, activeSettings);
        setItems((prev) =>
          prev.map((curr) =>
            curr.id === item.id
              ? {
                  ...curr,
                  status: 'done',
                  convertedBlob: result.blob,
                  convertedUrl: result.url,
                  convertedSize: result.blob.size,
                  convertedWidth: result.width,
                  convertedHeight: result.height,
                  durationMs: result.durationMs,
                }
              : curr
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((curr) =>
            curr.id === item.id
              ? {
                  ...curr,
                  status: 'error',
                  errorMessage: err instanceof Error ? err.message : 'Ошибка конвертации',
                }
              : curr
          )
        );
      }
    }

    setIsConverting(false);
  }, [items, isConverting]);

  // Load built-in sample WebP files
  const handleLoadSamples = async () => {
    try {
      setIsLoadingSamples(true);
      const sampleFiles = await generateSampleWebpFiles();
      await processFiles(sampleFiles);
    } catch {
      // ignore
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    const doneItems = items.filter((i) => i.status === 'done');
    if (doneItems.length === 0) return;

    try {
      setIsDownloadingZip(true);
      await downloadZip(doneItems);
    } catch {
      // error handled
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalPreviewUrl) URL.revokeObjectURL(target.originalPreviewUrl);
      if (target?.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      return prev.filter((i) => i.id !== id);
    });
    if (selectedCompareItem?.id === id) {
      setSelectedCompareItem(null);
    }
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.originalPreviewUrl) URL.revokeObjectURL(item.originalPreviewUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    });
    setItems([]);
    setSelectedCompareItem(null);
  };

  // Global clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        processFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const totalDone = items.filter((i) => i.status === 'done').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Bar Navigation */}
      <Header
        totalDone={totalDone}
        onDownloadAllZip={handleDownloadAllZip}
        isDownloadingZip={isDownloadingZip}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        isInstalled={isInstalled}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Hero title block & Android App Callout */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 mb-2">
              Конвертер изображений WebP в JPG
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Быстрое локальное преобразование файлов формата WebP в JPG без потери резкости. Настройте качество сжатия, заливку прозрачности и размер. Все файлы обрабатываются прямо на вашем устройстве.
            </p>
          </div>

          {/* Android Banner Card */}
          <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4 max-w-md w-full shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <span>Готовый APK для Android</span>
                  <span className="text-[10px] text-emerald-400 font-mono">338 КБ</span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Работает офлайн без интернета
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/webp-to-jpg-converter.apk"
                download="webp-to-jpg-converter.apk"
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать APK</span>
              </a>

              <button
                type="button"
                onClick={() => setIsAndroidModalOpen(true)}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Инструкция по установке и QR-код"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div className="mb-8">
          <DropZone
            onFilesAdded={processFiles}
            onLoadSamples={handleLoadSamples}
            isLoadingSamples={isLoadingSamples}
          />
        </div>

        {/* Settings Bar */}
        <SettingsBar
          settings={settings}
          onChange={setSettings}
          onReconvertAll={handleReconvertAll}
          hasItems={items.length > 0}
          isConverting={isConverting}
        />

        {/* Stats Banner */}
        <StatsBanner items={items} />

        {/* File Queue List */}
        <FileQueue
          items={items}
          onRemoveItem={handleRemoveItem}
          onClearAll={handleClearAll}
          onOpenCompare={(item) => setSelectedCompareItem(item)}
          onDownloadAllZip={handleDownloadAllZip}
          isDownloadingZip={isDownloadingZip}
          preserveExif={settings.preserveExif}
        />

        {/* Information & Technical FAQ */}
        <InfoSection />
      </main>

      {/* Compare Modal */}
      <CompareModal
        item={selectedCompareItem}
        onClose={() => setSelectedCompareItem(null)}
        preserveExif={settings.preserveExif}
      />

      {/* Android Install & APK Modal */}
      <AndroidInstallModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstall={install}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Footer */}
      <Footer />
    </div>
  );
}
