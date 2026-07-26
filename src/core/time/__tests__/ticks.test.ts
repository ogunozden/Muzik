import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  TICKS_PER_WHOLE,
  ZERO_TICKS,
  addTicks,
  cmpTicks,
  floorDivTicks,
  modTicks,
  mulTicks,
  quarterBeatsOf,
  subTicks,
  sumTicks,
  ticksFromFraction,
  ticksFromInteger,
  wholeNotesOf,
} from "../ticks";

/**
 * KRITIK KAPI (PLAN.md §3/G1): `TICKS_PER_WHOLE` korpusta gorulen HER paydayi
 * tam bolmeli. Bolmeyen bir payda, o notanin zaman eksenine kayipsiz
 * giremeyecegi demektir.
 *
 * Asagidaki liste 3000 TXT + 2999 mu2 dosyasinin TUM satir kodlari taranarak
 * olculdu. Korpus (`symb/`) gitignore'da oldugu icin CI'da okunamaz; bu yuzden
 * kume burada SABITLENIR ve ayrica korpus varsa canli taranir.
 */
const OBSERVED_DENOMINATORS = [1, 2, 3, 4, 6, 7, 8, 12, 13, 16, 20, 24, 32, 36, 48, 64, 72, 78, 120, 128] as const;

/** Korpusun en uzun eseri (tam nota) — tasma payi kontrolu icin. */
const LONGEST_PIECE_WHOLE_NOTES = 1122.75;

const CORPUS_DIR = path.join(process.cwd(), "symb", "SymbTr-3.0");

describe("Ticks — zaman cekirdegi (G1)", () => {
  describe("KRITIK KAPI: cozunurluk tum paydalari boler", () => {
    it.each(OBSERVED_DENOMINATORS)("payda %i tam boluyor", (denominator) => {
      expect(TICKS_PER_WHOLE % denominator).toBe(0);
    });

    it("40320 YETMEZ — bu sabitin neden buyudugunu kaydeder", () => {
      // Yaygin aday 40320; korpusta 13 ve 78 (=2·3·13) paydalari var.
      expect(40320 % 13).not.toBe(0);
      expect(40320 % 78).not.toBe(0);
      expect(TICKS_PER_WHOLE % 13).toBe(0);
      expect(TICKS_PER_WHOLE % 78).toBe(0);
    });

    it("tasma payi guvenli", () => {
      const longest = LONGEST_PIECE_WHOLE_NOTES * TICKS_PER_WHOLE;

      expect(Number.isSafeInteger(Math.round(longest))).toBe(true);
      // En az 1000 kat pay kalsin.
      expect(longest * 1000).toBeLessThan(Number.MAX_SAFE_INTEGER);
    });

    const hasCorpus = fs.existsSync(CORPUS_DIR);
    it.skipIf(!hasCorpus)("canli korpusta bolunmeyen payda YOK", () => {
      const unseen = new Set<number>();
      const txtDir = path.join(CORPUS_DIR, "txt");
      for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
        for (const line of fs.readFileSync(path.join(txtDir, file), "utf8").split(/\r?\n/).slice(1)) {
          if (!line.trim()) continue;
          const denominator = Number(line.split("\t")[7]);
          if (!Number.isFinite(denominator) || denominator <= 0) continue;
          if (TICKS_PER_WHOLE % denominator !== 0) unseen.add(denominator);
        }
      }

      expect([...unseen]).toEqual([]);
    });
  });

  describe("kesirden tick — kayipsiz", () => {
    it.each(OBSERVED_DENOMINATORS)("1/%i kayipsiz gidip geliyor", (denominator) => {
      const value = ticksFromFraction(1, denominator);

      expect(value).not.toBeNull();
      expect(wholeNotesOf(value!)).toBeCloseTo(1 / denominator, 12);
    });

    it("tam nota, yarim, ceyreklik dogru", () => {
      expect(ticksFromFraction(1, 1)).toBe(TICKS_PER_WHOLE);
      expect(ticksFromFraction(1, 2)).toBe(TICKS_PER_WHOLE / 2);
      expect(quarterBeatsOf(ticksFromFraction(1, 4)!)).toBe(1);
      expect(quarterBeatsOf(ticksFromFraction(1, 8)!)).toBe(0.5);
    });

    it("triole ve quintuplet TAM temsil edilir (float'ta edilemezdi)", () => {
      const triplet = ticksFromFraction(1, 12)!;
      const quintuplet = ticksFromFraction(1, 20)!;

      // Ucu birlestirince TAM olarak bir ceyreklik eder — float'ta 0.9999... olurdu.
      expect(sumTicks([triplet, triplet, triplet])).toBe(ticksFromFraction(1, 4));
      expect(sumTicks(Array<typeof quintuplet>(5).fill(quintuplet))).toBe(ticksFromFraction(1, 4));
    });

    it("BOLMEYEN payda null doner — sessizce YUVARLAMAZ", () => {
      // 524160 = 2^7 · 3^2 · 5 · 7 · 13. Asal carpani eksik olan paydalar:
      expect(ticksFromFraction(1, 11)).toBeNull(); // 11 yok
      expect(ticksFromFraction(1, 25)).toBeNull(); // 5 yalniz BIR kez var
      expect(ticksFromFraction(1, 27)).toBeNull(); // 3 yalniz IKI kez var
      expect(ticksFromFraction(1, 256)).toBeNull(); // 2 yalniz YEDI kez var
      expect(ticksFromFraction(1, 0)).toBeNull();
      expect(ticksFromFraction(1, -4)).toBeNull();
      expect(ticksFromFraction(1.5, 4)).toBeNull();
      expect(ticksFromFraction(Number.NaN, 4)).toBeNull();
    });

    it("`0/0` yer-tutucu satiri null doner (D1 yolu)", () => {
      expect(ticksFromFraction(0, 0)).toBeNull();
    });
  });

  describe("aritmetik — epsilon YOK", () => {
    it("toplama ve cikarma tam", () => {
      const a = ticksFromFraction(3, 16)!;
      const b = ticksFromFraction(1, 16)!;

      expect(addTicks(a, b)).toBe(ticksFromFraction(1, 4));
      expect(subTicks(addTicks(a, b), b)).toBe(a);
    });

    it("MEVCUT MOTORUN float birikimi burada YOK", () => {
      // Motorda bugun `startBeat += durationBeats`. 1/24'luk (triole 16'lik)
      // suresi ceyreklik cinsinden 4/24 = 0.1666... — 24 kez toplanınca float
      // ekseni TAM 4'e varmaz; tick ekseni varir.
      const asFloat = Array.from({length: 24}).reduce<number>((total) => total + (1 / 24) * 4, 0);
      const asTicks = sumTicks(Array.from({length: 24}, () => ticksFromFraction(1, 24)!));

      expect(asFloat).not.toBe(4); // float: 3.9999999999999996
      expect(quarterBeatsOf(asTicks)).toBe(4); // tick: TAM
      expect(asTicks).toBe(ticksFromFraction(1, 1));
    });

    it("karsilastirma", () => {
      const small = ticksFromFraction(1, 16)!;
      const big = ticksFromFraction(1, 4)!;

      expect(cmpTicks(small, big)).toBe(-1);
      expect(cmpTicks(big, small)).toBe(1);
      expect(cmpTicks(big, big)).toBe(0);
    });

    it("floorDiv ve mod — olcu izgarasinin temeli", () => {
      const measure = ticksFromFraction(1, 1)!; // 1 tam nota = 1 olcu
      const position = ticksFromFraction(9, 4)!; // 2 olcu + 1 ceyreklik

      expect(floorDivTicks(position, measure)).toBe(2);
      expect(modTicks(position, measure)).toBe(ticksFromFraction(1, 4));
    });

    it("mod negatif girdide pozitif kalan doner", () => {
      const measure = ticksFromFraction(1, 1)!;
      const negative = subTicks(ZERO_TICKS, ticksFromFraction(1, 4)!);

      expect(modTicks(negative, measure)).toBe(ticksFromFraction(3, 4));
    });

    it("mulTicks tamsayi olmayan carpani reddeder", () => {
      const value = ticksFromFraction(1, 4)!;

      expect(mulTicks(value, 3)).toBe(ticksFromFraction(3, 4));
      expect(mulTicks(value, 1.5)).toBeNull();
    });

    it("sumTicks bos dizide sifir", () => {
      expect(sumTicks([])).toBe(ZERO_TICKS);
    });
  });

  describe("tamsayi korumasi", () => {
    it("tamsayi olmayan deger yukseltilmez", () => {
      expect(ticksFromInteger(1.5)).toBeNull();
      expect(ticksFromInteger(Number.NaN)).toBeNull();
      expect(ticksFromInteger(Number.POSITIVE_INFINITY)).toBeNull();
      expect(ticksFromInteger(42)).toBe(42);
    });
  });
});
