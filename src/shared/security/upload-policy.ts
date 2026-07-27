export const SAMPLE_UPLOAD_EXTENSIONS = [".wav", ".mp3", ".ogg", ".flac"] as const;

export const MAX_SAMPLE_UPLOAD_BYTES = 25 * 1024 * 1024;

function hasAllowedExtension(fileName: string, allowedExtensions: readonly string[]): boolean {
  const normalized = fileName.toLowerCase();
  return allowedExtensions.some((extension) => normalized.endsWith(extension));
}

export function isAllowedSampleUpload(fileName: string, size: number): boolean {
  return size > 0 && size <= MAX_SAMPLE_UPLOAD_BYTES && hasAllowedExtension(fileName, SAMPLE_UPLOAD_EXTENSIONS);
}
