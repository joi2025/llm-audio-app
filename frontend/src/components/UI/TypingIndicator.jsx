import React from "react";

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: "4px" }}>
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: "#666",
        animation: "bounce 1.4s infinite ease-in-out",
      }}
    />
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: "#666",
        animation: "bounce 1.4s infinite ease-in-out 0.2s",
      }}
    />
    <div
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: "#666",
        animation: "bounce 1.4s infinite ease-in-out 0.4s",
      }}
    />
    <style>{`@keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-5px); }
      }`}</style>
  </div>
);

export default TypingIndicator;
