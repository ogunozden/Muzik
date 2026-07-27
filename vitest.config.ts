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
      //
      // 2026-07-27 (H7) olcum — IKI ORTAM ayri olculdu:
      //
      //                 yerel (korpuslu)   CI (korpussuz)   <- BAGLAYICI
      //   statements        69,73             69,47
      //   branches          65,07             64,83
      //   functions         78,30             78,30
      //   lines             70,59             70,40
      //
      // Esikler **CI degerinin** altina konuldu; yereldeki daha yuksek sayiya
      // gore ayarlamak CI'yi kirardi. Fark kucuk (~0,2 puan) cunku korpus
      // kapilari fixture testleriyle ayni kod yollarini geziyor.
      //
      // NOT: bu olcum H2'den ONCE alinamiyordu; korpus kapilari `testTimeout`
      // 20 s'ye takilip yerel coverage kosusunu dusuruyordu. Esikler aylardir
      // ***guncel olcum gorulmeden*** duruyordu.
      //
      // 2026-07-27 (H11) — OLU KOD SILINDI, oran YUKSELDI. Silinen sey
      // kapsanmayan koddu; paydadan cikinca yuzde kendiliginden arti:
      //
      //                 yerel (korpuslu)   H7'ye gore
      //   statements        70,66            +0,93
      //   branches          65,78            +0,71
      //   functions         79,77            +1,47
      //   lines             71,61            +1,02
      //
      // Yeni esikler yine CI payi birakilarak (H7'de olculen ~0,2 puanlik
      // yerel/CI farki) bir tam sayi asagi yuvarlandi.
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 79,
        lines: 71,
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
