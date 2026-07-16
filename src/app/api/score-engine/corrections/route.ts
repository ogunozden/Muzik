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

const MAX_ID_CHARS = 256;
const MAX_PAYLOAD_CHARS = 64_000;

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

    // Savunma derinligi (derin-analiz P2.6): sinirsiz id/payload SQLite'i
    // buyutur/bellek DoS'u. Duzeltme olaylari kucuktur.
    if (body.documentId.length > MAX_ID_CHARS || body.targetId.length > MAX_ID_CHARS) {
      return NextResponse.json({error: "documentId/targetId çok uzun."}, {status: 413});
    }
    if (body.payload !== undefined && JSON.stringify(body.payload).length > MAX_PAYLOAD_CHARS) {
      return NextResponse.json({error: "payload çok büyük."}, {status: 413});
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
