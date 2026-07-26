import {describe, expect, it} from "vitest";
import {parseSymbtrScore} from "../parser";

/**
 * SymbTr txt parser dayaniklilik testleri (D1).
 *
 * Korpusta `Kod=9` (nota) olmasina ragmen PERDESIZ ve SURESIZ yer-tutucu
 * satirlar var: `NotaAE=[] Koma53=[-1] Pay=0 Payda=0`. Eski surumde
 * `durationBeats = (0/0)*4 = NaN` uretiliyor ve `startBeat += durationBeats`
 * oldugu icin O ESERIN GERI KALANININ TAMAMI NaN zaman eksenine dusuyordu.
 *
 * Olcum (SymbTr-3.0, 401 dosya / 146.477 event): 5 bozuk satir -> 124 event'in
 * zaman ekseni cokmus, 4 eser etkilenmis. Ornek: acemkurdi--sarki--semai--
 * sen_kalbimin--teoman_alpay (event #79'dan sonraki 124 event).
 */

const HEADER = "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset";

function row(
  sira: number,
  notaAE: string,
  koma53: number,
  pay: number | string,
  payda: number | string,
  offset: number,
): string {
  const nota53 = notaAE ? `${notaAE}53` : "";
  return `${sira}\t9\t${nota53}\t${notaAE}\t${koma53}\t${koma53}\t${pay}\t${payda}\t400\t95\t96\t\t${offset}`;
}

// Gercek korpustaki bozuk satirin birebir sekli (perdesiz + 0/0).
const PLACEHOLDER_ROW = row(2, "", -1, 0, 0, 1.0);

const FIXTURE = [
  HEADER,
  row(1, "C5", 318, 1, 4, 1.0), // 1 vurus
  PLACEHOLDER_ROW, //             gecersiz -> atlanmali
  row(3, "D5", 327, 1, 2, 2.0), // 2 vurus
  row(4, "E5", 336, 1, 4, 3.0), // 1 vurus
].join("\n");

describe("parseSymbtrScore — bozuk sure dayanikliligi (D1)", () => {
  it("perdesiz/suresiz yer-tutucu satiri atlar", () => {
    const events = parseSymbtrScore(FIXTURE, 60);

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.sourcePitch)).toEqual(["C5", "D5", "E5"]);
  });

  it("bozuk satir SONRASINDAKI event'lerin zaman eksenini cokertmez", () => {
    const events = parseSymbtrScore(FIXTURE, 60);

    for (const event of events) {
      expect(Number.isFinite(event.startBeat), `${event.sourcePitch}: startBeat sonlu`).toBe(true);
      expect(Number.isFinite(event.startTime), `${event.sourcePitch}: startTime sonlu`).toBe(true);
      expect(Number.isFinite(event.durationBeats), `${event.sourcePitch}: durationBeats sonlu`).toBe(true);
      expect(Number.isFinite(event.duration), `${event.sourcePitch}: duration sonlu`).toBe(true);
    }
  });

  it("zaman ekseni bozuk satir hic yokmus gibi ilerler", () => {
    const events = parseSymbtrScore(FIXTURE, 60);

    expect(events.map((event) => event.startBeat)).toEqual([0, 1, 3]);
    expect(events.map((event) => event.durationBeats)).toEqual([1, 2, 1]);
  });

  it("payda 0 disinda kalan gecersiz sayisal alanlari da eler", () => {
    const fixture = [
      HEADER,
      row(1, "C5", 318, 1, 4, 1.0),
      row(2, "D5", 327, "", "", 1.0), // Number("") -> 0/0 -> NaN
      row(3, "E5", 336, 1, 4, 2.0),
    ].join("\n");

    const events = parseSymbtrScore(fixture, 60);

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.startBeat)).toEqual([0, 1]);
  });

  it("gecerli skorda davranis degismez (regresyon)", () => {
    const fixture = [
      HEADER,
      row(1, "C5", 318, 1, 4, 1.0),
      row(2, "D5", 327, 1, 4, 2.0),
      row(3, "E5", 336, 1, 2, 3.0),
    ].join("\n");

    const events = parseSymbtrScore(fixture, 60);

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.startBeat)).toEqual([0, 1, 2]);
    expect(events.map((event) => event.durationBeats)).toEqual([1, 1, 2]);
    // bpm=60 -> 1 vurus = 1 saniye
    expect(events.map((event) => event.startTime)).toEqual([0, 1, 2]);
  });
});
