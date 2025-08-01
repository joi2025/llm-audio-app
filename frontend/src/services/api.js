import axios from "axios";

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Interceptor para añadir el token de autenticación
api.interceptors.request.use(
  (config) => {
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

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // El servidor respondió con un estado fuera del rango 2xx
      console.error("Error response:", error.response.data);

      // Manejar errores de autenticación
      if (error.response.status === 401) {
        // Redirigir a login si el token es inválido o ha expirado
        localStorage.removeItem("user");
        window.location.href = "/login";
      }

      return Promise.reject({
        message: error.response.data?.message || "Error en la solicitud",
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.error("No response received:", error.request);
      return Promise.reject({
        message: "No se pudo conectar con el servidor",
        isNetworkError: true,
      });
    } else {
      // Algo sucedió en la configuración de la solicitud
      console.error("Request error:", error.message);
      return Promise.reject({
        message: "Error al configurar la solicitud",
        details: error.message,
      });
    }
  },
);

// Funciones de la API
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),

  register: (userData) => api.post("/auth/register", userData),

  getProfile: () => api.get("/auth/me"),
};

export const audioAPI = {
  startRecording: () => api.post("/audio/start"),

  stopRecording: () => api.post("/audio/stop"),

  uploadAudio: (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    return api.post("/audio/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export const adminAPI = {
  getStatus: () => api.get("/admin/status"),

  getLogs: (limit = 100) => api.get(`/admin/logs?limit=${limit}`),

  restartService: (service) => api.post(`/admin/restart/${service}`),
};

export default api;
