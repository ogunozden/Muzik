import {formatSolfegePitch} from "@/core/domain/note-naming";
import {
  INSTRUMENTS,
  MELODIC_INSTRUMENTS as MELODIC_INSTRUMENT_IDS,
  PERCUSSION_INSTRUMENTS as PERCUSSION_INSTRUMENT_IDS,
} from "@/lib/app-constants";

export type SampleCategory = "melodic" | "percussion";

export interface SampleSlot {
  key: string;
  category: SampleCategory;
  instrumentId: string;
  instrumentName: string;
  groupLabel: string;
  label: string;
  fileName: string;
  relativePath: string;
  url: string;
  midiNumber?: number;
  noteName?: string;
  symbol?: "dum" | "tek" | "ke" | "hek";
  isAccent?: boolean;
}

export interface MelodicSampleRef {
  midiNumber: number;
  url: string;
}

export interface PercussionSampleSet {
  urls: string[];
  accentUrls: string[];
}

const SAMPLE_FOLDER_BY_INSTRUMENT_ID = {
  ney: "ney",
  ud: "ud",
  kemençe: "kemence",
  tanpura: "tanpura",
  kanun: "kanun",
  bağlama: "baglama",
  tambur: "tambur",
  santur: "santur",
  lavta: "lavta",
  rebab: "rebab",
  miskal: "miskal",
  kudum: "kudum",
  bendir: "bendir",
  davul: "davul",
  def: "def",
  darbuka: "darbuka",
  zilli_def: "zilli-def",
  kaşık: "kasik",
  zil: "zil",
  nakkare: "nakkare",
} as const;

const INSTRUMENT_LABEL_BY_ID = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument.nameTr]));

function makeSampleInstrument(id: keyof typeof SAMPLE_FOLDER_BY_INSTRUMENT_ID) {
  return {
    id,
    name: INSTRUMENT_LABEL_BY_ID.get(id) ?? id,
    folder: SAMPLE_FOLDER_BY_INSTRUMENT_ID[id],
  };
}

const MELODIC_SAMPLE_INSTRUMENTS = MELODIC_INSTRUMENT_IDS.map(makeSampleInstrument);
const PERCUSSION_SAMPLE_INSTRUMENTS = PERCUSSION_INSTRUMENT_IDS.map(makeSampleInstrument);

const PERCUSSION_SYMBOLS = [
  {symbol: "dum", name: "Dum"},
  {symbol: "tek", name: "Tek"},
  {symbol: "ke", name: "Ke"},
  // `hek` iki elin birlikte vurusudur (Kudum kitabi s.14). Dosyalari
  // `scripts/derive-hek-samples.mjs` ile dum+tek toplamindan TURETILIR;
  // gercek hek kaydi bulunursa dogrudan uzerine yazilabilir (K4).
  {symbol: "hek", name: "Hek"},
] as const;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

function midiToSlotNoteName(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${NOTE_NAMES[midiNumber % 12]}${octave}`;
}

function noteNameToFileName(noteName: string): string {
  return `${noteName.replace("#", "s")}.wav`;
}

function makeUrl(relativePath: string): string {
  return `/samples/${relativePath.replace(/\\/g, "/")}`;
}

function makeMelodicSlots(): SampleSlot[] {
  const slots: SampleSlot[] = [];

  for (const instrument of MELODIC_SAMPLE_INSTRUMENTS) {
    for (let midiNumber = 48; midiNumber <= 83; midiNumber++) {
      const noteName = midiToSlotNoteName(midiNumber);
      const fileName = noteNameToFileName(noteName);
      const relativePath = `${instrument.folder}/${fileName}`;

      slots.push({
        key: `${instrument.id}:${noteName}`,
        category: "melodic",
        instrumentId: instrument.id,
        instrumentName: instrument.name,
        groupLabel: instrument.name,
        label: formatSolfegePitch(noteName),
        fileName,
        relativePath,
        url: makeUrl(relativePath),
        midiNumber,
        noteName,
      });
    }
  }

  return slots;
}

function makePercussionSlots(): SampleSlot[] {
  const slots: SampleSlot[] = [];

  for (const instrument of PERCUSSION_SAMPLE_INSTRUMENTS) {
    for (const {symbol, name} of PERCUSSION_SYMBOLS) {
      for (const isAccent of [false, true]) {
        const suffix = isAccent ? "-accent" : "";
        const fileName = `${symbol}${suffix}.wav`;
        const relativePath = `${instrument.folder}/${fileName}`;

        slots.push({
          key: `${instrument.id}:${symbol}${suffix}`,
          category: "percussion",
          instrumentId: instrument.id,
          instrumentName: instrument.name,
          groupLabel: instrument.name,
          label: isAccent ? `${name} vurgu` : name,
          fileName,
          relativePath,
          url: makeUrl(relativePath),
          symbol,
          isAccent,
        });
      }
    }
  }

  return slots;
}

export const SAMPLE_SLOTS: SampleSlot[] = [
  ...makeMelodicSlots(),
  ...makePercussionSlots(),
];

export const SAMPLE_SLOT_BY_KEY = new Map(SAMPLE_SLOTS.map((slot) => [slot.key, slot]));

export const MELODIC_SAMPLE_LIBRARY = SAMPLE_SLOTS
  .filter((slot): slot is SampleSlot & {midiNumber: number} => slot.category === "melodic" && typeof slot.midiNumber === "number")
  .reduce<Record<string, MelodicSampleRef[]>>((library, slot) => {
    library[slot.instrumentId] = library[slot.instrumentId] ?? [];
    library[slot.instrumentId].push({midiNumber: slot.midiNumber, url: slot.url});
    return library;
  }, {});

export const PERCUSSION_SAMPLE_LIBRARY = SAMPLE_SLOTS
  .filter((slot): slot is SampleSlot & {symbol: "dum" | "tek" | "ke" | "hek"} => slot.category === "percussion" && !!slot.symbol)
  .reduce<Record<"dum" | "tek" | "ke" | "hek", PercussionSampleSet>>(
    (library, slot) => {
      if (slot.isAccent) {
        library[slot.symbol].accentUrls.push(slot.url);
      } else {
        library[slot.symbol].urls.push(slot.url);
      }
      return library;
    },
    {
      dum: {urls: [], accentUrls: []},
      tek: {urls: [], accentUrls: []},
      ke: {urls: [], accentUrls: []},
      hek: {urls: [], accentUrls: []},
    },
  );

export const PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT = SAMPLE_SLOTS
  .filter((slot): slot is SampleSlot & {symbol: "dum" | "tek" | "ke" | "hek"} => slot.category === "percussion" && !!slot.symbol)
  .reduce<Record<string, Record<"dum" | "tek" | "ke" | "hek", PercussionSampleSet>>>((library, slot) => {
    library[slot.instrumentId] = library[slot.instrumentId] ?? {
      dum: {urls: [], accentUrls: []},
      tek: {urls: [], accentUrls: []},
      ke: {urls: [], accentUrls: []},
      hek: {urls: [], accentUrls: []},
    };

    if (slot.isAccent) {
      library[slot.instrumentId][slot.symbol].accentUrls.push(slot.url);
    } else {
      library[slot.instrumentId][slot.symbol].urls.push(slot.url);
    }

    return library;
  }, {});
