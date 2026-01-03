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

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />

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