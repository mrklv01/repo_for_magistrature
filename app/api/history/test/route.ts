import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const count = await db.collection("analyses").countDocuments();
    return NextResponse.json({ ok: true, count, message: "MongoDB подключена" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
