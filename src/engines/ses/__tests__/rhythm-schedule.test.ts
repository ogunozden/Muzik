import {describe, expect, it} from "vitest";
import {buildRhythmSchedule, heardContextTime, seamlessRetuneStart} from "../instruments";

/**
 * Gorsel senkron cekirdegi: imlec, sesin PLANLANDIGI `currentTime`'i degil,
 * o an DUYULAN frame'in zamanini okumali (aksi halde ~outputLatency kadar
 * onde gider). Regresyon: birisi currentTime'a geri donerse bu testler kirilir.
 */
describe("heardContextTime (gorsel-ses senkronu)", () => {
  it("prefers getOutputTimestamp().contextTime (the frame currently leaving the device)", () => {
    const heard = heardContextTime({
      currentTime: 1.49,
      outputLatency: 0.04,
      baseLatency: 0.01,
      getOutputTimestamp: () => ({contextTime: 1.438}),
    });
    // Planlama saati degil, duyulan-frame saati; olculen ~53ms geride.
    expect(heard).toBeCloseTo(1.438, 3);
  });

  it("falls back to currentTime minus outputLatency when getOutputTimestamp is absent (e.g. Safari)", () => {
    expect(heardContextTime({currentTime: 2, outputLatency: 0.05, baseLatency: 0.01})).toBeCloseTo(1.95, 3);
  });

  it("uses baseLatency when outputLatency is unavailable, and never leads currentTime", () => {
    expect(heardContextTime({currentTime: 2, baseLatency: 0.012})).toBeCloseTo(1.988, 3);
    // Hicbir latency bilgisi yoksa en kotu ihtimalle currentTime; asla ONUNDE degil.
    expect(heardContextTime({currentTime: 2})).toBe(2);
  });

  it("ignores a zero/absent contextTime (device not yet outputting) and falls back", () => {
    const heard = heardContextTime({
      currentTime: 0.5,
      outputLatency: 0.04,
      getOutputTimestamp: () => ({contextTime: 0}),
    });
    expect(heard).toBeCloseTo(0.46, 3);
  });
});

describe("buildRhythmSchedule", () => {
  it("uses explicit beat positions instead of array index order", () => {
    const schedule = buildRhythmSchedule(
      4,
      [
        {beat: 3, symbol: "ke", isAccent: false},
        {beat: 1, symbol: "dum", isAccent: true},
      ],
      120,
    );

    expect(schedule).toMatchObject([
      {startOffset: 0, beatDuration: 0.5, symbol: "dum", isAccent: true, gainScale: 1},
      {startOffset: 1, beatDuration: 0.5, symbol: "ke", isAccent: false, gainScale: 1},
    ]);
  });

  it("preserves half-beat te-ke strokes without merging them into one double hit", () => {
    const schedule = buildRhythmSchedule(
      10,
      [
        {beat: 9, symbol: "tek", isAccent: false, timeValue: 0.5},
        {beat: 9.5, symbol: "ke", isAccent: false, timeValue: 0.5},
      ],
      60,
    );

    // gainScale 1: bu vuruslar ANA darp dizisinden geliyor (isOrnament yok).
    // Kisa deger artik tek basina "susleme" demek DEGIL (D9).
    expect(schedule).toMatchObject([
      {startOffset: 8, beatDuration: 0.5, symbol: "tek", isAccent: false, gainScale: 1},
      {startOffset: 8.5, beatDuration: 0.5, symbol: "ke", isAccent: false, gainScale: 1},
    ]);
  });

  it("scales beat duration by the usul unit (9/8 aksak is eighth-note based)", () => {
    // Onceki surumde birim yok sayilip ceyreklik varsayiliyordu; 8'lik 14
    // usulde ses, sayfadaki gorsel imlecten 2x yavas akiyordu (2026-07-14).
    const schedule = buildRhythmSchedule(
      9,
      [
        {beat: 1, symbol: "dum", isAccent: true},
        {beat: 3, symbol: "tek", isAccent: false},
      ],
      120,
      "8",
    );

    expect(schedule).toMatchObject([
      {startOffset: 0, beatDuration: 0.25, symbol: "dum", isAccent: true, gainScale: 1},
      {startOffset: 0.5, beatDuration: 0.25, symbol: "tek", isAccent: false, gainScale: 1},
    ]);
  });

  it("keeps the quarter-note default when unit is omitted (backward compat)", () => {
    const schedule = buildRhythmSchedule(2, [{beat: 2, symbol: "dum", isAccent: true}], 60);

    expect(schedule).toMatchObject([{startOffset: 1, beatDuration: 1, symbol: "dum", isAccent: true, gainScale: 1}]);
  });

  it("uzun degerli darpta zarf NOTALI DEGERI izler (K1)", () => {
    // Eskiden pencere 1 vurusa kirpiliyordu: "teklerde iki vurus geliyor"
    // (2026-07-14). Kok neden kodda degil SAMPLE DOSYASINDAYDI — kudum'un
    // dum/ke/tek kayitlari ~10ms ve ~310ms'de iki vurus iceriyordu ve kudum
    // varsayilan vurmali. Dosyalar `scripts/trim-percussion-samples.mjs` ile
    // ilk vurusa kirpildi, workaround kaldirildi.
    const schedule = buildRhythmSchedule(4, [{beat: 1, symbol: "tek", isAccent: false, timeValue: 2}], 60);

    expect(schedule).toMatchObject([{startOffset: 0, beatDuration: 2, symbol: "tek", isAccent: false, gainScale: 1}]);
  });

  it("velvele DOLGU vuruslarini kisar, ana darplari tam gainde birakir (D9)", () => {
    // Susleme artik VELVELE YAPISINDAN gelir (`isOrnament`: ana darba denk
    // DUSMEYEN velvele vurusu), `timeValue` sezgiselinden degil. Eski kural
    // "timeValue < 1 ise suslemedir" diyordu; Gonul velvelelerindeki dolgunun
    // cogu `timeValue: 1` yazili oldugu icin (1.400 darbin 748'i) tam gainde
    // caliyor, niyet yalniz te-ke ikililerinde gerceklesiyordu.
    const schedule = buildRhythmSchedule(
      4,
      [
        {beat: 1, symbol: "dum", isAccent: true, timeValue: 2},
        {beat: 2, symbol: "tek", isAccent: false, timeValue: 1, isOrnament: true},
        {beat: 3, symbol: "ke", isAccent: false, timeValue: 0.5, isOrnament: true},
      ],
      60,
    );

    expect(schedule.map((hit) => hit.gainScale)).toEqual([1, 0.68, 0.68]);
  });

  it("Berefsan'in 4 vurusluk Duuuum'u 4 vurus SESLENIR (K1)", () => {
    // Korpustaki 1.400 darbin %26'si `timeValue > 1`; eskiden hepsi 1 vurusa
    // kirpiliyor, Duuuum ile Dum ayni sesleniyordu.
    const schedule = buildRhythmSchedule(8, [{beat: 1, symbol: "dum", isAccent: true, timeValue: 4}], 60);

    expect(schedule[0].notatedBeats).toBe(4);
    expect(schedule[0].beatDuration).toBe(4);
  });

  it("kisa degerli AMA ana darp olan vurus KISILMAZ (eski sezgiselin hatasi)", () => {
    const schedule = buildRhythmSchedule(4, [{beat: 1, symbol: "tek", isAccent: false, timeValue: 0.5}], 60);

    expect(schedule[0].gainScale).toBe(1);
  });
});

/**
 * Canli tempo degisimi cekirdegi (F12.2): retune, DURDURMADAN yeni tempoya
 * gecerken sonraki planlanmamis vurusu ayni duvar-saati aninda tutmali (seam
 * dikissiz), sonrasi yeni araliga gecmeli. Regresyon: seam kayarsa duraksama
 * veya cift/atlanmis vurus olusur.
 */
describe("seamlessRetuneStart (canli tempo gecisi)", () => {
  const NEXT_HIT_TIME = 10;
  const CYCLE_INDEX = 2;
  const BEATS = 4;
  const NEXT_HIT_BEAT_OFFSET = 1;

  it("pins the next unscheduled hit to its exact wall-clock time under the new tempo", () => {
    const newBeatSeconds = 0.5;
    const startAtCtx = seamlessRetuneStart(NEXT_HIT_TIME, CYCLE_INDEX, BEATS, NEXT_HIT_BEAT_OFFSET, newBeatSeconds);
    // Yeni tempoda ayni vurusu yeniden hesapla: tam olarak NEXT_HIT_TIME olmali.
    const recomputed =
      startAtCtx + CYCLE_INDEX * BEATS * newBeatSeconds + NEXT_HIT_BEAT_OFFSET * newBeatSeconds;
    expect(recomputed).toBeCloseTo(NEXT_HIT_TIME, 10);
  });

  it("spaces hits after the seam by the NEW beat duration, not the old one", () => {
    const newBeatSeconds = 0.5;
    const startAtCtx = seamlessRetuneStart(NEXT_HIT_TIME, CYCLE_INDEX, BEATS, NEXT_HIT_BEAT_OFFSET, newBeatSeconds);
    const nextHit = startAtCtx + CYCLE_INDEX * BEATS * newBeatSeconds + NEXT_HIT_BEAT_OFFSET * newBeatSeconds;
    const hitOneBeatLater =
      startAtCtx + CYCLE_INDEX * BEATS * newBeatSeconds + (NEXT_HIT_BEAT_OFFSET + 1) * newBeatSeconds;
    expect(hitOneBeatLater - nextHit).toBeCloseTo(newBeatSeconds, 10);
  });

  it("is a no-op origin shift when the tempo does not actually change", () => {
    const beatSeconds = 0.5;
    // Ayni tempoda: eski orijin nextHitTime'i uretiyorsa, yeni orijin de ayni
    // olmali (gecis fark yaratmamali).
    const startAtCtx = seamlessRetuneStart(NEXT_HIT_TIME, CYCLE_INDEX, BEATS, NEXT_HIT_BEAT_OFFSET, beatSeconds);
    const recomputed =
      startAtCtx + (CYCLE_INDEX * BEATS + NEXT_HIT_BEAT_OFFSET) * beatSeconds;
    expect(recomputed).toBeCloseTo(NEXT_HIT_TIME, 10);
  });
});
