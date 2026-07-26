import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {ZERO_TICKS, ticksFromFraction} from "@/core/time/ticks";
import {decodeWindows1254} from "../encoding";
import {readMu2WrittenMeter} from "../meter-map";
import {offsetTolerance, replaySymbtrOffsets, rowAdvance} from "../offset-replay";
import {SYMBTR_COLUMNS, readSymbtrRows} from "../rows";

const FIXTURE_TXT = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "txt");
const FIXTURE_MU2 = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "mu2");
const CORPUS = path.join(process.cwd(), "symb", "SymbTr-3.0");

const HEADER = SYMBTR_COLUMNS.join("\t");

function line(values: Partial<Record<(typeof SYMBTR_COLUMNS)[number], string | number>>): string {
  return SYMBTR_COLUMNS.map((column) => String(values[column] ?? "")).join("\t");
}

/**
 * `Offset` sutunu yeniden uretilemeyen 12 eser (mertebesi okunabilen 2999
 * icinde). Sebepleri KAYNAK verinin ozelligi, motorun degil:
 *   · 11'inde `Offset` sutunu bir noktadan sonra DONUYOR (cogu serbest/gazel)
 *   · `hicaz_uzzal--zeybek`: mu2 `9/4` diyor, `Offset` `9/8` ile yazilmis —
 *     korpustaki TEK mu2/TXT celiskisi.
 * Liste sabitlenir ki bir gun degisirse gorulsun.
 */
const REPLAY_EXCEPTIONS = [
  "beyati--sazsemaisi--aksaksemai----tanburi_isak.txt",
  "dilkeshaveran--sazsemaisi--aksaksemai----ismail_fenni_ertugrul.txt",
  "hicaz_humayun--sazsemaisi--aksaksemai----neyzen_yusuf_pasa.txt",
  "hicaz_uzzal--sazsemaisi--aksaksemai-----munir_mazhar_kamsoy.txt",
  "hicaz_uzzal--zeybek--aksak----izmir.txt",
  "hicazkar--sarki--duyek--leyla_acep--sadettin_kaynak.txt",
  "huzzam--sarki--curcuna--leylaklarin_hayali--sadettin_kaynak.txt",
  "nihavent--fantezi--duyek--kalplerden_dudaklara--sadettin_kaynak.txt",
  "rast--gazel--serbest--her_yer--mehmet_baha_pars.txt",
  "rengidil--gazel--serbest--o_suh--huseyin_sadettin_arel.txt",
  "segah--fantezi--duyek--bir_ruzgardir--sadettin_kaynak.txt",
  "ussak--gazel----aheste_cek--munir_nurettin_selcuk.txt",
];

describe("rowAdvance — tek fonksiyon, iki sayi (PLAN §2.3)", () => {
  it("normal nota her iki eksende de ilerletir", () => {
    const raw = [HEADER, line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 4})].join("\n");
    const advance = rowAdvance(readSymbtrRows(raw).rows[0]);

    expect(advance.canonical).toBe(ticksFromFraction(1, 4));
    expect(advance.offsetReplay).toBe(ticksFromFraction(1, 4));
  });

  it("kod-52 tempo isareti YALNIZ `Offset` eksenini ilerletir", () => {
    const raw = [HEADER, line({Sira: 1, Kod: 52, Pay: 1, Payda: 8, Ms: 0, LNS: 127})].join("\n");
    const advance = rowAdvance(readSymbtrRows(raw).rows[0]);

    expect(advance.canonical).toBe(ZERO_TICKS);
    expect(advance.offsetReplay).toBe(ticksFromFraction(1, 8));
  });

  it("suresiz ve mertebe satiri hicbir eksende ilerletmez", () => {
    const raw = [
      HEADER,
      line({Sira: 1, Kod: 8, Nota53: "Fa5", NotaAE: "F5", Koma53: 340, Pay: 0, Payda: 0}),
      line({Sira: 2, Kod: 51, Pay: 9, Payda: 8}),
    ].join("\n");
    const rows = readSymbtrRows(raw).rows;

    for (const row of rows) {
      expect(rowAdvance(row).canonical).toBe(ZERO_TICKS);
      expect(rowAdvance(row).offsetReplay).toBe(ZERO_TICKS);
    }
  });
});

describe("replaySymbtrOffsets — sentetik", () => {
  it("8/8'de her ceyreklik 0,25 olcu ilerletir", () => {
    const note = line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 4, Offset: 0});
    const raw = [
      HEADER,
      note.replace(/0$/, "0.25"),
      note.replace(/0$/, "0.5"),
      note.replace(/0$/, "0.75"),
      note.replace(/0$/, "1"),
    ].join("\n");
    const result = replaySymbtrOffsets(readSymbtrRows(raw).rows, {numerator: 8, denominator: 8});

    expect(result?.exact).toBe(true);
    expect(result?.compared).toBe(4);
    expect(result?.canonicalMeasures).toBe(1);
  });

  it("13/8'de `1/8` suresi 0,076923 ilerletir — mertebe DONUSUM CARPANI", () => {
    const raw = [
      HEADER,
      // Korpus `Offset`'i 7 anlamli haneyle yaziyor (orn. `0.4166667`).
      line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 8, Offset: 0.0769231}),
    ].join("\n");
    const result = replaySymbtrOffsets(readSymbtrRows(raw).rows, {numerator: 13, denominator: 8});

    expect(result?.rows[0].replayedOffsetUnits).toBeCloseTo(1 / 13, 12);
    expect(result?.exact).toBe(true);
  });

  it("kod-52 `Offset`'i ilerletir ama kanonik uzunlugu BUYUTMEZ", () => {
    const raw = [
      HEADER,
      line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 1, Offset: 1}),
      line({Sira: 2, Kod: 52, Pay: 1, Payda: 8, Ms: 0, LNS: 127, Offset: 1.125}),
    ].join("\n");
    const result = replaySymbtrOffsets(readSymbtrRows(raw).rows, {numerator: 4, denominator: 4});

    expect(result?.exact).toBe(true);
    expect(result?.canonicalTicks).toBe(ticksFromFraction(1, 1)); // tempo satiri KATILMADI
    expect(result?.canonicalMeasures).toBe(1);
    expect(result?.rows[1].replayedOffsetUnits).toBeCloseTo(1.125, 12);
  });

  it("eser ici mertebe degisimi carpani degistirir", () => {
    const raw = [
      HEADER,
      line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 1, Offset: 1}),
      line({Sira: 2, Kod: 51, Pay: 3, Payda: 4}),
      line({Sira: 3, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 3, Payda: 4, Offset: 2}),
    ].join("\n");
    const result = replaySymbtrOffsets(readSymbtrRows(raw).rows, {numerator: 4, denominator: 4});

    expect(result?.exact).toBe(true);
    expect(result?.rows[1].replayedOffsetUnits).toBe(2);
  });

  it("mertebesiz eserde `null` — `Offset` UYDURULMAZ", () => {
    const raw = [HEADER, line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 4})].join("\n");

    expect(replaySymbtrOffsets(readSymbtrRows(raw).rows, {numerator: 1, denominator: 0})).toBeNull();
  });

  it("tolerans dosyanin 7 haneli yazimina gore GORELI", () => {
    expect(offsetTolerance(0)).toBe(2e-6);
    expect(offsetTolerance(100)).toBeCloseTo(2e-4, 12);
  });
});

describe("FIXTURE'LAR — gercek eserlerde `Offset` birebir", () => {
  const cases = [
    "dilkeshaveran--seyir--duyek--1--erol_bingol",
    "hicaz--turku--aksak--ote_yakaya--kutahya",
    "yeni_cargah--pesrev--devrikebir----",
    "segah--salatiummiye--aksaksemaievferi--allahumme_salli--itri",
    "cargah--turku--senginsemai--sak_sak--yurdagul_ulgar",
    "beyati--sarki--duyek--dilbera_sazin--tanburi_isak",
    "sultaniyegah--sarki--curcuna--peymaneme_mehtab--emin_ongan",
  ];

  it.each(cases)("%s — `Offset` sutunu yeniden uretiliyor", (name) => {
    const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`))));
    expect(meter).not.toBeNull();

    const rows = readSymbtrRows(fs.readFileSync(path.join(FIXTURE_TXT, `${name}.txt`), "utf8")).rows;
    const result = replaySymbtrOffsets(rows, meter!);

    expect(result).not.toBeNull();
    expect(result!.compared).toBeGreaterThan(0);
    expect(result!.matched).toBe(result!.compared);
    expect(result!.exact).toBe(true);
  });

  it("mertebesiz `serbest` eserde replay CALISMAZ ve bu gizlenmez", () => {
    const name = "saba--miraciye--serbest--pes_heman--nayi_osman_dede";
    const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`))));

    expect(meter).toBeNull();
  });
});

describe("KAPI — canli korpus (PLAN §3/G3: >=2987/3000)", () => {
  const hasCorpus = fs.existsSync(CORPUS);

  it.skipIf(!hasCorpus)("2987/2999 eserde `Offset` birebir yeniden uretiliyor", () => {
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");
    let usable = 0;
    let unmetered = 0;
    const failures: string[] = [];

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;

      const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(mu2Path)));
      if (meter === null) {
        unmetered++;
        continue;
      }

      usable++;
      const rows = readSymbtrRows(fs.readFileSync(path.join(txtDir, file), "utf8")).rows;
      const result = replaySymbtrOffsets(rows, meter);
      if (!result?.exact) failures.push(file);
    }

    expect(usable).toBe(2999);
    expect(unmetered).toBe(1);
    expect(failures.sort()).toEqual(REPLAY_EXCEPTIONS);
    expect(usable - failures.length).toBeGreaterThanOrEqual(2987);
  });

  it.skipIf(!hasCorpus)("KANONIK EKSEN kod-52'yi katmadigi icin tam olcuye oturuyor", () => {
    // Iki eksenin de gerekli olduguna dair KARSIT kanit: `Offset` eksenini
    // (kod-52 dahil) muzikal zaman sansaydik, eserlerin cogu tam olcuye
    // oturmazdi. Olculdu: kanonik %75,8 · Offset ekseni %21,0.
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");
    let canonicalWhole = 0;
    let replayWhole = 0;
    let usable = 0;

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;

      const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(mu2Path)));
      if (meter === null) continue;

      const rows = readSymbtrRows(fs.readFileSync(path.join(txtDir, file), "utf8")).rows;
      const result = replaySymbtrOffsets(rows, meter);
      if (!result) continue;

      usable++;
      const last = result.rows[result.rows.length - 1];
      if (Math.abs(result.canonicalMeasures - Math.round(result.canonicalMeasures)) < 1e-9) canonicalWhole++;
      if (last && Math.abs(last.replayedOffsetUnits - Math.round(last.replayedOffsetUnits)) < 1e-6) replayWhole++;
    }

    expect(usable).toBe(2999);
    expect(canonicalWhole).toBeGreaterThan(2200); // olculdu: 2274
    expect(canonicalWhole).toBeGreaterThan(replayWhole * 3); // 2274 vs ~629
  });
});
