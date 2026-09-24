"use client";

import { useEffect } from "react";

/**
 * Error boundary del dashboard: en vez de "Internal Server Error" opaco,
 * muestra el mensaje (en desarrollo) o el digest (en producción, para
 * buscarlo en los logs de Vercel) y la causa más frecuente en este proyecto.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const schemaHint = /column|relation|does not exist|schema cache/i.test(error.message);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full rounded-card border border-border bg-surface px-6 py-8 text-center">
        <p className="text-sm font-medium text-ink mb-2">Algo falló al cargar esta vista.</p>
        <p className="text-xs text-ink-dim mb-3 break-words">{error.message}</p>
        {error.digest && <p className="text-[0.7rem] font-mono text-ink-dim mb-3">digest: {error.digest}</p>}
        {schemaHint && (
          <p className="text-xs text-warn mb-3">
            Parece una migración pendiente: ejecuta en Supabase las de <code>supabase/migrations/</code> que falten.
          </p>
        )}
        <button type="button" onClick={() => retry()} className="text-sm font-medium text-ink underline underline-offset-2">
          Reintentar
        </button>
      </div>
    </main>
  );
}
