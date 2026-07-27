import {describe, expect, it} from "vitest";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "../canonical-score";
import {evaluateCanonicalScoreQuality} from "../quality";
import {validateCanonicalScore} from "../validator";

/**
 * DOGRULAMA TOTOLOJIDEN CIKTI MI? (PLAN.md §3/G8)
 *
 * Iki kontrol de kendi urettigi veriyle karsilastirdigi icin HIC
 * tetiklenemiyordu:
 *
 *   `validator.ts` — `measure.endBeat` zaten o olcunun event'lerinin
 *     `max(startBeat + durationBeats)` degeri olarak uretiliyor
 *     (`canonical-score.ts:499-514`). Onu yine ayni event'lerle
 *     karsilastirmak matematiksel olarak imkansiz bir kosuldu.
 *
 *   `quality.ts` — `endBeat - startBeat` da ayni event'lerden turuyordu
 *     (`min`/`max`), yani "ilk notadan son notaya aralik". Olcunun basindaki
 *     ya da sonundaki BOSLUK gorunmuyordu: metrik dolulugu degil, event
 *     yayilimini olcuyordu.
 *
 * Bu dosyanin isi kontrollerin artik TETIKLENEBILDIGINI kanitlamak. Gecen
 * bir test, hic tetiklenemeyen bir kontrol icin de gecerdi — kanit degeri
 * yoktu.
 */

function measure(id: string, index: number, startBeat: number, endBeat: number, eventIds: string[]) {
  return {id, index, startBeat, endBeat, eventIds, verificationState: "symbolic-confirmed" as const};
}

function event(id: string, measureId: string, startBeat: number, durationBeats: number): CanonicalScoreEvent {
  return {
    id,
    eventId: id,
    sourceEventIndex: Number(id.replace(/\D/g, "")) || 0,
    measureId,
    voiceId: "v1",
    section: null,
    pitch: {
      source: "C5",
      solfege: "Do5",
      playback: "C5",
      midiNumber: 72,
      koma53: 318,
      frequency: 440,
      vexKey: "c/5",
      komaAccidental: null,
    },
    notationSymbol: "♩",
    measureBeat: 0,
    startBeat,
    durationBeats,
    durationFraction: {numerator: 1, denominator: 4},
    startTime: startBeat,
    duration: durationBeats,
    isRest: false,
    ornament: null,
    tie: null,
    slur: null,
    evidenceId: "e1",
    verificationState: "symbolic-confirmed" as const,
  };
}

function makeDocument(overrides: Partial<CanonicalScoreDocument>): CanonicalScoreDocument {
  return {
    schemaVersion: "score-engine-v2",
    id: "score:test",
    catalogId: null,
    sourceFingerprint: "test:1:fingerprinted",
    sourceKind: "local",
    title: "test",
    composer: "test",
    makam: "test",
    form: "test",
    usul: "test",
    meter: "4/4",
    bpm: 60,
    ahenkLabel: null,
    totalBeats: 8,
    totalDuration: 8,
    sources: [],
    sourceFeatures: [],
    notationPolicy: {accidentalStyle: "aeu", keySignature: [], naturals: []},
    sections: [],
    voices: [{id: "v1", label: "melodi", role: "melody"}],
    measures: [],
    events: [],
    usulCycle: [],
    sourceAnchors: [],
    validationIssues: [],
    ...overrides,
  } as unknown as CanonicalScoreDocument;
}

describe("validator — `measure-duration-overflow` TETIKLENEBILIR (G8)", () => {
  it("saglam belgede uyarmaz", () => {
    // Iki tam 4/4 olcu; ikinci olcu 4. vurusta basliyor.
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 4, ["e1"]), measure("m2", 2, 4, 8, ["e2"])],
      events: [event("e1", "m1", 0, 4), event("e2", "m2", 4, 4)],
    });

    const issues = validateCanonicalScore(document);
    expect(issues.filter((issue) => issue.code === "measure-duration-overflow")).toEqual([]);
  });

  it("event bir sonraki olcunun basina TASINCA hata verir", () => {
    // `e1` 6 vurus suruyor ama `m2` 4. vurusta basliyor -> tasma.
    // ESKI kontrol bunu goremezdi: `m1.endBeat` de 6 olarak uretilirdi.
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 6, ["e1"]), measure("m2", 2, 4, 8, ["e2"])],
      events: [event("e1", "m1", 0, 6), event("e2", "m2", 4, 4)],
    });

    const issues = validateCanonicalScore(document);
    const overflow = issues.filter((issue) => issue.code === "measure-duration-overflow");

    expect(overflow).toHaveLength(1);
    expect(overflow[0].severity).toBe("error");
    expect(overflow[0].measureId).toBe("m1");
  });

  it("ESKI kontrolun neden imkansiz oldugunu sabitler", () => {
    // `endBeat` daima event'lerin max'i olarak uretildigi icin
    // `maxEventEnd > endBeat` kosulu SAGLANAMAZ. Burada endBeat'i bilerek
    // event'lerin max'ina esitliyoruz: eski kontrol sessiz kalirdi, yenisi
    // de dogru sekilde sessiz kaliyor (tasma yok).
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 4, ["e1"]), measure("m2", 2, 4, 8, ["e2"])],
      events: [event("e1", "m1", 0, 4), event("e2", "m2", 4, 4)],
    });

    const maxEnd = Math.max(...document.events.filter((e) => e.measureId === "m1").map((e) => e.startBeat + e.durationBeats));
    expect(maxEnd).toBe(document.measures[0].endBeat); // totolojinin kaynagi
    expect(validateCanonicalScore(document).filter((i) => i.code === "measure-duration-overflow")).toEqual([]);
  });
});

describe("quality — olcu doluluğu EVENT YAYILIMINDAN bagimsiz (G8)", () => {
  function fillMetric(document: CanonicalScoreDocument) {
    return evaluateCanonicalScoreQuality(document).metrics.find((metric) => metric.id === "measure-duration-usul");
  }

  it("tam dolu olculerde `pass`", () => {
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 4, ["e1"]), measure("m2", 2, 4, 8, ["e2"])],
      events: [event("e1", "m1", 0, 4), event("e2", "m2", 4, 4)],
    });

    expect(fillMetric(document)?.status).toBe("pass");
  });

  it("EKSIK dolu olcuyu yakalar — eski metrik yakalayamazdi", () => {
    // `m1` yalniz 3 vurus dolu (4/4 bekleniyor). Ama event yayilimi
    // (`endBeat - startBeat` = 3 - 0 = 3) da 3'tu; eski metrik bunu
    // "span 3 != 4" diye yakalardi. ASIL fark asagidaki testte.
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 3, ["e1"]), measure("m2", 2, 4, 8, ["e2"])],
      events: [event("e1", "m1", 0, 3), event("e2", "m2", 4, 4)],
    });

    expect(fillMetric(document)?.status).toBe("review");
  });

  it("KRITIK FARK: olcu BASINDA bosluk olan olcuyu yakalar", () => {
    // `m1`de iki nota var: 0-1 ve 3-4. Yayilim 4-0 = 4 -> ESKI metrik
    // "uyumlu" derdi. Ama olcu 2 vurus BOS: gercek doluluk 2/4.
    // Yeni metrik sureleri topladigi icin bunu goruyor.
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 4, ["e1", "e2"]), measure("m2", 2, 4, 8, ["e3"])],
      events: [event("e1", "m1", 0, 1), event("e2", "m1", 3, 1), event("e3", "m2", 4, 4)],
    });

    const span = document.measures[0].endBeat - document.measures[0].startBeat;
    expect(span).toBe(4); // eski metrigin "uyumlu" dedigi buyukluk

    const filled = document.events
      .filter((candidate) => candidate.measureId === "m1")
      .reduce((total, candidate) => total + candidate.durationBeats, 0);
    expect(filled).toBe(2); // gercek doluluk

    expect(fillMetric(document)?.status).toBe("review");
  });

  it("SON olcu haric tutulur — eserlerin cogu tam olcuyle bitmez", () => {
    const document = makeDocument({
      measures: [measure("m1", 1, 0, 4, ["e1"]), measure("m2", 2, 4, 5, ["e2"])],
      events: [event("e1", "m1", 0, 4), event("e2", "m2", 4, 1)],
    });

    expect(fillMetric(document)?.status).toBe("pass");
  });
});
