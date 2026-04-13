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

  const attendeeLabel = state.count === 1 ? 'persona ya apuntada' : 'personas ya apuntadas';

  return (
    <p className="text-sm text-[var(--color-text-muted)]">
      <span className="font-semibold text-[var(--color-text)]">{state.count}</span>{' '}
      {attendeeLabel}. Reserva antes de que se complete el aforo.
    </p>
  );
}
