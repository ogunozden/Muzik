import {NextRequest, NextResponse} from "next/server";
import {parseSymbtrToCanonical} from "@/data/score-engine/importer";

interface SymbtrImportRequest {
  raw?: unknown;
  scoreId?: unknown;
  sourceReference?: unknown;
}

// Savunma derinligi (bkz. derin-analiz P2.6): sinirsiz govde bellek/parse DoS'u.
// SymbTr TXT dosyalari birkac KB'dir; 2MB fazlasiyla yeterli ust sinir.
const MAX_SYMBTR_RAW_CHARS = 2_000_000;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SymbtrImportRequest;
    if (typeof body.raw !== "string" || body.raw.trim().length === 0) {
      return NextResponse.json({error: "SymbTr raw TXT zorunlu."}, {status: 400});
    }
    if (body.raw.length > MAX_SYMBTR_RAW_CHARS) {
      return NextResponse.json({error: "SymbTr raw TXT çok büyük."}, {status: 413});
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
