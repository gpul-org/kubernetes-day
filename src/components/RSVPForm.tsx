import { startTransition, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type FormValues = {
  company: string;
  dietaryRestrictions: string;
  email: string;
  fullName: string;
  role: string;
};

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'sold-out'; message: string }
  | { kind: 'error'; message: string };

type ValidationErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  company: '',
  dietaryRestrictions: '',
  email: '',
  fullName: '',
  role: ''
};

const BOOKING_URL = import.meta.env.PUBLIC_BOOKING_URL;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClassName =
  'mt-2 w-full rounded-[1.1rem] border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-4 focus:ring-blue-100/80';

function validate(values: FormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!values.fullName.trim()) errors.fullName = 'Indica tu nombre completo.';
  if (!values.role.trim()) errors.role = 'Indica tu posición o cargo.';
  if (!values.email.trim()) {
    errors.email = 'Indica tu correo electrónico.';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Introduce un correo válido.';
  }
  if (!values.dietaryRestrictions.trim()) {
    errors.dietaryRestrictions = 'Necesitamos esta información para el catering.';
  }

  return errors;
}

function getResponseMessage(response: Response, payload: unknown) {
  if (typeof payload === 'object' && payload !== null) {
    const maybeMessage = Reflect.get(payload, 'message');
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  if (response.status === 409 || response.status === 410 || response.status === 429) {
    return 'Las plazas se han agotado. Si se liberan nuevas entradas, lo comunicaremos por los canales del evento.';
  }

  return 'No hemos podido registrar tu plaza ahora mismo. Vuelve a intentarlo en unos minutos.';
}

export function RSVPForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });

  const isConfigured = useMemo(() => Boolean(BOOKING_URL), []);
  const isSubmitting = submitState.kind === 'loading';

  const submitLabel =
    submitState.kind === 'loading' ? 'Enviando solicitud...' : 'Reservar plaza';

  const soldOut = submitState.kind === 'sold-out';
  const success = submitState.kind === 'success';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!BOOKING_URL) {
      startTransition(() => {
        setSubmitState({
          kind: 'error',
          message:
            'Falta configurar la URL de registro. Define PUBLIC_BOOKING_URL antes de publicar la landing.'
        });
      });
      return;
    }

    startTransition(() => {
      setSubmitState({ kind: 'loading' });
    });

    try {
      const response = await fetch(BOOKING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      let payload: unknown = null;
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        payload = text ? { message: text } : null;
      }

      if (response.ok) {
        startTransition(() => {
          setSubmitState({
            kind: 'success',
            message:
              'Tu solicitud se ha enviado correctamente. Revisa tu correo por si compartimos información adicional antes del evento.'
          });
          setValues(INITIAL_VALUES);
          setErrors({});
        });
        return;
      }

      const message = getResponseMessage(response, payload);
      const soldOutResponse =
        response.status === 409 ||
        response.status === 410 ||
        response.status === 429 ||
        (typeof payload === 'object' &&
          payload !== null &&
          (Reflect.get(payload, 'code') === 'SOLD_OUT' ||
            Reflect.get(payload, 'status') === 'full'));

      startTransition(() => {
        setSubmitState(
          soldOutResponse
            ? { kind: 'sold-out', message }
            : { kind: 'error', message }
        );
      });
    } catch {
      startTransition(() => {
        setSubmitState({
          kind: 'error',
          message:
            'Ha habido un problema de conexión mientras enviábamos tu solicitud. Prueba de nuevo.'
        });
      });
    }
  }

  return (
    <div className="rounded-[1.7rem] border border-[var(--color-border)] bg-white p-6 shadow-[var(--color-shadow)] md:p-8">
      <div className="mb-7 space-y-3">
        <p className="eyebrow">
          RSVP
        </p>
        <h3 className="text-[2rem] font-semibold tracking-tight text-slate-900">
          Reserva tu plaza
        </h3>
        <p className="text-sm leading-6 text-slate-600">
          El aforo está limitado a 80 personas. Recogeremos la información
          imprescindible para confirmar asistencia y coordinar el catering.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          `PUBLIC_BOOKING_URL` todavía no está definida. El formulario funciona
          visualmente, pero no enviará registros reales hasta configurarla.
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">
            Nombre completo
            <input
              autoComplete="name"
              className={`${fieldClassName} border-slate-200 bg-white`}
              disabled={isSubmitting || soldOut || success}
              name="fullName"
              onChange={(event) =>
                setValues((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="Ada Lovelace"
              value={values.fullName}
            />
            {errors.fullName && (
              <span className="mt-2 block text-xs text-rose-600">{errors.fullName}</span>
            )}
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Posición / cargo
            <input
              autoComplete="organization-title"
              className={`${fieldClassName} border-slate-200 bg-white`}
              disabled={isSubmitting || soldOut || success}
              name="role"
              onChange={(event) =>
                setValues((current) => ({ ...current, role: event.target.value }))
              }
              placeholder="Platform Engineer"
              value={values.role}
            />
            {errors.role && (
              <span className="mt-2 block text-xs text-rose-600">{errors.role}</span>
            )}
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">
            Empresa
            <input
              autoComplete="organization"
              className={`${fieldClassName} border-slate-200 bg-white`}
              disabled={isSubmitting || soldOut || success}
              name="company"
              onChange={(event) =>
                setValues((current) => ({ ...current, company: event.target.value }))
              }
              placeholder="Tu empresa u organización"
              value={values.company}
            />
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Correo electrónico
            <input
              autoComplete="email"
              className={`${fieldClassName} border-slate-200 bg-white`}
              disabled={isSubmitting || soldOut || success}
              name="email"
              onChange={(event) =>
                setValues((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="nombre@empresa.com"
              type="email"
              value={values.email}
            />
            {errors.email && (
              <span className="mt-2 block text-xs text-rose-600">{errors.email}</span>
            )}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-800">
          Alergias o restricciones alimentarias
          <textarea
            className={`${fieldClassName} min-h-32 resize-y border-slate-200 bg-white`}
            disabled={isSubmitting || soldOut || success}
            name="dietaryRestrictions"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                dietaryRestrictions: event.target.value
              }))
            }
            placeholder="Indica alergias, intolerancias o si necesitas una opción específica."
            value={values.dietaryRestrictions}
          />
          {errors.dietaryRestrictions && (
            <span className="mt-2 block text-xs text-rose-600">
              {errors.dietaryRestrictions}
            </span>
          )}
        </label>

        <button
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || soldOut || success}
          type="submit"
        >
          {submitLabel}
        </button>
      </form>

      {submitState.kind !== 'idle' && submitState.kind !== 'loading' && (
        <div
          className={`mt-5 rounded-[1.1rem] px-4 py-3 text-sm leading-6 ${
            submitState.kind === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : submitState.kind === 'sold-out'
                ? 'border border-amber-200 bg-amber-50 text-amber-800'
                : 'border border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {submitState.message}
        </div>
      )}
    </div>
  );
}
