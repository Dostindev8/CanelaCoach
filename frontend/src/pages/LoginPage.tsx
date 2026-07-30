import { lazy, Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/ui/AuthCard';
import { FormField } from '../components/ui/FormField';
import { PasswordField } from '../components/ui/PasswordField';
import { BrandCheckbox } from '../components/ui/BrandCheckbox';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { DividerWithText } from '../components/ui/DividerWithText';
import { SocialButton } from '../components/ui/SocialButton';
import { cn } from '../lib/cn';
import { INTRO_SESSION_KEY } from '../components/intro/intro.constants';

const IntroScreen = lazy(() =>
  import('../components/intro/IntroScreen').then(({ IntroScreen: Intro }) => ({ default: Intro }))
);

function loginContentVisible(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === 'true';
  } catch {
    return true;
  }
}

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email requerido')
    .email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
  remember: z.boolean().optional(),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    </svg>
  );
}

function mapAuthError(err: unknown): string {
  const ax = err as {
    code?: string;
    message?: string;
    response?: { data?: { error?: { message?: string; code?: string } }; status?: number };
  };
  if (
    ax.code === 'ERR_NETWORK' ||
    ax.code === 'ECONNABORTED' ||
    ax.message?.includes('Network Error') ||
    ax.response?.data?.error?.code === 'API_UNAVAILABLE' ||
    ax.response?.status === 502
  ) {
    return 'El servidor aún no responde. Espera unos segundos (Mongo/Atlas o fallback) e intenta de nuevo.';
  }
  const data = ax.response;
  const code = data?.data?.error?.code;
  const msg = data?.data?.error?.message;
  if (code === 'RATE_LIMIT' || data?.status === 429) {
    return 'Demasiados intentos. Espera unos segundos e intenta de nuevo.';
  }
  if (code === 'LOCKED') {
    return msg || 'Cuenta temporalmente bloqueada. Intenta más tarde.';
  }
  return msg || 'No se pudo iniciar sesión. Verifica email y contraseña.';
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [needTotp, setNeedTotp] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginVisible, setLoginVisible] = useState(loginContentVisible);

  useEffect(() => {
    if (loginVisible) return;
    const timer = window.setTimeout(() => setLoginVisible(true), 6_000);
    return () => window.clearTimeout(timer);
  }, [loginVisible]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      // Dev UX: email de demo sin password (nunca hardcodear secretos en el bundle)
      email: import.meta.env.DEV ? 'entrenador@canelacoach.com' : '',
      password: '',
      remember: true,
      totpCode: '',
    },
  });

  const remember = watch('remember');

  const onSubmit = async (values: LoginForm) => {
    setServerError('');
    if (needTotp && (!values.totpCode || values.totpCode.length !== 6)) {
      setServerError('Ingresa el código MFA de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      const result = await login(
        values.email.trim().toLowerCase(),
        values.password,
        values.totpCode || undefined
      );
      if (result.mfaSetupRequired) {
        navigate('/mfa-setup');
        return;
      }
      if (result.mfaRequired) {
        setNeedTotp(true);
        return;
      }
      navigate('/');
    } catch (err: unknown) {
      setServerError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        className={cn(
          'transition-opacity duration-500 ease-out',
          loginVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <AuthCard>
        <header className="mb-5 text-center sm:mb-6">
          <h1 className="font-display text-[1.35rem] font-bold uppercase tracking-[0.12em] text-text-primary sm:text-[1.5rem]">
            CANELA COACH®
          </h1>
          <div className="mx-auto mt-2.5 h-0.5 w-14 rounded-full bg-brand-blue" aria-hidden="true" />
          <h2 className="mt-3.5 font-display text-[1.35rem] font-bold uppercase tracking-[0.06em] sm:text-[1.5rem]">
            <span className="text-text-primary">INICIAR </span>
            <span className="text-brand-blue">SESIÓN</span>
          </h2>
          <p className="mt-2 font-sans text-sm text-text-secondary">Accede a tu cuenta para continuar</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5" noValidate>
          <FormField
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="entrenador@canelacoach.com"
            icon={<IconMail />}
            error={errors.email?.message}
            {...register('email')}
          />

          <PasswordField
            label="Contraseña"
            autoComplete="current-password"
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {needTotp && (
            <FormField
              label="Código MFA"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              autoComplete="one-time-code"
              icon={<IconShield />}
              className="tracking-[0.35em] text-center text-lg"
              {...register('totpCode')}
            />
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <BrandCheckbox
              label="Recordarme"
              checked={!!remember}
              onChange={(e) => setValue('remember', e.target.checked)}
            />
            <a
              href="mailto:soporte@canelacoach.com?subject=Recuperar%20contraseña"
              className="inline-flex min-h-touch items-center font-sans text-sm font-medium text-link hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {serverError ? (
            <div
              className="rounded-field border border-danger/40 bg-danger/15 px-4 py-2.5 text-sm text-danger"
              role="alert"
              aria-live="polite"
            >
              {serverError}
            </div>
          ) : null}

          <PrimaryButton
            type="submit"
            fullWidth
            loading={loading}
            icon={
              <span className="text-lg leading-none" aria-hidden="true">
                →
              </span>
            }
          >
            {needTotp ? 'Verificar e entrar' : 'Entrar'}
          </PrimaryButton>
        </form>

        <div className="mt-4 flex flex-col gap-3.5 sm:mt-5">
          <DividerWithText text="O continúa con" />
          <div className="flex items-center justify-center gap-3">
            <SocialButton
              provider="google"
              onClick={() =>
                setServerError('Inicio social disponible en producción. Usa email y contraseña por ahora.')
              }
            />
            <SocialButton
              provider="apple"
              onClick={() =>
                setServerError('Inicio social disponible en producción. Usa email y contraseña por ahora.')
              }
            />
            <SocialButton
              provider="generic"
              onClick={() =>
                setServerError('Inicio social disponible en producción. Usa email y contraseña por ahora.')
              }
            />
          </div>
          <p className="text-center font-sans text-sm text-text-secondary">
            ¿No tienes una cuenta?{' '}
            <a
              href="mailto:soporte@canelacoach.com?subject=Solicitud%20de%20cuenta%20Canela%20Coach"
              className="font-sans font-semibold text-link hover:underline"
            >
              Contáctanos
            </a>
          </p>
        </div>
        </AuthCard>
      </AuthLayout>
      <Suspense fallback={null}>
        <IntroScreen onComplete={() => setLoginVisible(true)} />
      </Suspense>
    </>
  );
}
