import { NextRequest, NextResponse } from "next/server";
import { parseScoreCreatePayload } from "@/core/application/score-payload";
import { createScore, listScores } from "@/core/infrastructure/scores/score-repository";

export async function GET() {
  try {
    const allScores = listScores();
    return NextResponse.json({ scores: allScores });
  } catch (error) {
    console.error("[API] Scores fetch error:", error);
    return NextResponse.json(
      { error: "Eserler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseScoreCreatePayload(body);

    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const newScore = createScore(payload.value);

    return NextResponse.json({ score: newScore }, { status: 201 });
  } catch (error) {
    console.error("[API] Score create error:", error);
    return NextResponse.json(
      { error: "Eser kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
