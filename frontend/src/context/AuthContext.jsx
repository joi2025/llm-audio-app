import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api, { setupResponseInterceptors } from "../services/axiosConfig";

const AuthContext = createContext();

/**
 * Hook para usar el contexto de autenticación
 * @returns {Object} Datos y funciones de autenticación
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userString = localStorage.getItem("user");
        if (userString) {
          // Si hay un usuario en localStorage, intentar validar con el backend
          const user = JSON.parse(userString);
          api.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
          const response = await api.get("/auth/me");
          setCurrentUser(response.data);
        } else {
          // Si no hay usuario, simplemente terminamos de cargar
          delete api.defaults.headers.common["Authorization"];
        }
      } catch (e) {
        // Si cualquier parte de la validación falla, limpiar todo
        console.error(
          "Fallo en la inicialización de la autenticación, limpiando sesión.",
          e,
        );
        localStorage.removeItem("user");
        setCurrentUser(null);
        delete api.defaults.headers.common["Authorization"];
      } finally {
        // En todos los casos, hemos terminado de cargar
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post("/auth/login", { email, password });
      const userData = response.data;

      localStorage.setItem("user", JSON.stringify(userData));
      api.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;
      setCurrentUser(userData);

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
      return userData;
    } catch (err) {
      console.error("Error en login:", err);
      const errorMessage =
        err.response?.data?.message || "Error al iniciar sesión";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    navigate("/login", { replace: true });
  };

  const isAuthenticated = !!currentUser;

  const hasRole = useCallback(
    (role) => {
      return currentUser?.roles?.includes(role) ?? false;
    },
    [currentUser],
  );

  const value = {
    currentUser,
    isAuthenticated,
    isLoading: loading,
    error,
    login,
    logout,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
