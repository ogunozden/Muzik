import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scores } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/scores/[id] - Tekil eser getir
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const [score] = await db.select().from(scores).where(eq(scores.id, id));
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

// PUT /api/scores/[id] - Eser güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, composer, makam, usul, form, notesData } = body;

    const [updated] = await db
      .update(scores)
      .set({
        ...(title && { title }),
        ...(composer !== undefined && { composer }),
        ...(makam && { makam }),
        ...(usul && { usul }),
        ...(form !== undefined && { form }),
        ...(notesData && { notesData }),
        updatedAt: new Date(),
      })
      .where(eq(scores.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ score: updated });
  } catch (error) {
    console.error("[API] Score update error:", error);
    return NextResponse.json(
      { error: "Eser güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/scores/[id] - Eser sil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(scores)
      .where(eq(scores.id, id))
      .returning();

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
