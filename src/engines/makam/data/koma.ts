import {Makam} from "@/core/domain/models";
import {midiToFrequency, noteNameToMidi} from "@/engines/nota/data";
import makamCorpus from "@/engines/makam/__generated__/makam-corpus.json";

export const KOMA_PER_OCTAVE = makamCorpus.komaPerOctave ?? 53;

/**
 * 53-EDO koma -> frekans: freq = kararHz × 2^(koma/53). Otantik makam perdesi
 * (12-TET yaklasik degil); Holder komasi = 1200/53 ≈ 22.64 cent.
 */
export function komaToFrequency(kararHz: number, koma: number): number {
  return kararHz * Math.pow(2, koma / KOMA_PER_OCTAVE);
}

/**
 * Makamin otantik koma dizisini SES FREKANSLARINA cevirir. Karar, makamin
 * nominal tonic perdesine demirlenir (register icin); dereceler korpus-turevli
 * gercek mikrotonal araliklari verir. Ustteki karar (oktav) da eklenir.
 * komaScale yoksa (korpus disi) null.
 */
export function getMakamKomaFrequencies(makam: Makam, octave = 4): number[] | null {
  if (!makam.komaScale || makam.komaScale.degrees.length === 0) return null;
  const kararHz = midiToFrequency(noteNameToMidi(makam.tonic, octave));
  const freqs = makam.komaScale.degrees.map((degree) => komaToFrequency(kararHz, degree.koma));
  freqs.push(komaToFrequency(kararHz, KOMA_PER_OCTAVE)); // ust karar (oktav)
  return freqs;
}

/**
 * 12-TET bir klavye tusunu (midiNumber) makamin OTANTIK koma perde-izgarasina
 * SNAP eder: tusun karara gore cent'i hesaplanir, oktav-ici en yakin dizi
 * derecesine (koma perdesi) kaydirilir, oktav ekseni korunur. Boylece piyano
 * makam-farkindalikli calar (hicaz'in 113c ikilisi gibi). komaScale yoksa null
 * (12-TET calinir). Bkz. playNoteAtFrequency.
 */
export function snapMidiToMakamFrequency(makam: Makam, midiNumber: number, octaveAnchor = 4): number | null {
  const scale = makam.komaScale;
  if (!scale || scale.degrees.length === 0) return null;
  const kararHz = midiToFrequency(noteNameToMidi(makam.tonic, octaveAnchor));
  const centsFromKarar = 1200 * Math.log2(midiToFrequency(midiNumber) / kararHz);
  const octaveOffset = Math.floor(centsFromKarar / 1200);
  const centsInOctave = centsFromKarar - octaveOffset * 1200; // 0..1200
  const candidates = [...scale.degrees.map((degree) => degree.cents), 1200]; // + ust karar
  let nearest = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - centsInOctave);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = candidate;
    }
  }
  return kararHz * Math.pow(2, (octaveOffset * 1200 + nearest) / 1200);
}
