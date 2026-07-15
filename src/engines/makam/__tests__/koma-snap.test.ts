import {describe, expect, it} from "vitest";
import {getMakamById, snapMidiToMakamFrequency, komaToFrequency} from "../data";
import {midiToFrequency, noteNameToMidi} from "@/engines/nota/data";

/**
 * Mikrotonal klavye snap (A3): 12-TET bir tus, makamin OTANTIK koma perde-
 * izgarasina kaydirilir. Bu, piyanoyu makam-farkindalikli yapar (hicaz'in
 * 113c ikilisi gibi 12-TET disi perdeler duyulur).
 */
describe("snapMidiToMakamFrequency (A3 mikrotonal klavye)", () => {
  it("karar tusunu tam kararHz'e snap eder (koma 0)", () => {
    const hicaz = getMakamById("hicaz")!;
    const tonicMidi = noteNameToMidi(hicaz.tonic, 4);
    const kararHz = midiToFrequency(tonicMidi);
    expect(snapMidiToMakamFrequency(hicaz, tonicMidi)).toBeCloseTo(kararHz, 4);
  });

  it("hicaz'da 2. tusu OTANTIK 113c koma ikilisine snap eder (12-TET 100c degil)", () => {
    const hicaz = getMakamById("hicaz")!;
    const tonicMidi = noteNameToMidi(hicaz.tonic, 4);
    const kararHz = midiToFrequency(tonicMidi);
    // tonic'in bir yarim-ton ustundeki tus (12-TET minor 2nd, 100c)
    const snapped = snapMidiToMakamFrequency(hicaz, tonicMidi + 1)!;
    const snappedCents = 1200 * Math.log2(snapped / kararHz);
    // hicaz'in ilk ust derecesi ~113c (5 koma), 100 degil
    const secondDegree = hicaz.komaScale!.degrees.find((d) => d.koma > 0)!;
    expect(snappedCents).toBeCloseTo(secondDegree.cents, 0);
    expect(Math.abs(snappedCents - 100)).toBeGreaterThan(5); // 12-TET DEGIL
  });

  it("snap edilen frekans daima bir koma derecesine denk gelir (oktav korunur)", () => {
    const rast = getMakamById("rast")!;
    const tonicMidi = noteNameToMidi(rast.tonic, 4);
    const kararHz = midiToFrequency(tonicMidi);
    const validCents = new Set(rast.komaScale!.degrees.map((d) => d.cents));
    validCents.add(1200);
    for (let midi = tonicMidi; midi <= tonicMidi + 24; midi += 1) {
      const snapped = snapMidiToMakamFrequency(rast, midi)!;
      const cents = 1200 * Math.log2(snapped / kararHz);
      const centsInOctave = ((cents % 1200) + 1200) % 1200;
      const nearest = [...validCents].reduce((a, b) =>
        Math.abs(b - centsInOctave) < Math.abs(a - centsInOctave) ? b : a,
      );
      expect(Math.abs(nearest - centsInOctave) % 1200, `midi ${midi}`).toBeLessThan(1);
    }
  });

  it("koma dizisi olmayan makamda null (12-TET calinir)", () => {
    const makam = {tonic: "C", komaScale: undefined} as ReturnType<typeof getMakamById> & object;
    expect(snapMidiToMakamFrequency(makam as never, 60)).toBeNull();
  });

  it("komaToFrequency ile tutarli (koma 0 = kararHz)", () => {
    expect(komaToFrequency(440, 0)).toBe(440);
  });
});
