export const SCORE_UPLOAD_EXTENSIONS = [".musicxml", ".xml", ".symbtr", ".json", ".mid", ".midi"] as const;
export const SAMPLE_UPLOAD_EXTENSIONS = [".wav", ".mp3", ".ogg", ".flac"] as const;

export const MAX_SCORE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_SAMPLE_UPLOAD_BYTES = 25 * 1024 * 1024;

export function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

export function hasAllowedExtension(fileName: string, allowedExtensions: readonly string[]): boolean {
  const normalized = fileName.toLowerCase();
  return allowedExtensions.some((extension) => normalized.endsWith(extension));
}

export function isAllowedScoreUpload(fileName: string, size: number): boolean {
  return size > 0 && size <= MAX_SCORE_UPLOAD_BYTES && hasAllowedExtension(fileName, SCORE_UPLOAD_EXTENSIONS);
}

export function isAllowedSampleUpload(fileName: string, size: number): boolean {
  return size > 0 && size <= MAX_SAMPLE_UPLOAD_BYTES && hasAllowedExtension(fileName, SAMPLE_UPLOAD_EXTENSIONS);
}
