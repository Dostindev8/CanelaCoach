import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AuthCard } from '../components/ui/AuthCard';
import { FormField } from '../components/ui/FormField';
import { PrimaryButton } from '../components/ui/PrimaryButton';

export function MfaSetupPage() {
  const { setMfaSetupRequired, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'init' | 'verify'>('init');

  const activar = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/mfa/activar');
      setQr(data.data.qr);
      setSecret(data.data.secret);
      setStep('verify');
    } catch {
      setError('No se pudo generar MFA');
    } finally {
      setLoading(false);
    }
  };

  const verificar = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/mfa/verificar', { code });
      setMfaSetupRequired(false);
      await refreshProfile();
      navigate('/');
    } catch {
      setError('Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <header className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.14em] text-text-primary">
            CANELA COACH<span className="text-brand-blue">®</span>
          </h1>
          <div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-brand-blue" aria-hidden="true" />
          <h2 className="mt-5 font-display text-xl font-bold uppercase tracking-[0.06em]">
            <span className="text-text-primary">CONFIGURAR </span>
            <span className="text-brand-blue">MFA</span>
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Los administradores deben activar autenticación TOTP antes de continuar.
          </p>
        </header>

        <div className="space-y-5">
          {step === 'init' && (
            <PrimaryButton type="button" fullWidth loading={loading} onClick={() => void activar()}>
              Generar código QR
            </PrimaryButton>
          )}

          {step === 'verify' && (
            <>
              {qr && (
                <img
                  src={qr}
                  alt="Código QR para autenticador TOTP"
                  className="mx-auto h-48 w-48 object-contain rounded-field bg-white p-2"
                />
              )}
              <p className="text-xs text-center text-text-secondary break-all">
                Secret manual: <span className="text-text-primary font-mono">{secret}</span>
              </p>
              <FormField
                label="Código de 6 dígitos"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="tracking-[0.35em] text-center text-lg"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <PrimaryButton
                type="button"
                fullWidth
                loading={loading}
                onClick={() => void verificar()}
                disabled={code.length !== 6}
              >
                Verificar y continuar
              </PrimaryButton>
            </>
          )}

          {error && (
            <p className="text-sm text-danger" role="alert" aria-live="polite">
              {error}
            </p>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
