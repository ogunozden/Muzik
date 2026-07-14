import {NextRequest, NextResponse} from "next/server";
import {parseSymbtrToCanonical} from "@/data/score-engine/importer";

interface SymbtrImportRequest {
  raw?: unknown;
  scoreId?: unknown;
  sourceReference?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SymbtrImportRequest;
    if (typeof body.raw !== "string" || body.raw.trim().length === 0) {
      return NextResponse.json({error: "SymbTr raw TXT zorunlu."}, {status: 400});
    }

    const result = parseSymbtrToCanonical({
      raw: body.raw,
      scoreId: typeof body.scoreId === "string" ? body.scoreId : undefined,
      sourceReference: typeof body.sourceReference === "string" ? body.sourceReference : "user-upload",
      sourceKind: "user-upload",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] ScoreEngine SymbTr import error:", error);
    return NextResponse.json({error: "SymbTr içe aktarımı başarısız."}, {status: 500});
  }
}
