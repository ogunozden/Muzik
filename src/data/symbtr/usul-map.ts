import {type Ticks, ZERO_TICKS, addTicks} from "@/core/time/ticks";
import {type DurationFraction, type SymbtrRow} from "./rows";

/**
 * USUL HARITASI (PLAN.md §2.2 / §3 G2).
 *
 * **Usul, yazili mertebe DEGILDIR.** Devrikebir 28 zamanlidir ama notada
 * 4/4 yazilir; iki eksen ayri tutulmazsa olcu izgarasi da usul vurgusu da
 * yanlis cikar. `MeterMap` yazili mertebeyi, bu modul usul devrini tasir.
 *
 * ── KAYNAK: `mu2` kod-51 ────────────────────────────────────────────────
 * Usul ADI TXT'de YOKTUR. README v2 madde 5 adin `Soz1`de olacagini soyler;
 * v3 korpusunda TXT kod-51 satirlarinin **382/382**'sinde `Soz1` bostur.
 * Ad, `mu2` kardes dosyasinin kod-51 satirlarindadir:
 *
 *     51 <bos> 8  8  <bos x4> Düyek
 *     51 <bos> 13 8  <bos x4> Nîmevsat
 *              ^  ^                ^
 *            Pay Payda           usul adi (Windows-1254)
 *
 * ── OLCULEN HIZALAMA (3000 dosya) ───────────────────────────────────────
 * · `mu2` kod-51 sayisi − TXT kod-51 sayisi = **+1** (2814 dosyada).
 *   Fazladan olan, eserin BASINDAKI acilis beyanidir; TXT'de karsiligi yok.
 * · TXT'de olup `mu2`de olmayan kod-51: **0 dosya**. Yani eslesme tek yonlu
 *   ve guvenli: `mu2[0]` = acilis, `mu2[i+1]` ↔ `txt[i]`.
 * · Korpusta **134 farkli usul adi** var (Aksak 449, Duyek 432, Sofyan 378…).
 *   Bunlarin hicbiri bugun motora girmiyor.
 */

export interface Mu2UsulDeclaration {
  /** `mu2` govdesindeki 1 tabanli satir sirasi. */
  readonly lineNumber: number;
  readonly meter: DurationFraction | null;
  /** Windows-1254'ten cozulmus usul adi. */
  readonly name: string | null;
}

export interface UsulSegment {
  /** Segmentin basladigi kanonik tick konumu. */
  readonly startTick: Ticks;
  readonly name: string | null;
  readonly meter: DurationFraction | null;
  /** TXT `LNS` sutunundaki kimlik; acilis segmentinde `null`. */
  readonly usulId: number | null;
  /** Bu segmenti acan TXT `rows` dizini; `null` ise acilis beyani. */
  readonly sourceRowIndex: number | null;
  /** Ad `mu2` ile hizalanarak mi bulundu, yoksa bilinmiyor mu? */
  readonly nameSource: "mu2-aligned" | "unknown";
}

export interface UsulMap {
  readonly segments: readonly UsulSegment[];
  /** `mu2` beyanlari TXT kod-51 satirlariyla +1 kuraliyla hizalandi mi? */
  readonly aligned: boolean;
}

/**
 * `mu2` govdesindeki kod-51 satirlarini sirayla okur.
 *
 * `mu2Raw` **cozulmus** metin olmali (bkz. `decodeWindows1254`); bu fonksiyon
 * kodlama donusumu yapmaz, boylece kaynak okuma sorumlulugu tek yerde kalir.
 */
export function readMu2UsulDeclarations(mu2Raw: string): Mu2UsulDeclaration[] {
  const declarations: Mu2UsulDeclaration[] = [];
  const lines = mu2Raw.split(/\r?\n/);

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (columns[0]?.trim() !== "51") continue;

    const numerator = Number(columns[2]?.trim());
    const denominator = Number(columns[3]?.trim());
    const name = columns[7]?.trim() || null;

    declarations.push({
      lineNumber: index,
      meter:
        Number.isInteger(numerator) && Number.isInteger(denominator) && numerator > 0 && denominator > 0
          ? {numerator, denominator}
          : null,
      name,
    });
  }

  return declarations;
}

/**
 * TXT satirlarini yurur, kod-51 konumlarini bulur ve `mu2` adlariyla eslestirir.
 *
 * Hizalama kurali (olculdu): `mu2[0]` acilis, `mu2[i+1]` ↔ `txt[i]`.
 * Sayilar bu kurala uymuyorsa **ad UYDURULMAZ** — `aligned: false` doner ve
 * tum segmentlerin `nameSource`'u `unknown` olur.
 */
export function buildUsulMap(
  rows: readonly SymbtrRow[],
  declarations: readonly Mu2UsulDeclaration[],
): UsulMap {
  const changeRows: Array<{index: number; startTick: Ticks; usulId: number | null; meter: DurationFraction | null}> = [];
  let position: Ticks = ZERO_TICKS;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row.kind === "timed") {
      position = addTicks(position, row.duration);
      continue;
    }
    if (row.kind === "meter-change") {
      changeRows.push({index, startTick: position, usulId: row.usulId, meter: row.meter});
    }
  }

  const aligned = declarations.length === changeRows.length + 1;
  const opening = declarations[0] ?? null;

  const segments: UsulSegment[] = [
    {
      startTick: ZERO_TICKS,
      name: aligned ? opening?.name ?? null : null,
      meter: aligned ? opening?.meter ?? null : null,
      usulId: null,
      sourceRowIndex: null,
      nameSource: aligned && opening?.name ? "mu2-aligned" : "unknown",
    },
  ];

  for (let index = 0; index < changeRows.length; index++) {
    const change = changeRows[index];
    const declaration = aligned ? declarations[index + 1] ?? null : null;

    segments.push({
      startTick: change.startTick,
      name: declaration?.name ?? null,
      meter: change.meter ?? declaration?.meter ?? null,
      usulId: change.usulId,
      sourceRowIndex: change.index,
      nameSource: declaration?.name ? "mu2-aligned" : "unknown",
    });
  }

  return {segments, aligned};
}

/** Verilen kanonik konumda gecerli usul segmentini bulur. */
export function usulAt(map: UsulMap, tick: Ticks): UsulSegment | null {
  if (map.segments.length === 0) return null;

  let found = map.segments[0];
  for (const segment of map.segments) {
    if (segment.startTick <= tick) found = segment;
    else break;
  }
  return found;
}
