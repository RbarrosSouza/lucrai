import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Budget from './components/Budget';
import BudgetForecast from './components/budget/BudgetForecast';
import BudgetPlanning from './components/budget/BudgetPlanning';
import Reconciliation from './components/Reconciliation';
import Settings from './components/Settings';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider } from './components/auth/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';
import AuthPage from './components/auth/AuthPage';
import SignupPhonePage from './components/auth/SignupPhonePage';
import { isSupabaseConfigured } from './services/supabaseClient';

function SupabaseNotConfigured() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="text-xl font-extrabold text-gray-900">Supabase não configurado</div>
        <div className="mt-2 text-sm text-gray-600">
          Configure as variáveis no seu <code className="font-mono">.env.local</code> (dev) ou no ambiente de build (prod):
        </div>
        <pre className="mt-4 text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-auto">
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
        </pre>
        <div className="mt-3 text-xs text-gray-500">
          Dica: em Vite, variáveis <code className="font-mono">VITE_*</code> são injetadas no build. No Vercel: Project → Settings → Environment
          Variables, depois faça um <strong>Redeploy</strong>. Garanta também que o Build Command é <code className="font-mono">npm run build</code>.
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  if (!isSupabaseConfigured) return <SupabaseNotConfigured />;
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route
            path="/signup/phone"
            element={
              <RequireAuth>
                <SignupPhonePage />
              </RequireAuth>
            }
          />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/budget/*" element={<Budget />}>
              <Route index element={<Navigate to="forecast" replace />} />
              <Route path="forecast" element={<BudgetForecast />} />
              <Route path="planning" element={<BudgetPlanning />} />
            </Route>
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;