/**
 * `mu2` KOD-14 — OLCU ICI DARP/HUZME GRUPLAMASI (PLAN.md §4/B4).
 *
 * `mu2` kod-14 satirlari sutun 7'de rakam dizisi tasir: `12122`, `22221`,
 * `21223`, `1111`… Her rakam bir grubun kac birim surdugunu soyler.
 *
 * ── OLCULEN (3000 mu2 dosyasi) ──────────────────────────────────────────
 *   kod-14 satiri            : 46.214  (2.586/3000 dosyada)
 *   rakam DESENLI olan       : 42.319
 *   desen toplami == mertebe : 33.488  (**%79,1**)
 *
 * ── B4'UN PLANDAKI IDDIASI DUZELTILDI ───────────────────────────────────
 * Plan bunun "usul vurgusunu kaynaktan verecegini" soyluyordu. Olcum bunu
 * KISMEN destekliyor:
 *
 * · Desen OLCU BASINA degisiyor — Duyek'te **152 farkli desen** var.
 *   Yani bu, usulun kanonik duzumu DEGIL; o olcude notalarin nasil
 *   huzmelendiginin kaydi. Toplamin mertebeye esit olmadigi %20,9 tam da
 *   olcunun tam dolmadigi durumlar (orn. Duyek 8/8'de `1111` = 4).
 *
 * · Buna karsilik usul basina EN SIK desen, ders kitabi duzumuyle
 *   ortusuyor — bu guclu bir kanit:
 *       Aksak        → `22221`   (2+2+2+2+1 = 9)
 *       Duyek        → `12122`   (1+2+1+2+2 = 8)
 *       Aksaksemai   → `212221`  (2+1+2+2+2+1 = 10)
 *       Curcuna      → `21223`   (2+1+2+2+3 = 10)
 *       Yuruksemai   → `111111`  (6/4)
 *
 * **Sonuc:** bu modul olcu ici gruplamayi OLDUGU GIBI okur. `USUL_DATA`nin
 * kanonik duzumunu DEGISTIRMEZ; en sik desen `evidence` olarak sunulabilir
 * ama otorite olarak degil. Frekansla turetilmis bir sayi, tanim degildir.
 */

/** `mu2` govdesinde darp/huzme gruplamasi satiri. */
export const MU2_DARP_GROUPING_CODE = 14;

export interface DarpGrouping {
  /** `mu2` govdesindeki 1 tabanli satir sirasi. */
  readonly lineNumber: number;
  /** Ham desen metni (`"12122"`). Rakam disi icerik olabilir. */
  readonly pattern: string;
  /** Rakamlara ayrilmis gruplar; desen rakam degilse bos. */
  readonly groups: readonly number[];
  /** Gruplarin toplami; `groups` bossa `null`. */
  readonly total: number | null;
}

const DIGIT_PATTERN = /^[1-9]+$/;

/**
 * `mu2` kod-14 satirlarini sirayla okur.
 *
 * Rakam olmayan desenler (bos ya da baska icerik) ATILMAZ: `groups` bos,
 * `total` `null` olarak tasinir. Korpusta 46.214 satirin 3.895'i boyle.
 */
export function readMu2DarpGroupings(mu2Raw: string): DarpGrouping[] {
  const groupings: DarpGrouping[] = [];
  const lines = mu2Raw.split(/\r?\n/);

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (Number(columns[0]?.trim()) !== MU2_DARP_GROUPING_CODE) continue;

    const pattern = columns[7]?.trim() ?? "";
    const isDigits = DIGIT_PATTERN.test(pattern);
    const groups = isDigits ? [...pattern].map(Number) : [];

    groupings.push({
      lineNumber: index,
      pattern,
      groups,
      total: groups.length > 0 ? groups.reduce((sum, value) => sum + value, 0) : null,
    });
  }

  return groupings;
}

export interface DarpGroupingSummary {
  readonly total: number;
  readonly withDigits: number;
  /** Desen -> kac kez gectigi. */
  readonly patternCounts: ReadonlyMap<string, number>;
  /** En sik gecen rakam deseni; hicbiri yoksa `null`. */
  readonly modalPattern: string | null;
}

/**
 * Desen frekanslarini ozetler.
 *
 * `modalPattern` FREKANSLA turetilmistir — usulun tanimi DEGILDIR.
 * Cagiran taraf bunu kanit olarak sunmali, otorite olarak degil.
 */
export function summarizeDarpGroupings(groupings: readonly DarpGrouping[]): DarpGroupingSummary {
  const patternCounts = new Map<string, number>();
  let withDigits = 0;

  for (const grouping of groupings) {
    if (grouping.groups.length === 0) continue;
    withDigits++;
    patternCounts.set(grouping.pattern, (patternCounts.get(grouping.pattern) ?? 0) + 1);
  }

  let modalPattern: string | null = null;
  let best = 0;
  for (const [pattern, count] of patternCounts) {
    if (count > best) {
      best = count;
      modalPattern = pattern;
    }
  }

  return {total: groupings.length, withDigits, patternCounts, modalPattern};
}
