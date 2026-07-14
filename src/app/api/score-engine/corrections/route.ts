import {NextRequest, NextResponse} from "next/server";
import {createScoreCorrectionEvent} from "@/data/score-engine/corrections";
import type {ScoreCorrectionEventType} from "@/data/score-engine/canonical-score";
import {appendCorrectionEvent} from "@/core/infrastructure/score-engine/correction-repository";

const VALID_TYPES = new Set<ScoreCorrectionEventType>([
  "pitch_changed",
  "duration_changed",
  "measure_split",
  "source_anchor_added",
  "source_anchor_rejected",
  "verified",
  "rollback",
]);

interface CorrectionRequest {
  documentId?: unknown;
  type?: unknown;
  targetId?: unknown;
  payload?: unknown;
  authorId?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CorrectionRequest;
    if (typeof body.documentId !== "string" || typeof body.targetId !== "string" || typeof body.type !== "string") {
      return NextResponse.json({error: "documentId, type ve targetId zorunlu."}, {status: 400});
    }

    if (!VALID_TYPES.has(body.type as ScoreCorrectionEventType)) {
      return NextResponse.json({error: "Correction event tipi geçersiz."}, {status: 400});
    }

    const event = createScoreCorrectionEvent({
      documentId: body.documentId,
      type: body.type as ScoreCorrectionEventType,
      targetId: body.targetId,
      payload: typeof body.payload === "object" && body.payload !== null ? (body.payload as Record<string, unknown>) : {},
      authorId: typeof body.authorId === "string" ? body.authorId : null,
    });

    const {eventCount} = appendCorrectionEvent(event);

    return NextResponse.json({event, stored: true, eventCount}, {status: 201});
  } catch (error) {
    console.error("[API] ScoreEngine correction event error:", error);
    return NextResponse.json({error: "Correction event kaydedilemedi."}, {status: 500});
  }
}
