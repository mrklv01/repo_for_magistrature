import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD ?? "admin";

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const token = btoa(`admin:${expected}`);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("hr_auth", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 дней
    path: "/",
  });
  return res;
}
