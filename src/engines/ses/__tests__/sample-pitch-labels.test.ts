import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

/**
 * SAMPLE DOSYA ADI ICERIKLE UYUSUYOR MU? (TODO D1)
 *
 * Bu test bir kusurun ARDINDAN yazildi. `public/samples/ney/` altindaki 10
 * dosyanin **5'i yanlis perde etiketi** tasiyordu:
 *
 *     As4.wav -> gercekte B3   ·  C5.wav -> gercekte Cs4
 *     Cs4.wav -> gercekte D4   ·  D3.wav -> gercekte D4
 *     Ds4.wav -> gercekte E4
 *
 * Sessiz bir hata degildi: `samples.ts:224` sample'i secerken dosya adini
 * DOGRU VARSAYIP `playbackRate = istenenFrekans / etiketlenenFrekans`
 * hesapliyor. Etiket yanlissa hiz 1.0 kaliyor ve enstruman **bambaska bir
 * perde caliyor** — `As4` istendiginde bir oktav+bir yarim ton pes.
 *
 * Birim testleri bunu yakalayamazdi cunku hicbir test sample ICERIGINE
 * bakmiyordu. Bu test tam olarak ona bakiyor.
 */

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");
const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];

/** Perde adini MIDI numarasina cevirir (`Fs4` -> 66). */
function midiFromSlotName(name: string): number | null {
  const match = name.match(/^([A-G]s?)(-?\d)$/);
  if (!match) return null;
  const index = NOTE_NAMES.indexOf(match[1]);
  if (index < 0) return null;
  return (Number(match[2]) + 1) * 12 + index;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** WAV'i mono `Float32Array`e cozer (16/24/32-bit PCM). */
function readWavMono(file: string): {mono: Float32Array; rate: number} | null {
  const buffer = fs.readFileSync(file);
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
 * YIN ile temel frekans (de Cheveigné & Kawahara 2002).
 *
 * Neden duz otokorelasyon DEGIL — iki kez yanildim, ikisi de kaydedilsin:
 *
 *  1. Serbest otokorelasyon arama ALT-harmonige kilitleniyor: `Ds5` 623 Hz
 *     iken 76 Hz olculdu, `A5`/`Gs5` tam bir oktav pes raporlandi.
 *  2. "Beklenen perdedeki korelasyon en iyiye yakin mi?" testi ise YANLIS
 *     ETIKETLI dosyayi ONAYLADI: icinde B3 (244 Hz) olan `As4.wav` icin
 *     beklenen 466 Hz lag'inde korelasyon 0,974 / en iyi 0,983 cikti —
 *     cunku harmonik zengin seste YARIM PERIYOT lag'inde de korelasyon
 *     yuksektir. Yani o test, yazilma sebebi olan hatayi kaciriyordu.
 *
 * YIN'in kumulatif ortalama normalizasyonu tam olarak bu ikiligi bastirir:
 * kucuk lag'lerdeki (harmonik) yanlis dipler cezalandirilir, ilk gercek dip
 * temel periyottur.
 */
function detectFundamentalHz(mono: Float32Array, rate: number): number | null {
  const start = Math.floor(mono.length * 0.35);
  const window = Math.min(Math.floor(rate * 0.3), mono.length - start);
  if (window <= 0) return null;

  // Hiz icin indirgeme; 1200 Hz'e kadar perdeler icin 8x oversampling kalir.
  const decimation = Math.max(1, Math.floor(rate / 9600));
  const sampleRate = rate / decimation;
  const length = Math.floor(window / decimation);
  const x = new Float32Array(length);
  for (let i = 0; i < length; i++) x[i] = mono[start + i * decimation];

  const maxLag = Math.min(Math.floor(sampleRate / 100), Math.floor(length / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / 1300));
  if (maxLag <= minLag) return null;

  // 1) Fark fonksiyonu
  const difference = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < length; i++) {
      const delta = x[i] - x[i + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  // 2) Kumulatif ortalama normalizasyon — oktav ikiligini bastiran adim
  const normalized = new Float64Array(maxLag + 1);
  normalized[minLag] = 1;
  let running = 0;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    running += difference[lag];
    normalized[lag] = running === 0 ? 1 : (difference[lag] * (lag - minLag)) / running;
  }

  // 3) Esigin altindaki ILK yerel dip = temel periyot
  const THRESHOLD = 0.15;
  let chosen = -1;
  for (let lag = minLag + 2; lag < maxLag; lag++) {
    if (normalized[lag] < THRESHOLD && normalized[lag] <= normalized[lag - 1] && normalized[lag] <= normalized[lag + 1]) {
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) {
    let bestValue = Infinity;
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (normalized[lag] < bestValue) {
        bestValue = normalized[lag];
        chosen = lag;
      }
    }
    if (chosen < 0 || bestValue > 0.6) return null;
  }

  // 4) Parabolik ara-deger ile lag'i inceltir
  const previous = normalized[chosen - 1] ?? normalized[chosen];
  const next = normalized[chosen + 1] ?? normalized[chosen];
  const denominator = 2 * (2 * normalized[chosen] - previous - next);
  const refined = denominator !== 0 ? chosen + (next - previous) / denominator : chosen;

  return sampleRate / refined;
}

/** Ney ilk kurban; sonra diger melodik klasorler de eklenebilir. */
const CHECKED_INSTRUMENTS = ["ney"];
/** Yeniden ornekleme + vibrato payi. Yarim ton = 100 cent. */
const TOLERANCE_CENTS = 40;

describe("Melodik sample etiketleri icerikle UYUSMALI (D1)", () => {
  for (const instrument of CHECKED_INSTRUMENTS) {
    const folder = path.join(SAMPLES_ROOT, instrument);
    const hasFolder = fs.existsSync(folder);

    it.skipIf(!hasFolder)(`${instrument} — her dosyanin olculen perdesi adiyla ayni`, () => {
      const files = fs.readdirSync(folder).filter((name) => name.endsWith(".wav")).sort();
      expect(files.length).toBeGreaterThan(0);

      const mismatches: string[] = [];
      const unreadable: string[] = [];

      for (const file of files) {
        const slot = file.replace(/\.wav$/, "");
        const midi = midiFromSlotName(slot);
        if (midi === null) {
          unreadable.push(`${file} — dosya adi perde olarak cozulemedi`);
          continue;
        }

        const wav = readWavMono(path.join(folder, file));
        if (!wav) {
          unreadable.push(`${file} — WAV cozulemedi`);
          continue;
        }

        const measured = detectFundamentalHz(wav.mono, wav.rate);
        if (measured === null) {
          unreadable.push(`${file} — perde olculemedi`);
          continue;
        }

        const expectedHz = midiToFrequency(midi);
        const cents = 1200 * Math.log2(measured / expectedHz);
        if (Math.abs(cents) > TOLERANCE_CENTS) {
          mismatches.push(
            `${slot}: olculen ${measured.toFixed(1)} Hz, beklenen ${expectedHz.toFixed(1)} Hz (${cents > 0 ? "+" : ""}${cents.toFixed(0)} cent)`,
          );
        }
      }

      expect(unreadable).toEqual([]);
      expect(mismatches).toEqual([]);
    });

    it.skipIf(!hasFolder)(`${instrument} — 36 kromatik yuvanin hepsi dolu (C3..B5)`, () => {
      const files = new Set(fs.readdirSync(folder).filter((name) => name.endsWith(".wav")));
      const missing: string[] = [];
      for (let midi = 48; midi < 48 + 36; midi++) {
        const name = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.wav`;
        if (!files.has(name)) missing.push(name);
      }

      expect(missing).toEqual([]);
    });
  }
});
