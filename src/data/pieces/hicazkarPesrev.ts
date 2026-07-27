import type {InstrumentType, PercussionSymbol} from "@/engines/ses/engine";
import type {SymbtrScoreEvent} from "@/data/symbtr/parser";
import type {ExternalReferenceSource} from "@/data/references/external-sources";
import {createDefaultVisualMap} from "@/data/pieces/visual-map";
import type {PieceVisualMap} from "@/data/pieces/visual-map";

export type PieceScoreEvent = SymbtrScoreEvent;
export {koma53ToFrequency, parseSymbtrScore} from "@/data/symbtr/parser";

export interface PieceLayer {
  id: string;
  label: string;
  instrument: InstrumentType;
  gain: number;
  delay: number;
}

export interface PiecePercussionLayer {
  id: string;
  label: string;
  instrument: InstrumentType;
}

export interface PiecePlaybackAhenk {
  label: string;
  koma53Offset: number;
  referencePitch: string;
}

export type PieceReferenceSource = ExternalReferenceSource;

export interface PieceUsulHit {
  beat: number;
  syllable: string;
  symbol: PercussionSymbol;
  isAccent: boolean;
  timeValue: number;
}

export interface PieceDefinition {
  id: string;
  title: string;
  displayTitle: string;
  composer: string;
  makam: string;
  form: string;
  usul: string;
  usulId: string;
  meter: string;
  bpm: number;
  symbtrCatalogId?: string;
  symbtrRawUrl: string;
  symbtrPageUrl: string;
  sourcePageUrl: string;
  referenceRecordingUrl?: string;
  referenceSources?: readonly PieceReferenceSource[];
  scorePageUrls: readonly string[];
  visualMap?: PieceVisualMap;
  playbackAhenk?: PiecePlaybackAhenk;
  usulHits?: readonly PieceUsulHit[];
  melodicLayers: readonly PieceLayer[];
  percussionLayers: readonly PiecePercussionLayer[];
  requiredPercussionSymbols: readonly PercussionSymbol[];
}

export const KIZ_NEYI_FOUR_VOICE_A_AHENK = {
  label: "Kız Neyi - 4 Ses - A",
  koma53Offset: 9,
  referencePitch: "Rast=A4",
} as const satisfies PiecePlaybackAhenk;

export const DEVRI_KEBIR_DARB_PATTERN = [
  {beat: 1, syllable: "Dü-üm", symbol: "dum", isAccent: true, timeValue: 2},
  {beat: 3, syllable: "Dü-üm", symbol: "dum", isAccent: false, timeValue: 2},
  {beat: 5, syllable: "Te-ek", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 7, syllable: "Düm", symbol: "dum", isAccent: true, timeValue: 1},
  {beat: 8, syllable: "Tek", symbol: "tek", isAccent: false, timeValue: 1},
  {beat: 9, syllable: "Te", symbol: "tek", isAccent: false, timeValue: 0.5},
  {beat: 9.5, syllable: "Ke", symbol: "ke", isAccent: false, timeValue: 0.5},
  {beat: 10, syllable: "Düm", symbol: "dum", isAccent: false, timeValue: 1},
  {beat: 11, syllable: "Te-ek", symbol: "tek", isAccent: true, timeValue: 2},
  {beat: 13, syllable: "Te-ek", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 15, syllable: "Te-ek", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 17, syllable: "Dü-üm", symbol: "dum", isAccent: true, timeValue: 2},
  {beat: 19, syllable: "Dü-üm", symbol: "dum", isAccent: true, timeValue: 2},
  {beat: 21, syllable: "Ta-aa", symbol: "tek", isAccent: false, timeValue: 2},
  {beat: 23, syllable: "He-ek", symbol: "dum", isAccent: false, timeValue: 2},
  {beat: 25, syllable: "Te", symbol: "tek", isAccent: false, timeValue: 1},
  {beat: 26, syllable: "Ke", symbol: "ke", isAccent: false, timeValue: 1},
  {beat: 27, syllable: "Te", symbol: "tek", isAccent: false, timeValue: 1},
  {beat: 28, syllable: "Ke", symbol: "ke", isAccent: false, timeValue: 1},
] as const satisfies readonly PieceUsulHit[];

export const HICAZKAR_REFERENCE_SOURCES = [
  {
    id: "defteriniz-hicazkar-pesrev-osman-bey-score",
    label: "Nota kaynağı",
    provider: "score",
    url: "https://defteriniz.com/hicazkar-pesrev-tanburi-osman-bey-saz-eserleri-t-s-m-nota/101492/",
    title: "Hicazkar Peşrev - Tanburi Osman Bey",
    access: "external-link",
    verification: "manual",
    verifiedAt: "2026-05-10",
  },
  {
    id: "symbtr-hicazkar-pesrev-devrikebir-tanburi-buyuk-osman-bey",
    label: "SymbTr",
    provider: "symbtr",
    url: "https://github.com/MTG/SymbTr",
    title: "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey",
    access: "external-link",
    verification: "catalog",
    verifiedAt: "2026-05-10",
  },
  {
    id: "youtube-nwbnzn75br8",
    label: "Referans kayıt",
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=NwbNZN75bR8",
    title: "Hicazkâr Peşrev (Tanburi Büyük Osman) Nota Eşliğinde (Ahenk: Kız Neyi - 4 Ses - A)",
    author: "Bekir GÜLSÜN",
    thumbnailUrl: "https://i.ytimg.com/vi/NwbNZN75bR8/hqdefault.jpg",
    access: "external-link",
    verification: "oembed",
    verifiedAt: "2026-05-10",
    notes: "Metadata YouTube oEmbed ile doğrulandı; otomatik embed yapılmaz.",
  },
] as const satisfies readonly PieceReferenceSource[];

export const HICAZKAR_VISUAL_MAP = {
  ...createDefaultVisualMap(3, {
    verifiedAt: "2026-05-10",
    notes: "Kaynak GIF sayfalarında ölçü koordinatı bulunmadığı için satır bantları yüzde tabanlı manuel hizalama noktası olarak tutulur.",
  }),
} as const satisfies PieceVisualMap;

export const HICAZKAR_PESREV = {
  id: "hicazkar-pesrev-osman-bey",
  title: "Hicazkar Pesrev",
  displayTitle: "Hicazkar Peşrev",
  composer: "Tanburi Büyük Osman Bey",
  makam: "Hicazkar",
  form: "Peşrev",
  usul: "Devr-i Kebir",
  usulId: "devrikebir",
  meter: "28/4",
  bpm: 72,
  symbtrCatalogId: "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey",
  symbtrRawUrl:
    "https://raw.githubusercontent.com/MTG/SymbTr/master/txt/hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey.txt",
  symbtrPageUrl: "https://github.com/MTG/SymbTr",
  sourcePageUrl: "https://defteriniz.com/hicazkar-pesrev-tanburi-osman-bey-saz-eserleri-t-s-m-nota/101492/",
  referenceRecordingUrl: "https://www.youtube.com/watch?v=NwbNZN75bR8",
  referenceSources: HICAZKAR_REFERENCE_SOURCES,
  scorePageUrls: [
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey01.gif",
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey02.gif",
    "https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey03.gif",
  ],
  visualMap: HICAZKAR_VISUAL_MAP,
  playbackAhenk: KIZ_NEYI_FOUR_VOICE_A_AHENK,
  usulHits: DEVRI_KEBIR_DARB_PATTERN,
  melodicLayers: [
    {id: "ud", label: "Ud", instrument: "ud", gain: 0.2, delay: 0},
    {id: "kanun", label: "Kanun", instrument: "kanun", gain: 0.13, delay: 0.012},
    {id: "kemence", label: "Kemençe", instrument: "kemençe", gain: 0.12, delay: 0.022},
  ] satisfies PieceLayer[],
  percussionLayers: [
    {id: "kudum", label: "Kudüm", instrument: "kudum"},
  ] satisfies PiecePercussionLayer[],
  requiredPercussionSymbols: ["dum", "tek", "ke"] satisfies PercussionSymbol[],
} as const satisfies PieceDefinition;

export const PIECE_LIBRARY = [HICAZKAR_PESREV] as const satisfies readonly PieceDefinition[];

export function getCurrentScoreEvent(events: PieceScoreEvent[], elapsedSeconds: number): PieceScoreEvent | null {
  return (
    events.find((event) => elapsedSeconds >= event.startTime && elapsedSeconds < event.startTime + event.duration) ??
    null
  );
}
