import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {readMu2DarpGroupings, summarizeDarpGroupings} from "../darp-grouping";
import {decodeWindows1254} from "../encoding";
import {readMu2Metadata} from "../mu2-metadata";

const CORPUS = path.join(process.cwd(), "symb", "SymbTr-3.0");
const CORPUS_V2_TXT = path.join(process.cwd(), "symb", "SymbTr-2.0.0", "txt");

describe("readMu2DarpGroupings (B4)", () => {
  it("rakam desenini gruplara ayirir", () => {
    const raw = ["9\t8\tPay\tPayda", "14\t\t\t\t\t\t\t22221\t\t0"].join("\n");
    const [grouping] = readMu2DarpGroupings(raw);

    expect(grouping.pattern).toBe("22221");
    expect(grouping.groups).toEqual([2, 2, 2, 2, 1]);
    expect(grouping.total).toBe(9); // aksak 9/8
  });

  it("rakam OLMAYAN desen ATILMAZ", () => {
    // Korpusta 46.214 satirin 3.895'i rakam degil.
    const raw = ["9\t8\tPay\tPayda", "14\t\t\t\t\t\t\t\t\t1"].join("\n");
    const [grouping] = readMu2DarpGroupings(raw);

    expect(grouping.pattern).toBe("");
    expect(grouping.groups).toEqual([]);
    expect(grouping.total).toBeNull();
  });

  it("ozet en sik deseni verir ama bunu TANIM saymaz", () => {
    const raw = [
      "8\t8\tPay\tPayda",
      "14\t\t\t\t\t\t\t12122",
      "14\t\t\t\t\t\t\t12122",
      "14\t\t\t\t\t\t\t1111",
      "14\t\t\t\t\t\t\t",
    ].join("\n");
    const summary = summarizeDarpGroupings(readMu2DarpGroupings(raw));

    expect(summary.total).toBe(4);
    expect(summary.withDigits).toBe(3);
    expect(summary.modalPattern).toBe("12122");
    expect(summary.patternCounts.get("1111")).toBe(1);
  });

  it("CANLI KORPUS: usul basina en sik desen ders kitabi duzumuyle ortusur", () => {
    const mu2Dir = path.join(CORPUS, "mu2");
    if (!fs.existsSync(mu2Dir)) return;

    const byUsul = new Map<string, Map<string, number>>();
    let totalRows = 0;
    let digitRows = 0;

    for (const file of fs.readdirSync(mu2Dir).filter((name) => name.endsWith(".mu2"))) {
      const raw = decodeWindows1254(fs.readFileSync(path.join(mu2Dir, file)));
      const usul = readMu2Metadata(raw).usul;
      const groupings = readMu2DarpGroupings(raw);
      totalRows += groupings.length;

      for (const grouping of groupings) {
        if (grouping.groups.length === 0) continue;
        digitRows++;
        if (!usul) continue;
        const counts = byUsul.get(usul) ?? new Map<string, number>();
        counts.set(grouping.pattern, (counts.get(grouping.pattern) ?? 0) + 1);
        byUsul.set(usul, counts);
      }
    }

    expect(totalRows).toBe(46_214);
    expect(digitRows).toBe(42_319);

    const modalOf = (usul: string): string | null => {
      const counts = byUsul.get(usul);
      if (!counts) return null;
      return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
    };

    // Ders kitabi duzumleriyle ortusuyor — B4'un GERCEK degeri bu.
    expect(modalOf("Aksak")).toBe("22221"); // 2+2+2+2+1 = 9
    expect(modalOf("Düyek")).toBe("12122"); // 1+2+1+2+2 = 8
    expect(modalOf("Aksaksemâî")).toBe("212221"); // = 10
    expect(modalOf("Curcuna")).toBe("21223"); // = 10

    // AMA desen olcu basina degisiyor: tek bir "usul duzumu" DEGIL.
    // Duyek'te 100'den fazla farkli desen var — bu yuzden `USUL_DATA`nin
    // kanonik duzumu bu sayilarla DEGISTIRILMIYOR.
    expect((byUsul.get("Düyek")?.size ?? 0)).toBeGreaterThan(100);
  });
});

describe("B6 — kod-51 usul adi v3'te KAYBOLMUS (korpus regresyonu)", () => {
  it("v3: 382 kod-51 satirinin HICBIRINDE `Soz1` yok", () => {
    const txtDir = path.join(CORPUS, "txt");
    if (!fs.existsSync(txtDir)) return;

    let rows = 0;
    let named = 0;
    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      for (const line of fs.readFileSync(path.join(txtDir, file), "utf8").split(/\r?\n/).slice(1)) {
        const columns = line.split("\t");
        if (columns[1] !== "51") continue;
        rows++;
        if ((columns[11] ?? "").trim()) named++;
      }
    }

    expect(rows).toBe(382);
    expect(named).toBe(0);
  });

  it("v2: ayni alan 319/411 satirda DOLUYDU — README v2 madde 5 dogruydu", () => {
    if (!fs.existsSync(CORPUS_V2_TXT)) return;

    let rows = 0;
    let named = 0;
    for (const file of fs.readdirSync(CORPUS_V2_TXT).filter((name) => name.endsWith(".txt"))) {
      for (const line of fs.readFileSync(path.join(CORPUS_V2_TXT, file), "latin1").split(/\r?\n/).slice(1)) {
        const columns = line.split("\t");
        if (columns[1] !== "51") continue;
        rows++;
        if ((columns[11] ?? "").trim()) named++;
      }
    }

    expect(rows).toBe(411);
    expect(named).toBe(319);
    // %77,6 -> %0. Bu bir KAYNAK regresyonu; motorun hatasi degil.
    // Telafi: usul adi artik `mu2` kod-51'den okunuyor (`usul-map.ts`).
    expect(named / rows).toBeGreaterThan(0.75);
  });
});
