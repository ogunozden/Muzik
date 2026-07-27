/**
 * App Configuration - Uygulama Konfigürasyonu
 * Merkezi uygulama ayarları
 */

export const appConfig = {
  name: "Muzik",
  fullName: "Muzik - Türk Müziği Platformu",
  description: "Türk müziği için kapsamlı nota, usül ve makam çalma platformu",
  version: "0.1.0",
  language: "tr" as const,
  locale: "tr-TR" as const,

  // Geliştirme ayarları
  development: {
    port: 4000,
    host: "localhost",
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },

  // Timeout değerleri (ms)
  timeouts: {
    api: 30000,
    audio: 5000,
    recording: 60000,
  },

  // Audio ayarları
  audio: {
    defaultBpm: 120,
    minBpm: 40,
    maxBpm: 200,
    bpmStep: 10,
  },
} as const;
