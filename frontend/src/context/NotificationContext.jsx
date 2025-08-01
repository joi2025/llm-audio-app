import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import ToastNotification from "../components/ToastNotification";

const NotificationContext = createContext();

/**
 * Hook para usar el contexto de notificaciones
 * @returns {Object} Funciones para mostrar notificaciones
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications debe usarse dentro de un NotificationProvider",
    );
  }
  return context;
};

/**
 * Proveedor de notificaciones
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componentes hijos
 * @returns {JSX.Element} Proveedor de contexto de notificaciones
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  /**
   * Agrega una nueva notificación
   * @param {Object} notification - Configuración de la notificación
   * @param {string} notification.message - Mensaje a mostrar
   * @param {string} [notification.type='info'] - Tipo de notificación (success, error, warning, info)
   * @param {number} [notification.duration=5000] - Duración en milisegundos (0 = no se cierra automáticamente)
   * @returns {string} ID de la notificación
   */
  const addNotification = useCallback(
    ({ message, type = "info", duration = 5000 }) => {
      const id = uuidv4();
      const newNotification = {
        id,
        message,
        type,
        duration,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Eliminar la notificación después de la duración especificada
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    [],
  );

  /**
   * Elimina una notificación por su ID
   * @param {string} id - ID de la notificación a eliminar
   */
  const removeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  }, []);

  /**
   * Muestra una notificación de éxito
   * @param {string} message - Mensaje a mostrar
   * @param {number} [duration=3000] - Duración en milisegundos
   * @returns {string} ID de la notificación
   */
  const success = useCallback(
    (message, duration = 3000) => {
      return addNotification({ message, type: "success", duration });
    },
    [addNotification],
  );

  /**
   * Muestra una notificación de error
   * @param {string} message - Mensaje a mostrar
   * @param {number} [duration=5000] - Duración en milisegundos
   * @returns {string} ID de la notificación
   */
  const error = useCallback(
    (message, duration = 5000) => {
      return addNotification({ message, type: "error", duration });
    },
    [addNotification],
  );

  /**
   * Muestra una notificación de advertencia
   * @param {string} message - Mensaje a mostrar
   * @param {number} [duration=4000] - Duración en milisegundos
   * @returns {string} ID de la notificación
   */
  const warning = useCallback(
    (message, duration = 4000) => {
      return addNotification({ message, type: "warning", duration });
    },
    [addNotification],
  );

  /**
   * Muestra una notificación informativa
   * @param {string} message - Mensaje a mostrar
   * @param {number} [duration=4000] - Duración en milisegundos
   * @returns {string} ID de la notificación
   */
  const info = useCallback(
    (message, duration = 4000) => {
      return addNotification({ message, type: "info", duration });
    },
    [addNotification],
  );

  // Valor del contexto
  const contextValue = {
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
    notifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
        {notifications.map((notification) => (
          <ToastNotification
            key={notification.id}
            id={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
