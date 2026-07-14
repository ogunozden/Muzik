import {NextRequest, NextResponse} from "next/server";
import {getScoreEngineDocumentPiece} from "@/data/score-engine/calibration";
import {importPieceCanonicalDocument} from "@/data/score-engine/importer";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const {id} = await context.params;
    const decodedId = decodeURIComponent(id);
    const piece = getScoreEngineDocumentPiece(decodedId);

    if (!piece) {
      return NextResponse.json({error: "ScoreEngine dokümanı bulunamadı."}, {status: 404});
    }

    const result = await importPieceCanonicalDocument(piece);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] ScoreEngine document error:", error);
    return NextResponse.json({error: "ScoreEngine dokümanı yüklenemedi."}, {status: 500});
  }
}
