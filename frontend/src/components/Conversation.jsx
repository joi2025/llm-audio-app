import React from "react";
import "./Conversation.css";

const Conversation = ({ messages, isLoading }) => {
  return (
    <div
      className="conversation"
      style={{
        width: "100%",
        maxWidth: "100%",
        padding: "10px",
        boxSizing: "border-box",
        overflowY: "auto",
        height: "100%",
      }}
    >
      {messages.length === 0 ? (
        <div
          className="empty-conversation"
          style={{ textAlign: "center", padding: "20px", fontSize: "0.9rem" }}
        >
          <p>No hay mensajes aún. ¡Graba algo para empezar a charlar!</p>
        </div>
      ) : (
        messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role}`}
            style={{ marginBottom: "10px", fontSize: "0.9rem" }}
          >
            <span
              className="role"
              style={{ fontWeight: "bold", marginRight: "5px" }}
            >
              {msg.role === "user" ? "Tú:" : "Amigo:"}
            </span>
            <span className="content">{msg.content}</span>
          </div>
        ))
      )}
      {isLoading && (
        <div
          className="loading-indicator"
          style={{ textAlign: "center", padding: "10px", fontSize: "0.8rem" }}
        >
          <p>Procesando...</p>
        </div>
      )}
    </div>
  );
};

export default Conversation;
