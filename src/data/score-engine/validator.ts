import {parsePitch} from "@/core/domain/note-naming";
import type {CanonicalScoreDocument, CanonicalValidationIssue} from "./canonical-score";
import {mapCanonicalEventToVex} from "./notation";

export interface CanonicalValidationSummary {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  issueCount: number;
}

function createIssue(
  index: number,
  code: string,
  message: string,
  severity: CanonicalValidationIssue["severity"],
  refs: Pick<CanonicalValidationIssue, "eventId" | "measureId"> = {},
): CanonicalValidationIssue {
  return {
    id: `canonical-validation:${code}:${index}`,
    code,
    message,
    severity,
    ...refs,
  };
}

export function validateCanonicalScore(document: CanonicalScoreDocument): CanonicalValidationIssue[] {
  const issues: CanonicalValidationIssue[] = [];
  const eventIds = new Set(document.events.map((event) => event.id));

  if (document.schemaVersion !== "score-engine-v2") {
    issues.push(createIssue(issues.length, "schema-version", "Canonical doküman score-engine-v2 değil.", "error"));
  }

  if (!document.sourceFingerprint || document.sourceFingerprint.includes("unfingerprinted")) {
    issues.push(createIssue(issues.length, "source-fingerprint", "Kaynak fingerprint eksik veya geçici.", "warning"));
  }

  if (document.events.length === 0) {
    issues.push(createIssue(issues.length, "empty-events", "Canonical dokümanda event yok.", "error"));
  }

  for (const measure of document.measures) {
    if (measure.eventIds.length === 0) {
      issues.push(
        createIssue(issues.length, "empty-measure", `${measure.index}. ölçüde event yok.`, "warning", {
          measureId: measure.id,
        }),
      );
    }

    for (const eventId of measure.eventIds) {
      if (!eventIds.has(eventId)) {
        issues.push(
          createIssue(issues.length, "measure-event-missing", "Ölçü bilinmeyen event ID referansı taşıyor.", "error", {
            measureId: measure.id,
            eventId,
          }),
        );
      }
    }

    const measureEvents = document.events.filter((event) => measure.eventIds.includes(event.id));
    const maxEventEnd = measureEvents.reduce((max, event) => Math.max(max, event.startBeat + event.durationBeats), 0);
    if (maxEventEnd > measure.endBeat + 0.0001) {
      issues.push(
        createIssue(issues.length, "measure-duration-overflow", "Ölçü bitişi event sürelerini kapsamıyor.", "error", {
          measureId: measure.id,
        }),
      );
    }
  }

  for (const event of document.events) {
    if (!event.measureId || !document.measures.some((measure) => measure.id === event.measureId)) {
      issues.push(
        createIssue(issues.length, "event-measure-missing", "Event geçerli ölçüye bağlı değil.", "error", {
          eventId: event.id,
        }),
      );
    }

    if (!Number.isFinite(event.durationBeats) || event.durationBeats <= 0) {
      issues.push(
        createIssue(issues.length, "duration-invalid", "Event süresi geçersiz.", "error", {eventId: event.id}),
      );
    }

    // Zaman ekseni sonluluk kapisi (D1). Yalniz `durationBeats` dogrulamak
    // yetmiyordu: bozuk tek bir sure `startBeat += durationBeats` zinciriyle
    // SONRAKI tum event'leri NaN'a cekiyor ve NaN karsilastirmalari hep false
    // oldugu icin ne bu validator ne de `measure-duration-overflow` uyariyordu
    // (imlec sessizce oluyordu). Parser artik bozuk satiri dusuruyor; bu kapi
    // correction event'leri gibi diger yazma yollarina karsi son savunmadir.
    if (!Number.isFinite(event.startBeat) || !Number.isFinite(event.startTime)) {
      issues.push(
        createIssue(issues.length, "event-time-invalid", "Event zaman ekseni geçersiz (sonlu değil).", "error", {
          eventId: event.id,
        }),
      );
    }

    if (!event.isRest && !parsePitch(event.pitch.source)) {
      issues.push(
        createIssue(issues.length, "pitch-unparseable", "Event pitch parse edilemiyor.", "error", {eventId: event.id}),
      );
    }

    try {
      const mapped = mapCanonicalEventToVex(event);
      if (!mapped.pitch.key || !mapped.duration.duration) {
        issues.push(createIssue(issues.length, "vex-map-missing", "VexFlow mapping eksik.", "error", {eventId: event.id}));
      }
    } catch {
      issues.push(createIssue(issues.length, "vex-map-error", "VexFlow mapping üretilemedi.", "error", {eventId: event.id}));
    }
  }

  return issues;
}

export function summarizeCanonicalValidation(issues: readonly CanonicalValidationIssue[]): CanonicalValidationSummary {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return {
    ok: errorCount === 0,
    errorCount,
    warningCount,
    issueCount: issues.length,
  };
}
