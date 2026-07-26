import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {parseSymbtrScore} from "../parser";

/**
 * ANA MOTOR GOCUNUN BASELINE'I (PLAN.md §3/G0).
 *
 * Neden var: gocun her adiminda "davranis degisti mi?" sorusunun CI'da
 * yanitlanabilmesi icin. Korpus (`symb/`) gitignore'da oldugu icin CI'da
 * okunamaz; bu yuzden sekiz TEMSILCI eser fixture olarak commit edildi.
 *
 * Secim olcutu (her biri gocun farkli bir kosesini zorlar):
 *   (a) dilkeshaveran--seyir--duyek        mertebe = 1 TAM NOTA (8/8)
 *   (b) hicaz--turku--aksak                mertebe != 1 tam nota (9/8)
 *   (c) yeni_cargah--pesrev--devrikebir    buyuk usul, KUCUK yazili mertebe (4/4)
 *   (d) segah--salatiummiye--...           eser ICI mertebe degisimi (2x code-51)
 *   (e) cargah--turku--senginsemai         code-52 yogun (3x) + triole (1/24)
 *   (f) beyati--sarki--duyek               code-8 susleme yogun (21x)
 *   (g) saba--miraciye--serbest            MERTEBESIZ (mu2 sig 1/0) -> measureIndex null
 *   (h) sultaniyegah--sarki--curcuna       `0/0` yer-tutucu satirli (D1 yolu)
 *
 * Bu sayilar MEVCUT davranisin fotografidir; dogru olduklarini iddia etmez.
 * Goc sirasinda degisirlerse BILEREK guncellenir ve commit mesajinda raporlanir
 * (bkz. PLAN.md §3 pivot uyarisi: 31.605 atilan sureli satir yuzunden davranis
 * degisimi kacinilmazdir; gizlenmeyecek).
 */

const FIXTURE_DIR = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "txt");

interface Baseline {
  events: number;
  rests: number;
  measureMin: number | null;
  measureMax: number | null;
  measureDistinct: number;
  endBeat: number;
  topFractions: string[];
}

const EXPECTED: Record<string, Baseline> = {
  "beyati--sarki--duyek--dilbera_sazin--tanburi_isak.txt": {
    events: 224, rests: 2, measureMin: 1, measureMax: 39, measureDistinct: 39, endBeat: 144,
    topFractions: ["1/8:135", "1/4:34", "1/16:29"],
  },
  "cargah--turku--senginsemai--sak_sak--yurdagul_ulgar.txt": {
    events: 62, rests: 0, measureMin: 1, measureMax: 5, measureDistinct: 5, endBeat: 20,
    topFractions: ["1/24:18", "1/32:16", "1/8:14"],
  },
  "dilkeshaveran--seyir--duyek--1--erol_bingol.txt": {
    events: 54, rests: 0, measureMin: 1, measureMax: 8, measureDistinct: 8, endBeat: 32,
    topFractions: ["1/8:33", "1/4:9", "1/16:9"],
  },
  "hicaz--turku--aksak--ote_yakaya--kutahya.txt": {
    events: 56, rests: 5, measureMin: 1, measureMax: 10, measureDistinct: 10, endBeat: 45,
    topFractions: ["1/8:37", "1/4:14", "3/8:3"],
  },
  "saba--miraciye--serbest--pes_heman--nayi_osman_dede.txt": {
    events: 1233, rests: 8, measureMin: null, measureMax: null, measureDistinct: 0, endBeat: 808.875,
    topFractions: ["1/8:526", "1/4:300", "1/16:211"],
  },
  "segah--salatiummiye--aksaksemaievferi--allahumme_salli--itri.txt": {
    events: 42, rests: 0, measureMin: 1, measureMax: 4, measureDistinct: 4, endBeat: 20.5,
    topFractions: ["1/8:29", "1/16:9", "1/4:3"],
  },
  "sultaniyegah--sarki--curcuna--peymaneme_mehtab--emin_ongan.txt": {
    events: 212, rests: 0, measureMin: 1, measureMax: 40, measureDistinct: 40, endBeat: 197.5,
    topFractions: ["1/8:132", "1/4:35", "3/8:22"],
  },
  "yeni_cargah--pesrev--devrikebir----.txt": {
    events: 79, rests: 3, measureMin: 1, measureMax: 21, measureDistinct: 21, endBeat: 84,
    topFractions: ["1/4:45", "1/8:21", "1/2:9"],
  },
};

function photograph(raw: string): Baseline {
  const events = parseSymbtrScore(raw, 60);
  const measureIndexes = events.map((event) => event.measureIndex).filter((value): value is number => value !== null);
  const fractions = new Map<string, number>();
  for (const event of events) {
    const key = `${event.durationFraction.numerator}/${event.durationFraction.denominator}`;
    fractions.set(key, (fractions.get(key) ?? 0) + 1);
  }
  const last = events[events.length - 1];

  return {
    events: events.length,
    rests: events.filter((event) => event.isRest).length,
    measureMin: measureIndexes.length ? Math.min(...measureIndexes) : null,
    measureMax: measureIndexes.length ? Math.max(...measureIndexes) : null,
    measureDistinct: new Set(measureIndexes).size,
    endBeat: Number((last.startBeat + last.durationBeats).toFixed(6)),
    topFractions: [...fractions.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([key, count]) => `${key}:${count}`),
  };
}

describe("SymbTr fixture baseline (G0)", () => {
  const files = fs.readdirSync(FIXTURE_DIR).filter((file) => file.endsWith(".txt")).sort();

  it("sekiz temsilci fixture commit edilmis", () => {
    expect(files).toHaveLength(8);
    expect(files.sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(files)("%s — parse fotografi degismedi", (file) => {
    const actual = photograph(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8"));

    expect(actual).toEqual(EXPECTED[file]);
  });

  it("mertebesiz eser measureIndex URETMEZ (emniyet valfi yolu)", () => {
    // `saba--miraciye--serbest`: mu2 mertebesi 1/0 (dejenere). Bu eserde olcu
    // izgarasi kurulmamali; goc sonrasi da `unmetered` yolunda kalmali.
    const serbest = photograph(
      fs.readFileSync(path.join(FIXTURE_DIR, "saba--miraciye--serbest--pes_heman--nayi_osman_dede.txt"), "utf8"),
    );

    expect(serbest.measureDistinct).toBe(0);
    expect(serbest.measureMin).toBeNull();
  });

  it("triole ve 32'lik tasiyan fixture var (sure merdiveni kapsami)", () => {
    const sengin = photograph(
      fs.readFileSync(path.join(FIXTURE_DIR, "cargah--turku--senginsemai--sak_sak--yurdagul_ulgar.txt"), "utf8"),
    );

    expect(sengin.topFractions.some((entry) => entry.startsWith("1/24:"))).toBe(true);
    expect(sengin.topFractions.some((entry) => entry.startsWith("1/32:"))).toBe(true);
  });
});
