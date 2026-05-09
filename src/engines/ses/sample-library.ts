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
  symbol?: "dum" | "tek" | "ke";
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

const MELODIC_INSTRUMENTS = [
  {id: "ney", name: "Ney", folder: "ney"},
  {id: "ud", name: "Ud", folder: "ud"},
  {id: "kemençe", name: "Kemençe", folder: "kemence"},
  {id: "tanpura", name: "Tanpura", folder: "tanpura"},
  {id: "kanun", name: "Kanun", folder: "kanun"},
  {id: "bağlama", name: "Bağlama", folder: "baglama"},
  {id: "tambur", name: "Tambur", folder: "tambur"},
  {id: "santur", name: "Santur", folder: "santur"},
  {id: "lavta", name: "Lavta", folder: "lavta"},
  {id: "rebab", name: "Rebab", folder: "rebab"},
  {id: "miskal", name: "Miskal", folder: "miskal"},
] as const;

const PERCUSSION_INSTRUMENTS = [
  {id: "kudum", name: "Kudüm", folder: "kudum"},
  {id: "bendir", name: "Bendir", folder: "bendir"},
  {id: "davul", name: "Davul", folder: "davul"},
  {id: "def", name: "Def", folder: "def"},
  {id: "darbuka", name: "Darbuka", folder: "darbuka"},
  {id: "zilli_def", name: "Zilli Def", folder: "zilli-def"},
  {id: "kaşık", name: "Kaşık", folder: "kasik"},
  {id: "zil", name: "Zil", folder: "zil"},
  {id: "nakkare", name: "Nakkare", folder: "nakkare"},
] as const;

const PERCUSSION_SYMBOLS = [
  {symbol: "dum", name: "Dum"},
  {symbol: "tek", name: "Tek"},
  {symbol: "ke", name: "Ke"},
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

  for (const instrument of MELODIC_INSTRUMENTS) {
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
        label: noteName,
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

  for (const instrument of PERCUSSION_INSTRUMENTS) {
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
  .filter((slot): slot is SampleSlot & {symbol: "dum" | "tek" | "ke"} => slot.category === "percussion" && !!slot.symbol)
  .reduce<Record<"dum" | "tek" | "ke", PercussionSampleSet>>(
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
    },
  );

export const PERCUSSION_SAMPLE_LIBRARY_BY_INSTRUMENT = SAMPLE_SLOTS
  .filter((slot): slot is SampleSlot & {symbol: "dum" | "tek" | "ke"} => slot.category === "percussion" && !!slot.symbol)
  .reduce<Record<string, Record<"dum" | "tek" | "ke", PercussionSampleSet>>>((library, slot) => {
    library[slot.instrumentId] = library[slot.instrumentId] ?? {
      dum: {urls: [], accentUrls: []},
      tek: {urls: [], accentUrls: []},
      ke: {urls: [], accentUrls: []},
    };

    if (slot.isAccent) {
      library[slot.instrumentId][slot.symbol].accentUrls.push(slot.url);
    } else {
      library[slot.instrumentId][slot.symbol].urls.push(slot.url);
    }

    return library;
  }, {});
