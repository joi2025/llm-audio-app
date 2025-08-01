import React from "react";
import PropTypes from "prop-types";

/**
 * Componente de carga que muestra un spinner animado
 * @param {Object} props - Propiedades del componente
 * @param {string} [props.size='md'] - Tamaño del spinner (sm, md, lg, xl)
 * @param {string} [props.color='primary'] - Color del spinner (primary, secondary, success, danger, warning, info)
 * @param {string} [props.className=''] - Clases CSS adicionales
 * @param {string} [props.text='Cargando...'] - Texto a mostrar debajo del spinner
 * @returns {JSX.Element} Componente de carga
 */
const LoadingSpinner = ({
  size = "md",
  color = "primary",
  className = "",
  text = "Cargando...",
}) => {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-2",
    lg: "h-16 w-16 border-4",
    xl: "h-24 w-24 border-4",
  };

  const colorClasses = {
    primary: "border-t-blue-500 border-r-blue-500 border-b-transparent",
    secondary: "border-t-gray-500 border-r-gray-500 border-b-transparent",
    success: "border-t-green-500 border-r-green-500 border-b-transparent",
    danger: "border-t-red-500 border-r-red-500 border-b-transparent",
    warning: "border-t-yellow-500 border-r-yellow-500 border-b-transparent",
    info: "border-t-cyan-500 border-r-cyan-500 border-b-transparent",
  };

  const textSizes = {
    sm: "text-xs mt-1",
    md: "text-sm mt-2",
    lg: "text-base mt-3",
    xl: "text-lg mt-4",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} 
        rounded-full animate-spin`}
        role="status"
      >
        <span className="sr-only">Cargando...</span>
      </div>
      {text && (
        <p className={`text-gray-600 dark:text-gray-400 ${textSizes[size]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "info",
  ]),
  className: PropTypes.string,
  text: PropTypes.string,
};

export default LoadingSpinner;
