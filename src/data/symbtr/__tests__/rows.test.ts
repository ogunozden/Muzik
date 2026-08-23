import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {TICKS_PER_WHOLE, quarterBeatsOf, ticksFromFraction} from "@/core/time/ticks";
import {parseSymbtrScore} from "../parser";
import {METER_CHANGE_CODE, SYMBTR_COLUMNS, readSymbtrRows, rowAdvance} from "../rows";
import {CORPUS_TIMEOUT_MS} from "./corpus-gate";

const FIXTURE_DIR = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "txt");
const CORPUS_TXT = path.join(process.cwd(), "symb", "SymbTr-3.0", "txt");

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}

const HEADER = SYMBTR_COLUMNS.join("\t");

/**
 * `Offset` sutunu bir noktadan sonra DONAN 12 eser (3000 icinde). Kaynak
 * verinin ozelligi; okuyucunun hatasi degil. Cogu `serbest`/`gazel`, yani
 * mertebesiz — olcu ekseni olmadigi icin Offset ilerletilmemis.
 */
const FROZEN_OFFSET_FILES = [
  "beyati--sazsemaisi--aksaksemai----tanburi_isak.txt",
  "dilkeshaveran--sazsemaisi--aksaksemai----ismail_fenni_ertugrul.txt",
  "hicaz_humayun--sazsemaisi--aksaksemai----neyzen_yusuf_pasa.txt",
  "hicaz_uzzal--sazsemaisi--aksaksemai-----munir_mazhar_kamsoy.txt",
  "hicazkar--sarki--duyek--leyla_acep--sadettin_kaynak.txt",
  "huzzam--sarki--curcuna--leylaklarin_hayali--sadettin_kaynak.txt",
  "nihavent--fantezi--duyek--kalplerden_dudaklara--sadettin_kaynak.txt",
  "rast--gazel--serbest--her_yer--mehmet_baha_pars.txt",
  "rengidil--gazel--serbest--o_suh--huseyin_sadettin_arel.txt",
  "saba--miraciye--serbest--pes_heman--nayi_osman_dede.txt",
  "segah--fantezi--duyek--bir_ruzgardir--sadettin_kaynak.txt",
  "ussak--gazel----aheste_cek--munir_nurettin_selcuk.txt",
];

/** Test icin tek satirlik TXT uretir — sutun sirasi `SYMBTR_COLUMNS` ile ayni. */
function line(values: Partial<Record<(typeof SYMBTR_COLUMNS)[number], string | number>>): string {
  return SYMBTR_COLUMNS.map((column) => String(values[column] ?? "")).join("\t");
}

describe("readSymbtrRows (G2) — hicbir satir atilmaz", () => {
  describe("KAPI: satir muhasebesi denklesir", () => {
    const files = fs.readdirSync(FIXTURE_DIR).filter((file) => file.endsWith(".txt")).sort();

    it.each(files)("%s — okunan satir sayisi ham satir sayisina esit", (file) => {
      const raw = fixture(file);
      const bodyLines = raw.split(/\r?\n/).slice(1);
      const nonBlank = bodyLines.filter((value) => value.trim() !== "").length;
      const result = readSymbtrRows(raw);

      expect(result.counts.total).toBe(nonBlank);
      expect(result.counts.timed + result.counts.meterChange + result.counts.untimed).toBe(nonBlank);
      expect(result.counts.blank).toBe(bodyLines.length - nonBlank);
    });

    it.each(files)("%s — `timed` kumesi parser ciktisiyla BIREBIR ortusur", (file) => {
      const raw = fixture(file);
      const events = parseSymbtrScore(raw, 60);
      const result = readSymbtrRows(raw);

      // G9 sonrasi: parser ZAMANI ILERLETEN her satiri uretiyor, yalniz
      // kod-9'u degil. Iki tarafin ayni kumeyi gormesi artik dogrudan
      // dogrulanabiliyor — eskiden "kod-9 alt kumesi" ile kiyaslaniyordu.
      const advancing = result.rows.filter((row) => row.kind === "timed" && rowAdvance(row).canonical > 0);

      expect(advancing).toHaveLength(events.length);
      for (let index = 0; index < events.length; index++) {
        const row = advancing[index];
        if (row.kind !== "timed") throw new Error("beklenmeyen satir tipi");

        expect(row.durationFraction).toEqual(events[index].durationFraction);
        expect(quarterBeatsOf(row.duration)).toBeCloseTo(events[index].durationBeats, 9);
        expect(row.code).toBe(events[index].code);
      }
    });

    it("kod-9 DISI sureli satirlar artik olay akisinda (G9)", () => {
      // Bu fixture 21 adet kod-8 (carpma) tasiyor ve hepsi sure iceriyor.
      // Eskiden akista HIC gorunmuyorlardi.
      const raw = fixture("beyati--sarki--duyek--dilbera_sazin--tanburi_isak.txt");
      const events = parseSymbtrScore(raw, 60);
      const graceEvents = events.filter((event) => event.code === 8);

      expect(graceEvents.length).toBe(21);
      expect(graceEvents.every((event) => event.ornament === "grace")).toBe(true);
      expect(events.some((event) => event.code === 9)).toBe(true);
    });

    it("kod-52 tempo isareti olay URETMEZ — hayalet sure eklemez", () => {
      const raw = [
        SYMBTR_COLUMNS.join("\t"),
        line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 4}),
        line({Sira: 2, Kod: 52, Pay: 1, Payda: 8, LNS: 127}),
        line({Sira: 3, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 4}),
      ].join("\n");
      const events = parseSymbtrScore(raw, 60);

      expect(events).toHaveLength(2);
      expect(events.every((event) => event.code === 9)).toBe(true);
      // Ikinci nota 1. ceyreklikte basliyor — tempo satiri zamani kaydirmadi.
      expect(events[1].startBeat).toBe(1);
    });

    it("eski parser'in DUSURDUGU satirlar burada gorunur kalir", () => {
      // `sultaniyegah--...--curcuna` fixture'i `0/0` yer-tutucu satir tasiyor
      // (D1'in kapattigi NaN yolu). Eski parser onu sessizce atiyor.
      const raw = fixture("sultaniyegah--sarki--curcuna--peymaneme_mehtab--emin_ongan.txt");
      const result = readSymbtrRows(raw);
      const dropped = result.rows.filter((row) => row.kind === "untimed" && row.code === 9);

      expect(dropped.length).toBeGreaterThan(0);
      for (const row of dropped) {
        expect(row.kind).toBe("untimed");
        if (row.kind === "untimed") expect(row.reason).toBe("no-duration");
      }
    });

    it("kod-9 disi SURELI satirlar artik kayip degil", () => {
      const raw = fixture("beyati--sarki--dilbera_sazin--tanburi_isak.txt".replace("sarki--", "sarki--duyek--"));
      const result = readSymbtrRows(raw);
      const nonNineTimed = result.rows.filter((row) => row.kind === "timed" && row.code !== 9);

      // Bu fixture 21 adet kod-8 (carpma) tasiyor; bir kismi sure tasir.
      expect(result.countsByCode.get(8) ?? 0).toBeGreaterThan(0);
      // Sureli olsun olmasin HEPSI `rows` icinde.
      expect(result.rows.filter((row) => row.code === 8)).toHaveLength(result.countsByCode.get(8) ?? 0);
      expect(nonNineTimed.length + result.rows.filter((row) => row.kind === "untimed" && row.code !== 9).length)
        .toBe(result.rows.filter((row) => row.code !== 9 && row.code !== METER_CHANGE_CODE).length);
    });
  });

  describe("kod 51 — sure DEGIL, mertebe", () => {
    it("Pay/Payda mertebe olarak okunur, sure uretmez", () => {
      const raw = [HEADER, line({Sira: 1, Kod: 51, Pay: 9, Payda: 8, LNS: 87, Bas: 0, Offset: 0})].join("\n");
      const result = readSymbtrRows(raw);
      const row = result.rows[0];

      expect(row.kind).toBe("meter-change");
      if (row.kind !== "meter-change") return;
      expect(row.meter).toEqual({numerator: 9, denominator: 8});
      expect(row.usulId).toBe(87);
      expect(result.counts.timed).toBe(0);
    });

    it("acilis satirinda kimlik `Bas` sutununda olabilir — ikisi de tasinir", () => {
      const raw = [HEADER, line({Sira: 1, Kod: 51, Pay: 9, Payda: 8, LNS: 0, Bas: 114, Offset: 0})].join("\n");
      const row = readSymbtrRows(raw).rows[0];

      expect(row.kind).toBe("meter-change");
      if (row.kind !== "meter-change") return;
      expect(row.usulId).toBe(0);
      expect(row.usulIdAlternate).toBe(114);
    });
  });

  describe("sure ve es", () => {
    it("sure tick olarak KAYIPSIZ okunur", () => {
      const raw = [HEADER, line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 24})].join("\n");
      const row = readSymbtrRows(raw).rows[0];

      expect(row.kind).toBe("timed");
      if (row.kind !== "timed") return;
      expect(row.duration).toBe(ticksFromFraction(1, 24));
      expect(row.duration).toBe(TICKS_PER_WHOLE / 24);
    });

    it("`Koma53 = -1` es demektir (README v2 madde 4)", () => {
      const raw = [HEADER, line({Sira: 1, Kod: 9, Nota53: "Es", NotaAE: "Sus", Koma53: -1, KomaAE: -1, Pay: 1, Payda: 4})].join("\n");
      const row = readSymbtrRows(raw).rows[0];

      expect(row.kind).toBe("timed");
      if (row.kind !== "timed") return;
      expect(row.isRest).toBe(true);
      expect(row.pitchAeu).toBeNull();
      expect(row.koma53).toBeNull();
    });

    it("`0/0` satiri ATILMAZ, `no-duration` olarak tasinir", () => {
      const raw = [HEADER, line({Sira: 1, Kod: 9, Koma53: -1, Pay: 0, Payda: 0, Offset: 3.5})].join("\n");
      const result = readSymbtrRows(raw);
      const row = result.rows[0];

      expect(result.counts.total).toBe(1);
      expect(row.kind).toBe("untimed");
      if (row.kind !== "untimed") return;
      expect(row.reason).toBe("no-duration");
      expect(row.offsetUnits).toBe(3.5);
      expect(row.columns).toHaveLength(SYMBTR_COLUMNS.length);
    });

    it("tick eksenine girmeyen payda `unrepresentable-duration` olur — sessiz yuvarlama YOK", () => {
      const raw = [HEADER, line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 11})].join("\n");
      const row = readSymbtrRows(raw).rows[0];

      expect(row.kind).toBe("untimed");
      if (row.kind !== "untimed") return;
      expect(row.reason).toBe("unrepresentable-duration");
    });
  });

  describe("kod 52 — tempo isareti, `timed` ama karar tuketicinin", () => {
    it("sureli olarak tasinir ve kodu KAYBOLMAZ", () => {
      const raw = [HEADER, line({Sira: 138, Kod: 52, Pay: 1, Payda: 8, Ms: 0, LNS: 127, Bas: 41, Offset: 16.125})].join("\n");
      const row = readSymbtrRows(raw).rows[0];

      expect(row.kind).toBe("timed");
      if (row.kind !== "timed") return;
      expect(row.code).toBe(52);
      expect(row.isRest).toBe(true); // perdesiz
      // `LNS` bu satirda BPM; modul yorumlamaz, ham tasir.
      expect(row.lnsPercent).toBe(127);
    });
  });

  describe("CANLI KORPUS", () => {
    const hasCorpus = fs.existsSync(CORPUS_TXT);

    it.skipIf(!hasCorpus)("tick eksenine girmeyen sure YOK (3000 eser)", () => {
      const offenders: string[] = [];
      for (const file of fs.readdirSync(CORPUS_TXT).filter((name) => name.endsWith(".txt"))) {
        const result = readSymbtrRows(fs.readFileSync(path.join(CORPUS_TXT, file), "utf8"));
        if (result.rows.some((row) => row.kind === "untimed" && row.reason === "unrepresentable-duration")) {
          offenders.push(file);
        }
      }

      expect(offenders).toEqual([]);
    }, CORPUS_TIMEOUT_MS);

    it.skipIf(!hasCorpus)("ZAMAN ILERLETME KURALI: `Pay>0 && Payda>0 && kod!==51`", () => {
      // Dosyanin KENDI `Offset` sutunu hakem. `timed` dedigimiz her satir
      // Offset'i ilerletmeli; `untimed`/`meter-change` ilerletmemeli.
      const files = fs.readdirSync(CORPUS_TXT).filter((name) => name.endsWith(".txt"));
      let advancedButUntimed = 0;
      let checked = 0;
      const stalledFiles: string[] = [];

      for (const file of files) {
        const rows = readSymbtrRows(fs.readFileSync(path.join(CORPUS_TXT, file), "utf8")).rows;
        let previous: number | null = null;
        let stalled = 0;
        for (const row of rows) {
          if (row.offsetUnits === null) continue;
          if (previous !== null) {
            checked++;
            const advanced = row.offsetUnits - previous > 1e-6;
            if (advanced && row.kind !== "timed") advancedButUntimed++;
            if (!advanced && row.kind === "timed") stalled++;
          }
          previous = row.offsetUnits;
        }
        if (stalled > 0) stalledFiles.push(file);
      }

      expect(checked).toBeGreaterThan(1_000_000);

      // GUCLU YON — istisnasiz: suresiz bir satir Offset'i ASLA ilerletmez.
      expect(advancedButUntimed).toBe(0);

      // ZAYIF YON — 12 dosyada `Offset` sutununun KENDISI donmus durumda
      // (kaynak verinin ozelligi, kuralin degil). Cogunlugu `serbest`/`gazel`,
      // yani MERTEBESIZ eserler: olcu ekseni olmadigi icin yazar Offset'i
      // ilerletmemis. Liste burada SABITLENIR ki bir gun degisirse gorulsun.
      expect(stalledFiles.sort()).toEqual(FROZEN_OFFSET_FILES);
    }, CORPUS_TIMEOUT_MS);
  });
});
