import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {ORNAMENT_BY_CODE, SYMBTR_COLUMNS, UNRESOLVED_PITCHED_CODES, readSymbtrRows} from "../rows";
import {CORPUS_TIMEOUT_MS} from "./corpus-gate";

const CORPUS_TXT = path.join(process.cwd(), "symb", "SymbTr-3.0", "txt");
const HEADER = SYMBTR_COLUMNS.join("\t");

function line(values: Partial<Record<(typeof SYMBTR_COLUMNS)[number], string | number>>): string {
  return SYMBTR_COLUMNS.map((column) => String(values[column] ?? "")).join("\t");
}

function pitched(code: number, pay: number, payda: number): string {
  return line({Sira: 1, Kod: code, Nota53: "Fa5", NotaAE: "F5", Koma53: 340, Pay: pay, Payda: payda});
}

describe("Susleme kimlikleri (B1) — MusicXML ile turetildi, uydurulmadi", () => {
  it("kod 8 = carpma (grace) ve SURESIZ olabilir", () => {
    // Korpusta kod-8'in %91'i suresiz. Suresiz de olsa kimlik KAYBOLMAZ.
    const raw = [HEADER, pitched(8, 0, 0)].join("\n");
    const row = readSymbtrRows(raw).rows[0];

    expect(row.kind).toBe("untimed");
    if (row.kind !== "untimed") return;
    expect(row.ornament).toBe("grace");
    expect(row.ornamentConfidence).toBe("high");
    expect(row.reason).toBe("no-duration");
  });

  it("kod 8 sureli oldugunda da carpma", () => {
    const row = readSymbtrRows([HEADER, pitched(8, 1, 8)].join("\n")).rows[0];

    expect(row.kind).toBe("timed");
    if (row.kind !== "timed") return;
    expect(row.ornament).toBe("grace");
  });

  it("kod 12 = tril, kod 23/24 = mordent, kod 7 = tremolo", () => {
    const cases: Array<[number, string]> = [
      [12, "trill"],
      [23, "mordent"],
      [24, "mordent"],
      [7, "tremolo"],
    ];

    for (const [code, kind] of cases) {
      const row = readSymbtrRows([HEADER, pitched(code, 1, 8)].join("\n")).rows[0];
      expect(row.kind).toBe("timed");
      if (row.kind !== "timed") continue;
      expect(row.ornament).toBe(kind);
    }
  });

  it("KUCUK ORNEKLEM kodlari `low` guvenle isaretlenir", () => {
    // 12 icin n=61, 23 icin n=10, 24 icin n=3, 7 icin n=3.
    // Kanit gucu farkli; tip yuzeyinde GORUNUR kalir.
    expect(ORNAMENT_BY_CODE.get(8)?.confidence).toBe("high");
    expect(ORNAMENT_BY_CODE.get(12)?.confidence).toBe("high");
    expect(ORNAMENT_BY_CODE.get(23)?.confidence).toBe("low");
    expect(ORNAMENT_BY_CODE.get(7)?.confidence).toBe("low");
  });

  it("duz nota (kod 9) susleme TASIMAZ", () => {
    const row = readSymbtrRows([HEADER, pitched(9, 1, 4)].join("\n")).rows[0];

    expect(row.kind).toBe("timed");
    if (row.kind !== "timed") return;
    expect(row.ornament).toBeNull();
    expect(row.ornamentConfidence).toBeNull();
    expect(row.unresolvedCode).toBe(false);
  });
});

describe("Cozulemeyen kodlar (B2) — durustce isaretlenir", () => {
  it("perde+sure tasiyor ama anlami bilinmiyor -> `unresolvedCode`", () => {
    for (const code of [1, 4, 10, 11, 16, 28, 32, 43, 44]) {
      const row = readSymbtrRows([HEADER, pitched(code, 1, 8)].join("\n")).rows[0];

      expect(row.kind).toBe("timed");
      if (row.kind !== "timed") continue;
      // Nota olarak ISLENIR: sure ve perde gercek.
      expect(row.duration).toBeGreaterThan(0);
      expect(row.pitchAeu).toBe("F5");
      // Ama "biliniyor" gibi sunulmaz.
      expect(row.unresolvedCode).toBe(true);
      expect(row.ornament).toBeNull();
    }
  });

  it("kimligi BILINEN kod `unresolvedCode` DEGILDIR", () => {
    const row = readSymbtrRows([HEADER, pitched(12, 1, 8)].join("\n")).rows[0];

    expect(row.kind).toBe("timed");
    if (row.kind !== "timed") return;
    expect(row.unresolvedCode).toBe(false);
    expect(row.ornament).toBe("trill");
  });

  it("iki kume ORTUSMEZ — bir kod hem bilinen hem bilinmeyen olamaz", () => {
    for (const code of ORNAMENT_BY_CODE.keys()) {
      expect(UNRESOLVED_PITCHED_CODES.has(code)).toBe(false);
    }
  });
});

describe("CANLI KORPUS — sayilar sabitlenir", () => {
  const hasCorpus = fs.existsSync(CORPUS_TXT);

  it.skipIf(!hasCorpus)("susleme ve cozulemeyen kod sayilari", () => {
    const byOrnament = new Map<string, number>();
    let unresolved = 0;
    let graceUntimed = 0;
    let graceTotal = 0;

    for (const file of fs.readdirSync(CORPUS_TXT).filter((name) => name.endsWith(".txt"))) {
      for (const row of readSymbtrRows(fs.readFileSync(path.join(CORPUS_TXT, file), "utf8")).rows) {
        if (row.kind === "meter-change") continue;
        if (row.ornament) {
          byOrnament.set(row.ornament, (byOrnament.get(row.ornament) ?? 0) + 1);
          if (row.ornament === "grace") {
            graceTotal++;
            if (row.kind === "untimed") graceUntimed++;
          }
        }
        if (row.kind === "timed" && row.unresolvedCode) unresolved++;
      }
    }

    // Kod envanterinden olculen degerler.
    expect(byOrnament.get("grace")).toBe(15_984);
    expect(byOrnament.get("trill")).toBe(3_443);
    expect(byOrnament.get("tremolo")).toBe(3_807);
    expect((byOrnament.get("mordent") ?? 0)).toBe(841 + 554); // kod 23 + kod 24

    // Carpmalarin BUYUK cogunlugu suresiz — `<grace>` semantigiyle tutarli.
    expect(graceUntimed / graceTotal).toBeGreaterThan(0.9);

    // Cozulemeyen ama sure tasiyan satirlar: eskiden tamamen atiliyorlardi.
    expect(unresolved).toBeGreaterThan(12_000);
  }, CORPUS_TIMEOUT_MS);
});
