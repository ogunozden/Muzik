import {describe, it, expect} from "vitest";
import {parseScoreCreatePayload, parseScoreUpdatePayload} from "../score-payload";

const validNote = {pitch: "A4", duration: 1, startTime: 0, velocity: 100};
const validCreate = {title: "Eser", makam: "rast", usul: "sofyan", notesData: [validNote]};

describe("parseScoreCreatePayload", () => {
  it("geçerli tam yükü kabul eder ve normalize eder", () => {
    const result = parseScoreCreatePayload({...validCreate, composer: "  Dede  ", form: " Şarkı "});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Eser");
      expect(result.value.composer).toBe("Dede"); // trim
      expect(result.value.form).toBe("Şarkı");
      expect(result.value.notesData).toHaveLength(1);
    }
  });

  it("record olmayan gövdeyi reddeder", () => {
    for (const body of [null, undefined, "x", 5, [validNote]]) {
      expect(parseScoreCreatePayload(body).ok, String(body)).toBe(false);
    }
  });

  it("zorunlu alanlar eksikse reddeder", () => {
    expect(parseScoreCreatePayload({makam: "rast", usul: "sofyan", notesData: [validNote]}).ok).toBe(false); // title yok
    expect(parseScoreCreatePayload({...validCreate, title: "   "}).ok).toBe(false); // bos title
    expect(parseScoreCreatePayload({...validCreate, notesData: []}).ok).toBe(true); // bos dizi gecerli
  });

  it("title 160 karakter sınırını uygular", () => {
    expect(parseScoreCreatePayload({...validCreate, title: "a".repeat(160)}).ok).toBe(true);
    expect(parseScoreCreatePayload({...validCreate, title: "a".repeat(161)}).ok).toBe(false);
  });

  it("composer/form metin değilse anlamlı hata döner", () => {
    const r1 = parseScoreCreatePayload({...validCreate, composer: 42});
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toMatch(/composer/);
    const r2 = parseScoreCreatePayload({...validCreate, form: {}});
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toMatch(/form/);
  });

  describe("nota olayı sınırları", () => {
    it("velocity sınırları: 0 ve 127 kabul, 128 ve -1 red", () => {
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, velocity: 0}]}).ok).toBe(true);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, velocity: 127}]}).ok).toBe(true);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, velocity: 128}]}).ok).toBe(false);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, velocity: -1}]}).ok).toBe(false);
    });

    it("velocity opsiyonel (undefined kabul)", () => {
      const noVel = {pitch: "A4", duration: 1, startTime: 0};
      expect(parseScoreCreatePayload({...validCreate, notesData: [noVel]}).ok).toBe(true);
    });

    it("duration > 0 ve startTime >= 0 zorunlu", () => {
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, duration: 0}]}).ok).toBe(false);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, duration: -1}]}).ok).toBe(false);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, startTime: -0.1}]}).ok).toBe(false);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, startTime: 0}]}).ok).toBe(true);
    });

    it("sonsuz/NaN sayıları reddeder", () => {
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, duration: Infinity}]}).ok).toBe(false);
      expect(parseScoreCreatePayload({...validCreate, notesData: [{...validNote, startTime: NaN}]}).ok).toBe(false);
    });

    it("MAX_NOTES (10000) üst sınırını uygular", () => {
      const many = (n: number) => Array.from({length: n}, () => validNote);
      expect(parseScoreCreatePayload({...validCreate, notesData: many(10000)}).ok).toBe(true);
      expect(parseScoreCreatePayload({...validCreate, notesData: many(10001)}).ok).toBe(false);
    });
  });
});

describe("parseScoreUpdatePayload", () => {
  it("record olmayan gövdeyi reddeder", () => {
    expect(parseScoreUpdatePayload(null).ok).toBe(false);
  });

  it("boş nesne 'güncellenecek alan yok' hatası döner", () => {
    const r = parseScoreUpdatePayload({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Güncellenecek alan bulunamadı/);
  });

  it("kısmi güncellemeyi kabul eder (yalnız verilen alanlar)", () => {
    const r = parseScoreUpdatePayload({title: "Yeni Başlık"});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("Yeni Başlık");
      expect(Object.keys(r.value)).toEqual(["title"]);
    }
  });

  it("verilen zorunlu alan boşsa reddeder", () => {
    expect(parseScoreUpdatePayload({title: "  "}).ok).toBe(false);
    expect(parseScoreUpdatePayload({makam: ""}).ok).toBe(false);
    expect(parseScoreUpdatePayload({usul: "   "}).ok).toBe(false);
  });

  it("composer null olarak temizlenebilir", () => {
    const r = parseScoreUpdatePayload({composer: null});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.composer).toBeNull();
  });

  it("geçersiz notesData'yı reddeder", () => {
    expect(parseScoreUpdatePayload({notesData: [{pitch: "A4", duration: -1, startTime: 0}]}).ok).toBe(false);
  });
});
