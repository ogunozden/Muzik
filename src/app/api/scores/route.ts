import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readJson, writeJson, generateId } from "@/lib/json-store";
import { parseScoreCreatePayload } from "@/core/application/score-payload";
import type { ScoreCreatePayload } from "@/core/application/score-payload";

const DATA_DIR = path.join(process.cwd(), "src", "data", "scores");
const FILE = path.join(DATA_DIR, "scores.json");

interface ScoreRecord extends ScoreCreatePayload {
  id: string;
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

export async function GET() {
  try {
    const allScores = await readScores();
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

    const now = new Date().toISOString();
    const newScore: ScoreRecord = {
      ...payload.value,
      id: generateId(),
      userId: null,
      createdAt: now,
      updatedAt: now,
    };

    const scores = await readScores();
    scores.push(newScore);
    await writeScores(scores);

    return NextResponse.json({ score: newScore }, { status: 201 });
  } catch (error) {
    console.error("[API] Score create error:", error);
    return NextResponse.json(
      { error: "Eser kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
