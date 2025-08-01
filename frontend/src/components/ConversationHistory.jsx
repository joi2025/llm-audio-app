import React from "react";
import { FiUser, FiMessageSquare } from "react-icons/fi";

const ConversationHistory = ({ history, onClear }) => {
  return (
    <div
      className="conversation-history"
      style={{
        width: "100%",
        maxWidth: "100%",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>
        Historial de Conversaciones
      </h2>
      <button
        onClick={onClear}
        className="clear-history-btn"
        style={{
          padding: "5px 10px",
          fontSize: "0.8rem",
          width: "100%",
          marginBottom: "10px",
        }}
      >
        Limpiar Historial
      </button>
      <div
        className="history-messages"
        style={{
          maxHeight: "50vh",
          overflowY: "auto",
          fontSize: "0.9rem",
        }}
      >
        {history.length === 0 ? (
          <p className="no-history">No hay conversaciones previas.</p>
        ) : (
          history.map((item, index) => (
            <div
              key={index}
              className={`history-message ${item.type}`}
              style={{ padding: "5px" }}
            >
              <span className="timestamp" style={{ fontSize: "0.7rem" }}>
                [{item.timestamp}]
              </span>
              <span className="role" style={{ fontSize: "0.8rem" }}>
                {item.type === "user" ? "Tú" : "Asistente"}:
              </span>
              <span className="content" style={{ fontSize: "0.9rem" }}>
                {item.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;
