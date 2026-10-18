import JSZip from 'jszip';
import { ConversionSettings, ConvertedItem } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Helper to scan raw EXIF bytes for human-readable features (GPS, Camera, Date)
 */
function detectExifFeatures(raw: Uint8Array): string[] {
  const tags: string[] = [];
  const textDecoder = new TextDecoder('latin1');
  const ascii = textDecoder.decode(raw);

  // Check for GPS tags or keywords
  if (ascii.includes('GPS') || ascii.includes('WGS-84') || raw.includes(0x25)) {
    tags.push('GPS геолокация');
  }

  // Check for camera/device identifiers
  if (
    ascii.includes('Apple') ||
    ascii.includes('Canon') ||
    ascii.includes('Nikon') ||
    ascii.includes('Sony') ||
    ascii.includes('Samsung') ||
    ascii.includes('Google') ||
    ascii.includes('Make') ||
    ascii.includes('Model')
  ) {
    tags.push('Модель камеры');
  }

  // Check for dates (YYYY:MM:DD pattern)
  if (/\d{4}:\d{2}:\d{2}/.test(ascii)) {
    tags.push('Дата и время');
  }

  if (tags.length === 0) {
    tags.push('Метаданные EXIF');
  }

  return tags;
}

/**
 * Extracts raw EXIF bytes from WebP, JPEG, or PNG files
 */
export async function extractExifData(file: File): Promise<{
  rawExif: Uint8Array | null;
  hasExif: boolean;
  tags: string[];
}> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. WebP RIFF
    if (
      bytes.length > 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 && // 'RIFF'
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50 // 'WEBP'
    ) {
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const fourCC = String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3]
        );
        const chunkSize =
          bytes[offset + 4] |
          (bytes[offset + 5] << 8) |
          (bytes[offset + 6] << 16) |
          (bytes[offset + 7] << 24);
        const dataOffset = offset + 8;

        if (fourCC === 'EXIF' && chunkSize > 0 && dataOffset + chunkSize <= bytes.length) {
          const raw = bytes.slice(dataOffset, dataOffset + chunkSize);
          const tags = detectExifFeatures(raw);
          return { rawExif: raw, hasExif: true, tags };
        }

        offset = dataOffset + chunkSize + (chunkSize % 2 === 1 ? 1 : 0);
      }
    }

    // 2. JPEG (APP1)
    if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 <= bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xd9 || marker === 0xda) break;
        const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

        if (marker === 0xe1 && segmentLength >= 8) {
          if (
            bytes[offset + 4] === 0x45 &&
            bytes[offset + 5] === 0x78 &&
            bytes[offset + 6] === 0x69 &&
            bytes[offset + 7] === 0x66 &&
            bytes[offset + 8] === 0x00 &&
            bytes[offset + 9] === 0x00
          ) {
            const raw = bytes.slice(offset + 4, offset + 2 + segmentLength);
            const tags = detectExifFeatures(raw);
            return { rawExif: raw, hasExif: true, tags };
          }
        }
        offset += 2 + segmentLength;
      }
    }

    // 3. PNG (eXIf)
    if (
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      let offset = 8;
      while (offset + 12 <= bytes.length) {
        const length =
          (bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3];
        const type = String.fromCharCode(
          bytes[offset + 4],
          bytes[offset + 5],
          bytes[offset + 6],
          bytes[offset + 7]
        );
        if (type === 'eXIf' && length > 0 && offset + 8 + length <= bytes.length) {
          const raw = bytes.slice(offset + 8, offset + 8 + length);
          const tags = detectExifFeatures(raw);
          return { rawExif: raw, hasExif: true, tags };
        }
        offset += 12 + length;
      }
    }
  } catch (err) {
    console.warn('Failed to parse EXIF metadata:', err);
  }

  return { rawExif: null, hasExif: false, tags: [] };
}

/**
 * Injects EXIF APP1 segment into a generated JPEG blob
 */
export async function insertExifIntoJpeg(jpegBlob: Blob, rawExif: Uint8Array): Promise<Blob> {
  const buffer = await jpegBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return jpegBlob;
  }

  let exifPayload: Uint8Array;
  // If rawExif already starts with 'Exif\0\0'
  if (
    rawExif.length >= 6 &&
    rawExif[0] === 0x45 &&
    rawExif[1] === 0x78 &&
    rawExif[2] === 0x69 &&
    rawExif[3] === 0x66 &&
    rawExif[4] === 0x00 &&
    rawExif[5] === 0x00
  ) {
    exifPayload = rawExif;
  } else {
    // Prepend 'Exif\0\0'
    const header = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);
    exifPayload = new Uint8Array(header.length + rawExif.length);
    exifPayload.set(header);
    exifPayload.set(rawExif, header.length);
  }

  const segmentLength = 2 + exifPayload.length;
  if (segmentLength > 65535) {
    return jpegBlob;
  }

  const app1Segment = new Uint8Array(2 + 2 + exifPayload.length);
  app1Segment[0] = 0xff;
  app1Segment[1] = 0xe1;
  app1Segment[2] = (segmentLength >> 8) & 0xff;
  app1Segment[3] = segmentLength & 0xff;
  app1Segment.set(exifPayload, 4);

  // Construct new JPEG: SOI (2) + APP1 + original bytes (from index 2)
  const combined = new Uint8Array(2 + app1Segment.length + (bytes.length - 2));
  combined[0] = 0xff;
  combined[1] = 0xd8;
  combined.set(app1Segment, 2);
  combined.set(bytes.subarray(2), 2 + app1Segment.length);

  return new Blob([combined], { type: 'image/jpeg' });
}

/**
 * Loads an image file and retrieves its dimensions and checks if it contains alpha transparency and EXIF.
 */
export async function analyzeImage(file: File): Promise<{
  width: number;
  height: number;
  previewUrl: string;
  hasAlpha: boolean;
  hasExif: boolean;
  exifTags: string[];
}> {
  const exifInfo = await extractExifData(file);

  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Sample alpha channel
      let hasAlpha = false;
      try {
        const sampleSize = 64;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(width, sampleSize);
        canvas.height = Math.min(height, sampleSize);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 250) {
              hasAlpha = true;
              break;
            }
          }
        }
      } catch {
        hasAlpha = false;
      }

      resolve({
        width,
        height,
        previewUrl,
        hasAlpha,
        hasExif: exifInfo.hasExif,
        exifTags: exifInfo.tags,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error('Не удалось загрузить или декодировать изображение WebP'));
    };

    img.src = previewUrl;
  });
}

/**
 * Converts a WebP file to JPG using HTML5 Canvas with quality, background color, and EXIF settings
 */
export async function convertWebpToJpg(
  file: File,
  settings: ConversionSettings
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  durationMs: number;
}> {
  const startTime = performance.now();

  // Extract EXIF upfront if preserving
  const exifData = settings.preserveExif ? await extractExifData(file) : null;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // Calculate target dimensions
        let targetWidth = Math.round(originalWidth * settings.scale);
        let targetHeight = Math.round(originalHeight * settings.scale);

        if (settings.maxWidth && targetWidth > settings.maxWidth) {
          const ratio = settings.maxWidth / targetWidth;
          targetWidth = settings.maxWidth;
          if (settings.maintainAspectRatio) {
            targetHeight = Math.round(targetHeight * ratio);
          }
        }

        if (settings.maxHeight && targetHeight > settings.maxHeight) {
          const ratio = settings.maxHeight / targetHeight;
          targetHeight = settings.maxHeight;
          if (settings.maintainAspectRatio) {
            targetWidth = Math.round(targetWidth * ratio);
          }
        }

        targetWidth = Math.max(1, targetWidth);
        targetHeight = Math.max(1, targetHeight);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Не удалось получить 2D контекст канваса'));
          return;
        }

        // Fill background color
        ctx.fillStyle = settings.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Configure smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convert to JPG blob
        const clampedQuality = Math.min(1.0, Math.max(0.05, settings.quality));
        canvas.toBlob(
          async (initialBlob) => {
            URL.revokeObjectURL(objectUrl);
            if (!initialBlob) {
              reject(new Error('Сбой создания JPG файла из канваса'));
              return;
            }

            let finalBlob = initialBlob;

            // Preserve EXIF if requested and available in source
            if (settings.preserveExif && exifData?.rawExif) {
              try {
                finalBlob = await insertExifIntoJpeg(initialBlob, exifData.rawExif);
              } catch (exifErr) {
                console.warn('Failed to inject EXIF into JPEG:', exifErr);
              }
            }

            const url = URL.createObjectURL(finalBlob);
            const endTime = performance.now();
            resolve({
              blob: finalBlob,
              url,
              width: targetWidth,
              height: targetHeight,
              durationMs: Math.round(endTime - startTime),
            });
          },
          'image/jpeg',
          clampedQuality
        );
      } catch (err: unknown) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error('Ошибка при конвертации изображения'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Файл не является поддерживаемым изображением WebP'));
    };

    img.src = objectUrl;
  });
}

/**
 * Downloads a single Blob with the given file name
 */
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Packs multiple converted items into a single zip archive and triggers download
 */
export async function downloadZip(items: ConvertedItem[]): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('converted_jpg') || zip;

  let addedCount = 0;
  for (const item of items) {
    if (item.status === 'done' && item.convertedBlob) {
      const outputName = item.name.replace(/\.[^/.]+$/, '') + '.jpg';
      folder.file(outputName, item.convertedBlob);
      addedCount++;
    }
  }

  if (addedCount === 0) {
    throw new Error('Нет успешно сконвертированных файлов для архивации');
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(content, `webp_to_jpg_${timestamp}.zip`);
}

/**
 * Creates simulated EXIF payload with Camera and GPS info
 */
function createSimulatedExif(): Uint8Array {
  // A minimal valid TIFF header with Camera Make, Model and GPS
  const tiffData = new Uint8Array([
    0x49, 0x49, 0x2a, 0x00, // II* (Little Endian)
    0x08, 0x00, 0x00, 0x00, // Offset to 1st IFD
    0x03, 0x00, // 3 directory entries
    // Tag 1: Make (0x010F)
    0x0f, 0x01, 0x02, 0x00, 0x06, 0x00, 0x00, 0x00, 0x32, 0x00, 0x00, 0x00,
    // Tag 2: Model (0x0110)
    0x10, 0x01, 0x02, 0x00, 0x09, 0x00, 0x00, 0x00, 0x38, 0x00, 0x00, 0x00,
    // Tag 3: DateTime (0x0132)
    0x32, 0x01, 0x02, 0x00, 0x14, 0x00, 0x00, 0x00, 0x42, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, // Next IFD
    // Values:
    0x43, 0x61, 0x6e, 0x6f, 0x6e, 0x00, // "Canon\0" (offset 0x32 = 50)
    0x45, 0x4f, 0x53, 0x20, 0x52, 0x36, 0x20, 0x49, 0x49, 0x00, // "EOS R6 II\0" (offset 0x38 = 56)
    0x32, 0x30, 0x32, 0x36, 0x3a, 0x31, 0x30, 0x3a, 0x31, 0x38, 0x20, 0x31, 0x34, 0x3a, 0x33, 0x30, 0x3a, 0x30, 0x30, 0x00, // "2026:10:18 14:30:00\0"
    // GPS marker
    0x47, 0x50, 0x53, 0x49, 0x6e, 0x66, 0x6f, 0x00,
  ]);
  return tiffData;
}

/**
 * Injects EXIF chunk into a WebP blob
 */
async function injectExifIntoWebp(webpBlob: Blob, rawExif: Uint8Array): Promise<Blob> {
  const buffer = await webpBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (
    bytes.length < 12 ||
    bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
    bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50
  ) {
    return webpBlob;
  }

  // Build EXIF chunk: 'EXIF' + size (4 bytes LE) + payload + padding if odd
  const chunkLen = rawExif.length;
  const padding = chunkLen % 2 === 1 ? 1 : 0;
  const chunkHeader = new Uint8Array(8);
  chunkHeader[0] = 0x45; // 'E'
  chunkHeader[1] = 0x58; // 'X'
  chunkHeader[2] = 0x49; // 'I'
  chunkHeader[3] = 0x46; // 'F'
  chunkHeader[4] = chunkLen & 0xff;
  chunkHeader[5] = (chunkLen >> 8) & 0xff;
  chunkHeader[6] = (chunkLen >> 16) & 0xff;
  chunkHeader[7] = (chunkLen >> 24) & 0xff;

  const totalExifChunkLen = 8 + chunkLen + padding;
  const newFileSize = bytes.length + totalExifChunkLen;

  const result = new Uint8Array(newFileSize);
  result.set(bytes);
  // Update RIFF file size at bytes 4..7 (fileSize - 8)
  const riffSize = newFileSize - 8;
  result[4] = riffSize & 0xff;
  result[5] = (riffSize >> 8) & 0xff;
  result[6] = (riffSize >> 16) & 0xff;
  result[7] = (riffSize >> 24) & 0xff;

  // Append EXIF chunk to the end of WebP RIFF
  result.set(chunkHeader, bytes.length);
  result.set(rawExif, bytes.length + 8);
  if (padding) {
    result[newFileSize - 1] = 0;
  }

  return new Blob([result], { type: 'image/webp' });
}

/**
 * Generates sample WebP test files right in the browser (100% offline, guaranteed)
 */
export async function generateSampleWebpFiles(): Promise<File[]> {
  const createWebpBlob = (
    drawFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
    width: number,
    height: number,
    filename: string,
    withExif = false
  ): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawFn(ctx, width, height);
      }
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            let finalBlob = blob;
            if (withExif) {
              try {
                finalBlob = await injectExifIntoWebp(blob, createSimulatedExif());
              } catch (e) {
                console.warn('Sample EXIF injection skipped:', e);
              }
            }
            const file = new File([finalBlob], filename, { type: 'image/webp' });
            resolve(file);
          }
        },
        'image/webp',
        0.92
      );
    });
  };

  // Sample 1: Landscape with gradients and sun (photo style WITH EXIF: Camera Canon + GPS)
  const file1 = await createWebpBlob(
    (ctx, w, h) => {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      sky.addColorStop(0, '#0f172a');
      sky.addColorStop(0.5, '#312e81');
      sky.addColorStop(0.8, '#c2410c');
      sky.addColorStop(1, '#f59e0b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Glowing Sun
      const sunGrad = ctx.createRadialGradient(w * 0.65, h * 0.55, 10, w * 0.65, h * 0.55, 90);
      sunGrad.addColorStop(0, '#fffbeb');
      sunGrad.addColorStop(0.4, '#fde047');
      sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w * 0.65, h * 0.55, 90, 0, Math.PI * 2);
      ctx.fill();

      // Mountains silhouette
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.75);
      ctx.lineTo(w * 0.25, h * 0.45);
      ctx.lineTo(w * 0.5, h * 0.65);
      ctx.lineTo(w * 0.8, h * 0.38);
      ctx.lineTo(w, h * 0.7);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Foreground hills
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.82);
      ctx.quadraticCurveTo(w * 0.35, h * 0.7, w * 0.7, h * 0.86);
      ctx.quadraticCurveTo(w * 0.88, h * 0.95, w, h * 0.8);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    },
    800,
    500,
    'sunset_landscape_with_exif.webp',
    true // Includes EXIF metadata (Canon EOS R6 II, GPS, Date)
  );

  // Sample 2: Transparent Badge / Icon (tests transparent background fill)
  const file2 = await createWebpBlob(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);

      // Shield badge
      ctx.save();
      ctx.translate(w / 2, h / 2);

      const grad = ctx.createLinearGradient(-120, -140, 120, 140);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#8b5cf6');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -130);
      ctx.lineTo(110, -90);
      ctx.lineTo(100, 40);
      ctx.lineTo(0, 130);
      ctx.lineTo(-100, 40);
      ctx.lineTo(-110, -90);
      ctx.closePath();
      ctx.fill();

      // Star emblem in center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const points = 5;
      const outerR = 50;
      const innerR = 25;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    450,
    450,
    'transparent_shield_badge.webp',
    false
  );

  // Sample 3: Architectural Graphic Card (fine detail and typography)
  const file3 = await createWebpBlob(
    (ctx, w, h) => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);

      // Isometric architectural grid
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Neon isometric cube wireframe
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.15, h * 0.2, w * 0.7, h * 0.6);

      // Center title text
      ctx.fillStyle = '#f4f4f5';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WEBP TEST ASSET', w / 2, h / 2 - 10);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '16px monospace';
      ctx.fillText('HIGH-DENSITY COMPRESSION SAMPLE', w / 2, h / 2 + 30);
    },
    600,
    400,
    'architectural_blueprint.webp',
    false
  );

  return [file1, file2, file3];
}
