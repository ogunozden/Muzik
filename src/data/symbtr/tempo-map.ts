import {type Ticks, ZERO_TICKS, addTicks} from "@/core/time/ticks";
import {type DurationFraction, type SymbtrRow, TEMPO_MARK_CODE, rowAdvance} from "./rows";

/**
 * TEMPO HARITASI (PLAN.md §4/B7).
 *
 * Tempo isareti "su nota degeri = su BPM" der. `mu2` bunu acikca yazar:
 *
 *     52 <bos> 1 8 168      ->  sekizlik = 168
 *              ^ ^ ^
 *          Pay Payda BPM
 *
 * TXT ayni isareti tasir ama BPM'i `LNS` sutununda ve **7 bit'e KIRPILMIS**
 * olarak: 127'yi asan degerler 127'de duruyor.
 *
 * ── NEDEN `127 + Bas` KURALI KULLANILMIYOR ──────────────────────────────
 * Plan `(LNS>=127 ? 127+Bas : LNS)` kuralini %87,3 isabetle onermisti.
 * `mu2`nin KIRPILMAMIS degerine karsi olculdu (2.121 eslesen cift):
 *
 *     LNS dogrudan dogru        : 1.090  (%51,4)
 *     `127 + Bas` kurali dogru  : 1.852  (%87,3)
 *     kural TUTMAYAN            :   269  (%12,7)
 *
 * Tutmayanlar rastgele: `LNS=127 Bas=89` -> kural 216 der, `mu2` **432**;
 * `LNS=127 Bas=96` -> kural 223 der, `mu2` **132**. Yani `Bas` sutunu
 * tasma baytı DEGIL; sekizde bir yaniltiyor.
 *
 * **Karar:** tempo `mu2`den okunur (3000/3000 dosyada var, kirpilmamis).
 * `mu2` yoksa TXT'nin `LNS` degeri kullanilir ama `clipped: true` ile
 * isaretlenir — kirpilmis bir sayi KESIN gibi sunulmaz. Uydurma kural yok.
 */

/** 7 bit sinir: bu degerdeki TXT tempolari kirpilmis olabilir. */
export const TXT_BPM_CLIP_THRESHOLD = 127;

export interface TempoMark {
  /** Isaretin kanonik tick konumu. */
  readonly startTick: Ticks;
  /** Vurus birimi (`Pay/Payda`) — "sekizlik = 168"deki *sekizlik*. */
  readonly beatUnit: DurationFraction | null;
  readonly bpm: number | null;
  readonly source: "mu2" | "symbtr-txt";
  /**
   * `true` ise deger 7 bit'e kirpilmis olabilir ve GERCEK tempo daha
   * yuksektir. Gosterimde/sesde kesin muamele gormemeli.
   */
  readonly clipped: boolean;
  /** Isareti ureten `rows` dizini. */
  readonly sourceRowIndex: number;
}

export interface TempoMap {
  readonly marks: readonly TempoMark[];
  /** `mu2` beyanlari TXT isaretleriyle birebir hizalandi mi? */
  readonly aligned: boolean;
  /** Kirpilmis (dolayisiyla belirsiz) isaret sayisi. */
  readonly clippedCount: number;
}

export interface Mu2TempoDeclaration {
  readonly beatUnit: DurationFraction | null;
  readonly bpm: number | null;
}

/** `mu2` govdesindeki kod-52 satirlarini sirayla okur. */
export function readMu2TempoDeclarations(mu2Raw: string): Mu2TempoDeclaration[] {
  const declarations: Mu2TempoDeclaration[] = [];

  for (const line of mu2Raw.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (Number(columns[0]?.trim()) !== TEMPO_MARK_CODE) continue;

    const numerator = Number(columns[2]?.trim());
    const denominator = Number(columns[3]?.trim());
    const bpm = Number(columns[4]?.trim());

    declarations.push({
      beatUnit:
        Number.isInteger(numerator) && Number.isInteger(denominator) && numerator > 0 && denominator > 0
          ? {numerator, denominator}
          : null,
      bpm: Number.isFinite(bpm) && bpm > 0 ? bpm : null,
    });
  }

  return declarations;
}

/**
 * Tempo isaretlerini kanonik eksende konumlandirir.
 *
 * `mu2Declarations` verilir ve SAYISI tutarsa BPM oradan alinir (kirpilmamis).
 * Tutmazsa TXT'ye dusulur ve 127'deki degerler `clipped` isaretlenir —
 * hizalama zorlanmaz, ad/deger uydurulmaz.
 */
export function buildTempoMap(
  rows: readonly SymbtrRow[],
  mu2Declarations: readonly Mu2TempoDeclaration[] = [],
): TempoMap {
  const positions: Array<{index: number; startTick: Ticks; row: SymbtrRow}> = [];
  let position: Ticks = ZERO_TICKS;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row.kind === "timed" && row.code === TEMPO_MARK_CODE) {
      positions.push({index, startTick: position, row});
    }
    position = addTicks(position, rowAdvance(row).canonical);
  }

  const aligned = mu2Declarations.length === positions.length && positions.length > 0;

  const marks: TempoMark[] = positions.map(({index, startTick, row}, order) => {
    const declaration = aligned ? mu2Declarations[order] : null;
    if (declaration?.bpm != null) {
      return {
        startTick,
        beatUnit: declaration.beatUnit ?? (row.kind === "timed" ? row.durationFraction : null),
        bpm: declaration.bpm,
        source: "mu2",
        clipped: false,
        sourceRowIndex: index,
      };
    }

    // TXT yedegi: `LNS` sutunu BPM tasiyor ama 7 bit'e kirpilmis olabilir.
    const rawBpm = row.kind === "timed" ? row.lnsPercent : null;
    return {
      startTick,
      beatUnit: row.kind === "timed" ? row.durationFraction : null,
      bpm: rawBpm != null && rawBpm > 0 ? rawBpm : null,
      source: "symbtr-txt",
      clipped: rawBpm != null && rawBpm >= TXT_BPM_CLIP_THRESHOLD,
      sourceRowIndex: index,
    };
  });

  return {marks, aligned, clippedCount: marks.filter((mark) => mark.clipped).length};
}

/** Verilen kanonik konumda gecerli tempo isareti. */
export function tempoAt(map: TempoMap, tick: Ticks): TempoMark | null {
  let found: TempoMark | null = null;
  for (const mark of map.marks) {
    if (mark.startTick <= tick) found = mark;
    else break;
  }
  return found;
}
