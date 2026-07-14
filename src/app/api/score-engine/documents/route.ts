import {NextResponse} from "next/server";
import {listReachableCanonicalDocuments} from "@/data/score-engine/importer";

export async function GET() {
  try {
    const documents = await listReachableCanonicalDocuments();
    return NextResponse.json({documents});
  } catch (error) {
    console.error("[API] ScoreEngine documents error:", error);
    return NextResponse.json({error: "ScoreEngine dokümanları yüklenemedi."}, {status: 500});
  }
}
