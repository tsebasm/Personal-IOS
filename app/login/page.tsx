"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    // signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      // Email confirmation is required by the Supabase project's auth
      // settings — there's no session yet until the user confirms.
      setCheckEmail(true);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-[0.08em] text-ink-dim mb-1">
            Personal OS
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {mode === "signin" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </h1>
        </div>

        <div className="bg-surface border border-border rounded-card shadow-card p-6">
          {checkEmail ? (
            <div className="text-sm text-ink">
              Revisa tu correo (<span className="font-mono">{email}</span>) para confirmar
              la cuenta y luego inicia sesión.
              <button
                type="button"
                className="mt-4 w-full rounded-md bg-accent text-accent-ink text-sm font-semibold py-2"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signin");
                }}
              >
                Ir a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {mode === "signup" && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="name" className="text-xs uppercase tracking-wide text-ink-dim">
                    Nombre
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs uppercase tracking-wide text-ink-dim">
                  Correo
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-xs uppercase tracking-wide text-ink-dim">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                />
              </div>

              {error && (
                <div className="rounded-md bg-bad-bg text-bad text-sm px-3 py-2">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-md bg-accent text-accent-ink text-sm font-semibold py-2 disabled:opacity-60"
              >
                {loading
                  ? "Un momento…"
                  : mode === "signin"
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
              </button>
            </form>
          )}
        </div>

        {!checkEmail && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="mt-4 w-full text-center text-sm text-ink-dim"
          >
            {mode === "signin" ? (
              <>¿Primera vez? <span className="text-accent font-medium">Crea tu cuenta</span></>
            ) : (
              <>¿Ya tienes cuenta? <span className="text-accent font-medium">Inicia sesión</span></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
