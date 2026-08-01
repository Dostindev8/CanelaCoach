import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { PrivateRoute } from './components/PrivateRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { MfaSetupPage } from './pages/MfaSetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientesPage } from './pages/ClientesPage';
import { ClienteDetailPage } from './pages/ClienteDetailPage';
import { WizardEvaluacionPage } from './pages/WizardEvaluacionPage';
import { IntakeQuestionnairePage } from './pages/IntakeQuestionnairePage';
import { EvaluationReportPage } from './pages/EvaluationReportPage';
import { PlanesPage } from './pages/PlanesPage';
import { AgendaPage } from './pages/AgendaPage';
import { PortalPacientePage } from './pages/PortalPacientePage';
import { PortalClienteLayout } from './pages/portal/PortalClienteLayout';
import { LoginClientePage } from './pages/portal/LoginClientePage';
import { RegistroClientePage } from './pages/portal/RegistroClientePage';
import { OlvidePasswordPage } from './pages/portal/OlvidePasswordPage';
import { ResetPasswordPage } from './pages/portal/ResetPasswordPage';
import { DashboardClientePage } from './pages/portal/DashboardClientePage';
import { VerificarEmailPage } from './pages/portal/VerificarEmailPage';
import { ProtocolBuilderPage } from './pages/ProtocolBuilderPage';
import { EjerciciosPage } from './pages/EjerciciosPage';
import type { ReactNode } from 'react';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function BootScreen({ label = 'Cargando Canela Coach®…' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#05070C] px-6 text-center text-white">
      <div className="max-w-sm space-y-3">
        <div className="animate-pulse font-display text-xl tracking-widest">CANELA COACH®</div>
        <p className="text-sm text-white/70">{label}</p>
      </div>
    </div>
  );
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading, mfaSetupRequired } = useAuth();
  if (loading) return <BootScreen label="Verificando sesión…" />;
  if (user && mfaSetupRequired) return <Navigate to="/mfa-setup" replace />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  return <Navigate to={user ? '/' : '/login'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <LoginPage />
                </PublicOnly>
              }
            />
            <Route path="/portal" element={<PortalClienteLayout />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<LoginClientePage />} />
              <Route path="registro" element={<RegistroClientePage />} />
              <Route path="olvide-password" element={<OlvidePasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="verificar" element={<VerificarEmailPage />} />
              <Route path="dashboard" element={<DashboardClientePage />} />
            </Route>
            {/* Legacy PacienteCuenta portal — EXTEND, keep reachable */}
            <Route path="/portal/legacy" element={<PortalPacientePage />} />
            <Route path="/mfa-setup" element={<MfaSetupPage />} />
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="clientes/:id" element={<ClienteDetailPage />} />
                <Route path="clientes/:id/cuestionario-ingreso" element={<IntakeQuestionnairePage />} />
                <Route path="clientes/:id/evaluacion/nueva" element={<WizardEvaluacionPage />} />
                <Route
                  path="clientes/:id/evaluaciones/:evalId/reporte"
                  element={<EvaluationReportPage />}
                />
                <Route path="clientes/:id/protocolo" element={<ProtocolBuilderPage />} />
                <Route path="planes" element={<PlanesPage />} />
                <Route path="ejercicios" element={<EjerciciosPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<CatchAll />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
