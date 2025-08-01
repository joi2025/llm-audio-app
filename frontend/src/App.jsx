import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import LoadingSpinner from './components/LoadingSpinner';
import Navbar from './components/Navbar';

// Carga perezosa de componentes de página
const VoiceAppPage = lazy(() => import('./pages/VoiceAppPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Componente de carga genérico
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <LoadingSpinner size="lg" />
  </div>
);

// Componente de layout principal que envuelve las páginas
const MainLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <main className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </main>
  </div>
);

// Componente de enrutamiento principal de la aplicación
const App = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Rutas solo para usuarios no autenticados */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-contrasena/:token" element={<ResetPasswordPage />} />
        </Route>

        {/* Rutas protegidas para usuarios autenticados */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={<MainLayout><VoiceAppPage /></MainLayout>}
          />
          <Route
            path="/perfil"
            element={<MainLayout><ProfilePage /></MainLayout>}
          />
          <Route
            path="/configuracion"
            element={<MainLayout><SettingsPage /></MainLayout>}
          />
          {/* Rutas de administración */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin" />}>
            <Route index element={<MainLayout><AdminDashboard /></MainLayout>} />
          </Route>
        </Route>

        {/* Ruta para páginas no encontradas */}
        <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
      </Routes>
    </Suspense>
  );
};

export default App;
