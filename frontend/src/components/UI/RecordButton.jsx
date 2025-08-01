import React from "react";

/**
 * Botón redondo para grabar/pausar con soporte ratón y táctil.
 * Mantén pulsado (mousedown / touchstart) para grabar y suelta (mouseup / touchend) para enviar.
 */
const RecordButton = ({ isRecording, onStart, onStop }) => {
  const handlePressStart = (e) => {
    e.preventDefault();
    if (onStart) onStart();
  };

  const handlePressEnd = (e) => {
    e.preventDefault();
    if (onStop) onStop();
  };

  return (
    <button
      type="button"
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      aria-label={
        isRecording ? "Soltar para detener" : "Mantén presionado para hablar"
      }
      style={{
        padding: "18px 32px",
        fontSize: "18px",
        backgroundColor: isRecording ? "#e74c3c" : "#3498db",
        color: "#fff",
        border: "none",
        borderRadius: "40px",
        cursor: "pointer",
        transition: "background 0.2s ease",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {isRecording ? "Suelta para enviar ⏹️" : "Mantén para hablar 🎙️"}
    </button>
  );
};

export default RecordButton;
