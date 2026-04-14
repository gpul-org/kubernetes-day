import { useEffect, useState } from 'react';

const COUNT_URL = import.meta.env.PUBLIC_RSVP_COUNT_URL;

type CountState =
  | { kind: 'loading' }
  | { kind: 'ready'; count: number }
  | { kind: 'error' };

export function RSVPCount() {
  const [state, setState] = useState<CountState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadCount() {
      if (!COUNT_URL) {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
        return;
      }

      try {
        const response = await fetch(COUNT_URL, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error('Count request failed');
        }

        const payload = (await response.json()) as { rsvped?: unknown };
        const count =
          typeof payload.rsvped === 'number' && Number.isFinite(payload.rsvped)
            ? payload.rsvped
            : 0;

        if (!cancelled) {
          setState({ kind: 'ready', count });
        }
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      }
    }

    void loadCount();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'error') {
    return null;
  }

  if (state.kind === 'loading') {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Consultando asistentes confirmados...
      </p>
    );
  }

  const attendeeLabel = state.count === 1 ? 'Persona ya apuntada' : 'Personas apuntadas';

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-black tracking-tighter text-black">{state.count}</span>
      <span className="text-xs font-black uppercase tracking-widest text-zinc-600">
        {attendeeLabel}
      </span>
    </div>
  );
}
