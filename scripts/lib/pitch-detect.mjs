/**
 * PERDE OLCUMU — IKI BAGIMSIZ YONTEM, UZLASMA ZORUNLU (PLAN.md §10/F0).
 *
 * ── NEDEN IKI YONTEM ────────────────────────────────────────────────────
 * Tek yontemle ucuncu kez yanilmamak icin. Bu oturumda ayni sinif hata
 * ucusu birden yasandi:
 *
 *   1. Serbest otokorelasyon ALT-HARMONIGE kilitlendi — `Ds5` 623 Hz iken
 *      76 Hz olculdu (8. altharmonik).
 *   2. "Beklenen perdede korelasyon yuksek mi" testi YANLIS ETIKETLI dosyayi
 *      onayladi: harmonik zengin seste yarim periyot lag'inde de korelasyon
 *      yuksek (0,974 / 0,983).
 *   3. YIN tek basina, tellilerde (ud/rebab/tanpura/lavta) oktav kaymasi
 *      cikardi: oktav duzeltildikten sonra kalan sapmanin sd'si 112–241 cent.
 *      Bu belirsizlikle "bu dosya yanlis" DENEMEZ.
 *
 * Cozum: YIN (zaman alani) + HPS (frekans alani) ayri ayri olcer. Ikisi
 * **uyusmazsa sonuc `null`** — yani "bilmiyorum" der. Bilmemek, yanlis
 * bilmekten iyidir; ozellikle 132 dosyayi yeniden yazmak soz konusuysa.
 */

/** Iki yontemin ayni kabul edilmesi icin izin verilen fark. */
export const AGREEMENT_TOLERANCE_CENTS = 55;

export function centsBetween(hz, referenceHz) {
  return 1200 * Math.log2(hz / referenceHz);
}

/** WAV -> mono Float32Array (16/24/32-bit PCM). */
export function readWavMono(buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  const channels = buffer.readUInt16LE(22);
  const rate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);

  let offset = 12;
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      const bytesPerSample = bits / 8;
      const frames = Math.floor(Math.min(size, buffer.length - offset - 8) / (bytesPerSample * channels));
      const mono = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        const p = offset + 8 + i * bytesPerSample * channels;
        if (bits === 24) mono[i] = ((buffer[p + 2] << 24) | (buffer[p + 1] << 16) | (buffer[p] << 8)) / 2147483648;
        else if (bits === 16) mono[i] = buffer.readInt16LE(p) / 32768;
        else if (bits === 32) mono[i] = buffer.readInt32LE(p) / 2147483648;
      }
      return {mono, rate};
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

/**
 * Analiz penceresi: ATTACK'i atla, kararli bolgeden al.
 *
 * Tellilerde attack transiyenti genis bantli; YIN'i de HPS'i de yaniltiyor.
 * Enerji zirvesinden sonra baslamak bunu buyuk olcude cozuyor.
 */
function stableWindow(mono, rate, seconds) {
  // Enerji zirvesini bul (kaba zarf).
  const block = Math.max(1, Math.floor(rate * 0.01));
  let peakIndex = 0;
  let peakEnergy = 0;
  for (let i = 0; i + block < mono.length; i += block) {
    let energy = 0;
    for (let j = i; j < i + block; j++) energy += mono[j] * mono[j];
    if (energy > peakEnergy) {
      peakEnergy = energy;
      peakIndex = i;
    }
  }
  // Zirveden biraz SONRA basla — attack gecsin, sonum baslamadan al.
  const start = Math.min(mono.length - 1, peakIndex + Math.floor(rate * 0.06));
  const length = Math.min(Math.floor(rate * seconds), mono.length - start);
  return length > 0 ? mono.subarray(start, start + length) : null;
}

/** YIN — zaman alani. */
export function detectYin(mono, rate, {minHz = 60, maxHz = 2000, seconds = 0.4} = {}) {
  const x = stableWindow(mono, rate, seconds);
  if (!x) return null;

  const decimation = Math.max(1, Math.floor(rate / 12000));
  const sampleRate = rate / decimation;
  const length = Math.floor(x.length / decimation);
  const signal = new Float32Array(length);
  for (let i = 0; i < length; i++) signal[i] = x[i * decimation];

  const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(length / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  if (maxLag <= minLag) return null;

  const difference = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < length; i++) {
      const delta = signal[i] - signal[i + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  const normalized = new Float64Array(maxLag + 1);
  normalized[minLag] = 1;
  let running = 0;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    running += difference[lag];
    normalized[lag] = running === 0 ? 1 : (difference[lag] * (lag - minLag)) / running;
  }

  let chosen = -1;
  for (let lag = minLag + 2; lag < maxLag; lag++) {
    if (normalized[lag] < 0.15 && normalized[lag] <= normalized[lag - 1] && normalized[lag] <= normalized[lag + 1]) {
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) {
    let best = Infinity;
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (normalized[lag] < best) {
        best = normalized[lag];
        chosen = lag;
      }
    }
    if (chosen < 0 || best > 0.5) return null;
  }

  const previous = normalized[chosen - 1] ?? normalized[chosen];
  const next = normalized[chosen + 1] ?? normalized[chosen];
  const denominator = 2 * (2 * normalized[chosen] - previous - next);
  const refined = denominator !== 0 ? chosen + (next - previous) / denominator : chosen;
  return sampleRate / refined;
}

/** Basit DFT buyuklugu (belirli frekans kumesi icin — FFT'ye gerek yok). */
function magnitudeAt(signal, rate, hz) {
  const omega = (2 * Math.PI * hz) / rate;
  let re = 0;
  let im = 0;
  for (let i = 0; i < signal.length; i++) {
    re += signal[i] * Math.cos(omega * i);
    im += signal[i] * Math.sin(omega * i);
  }
  return Math.sqrt(re * re + im * im) / signal.length;
}

/**
 * HPS — frekans alani (Harmonic Product Spectrum).
 *
 * Aday frekanslarin harmoniklerindeki enerjiyi CARPAR. Temel frekans zayif
 * olsa bile harmonikleri hizada oldugu icin skor orada tepe yapar; YIN'in
 * kacirdigi zayif-temelli telli seslerde bu yontem tutuyor.
 */
export function detectHps(mono, rate, {minHz = 60, maxHz = 2000, seconds = 0.4, harmonics = 5} = {}) {
  const x = stableWindow(mono, rate, seconds);
  if (!x) return null;

  const decimation = Math.max(1, Math.floor(rate / 12000));
  const sampleRate = rate / decimation;
  const length = Math.floor(x.length / decimation);
  const signal = new Float32Array(length);
  for (let i = 0; i < length; i++) signal[i] = x[i * decimation];

  // Cent izgarasinda tara — her yarim tonda 10 adim.
  const steps = Math.round(centsBetween(maxHz, minHz) / 10);
  let bestHz = null;
  let bestScore = 0;

  for (let step = 0; step <= steps; step++) {
    const hz = minHz * Math.pow(2, (step * 10) / 1200);
    if (hz > maxHz) break;
    let product = 1;
    let used = 0;
    for (let h = 1; h <= harmonics; h++) {
      const harmonicHz = hz * h;
      if (harmonicHz > sampleRate / 2) break;
      product *= magnitudeAt(signal, sampleRate, harmonicHz) + 1e-12;
      used++;
    }
    if (used < 2) continue;
    const score = Math.pow(product, 1 / used);
    if (score > bestScore) {
      bestScore = score;
      bestHz = hz;
    }
  }
  return bestHz;
}

/**
 * IKI YONTEMIN UZLASMASI. Uyusmazlarsa `null` — "bilmiyorum".
 *
 * Donen `agreed` degeri YIN'inkidir (daha hassas), ama yalniz HPS de ayni
 * perdeyi gordugunde. Oktav farki uyusmazlik SAYILIR: zaten kacirilan hata
 * turu tam olarak oydu.
 */
export function detectPitchConsensus(mono, rate, options = {}) {
  const yin = detectYin(mono, rate, options);
  const hps = detectHps(mono, rate, options);
  if (yin === null || hps === null) return {hz: null, yin, hps, agreed: false};

  const difference = Math.abs(centsBetween(yin, hps));
  return {hz: difference <= AGREEMENT_TOLERANCE_CENTS ? yin : null, yin, hps, agreed: difference <= AGREEMENT_TOLERANCE_CENTS};
}
