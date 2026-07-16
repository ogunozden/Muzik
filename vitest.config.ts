import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.mjs'],
    // Coverage instrumentation yavaslatir; zamanlama-hassas async testlerin
    // (debounce/playback) coverage altinda timeout almasini engeller.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // Saf mantik katmanlari icin coverage kapisi (F6.1). Buyuk UI bilesenleri
      // RTL ile davranis-testli ama satir-coverage'a dahil degil; bu esik
      // motor/domain/veri-erisim/yardimci katmanina uygulanir.
      include: [
        'src/core/**/*.ts',
        'src/engines/**/*.ts',
        'src/data/score-engine/*.ts',
        'src/data/symbtr/parser.ts',
        'src/shared/api/**/*.ts',
        'src/shared/hooks/**/*.ts',
        'src/shared/security/**/*.ts',
        'src/app/studio/follow/parts/follow-helpers.ts',
        'src/features/references/curation-helpers.ts',
        // Rehberli ogrenme: test-edilen saf/veri modulleri (playback rAF hook'u
        // ve JSX stepper davranis-testli ama satir-coverage disi).
        'src/features/learn/curriculum.ts',
        'src/features/learn/makam-curriculum.ts',
        'src/features/learn/useLearningProgress.ts',
        'src/features/learn/useMakamPlayback.ts',
      ],
      exclude: ['**/__tests__/**', '**/*.test.*', '**/*.generated.*'],
      // Mevcut olculen seviyenin hemen altinda ratchet; regresyonu yakalar,
      // yeni test eklendikce yukari cekilir (F6.1).
      thresholds: {
        statements: 62,
        branches: 58,
        functions: 70,
        lines: 62,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` client ortaminda firlatir; test ortami bir client
      // bundle degildir, bu yuzden paketin kendi no-op modulune yonlendirilir.
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
});
