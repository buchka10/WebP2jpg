export interface ConversionSettings {
  quality: number; // 0.1 to 1.0 (e.g. 0.92)
  backgroundColor: string; // Hex color for transparent areas (e.g. '#ffffff')
  scale: number; // 1.0 = 100%, 0.75, 0.5, etc.
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio: boolean;
  preserveExif: boolean; // false = strip EXIF (privacy mode), true = keep EXIF
}

export interface ConvertedItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalPreviewUrl: string;
  hasAlpha: boolean;
  hasExif?: boolean;
  exifTags?: string[];
  status: 'idle' | 'converting' | 'done' | 'error';
  errorMessage?: string;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedSize?: number;
  convertedWidth?: number;
  convertedHeight?: number;
  durationMs?: number;
}

export type QualityPreset = {
  id: string;
  label: string;
  quality: number;
  description: string;
};
