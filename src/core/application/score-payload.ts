import type {NotaEvent} from "@/core/domain/models";

export interface ScoreCreatePayload {
  title: string;
  composer: string | null;
  makam: string;
  usul: string;
  form: string | null;
  notesData: NotaEvent[];
}

export type ScoreUpdatePayload = Partial<ScoreCreatePayload>;

type PayloadResult<T> = {ok: true; value: T} | {ok: false; error: string};

const MAX_TEXT_LENGTH = 160;
const MAX_NOTES = 10000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) return null;

  return trimmed;
}

function normalizeOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_TEXT_LENGTH) return null;

  return trimmed;
}

function isInvalidOptionalText(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "string") return true;

  return value.trim().length > MAX_TEXT_LENGTH;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNotaEvent(value: unknown): value is NotaEvent {
  if (!isRecord(value)) return false;

  const velocity = value.velocity;

  return (
    normalizeRequiredText(value.pitch) !== null &&
    isFiniteNumber(value.duration) &&
    value.duration > 0 &&
    isFiniteNumber(value.startTime) &&
    value.startTime >= 0 &&
    (velocity === undefined || (isFiniteNumber(velocity) && velocity >= 0 && velocity <= 127))
  );
}

function normalizeNotesData(value: unknown): NotaEvent[] | null {
  if (!Array.isArray(value) || value.length > MAX_NOTES) return null;
  if (!value.every(isNotaEvent)) return null;

  return value.map((note) => ({
    pitch: note.pitch.trim(),
    duration: note.duration,
    ...(note.velocity !== undefined && {velocity: note.velocity}),
    startTime: note.startTime,
  }));
}

export function parseScoreCreatePayload(body: unknown): PayloadResult<ScoreCreatePayload> {
  if (!isRecord(body)) {
    return {ok: false, error: "Geçersiz eser verisi"};
  }

  const title = normalizeRequiredText(body.title);
  const makam = normalizeRequiredText(body.makam);
  const usul = normalizeRequiredText(body.usul);
  const notesData = normalizeNotesData(body.notesData);
  const composer = normalizeOptionalText(body.composer);
  const form = normalizeOptionalText(body.form);

  if (!title || !makam || !usul || !notesData) {
    return {ok: false, error: "Zorunlu alanlar eksik veya geçersiz: title, makam, usul, notesData"};
  }

  if (isInvalidOptionalText(body.composer)) {
    return {ok: false, error: "composer alanı metin olmalıdır"};
  }

  if (isInvalidOptionalText(body.form)) {
    return {ok: false, error: "form alanı metin olmalıdır"};
  }

  return {
    ok: true,
    value: {
      title,
      composer: composer ?? null,
      makam,
      usul,
      form: form ?? null,
      notesData,
    },
  };
}

export function parseScoreUpdatePayload(body: unknown): PayloadResult<ScoreUpdatePayload> {
  if (!isRecord(body)) {
    return {ok: false, error: "Geçersiz eser verisi"};
  }

  const value: ScoreUpdatePayload = {};

  if ("title" in body) {
    const title = normalizeRequiredText(body.title);
    if (!title) return {ok: false, error: "title alanı boş veya geçersiz olamaz"};
    value.title = title;
  }

  if ("composer" in body) {
    const composer = normalizeOptionalText(body.composer);
    if (isInvalidOptionalText(body.composer)) {
      return {ok: false, error: "composer alanı metin olmalıdır"};
    }
    value.composer = composer ?? null;
  }

  if ("makam" in body) {
    const makam = normalizeRequiredText(body.makam);
    if (!makam) return {ok: false, error: "makam alanı boş veya geçersiz olamaz"};
    value.makam = makam;
  }

  if ("usul" in body) {
    const usul = normalizeRequiredText(body.usul);
    if (!usul) return {ok: false, error: "usul alanı boş veya geçersiz olamaz"};
    value.usul = usul;
  }

  if ("form" in body) {
    const form = normalizeOptionalText(body.form);
    if (isInvalidOptionalText(body.form)) {
      return {ok: false, error: "form alanı metin olmalıdır"};
    }
    value.form = form ?? null;
  }

  if ("notesData" in body) {
    const notesData = normalizeNotesData(body.notesData);
    if (!notesData) return {ok: false, error: "notesData geçerli nota olayı dizisi olmalıdır"};
    value.notesData = notesData;
  }

  if (Object.keys(value).length === 0) {
    return {ok: false, error: "Güncellenecek alan bulunamadı"};
  }

  return {ok: true, value};
}
