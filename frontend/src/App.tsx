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
import { ProtocolBuilderPage } from './pages/ProtocolBuilderPage';
import type { ReactNode } from 'react';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return null;
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
            <Route path="/portal" element={<PortalPacientePage />} />
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
