import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Componente de ruta que solo permite el acceso a usuarios NO autenticados.
 * Redirige a la página de inicio si el usuario ya está autenticado.
 */
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Si el usuario está autenticado, redirigir a la página de origen o a la página de inicio
  if (isAuthenticated) {
    return <Navigate to={from} replace state={{ from: location }} />;
  }

  // Si no está autenticado, renderizar los children
  return children;
};

export default PublicOnlyRoute;
