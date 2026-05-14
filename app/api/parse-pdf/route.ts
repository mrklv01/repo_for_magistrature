import { NextRequest, NextResponse } from "next/server";
import { parsePdf } from "@/lib/parsers/pdf";

export const runtime = "nodejs";

/**
 * POST /api/parse-pdf
 * Accepts a multipart PDF file, extracts text, attempts to parse rows.
 * Returns { rows: Record<string, string>[] }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await (file as Blob).arrayBuffer());
    const text = await parsePdf(buffer);

    // Basic table parsing: split by newlines, find header row, parse columns
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // Look for a header line containing known column names
    const headerKeywords = ["created_at", "ticket_id", "Номер", "Дата создания", "Исполнитель"];
    const headerIdx = lines.findIndex((l) =>
      headerKeywords.some((kw) => l.toLowerCase().includes(kw.toLowerCase()))
    );

    if (headerIdx === -1) {
      return NextResponse.json(
        { error: "Не удалось найти заголовок таблицы в PDF. Попробуйте CSV или XLSX." },
        { status: 422 }
      );
    }

    const headers = lines[headerIdx].split(/\t|;|,/).map((h) => h.trim());
    const rows: Record<string, string>[] = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cells = lines[i].split(/\t|;|,/);
      if (cells.length < headers.length / 2) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (cells[idx] ?? "").trim();
      });
      rows.push(row);
    }

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("[parse-pdf]", err);
    return NextResponse.json({ error: "PDF processing failed" }, { status: 500 });
  }
}
