import React, { useEffect, useRef } from "react";
import "./Conversation.css";

const Conversation = ({ messages, typingIndicator }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingIndicator]);

  return (
    <div className="conversation-container">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.role}`}>
          <div className="bubble">
            <strong>
              {msg.role === "user"
                ? "Tú"
                : msg.role === "assistant"
                  ? "Asistente"
                  : "Sistema"}
              :
            </strong>
            <p>{msg.content}</p>
          </div>
        </div>
      ))}
      {typingIndicator && (
        <div className="message assistant">
          <div className="bubble typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Conversation;
