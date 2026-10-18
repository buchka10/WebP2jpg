import React from 'react';
import { ShieldCheck, HelpCircle, FileCheck2, Zap, EyeOff } from 'lucide-react';

export const InfoSection: React.FC = () => {
  return (
    <section id="faq" className="mt-12 pt-10 border-t border-neutral-800 text-neutral-300">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 mb-2">
          Всё о конвертации WebP в JPG
        </h2>
        <p className="text-sm text-neutral-400">
          Быстрая справка по форматам, совместимости и принципам локальной обработки
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-100 mb-2">
            Максимальная совместимость
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Формат WebP отлично подходит для веба, но часто не открывается в старых версиях Photoshop, документах Word/PowerPoint, старых ОС или на принтерах. Конвертация в JPG решает любые проблемы совместимости.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-100 mb-2">
            100% Конфиденциальность
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Вся обработка выполняется исключительно в вашем браузере с помощью графического движка Canvas. Ваши фотографии, сканы и изображения никогда не загружаются на удаленные сервера.
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-100 mb-2">
            Умная обработка прозрачности
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Формат JPG не поддерживает прозрачность. При наивной конвертации прозрачные области становятся черными. Наш конвертер позволяет выбрать белый, черный или любой другой фоновый цвет заливки.
          </p>
        </div>
      </div>

      {/* Accordion / FAQ list */}
      <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Часто задаваемые вопросы</span>
        </h4>

        <div className="space-y-4 text-xs">
          <div>
            <div className="font-medium text-neutral-200 mb-1 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>Зачем удалять метаданные (EXIF) при конвертации?</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Фотографии с телефонов и камер содержат встроенные метаданные EXIF: точные координаты GPS места съемки, модель и серийный номер устройства, дату и время. Режим «Удалять (Приватно)» полностью очищает эти скрытые данные, защищая вас от утечки личной информации при отправке или публикации картинок в сети.
            </p>
          </div>

          <div className="border-t border-neutral-800/80 pt-3">
            <div className="font-medium text-neutral-200 mb-1">
              Какое качество сжатия выбрать?
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Значение <span className="text-amber-400 font-mono">92%</span> обеспечивает практически неотличимое от оригинала качество при оптимальном размере файла. Если требуется идеальная точность каждого пикселя, выберите 100%. Для экономии места на диске отлично подходит 80%.
            </p>
          </div>

          <div className="border-t border-neutral-800/80 pt-3">
            <div className="font-medium text-neutral-200 mb-1">
              Есть ли ограничение на количество или вес файлов?
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Нет ограничений. Вы можете перетаскивать десятки и сотни файлов WebP одновременно. Производительность зависит только от мощности вашего компьютера.
            </p>
          </div>

          <div className="border-t border-neutral-800/80 pt-3">
            <div className="font-medium text-neutral-200 mb-1">
              Как скачать все сконвертированные файлы разом?
            </div>
            <p className="text-neutral-400 leading-relaxed">
              После завершения конвертации нажмите кнопку «Скачать все (ZIP)» в шапке или в блоке очереди. Браузер сгенерирует ZIP-архив со всеми готовыми JPG-изображениями.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
