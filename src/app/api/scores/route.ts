import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scores } from "@/db/schema";
import { parseScoreCreatePayload } from "@/core/application/score-payload";

// GET /api/scores - Tüm eserleri listele
export async function GET() {
  try {
    const allScores = await db.select().from(scores);
    return NextResponse.json({ scores: allScores });
  } catch (error) {
    console.error("[API] Scores fetch error:", error);
    return NextResponse.json(
      { error: "Eserler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST /api/scores - Yeni eser kaydet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseScoreCreatePayload(body);

    if (!payload.ok) {
      return NextResponse.json(
        { error: payload.error },
        { status: 400 }
      );
    }

    const now = new Date();
    const [newScore] = await db
      .insert(scores)
      .values({
        ...payload.value,
        userId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ score: newScore }, { status: 201 });
  } catch (error) {
    console.error("[API] Score create error:", error);
    return NextResponse.json(
      { error: "Eser kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
