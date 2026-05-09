import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scores } from "@/db/schema";

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
    const { title, composer, makam, usul, form, notesData, userId } = body;

    if (!title || !makam || !usul || !notesData) {
      return NextResponse.json(
        { error: "Zorunlu alanlar eksik: title, makam, usul, notesData" },
        { status: 400 }
      );
    }

    const [newScore] = await db
      .insert(scores)
      .values({
        title,
        composer: composer || null,
        makam,
        usul,
        form: form || null,
        notesData,
        userId: userId || null,
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
