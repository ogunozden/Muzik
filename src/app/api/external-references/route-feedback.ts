import path from "node:path";
import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {mkdir, open, rename, unlink, writeFile} from "node:fs/promises";
import * as CFG from "./route-config";
import {readJsonOrNull} from "./route-state";
import type {
  ExternalReferenceAction,
  SourceTerminalDecisionManifest,
  SourceTerminalFeedbackEvent,
  SourceTerminalFeedbackManifest,
  SourceTerminalFeedbackSummary,
} from "./route-types";

/**
 * Kaynak terminal feedback yazma katmani (M8.1 bolme): event kurma,
 * dogrulama, lock + atomik-rename ile manifest yazimi. GET okuma
 * katmanindan (route-state) ayridir.
 */

const EXTERNAL_REFERENCE_ACTIONS = new Set<ExternalReferenceAction>([
  "stage","map","sync","audit","candidate-export","candidate-import",
  "candidate-review-export","candidate-review-group-export",
  "candidate-review-group-decision-recommendation-export",
  "candidate-review-group-decision-template-export",
  "candidate-review-group-decision-import","curation-auto-attach",
  "curation-stats","curation-validate","curation-feedback",
  "curation-feedback-batch","source-terminal-feedback",
  "curation-manual-correction","curation-embed-state",
]);

export const SOURCE_TERMINAL_FEEDBACK_EVENT_TYPES = new Set([
  "comment_added",
  "alternate_proposed",
  "verified",
  "community_verified_requested",
  "disputed",
  "rejected",
  "rolled_back",
]);

function toProjectRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildSourceTerminalFeedbackEvent(
  input: unknown,
  decisions: SourceTerminalDecisionManifest | null,
  currentFeedback: SourceTerminalFeedbackManifest,
): SourceTerminalFeedbackEvent | NextResponse {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({error: "Terminal kaynak feedback girdisi gerekli."}, {status: 400});
  }

  const event = input as SourceTerminalFeedbackEvent;
  const catalogId = typeof event.catalogId === "string" ? event.catalogId.trim() : "";
  const eventType = typeof event.eventType === "string" ? event.eventType.trim() : "";
  const previousEventId = typeof event.previousEventId === "string" ? event.previousEventId.trim() : "";
  const alternateUrl = typeof event.alternateUrl === "string" ? event.alternateUrl.trim() : "";
  if (!catalogId) {
    return NextResponse.json({error: "Terminal kaynak feedback catalogId gerekli."}, {status: 400});
  }
  const terminalEntry = (decisions?.entries ?? []).find((entry) => entry.catalogId === catalogId);
  if (!terminalEntry) {
    return NextResponse.json({error: "Terminal kaynak feedback catalogId terminal karar manifestinde yok."}, {status: 400});
  }
  if (!SOURCE_TERMINAL_FEEDBACK_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({error: "Terminal kaynak feedback eventType geçersiz."}, {status: 400});
  }
  if (alternateUrl && !isHttpsUrl(alternateUrl)) {
    return NextResponse.json({error: "Terminal kaynak alternateUrl HTTPS olmalı."}, {status: 400});
  }
  if (eventType === "rolled_back" && !previousEventId) {
    return NextResponse.json({error: "Terminal kaynak rollback previousEventId gerekli."}, {status: 400});
  }
  if (eventType === "rolled_back") {
    const previousEvent = (currentFeedback.events ?? []).find((candidate) => candidate.eventId === previousEventId);
    if (!previousEvent) {
      return NextResponse.json({error: "Terminal kaynak rollback previousEventId bulunamadı."}, {status: 400});
    }
    if (previousEvent.catalogId !== catalogId) {
      return NextResponse.json({error: "Terminal kaynak rollback catalogId önceki event ile eşleşmiyor."}, {status: 400});
    }
    if ((currentFeedback.events ?? []).some((candidate) => candidate.previousEventId === previousEventId)) {
      return NextResponse.json({error: "Terminal kaynak rollback event zaten geri alınmış."}, {status: 400});
    }
  }

  return {
    eventId: event.eventId ?? `source-terminal-event-${randomUUID().slice(0, 12)}`,
    catalogId,
    eventType,
    reason: typeof event.reason === "string" ? event.reason.slice(0, CFG.MAX_SOURCE_FIELD_CHARS) : undefined,
    note: typeof event.note === "string" ? event.note.slice(0, CFG.MAX_SOURCE_FIELD_CHARS) : undefined,
    alternateUrl: alternateUrl ? alternateUrl.slice(0, CFG.MAX_SOURCE_FIELD_CHARS) : undefined,
    previousEventId: previousEventId || undefined,
    previousValue: event.previousValue && typeof event.previousValue === "object" ? event.previousValue : {status: terminalEntry.status},
    createdAt: event.createdAt ?? new Date().toISOString(),
    createdBy: typeof event.createdBy === "string" && event.createdBy.trim() ? event.createdBy : "local-user",
    weakLabel: true,
    labelPolicy: "Terminal source feedback is a weak label. It may guide review ranking, but it never promotes a source without validator/import gates.",
  };
}

export function summarizeSourceTerminalFeedbackEvents(events: SourceTerminalFeedbackEvent[]): SourceTerminalFeedbackSummary {
  const rolledBackIds = new Set(events.map((event) => event.previousEventId).filter((id): id is string => Boolean(id)));
  const eventTypeCounts = events.reduce<Record<string, number>>((counts, event) => {
    const type = event.eventType ?? "unknown";
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});

  return {
    eventCount: events.length,
    activeEventCount: events.filter((event) => !event.eventId || !rolledBackIds.has(event.eventId)).length,
    rolledBackEventCount: rolledBackIds.size,
    eventTypeCounts,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withSourceTerminalFeedbackLock<T>(callback: () => Promise<T>): Promise<T> {
  await mkdir(path.dirname(CFG.SOURCE_TERMINAL_FEEDBACK_LOCK_FILE), {recursive: true});

  let lockHandle: Awaited<ReturnType<typeof open>> | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      lockHandle = await open(CFG.SOURCE_TERMINAL_FEEDBACK_LOCK_FILE, "wx");
      break;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        await sleep(50);
        continue;
      }
      throw error;
    }
  }

  if (!lockHandle) {
    return NextResponse.json({error: "Terminal kaynak feedback kilidi alınamadı."}, {status: 423}) as T;
  }

  try {
    await lockHandle.writeFile(new Date().toISOString());
    return await callback();
  } finally {
    await lockHandle.close().catch(() => undefined);
    await unlink(CFG.SOURCE_TERMINAL_FEEDBACK_LOCK_FILE).catch(() => undefined);
  }
}

export async function writeJsonAtomically(filePath: string, payload: unknown): Promise<void> {
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`);
  await rename(tempPath, filePath);
}

export async function recordSourceTerminalFeedback(input: unknown): Promise<unknown> {
  return await withSourceTerminalFeedbackLock(async () => {
    const decisions = await readJsonOrNull<SourceTerminalDecisionManifest>(CFG.SOURCE_TERMINAL_DECISIONS_FILE);
    const current = await readJsonOrNull<SourceTerminalFeedbackManifest>(CFG.SOURCE_TERMINAL_FEEDBACK_FILE) ?? {
      version: 1,
      type: "source-terminal-feedback-events",
      events: [],
    };
    const event = buildSourceTerminalFeedbackEvent(input, decisions, current);
    if (event instanceof NextResponse) return event;

    const next = {
      version: 1,
      type: "source-terminal-feedback-events",
      events: [...(current.events ?? []), event],
    };
    const summary = summarizeSourceTerminalFeedbackEvents(next.events);
    const manifest = {...next, summary};

    await mkdir(path.dirname(CFG.SOURCE_TERMINAL_FEEDBACK_FILE), {recursive: true});
    await writeJsonAtomically(CFG.SOURCE_TERMINAL_FEEDBACK_FILE, manifest);

    return {
      eventCount: manifest.events.length,
      activeEventCount: summary.activeEventCount,
      rolledBackEventCount: summary.rolledBackEventCount,
      event,
      artifactPath: toProjectRelativePath(CFG.SOURCE_TERMINAL_FEEDBACK_FILE),
    };
  });
}

export function isExternalReferenceAction(action: unknown): action is ExternalReferenceAction {
  return typeof action === "string" && EXTERNAL_REFERENCE_ACTIONS.has(action as ExternalReferenceAction);
}

