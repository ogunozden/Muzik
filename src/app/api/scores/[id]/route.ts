import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readJson, writeJson } from "@/lib/json-store";
import { parseScoreUpdatePayload } from "@/core/application/score-payload";

const DATA_DIR = path.join(process.cwd(), "src", "data", "scores");
const FILE = path.join(DATA_DIR, "scores.json");

export interface ScoreRecord {
  id: string;
  title: string;
  composer: string | null;
  makam: string;
  usul: string;
  form: string | null;
  notesData: unknown[];
  userId: null;
  createdAt: string;
  updatedAt: string;
}

async function readScores(): Promise<ScoreRecord[]> {
  return (await readJson<ScoreRecord[]>(FILE)) ?? [];
}

async function writeScores(scores: ScoreRecord[]): Promise<void> {
  await writeJson(FILE, scores);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allScores = await readScores();
    const score = allScores.find((s) => s.id === id);

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

    const allScores = await readScores();
    const index = allScores.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
    }

    allScores[index] = {
      ...allScores[index],
      ...payload.value,
      updatedAt: new Date().toISOString(),
    };

    await writeScores(allScores);

    return NextResponse.json({ score: allScores[index] });
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
    const allScores = await readScores();
    const index = allScores.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
    }

    const [deleted] = allScores.splice(index, 1);
    await writeScores(allScores);

    return NextResponse.json({ message: "Eser silindi", score: deleted });
  } catch (error) {
    console.error("[API] Score delete error:", error);
    return NextResponse.json(
      { error: "Eser silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
