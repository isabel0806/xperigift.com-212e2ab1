import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: 'Darse de baja' },
      { name: 'description', content: 'Confirmá tu baja de los envíos.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
});

function UnsubscribePage() {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Falta el token de baja.');
    }
  }, [token]);

  async function confirm() {
    if (!token) return;
    setStatus('working');
    setError(null);
    const { data, error } = await supabase.rpc('process_unsubscribe', {
      _token: token,
    });
    if (error) {
      setStatus('error');
      setError(error.message);
      return;
    }
    const result = data as { ok: boolean; email?: string; error?: string } | null;
    if (!result?.ok) {
      setStatus('error');
      setError(result?.error ?? 'No pudimos procesar la baja.');
      return;
    }
    setEmail(result.email ?? null);
    setStatus('done');
  }

  return (
    <main className="min-h-screen bg-paper-soft">
      <div className="mx-auto max-w-md px-6 py-24">
        <div className="rounded-sm border border-hairline bg-paper p-8 shadow-sm">
          <h1 className="font-display text-[24px] leading-tight text-ink">Darse de baja</h1>

          {status === 'idle' && token && (
            <>
              <p className="mt-3 text-[14px] text-ink-soft">
                Vas a dejar de recibir nuestros emails de marketing. Podés volver
                a inscribirte cuando quieras.
              </p>
              <button
                onClick={confirm}
                className="mt-6 inline-flex h-10 items-center rounded-sm bg-ink px-4 text-[13px] text-paper hover:bg-ink-soft"
              >
                Confirmar baja
              </button>
            </>
          )}

          {status === 'working' && (
            <p className="mt-4 text-[14px] text-ink-muted">Procesando…</p>
          )}

          {status === 'done' && (
            <>
              <p className="mt-4 text-[14px] text-emerald-deep">
                Listo. {email ? <>Diste de baja a <strong>{email}</strong>.</> : 'Tu baja fue procesada.'}
              </p>
              <p className="mt-2 text-[13px] text-ink-muted">
                Ya no vas a recibir más campañas de este remitente.
              </p>
            </>
          )}

          {status === 'error' && (
            <p className="mt-4 text-[14px] text-destructive">
              {error ?? 'Algo salió mal.'}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
