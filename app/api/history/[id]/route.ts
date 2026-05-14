import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/** GET /api/history/[id] — load full record */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Неверный id" }, { status: 400 });
    }
    const db = await getDb();
    const record = await db
      .collection("analyses")
      .findOne({ _id: new ObjectId(id) });

    if (!record) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    return NextResponse.json({
      ...record,
      id: record._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error("[history GET id]", err);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

/** DELETE /api/history/[id] — remove record */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Неверный id" }, { status: 400 });
    }
    const db = await getDb();
    await db.collection("analyses").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[history DELETE]", err);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
