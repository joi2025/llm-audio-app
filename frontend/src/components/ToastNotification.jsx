import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ToastNotification = ({
  id,
  message,
  type = "info",
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(duration);

  // Configuración de estilos según el tipo de notificación
  const typeConfigs = {
    success: {
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-400",
      textColor: "text-green-800",
      progressColor: "bg-green-500",
    },
    error: {
      icon: <XCircleIcon className="h-6 w-6 text-red-500" />,
      bgColor: "bg-red-50",
      borderColor: "border-red-400",
      textColor: "text-red-800",
      progressColor: "bg-red-500",
    },
    warning: {
      icon: <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" />,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-400",
      textColor: "text-yellow-800",
      progressColor: "bg-yellow-500",
    },
    info: {
      icon: <InformationCircleIcon className="h-6 w-6 text-blue-500" />,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-400",
      textColor: "text-blue-800",
      progressColor: "bg-blue-500",
    },
  };

  const config = typeConfigs[type] || typeConfigs.info;

  // Efecto para manejar el tiempo de la notificación
  useEffect(() => {
    if (duration === 0) return;

    let animationFrame;
    let start;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;

      if (!isPaused) {
        const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(newProgress);

        if (newProgress > 0) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          handleClose();
        }
      } else {
        // Si está pausado, actualizamos el tiempo restante
        setRemainingTime((prev) => Math.max(0, prev - elapsed));
        start = timestamp; // Reiniciamos el contador de tiempo
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isVisible) {
      setStartTime(Date.now());
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, duration, isPaused]);

  // Efecto para pausar/despausar al hacer hover
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Función para cerrar la notificación
  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Esperar a que termine la animación de salida antes de llamar a onClose
    setTimeout(() => {
      if (onClose) onClose(id);
    }, 300);
  }, [id, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`relative w-full max-w-sm overflow-hidden rounded-lg shadow-lg mb-2 border-l-4 ${config.borderColor} ${config.bgColor} transition-all duration-300 transform`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">{config.icon}</div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={handleClose}
            >
              <span className="sr-only">Cerrar</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      {duration > 0 && (
        <div className="h-1 bg-gray-200">
          <div
            className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

ToastNotification.propTypes = {
  id: PropTypes.string.isRequired,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  type: PropTypes.oneOf(["success", "error", "warning", "info"]),
  duration: PropTypes.number,
  onClose: PropTypes.func,
};

export default ToastNotification;
