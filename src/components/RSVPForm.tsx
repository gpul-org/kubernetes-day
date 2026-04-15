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
  'mt-2 w-full border-2 border-black bg-white px-4 py-3 text-sm font-bold text-black outline-none transition placeholder:text-zinc-400 focus:bg-yellow-50 focus:ring-4 focus:ring-black';

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
    submitState.kind === 'loading' ? 'Enviando...' : 'Reservar mi plaza';

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
    <div className="border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] md:p-10">
      <div className="mb-10 space-y-4">
        <p className="inline-block bg-black px-2 py-0.5 text-xs font-black uppercase tracking-widest text-white">
          Inscripción
        </p>
        <h3 className="text-4xl font-black uppercase leading-none tracking-tighter text-black md:text-5xl">
          Apúntate ya
        </h3>
        <p className="text-lg font-bold leading-tight text-zinc-600">
          Aforo limitado a 80 personas.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-8 border-4 border-black bg-amber-200 p-4 text-sm font-black uppercase leading-tight text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          `PUBLIC_BOOKING_URL` NO CONFIGURADA. EL FORMULARIO ESTÁ EN MODO PRUEBA.
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-xs font-black uppercase tracking-widest text-black">
            Nombre completo
            <input
              autoComplete="name"
              className={fieldClassName}
              disabled={isSubmitting || soldOut || success}
              name="fullName"
              onChange={(event) =>
                setValues((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="E.g. Alan Turing"
              value={values.fullName}
            />
            {errors.fullName && (
              <span className="mt-2 block bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                {errors.fullName}
              </span>
            )}
          </label>

          <label className="block text-xs font-black uppercase tracking-widest text-black">
            Posición / cargo
            <input
              autoComplete="organization-title"
              className={fieldClassName}
              disabled={isSubmitting || soldOut || success}
              name="role"
              onChange={(event) =>
                setValues((current) => ({ ...current, role: event.target.value }))
              }
              placeholder="E.g. Platform Engineer"
              value={values.role}
            />
            {errors.role && (
              <span className="mt-2 block bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                {errors.role}
              </span>
            )}
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-xs font-black uppercase tracking-widest text-black">
            Empresa
            <input
              autoComplete="organization"
              className={fieldClassName}
              disabled={isSubmitting || soldOut || success}
              name="company"
              onChange={(event) =>
                setValues((current) => ({ ...current, company: event.target.value }))
              }
              placeholder="Tu organización"
              value={values.company}
            />
          </label>

          <label className="block text-xs font-black uppercase tracking-widest text-black">
            Correo electrónico
            <input
              autoComplete="email"
              className={fieldClassName}
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
              <span className="mt-2 block bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                {errors.email}
              </span>
            )}
          </label>
        </div>

        <label className="block text-xs font-black uppercase tracking-widest text-black">
          Restricciones alimentarias
          <textarea
            className={`${fieldClassName} min-h-32 resize-none`}
            disabled={isSubmitting || soldOut || success}
            name="dietaryRestrictions"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                dietaryRestrictions: event.target.value
              }))
            }
            placeholder="Alergias, intolerancias, opción vegana..."
            value={values.dietaryRestrictions}
          />
          {errors.dietaryRestrictions && (
            <span className="mt-2 block bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
              {errors.dietaryRestrictions}
            </span>
          )}
        </label>

        <button
          className="w-full border-4 border-black bg-red-500 py-4 text-xl font-black uppercase text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:bg-red-600 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || soldOut || success}
          type="submit"
        >
          {submitLabel}
        </button>
      </form>

      {submitState.kind !== 'idle' && submitState.kind !== 'loading' && (
        <div
          className={`mt-8 border-4 border-black p-4 text-sm font-black uppercase leading-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${submitState.kind === 'success'
            ? 'bg-emerald-400 text-black'
            : submitState.kind === 'sold-out'
              ? 'bg-amber-400 text-black'
              : 'bg-red-600 text-white'
            }`}
        >
          {submitState.message}
        </div>
      )}
    </div>
  );
}
