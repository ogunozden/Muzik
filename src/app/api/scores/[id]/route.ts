import { NextRequest, NextResponse } from "next/server";
import { parseScoreUpdatePayload } from "@/core/application/score-payload";
import {
  deleteScore,
  getScoreById,
  updateScore,
} from "@/core/infrastructure/scores/score-repository";
export type { ScoreRecord } from "@/core/infrastructure/scores/score-repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const score = getScoreById(id);

    if (!score) {
      return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ score });
  } catch (error) {
    console.error("[API] Score fetch error:", error);
    return NextResponse.json(
      { error: "Eser yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = parseScoreUpdatePayload(body);

    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const score = updateScore(id, payload.value);

    if (!score) {
      return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ score });
  } catch (error) {
    console.error("[API] Score update error:", error);
    return NextResponse.json(
      { error: "Eser güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteScore(id);

    if (!deleted) {
      return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ message: "Eser silindi", score: deleted });
  } catch (error) {
    console.error("[API] Score delete error:", error);
    return NextResponse.json(
      { error: "Eser silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
