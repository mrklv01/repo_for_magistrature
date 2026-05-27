"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const json = await res.json() as { error?: string };
        setError(json.error ?? "Ошибка входа");
      }
    } catch {
      setError("Сервер недоступен");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-black shadow-lg">
            HR
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-foreground">HR-Agent</h1>
            <p className="mt-1 text-sm text-muted-foreground">People Analytics · Esil University</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Вход для HR-менеджера</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Логин</label>
              <Input value="admin" disabled className="bg-muted/50 text-muted-foreground" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Пароль
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !password} className="mt-1 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Вход…" : "Войти"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Инструмент магистерской диссертации Прудникова Д., Esil University, 2026
        </p>
      </div>
    </main>
  );
}
