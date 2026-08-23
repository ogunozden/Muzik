import {describe, expect, it} from "vitest";
import {getSequenceDuration, repeatScheduledNotes, wrapSequencePosition} from "../playback-helpers";

describe("studio playback helpers", () => {
  it("sureyi son notanin bitisine gore hesaplar", () => {
    expect(getSequenceDuration([{startTime: 0, duration: 1}, {startTime: 2, duration: 1.5}])).toBeCloseTo(3.5);
  });

  it("notalari kayit suresi kadar ofsetlenmis kopyalarla tekrar eder", () => {
    const notes = [
      {startTime: 0, duration: 1, id: "a"},
      {startTime: 1, duration: 1, id: "b"},
    ];
    const repeated = repeatScheduledNotes(notes, 3);

    expect(repeated).toHaveLength(6);
    // Kayit suresi 2 sn: kopyalar 0, 2, 4 sn'de baslar.
    expect(repeated.map((note) => note.startTime)).toEqual([0, 2, 4, 1, 3, 5]);
    expect(repeated[3]).toMatchObject({id: "b"});
  });

  it("tekrar 1 veya gecersiz girdide notalari degistirmez", () => {
    const notes = [{startTime: 0, duration: 1, id: "a"}];
    expect(repeatScheduledNotes(notes, 1)).toEqual(notes);
    expect(repeatScheduledNotes([], 5)).toEqual([]);
    expect(repeatScheduledNotes(notes, 0)).toEqual(notes);
  });

  it("imleci kayit suresinde sarar", () => {
    expect(wrapSequencePosition(0.5, 2)).toBeCloseTo(0.5);
    expect(wrapSequencePosition(4.2, 2)).toBeCloseTo(0.2);
    expect(wrapSequencePosition(-1, 2)).toBeCloseTo(0);
    expect(wrapSequencePosition(3, 0)).toBeCloseTo(3);
  });
});
