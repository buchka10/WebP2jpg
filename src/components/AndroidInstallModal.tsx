import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import QRCode from 'qrcode';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  onInstall,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    if (isOpen && canvasRef.current && currentUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 160,
          margin: 1,
          color: {
            dark: '#18181b',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [isOpen, currentUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerInstall = async () => {
    setInstalling(true);
    try {
      await onInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                Готовый APK для Android
              </h3>
              <p className="text-xs text-neutral-400">
                Установите приложение на телефон через APK-файл или WebAPK
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Hero: Direct APK Download Card */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-neutral-100">
                      webp-to-jpg-converter.apk
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Подписан v1+v2+v3
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Автономный установщик для Android (338 КБ)
                  </p>
                </div>
              </div>

              {/* Direct APK Download Button */}
              <a
                href="/webp-to-jpg-converter.apk"
                download="webp-to-jpg-converter.apk"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Скачать APK (338 КБ)</span>
              </a>
            </div>

            {/* Quick installation steps for the APK */}
            <div className="pt-4">
              <div className="text-[11px] font-semibold text-neutral-300 mb-2 uppercase tracking-wider">
                Как установить скачанный APK на Android:
              </div>
              <ol className="text-xs text-neutral-400 space-y-1.5 list-decimal list-inside">
                <li>Нажмите зеленую кнопку <strong>«Скачать APK»</strong>.</li>
                <li>После завершения загрузки откройте файл в панели уведомлений телефона.</li>
                <li>Если Android запросит разрешение: нажмите <em>«Настройки» → «Разрешить установку из этого источника»</em>.</li>
                <li>Нажмите <strong>«Установить»</strong>. Приложение появится в списке ваших программ и работает 100% офлайн!</li>
              </ol>
            </div>
          </div>

          {/* Section 1: Scan QR Code to download or open on Phone */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-md">
              <canvas ref={canvasRef} className="block" />
            </div>

            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-amber-400">
                <QrCode className="w-4 h-4" />
                <span>Открыть на телефоне через камеру</span>
              </div>
              <h4 className="text-sm font-semibold text-neutral-200">
                Наведите камеру смартфона на QR-код
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ссылка откроется в браузере телефона, откуда вы сможете сразу скачать APK или установить приложение.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="text-xs bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-400 font-mono flex-1 truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Alternative 1-Click WebAPK install */}
          {isInstallable && !isInstalled && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-neutral-100">
                  Альтернатива: Установка без загрузки файлов (WebAPK)
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Если вы открыли эту страницу в браузере Android, можно установить приложение в 1 клик
                </div>
              </div>
              <button
                type="button"
                onClick={handleTriggerInstall}
                disabled={installing}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Smartphone className="w-4 h-4" />
                <span>{installing ? 'Установка...' : 'Установить через WebAPK'}</span>
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Приложение уже установлено на этом устройстве и работает в автономном режиме.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Файл проверен и безопасно подписан ключом Android</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
