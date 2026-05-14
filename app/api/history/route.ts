import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { EmployeeFeatures } from "@/types/index";
import type { DepartmentInsights } from "@/lib/features/department";

export const runtime = "nodejs";

interface HistoryRecord {
  _id?: ObjectId;
  createdAt: Date;
  label: string;
  metadata: {
    total_tickets: number;
    period_start: string;
    period_end: string;
    employee_count: number;
  };
  analysis: ClaudeAnalysis;
  features: EmployeeFeatures[];
  nameMap: [string, string][];
  insights: DepartmentInsights;
}

/** GET /api/history — return list (no heavy fields) */
export async function GET() {
  try {
    const db = await getDb();
    const records = await db
      .collection<HistoryRecord>("analyses")
      .find({}, { projection: { features: 0, insights: 0, nameMap: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      records.map((r) => ({
        id: r._id!.toString(),
        label: r.label,
        createdAt: r.createdAt,
        metadata: r.metadata,
        avgBurnoutRisk: r.analysis.department.avg_burnout_risk,
        highRiskCount: r.analysis.department.high_risk_count,
      }))
    );
  } catch (err) {
    console.error("[history GET]", err);
    return NextResponse.json({ error: "Ошибка получения истории" }, { status: 500 });
  }
}

/** POST /api/history — save new analysis */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<HistoryRecord, "_id" | "createdAt" | "label">;
    const db = await getDb();

    const createdAt = new Date();
    const label = `${createdAt.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, ${createdAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

    const record: HistoryRecord = {
      createdAt,
      label,
      metadata: body.metadata,
      analysis: body.analysis,
      features: body.features,
      nameMap: body.nameMap,
      insights: body.insights,
    };

    const result = await db.collection<HistoryRecord>("analyses").insertOne(record);
    return NextResponse.json({ id: result.insertedId.toString(), label }, { status: 201 });
  } catch (err) {
    console.error("[history POST]", err);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
