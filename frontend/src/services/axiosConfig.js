import axios from "axios";

// Configuración base de Axios para toda la aplicación
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// Interceptor para añadir el token de autenticación a las peticiones
api.interceptors.request.use(
  (config) => {
    // No modificar la configuración si es una solicitud de actualización de token
    if (config.url.includes("/auth/refresh")) {
      return config;
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar respuestas y errores
export const setupResponseInterceptors = (refreshToken, onLogout) => {
  // Interceptor de respuesta
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Si el error es 401 y no es una solicitud de actualización de token
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Si es un error de autenticación en la ruta de login, simplemente rechazamos
        if (originalRequest.url.includes("/auth/login")) {
          return Promise.reject(error);
        }

        // Si ya estamos intentando refrescar el token, no lo hacemos de nuevo
        if (originalRequest._isRetry) {
          return Promise.reject(error);
        }

        // Marcamos la solicitud para evitar bucles
        originalRequest._retry = true;

        try {
          // Intentamos refrescar el token
          const response = await refreshToken();
          const { token } = response.data;

          // Actualizamos el token en el localStorage
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          user.token = token;
          localStorage.setItem("user", JSON.stringify(user));

          // Actualizamos el encabezado de autorización
          originalRequest.headers.Authorization = `Bearer ${token}`;

          // Reintentamos la solicitud original
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Error al refrescar el token:", refreshError);

          // Si hay un error al refrescar el token, cerramos la sesión
          if (onLogout) {
            onLogout();
          }

          return Promise.reject(refreshError);
        }
      }

      // Para otros errores, simplemente los rechazamos
      return Promise.reject(error);
    },
  );
};

export default api;
