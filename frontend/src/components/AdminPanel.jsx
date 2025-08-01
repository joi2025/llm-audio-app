import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAiSettings } from "../hooks/useAiSettings";
import "./AdminPanel.css";

const AdminPanel = ({ isOpen, onClose }) => {
  const { logs, clearLogs, addLog } = useAppContext();
  const {
    aiName,
    setAiName,
    userName,
    setUserName,
    responseStyle,
    setResponseStyle,
    attitude,
    setAttitude,
    maxTokens,
    setMaxTokens,
    temperature,
    setTemperature,
    systemPrompt,
    setSystemPrompt,
    handleSave: handleSaveAiSettings,
  } = useAiSettings();

  const [activeTab, setActiveTab] = useState("ai");
  const [useRealtimeAPI, setUseRealtimeAPI] = useState(
    localStorage.getItem("useRealtimeAPI") === "true",
  );
  const [useAdvancedVoice, setUseAdvancedVoice] = useState(
    localStorage.getItem("useAdvancedVoice") === "true",
  );
  const [voiceType, setVoiceType] = useState(
    localStorage.getItem("voiceType") || "default",
  );
  const [voiceSpeed, setVoiceSpeed] = useState(
    localStorage.getItem("voiceSpeed") || "1.0",
  );
  const [voiceVolume, setVoiceVolume] = useState(
    localStorage.getItem("voiceVolume") || "80",
  );

  const handleSaveSettings = () => {
    handleSaveAiSettings();
    localStorage.setItem("useRealtimeAPI", useRealtimeAPI);
    localStorage.setItem("useAdvancedVoice", useAdvancedVoice);
    localStorage.setItem("voiceType", voiceType);
    localStorage.setItem("voiceSpeed", voiceSpeed);
    localStorage.setItem("voiceVolume", voiceVolume);
    addLog("Configuración guardada en localStorage.");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "clamp(60px, 10vh, 100px)",
        left: "clamp(10px, 2vw, 20px)",
        right: "clamp(10px, 2vw, 20px)",
        bottom: "clamp(10px, 2vh, 20px)",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "clamp(10px, 2vw, 20px)",
        zIndex: 1000,
        overflowY: "auto",
        maxHeight: "80vh",
      }}
    >
      <h2
        style={{
          fontSize: "clamp(18px, 4vw, 24px)",
          marginTop: 0,
          marginBottom: "clamp(10px, 2vw, 15px)",
          textAlign: "center",
        }}
      >
        Panel de Administración
      </h2>
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #ddd",
          marginBottom: "clamp(10px, 2vw, 15px)",
        }}
      >
        <button
          onClick={() => setActiveTab("ai")}
          style={{
            flex: 1,
            padding: "clamp(8px, 1.5vw, 12px)",
            background: activeTab === "ai" ? "#007bff" : "#f8f9fa",
            color: activeTab === "ai" ? "white" : "black",
            border: "1px solid #ddd",
            borderBottom: "none",
            borderRadius: "5px 5px 0 0",
            cursor: "pointer",
          }}
        >
          IA
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          style={{
            flex: 1,
            padding: "clamp(8px, 1.5vw, 12px)",
            background: activeTab === "voice" ? "#007bff" : "#f8f9fa",
            color: activeTab === "voice" ? "white" : "black",
            border: "1px solid #ddd",
            borderBottom: "none",
            borderRadius: "5px 5px 0 0",
            cursor: "pointer",
          }}
        >
          Voz
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          style={{
            flex: 1,
            padding: "clamp(8px, 1.5vw, 12px)",
            background: activeTab === "logs" ? "#007bff" : "#f8f9fa",
            color: activeTab === "logs" ? "white" : "black",
            border: "1px solid #ddd",
            borderBottom: "none",
            borderRadius: "5px 5px 0 0",
            cursor: "pointer",
          }}
        >
          Logs
        </button>
      </div>

      {activeTab === "ai" && (
        <div>
          <h3
            style={{
              fontSize: "clamp(16px, 3vw, 20px)",
              marginBottom: "clamp(8px, 1.5vw, 12px)",
            }}
          >
            Personalización de IA
          </h3>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Nombre de la IA:
            </label>
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              style={{
                width: "100%",
                padding: "clamp(6px, 1vw, 8px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Nombre del usuario:
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{
                width: "100%",
                padding: "clamp(6px, 1vw, 8px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Estilo de respuesta:
            </label>
            <select
              value={responseStyle}
              onChange={(e) => setResponseStyle(e.target.value)}
              style={{
                width: "100%",
                padding: "clamp(6px, 1vw, 8px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="informativo">Informativo</option>
              <option value="narrativo">Narrativo</option>
            </select>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Actitud:
            </label>
            <select
              value={attitude}
              onChange={(e) => setAttitude(e.target.value)}
              style={{
                width: "100%",
                padding: "clamp(6px, 1vw, 8px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="amigable">Amigable</option>
              <option value="neutral">Neutral</option>
              <option value="serio">Serio</option>
              <option value="divertido">Divertido</option>
            </select>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Máximo de tokens (coste/respuesta):
            </label>
            <input
              type="range"
              min="50"
              max="500"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
              {maxTokens}
            </span>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Temperatura (creatividad, 0-1):
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
              {temperature}
            </span>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Prompt del sistema:
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              style={{
                width: "100%",
                height: "clamp(80px, 15vh, 120px)",
                padding: "clamp(6px, 1vw, 8px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
                resize: "vertical",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "clamp(12px, 2.5vw, 14px)",
              }}
            >
              <input
                type="checkbox"
                checked={useRealtimeAPI}
                onChange={(e) => setUseRealtimeAPI(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Usar API de Conversaciones en Tiempo Real (más costoso)
            </label>
          </div>
        </div>
      )}

      {activeTab === "voice" && (
        <div>
          <h3
            style={{
              fontSize: "clamp(16px, 3vw, 20px)",
              marginBottom: "clamp(8px, 1.5vw, 12px)",
            }}
          >
            Configuración de Voz
          </h3>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "clamp(12px, 2.5vw, 14px)",
              }}
            >
              <input
                type="checkbox"
                checked={useAdvancedVoice}
                onChange={(e) => setUseAdvancedVoice(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Usar Voz Avanzada (API Externa)
            </label>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Tipo de voz:
            </label>
            <select
              value={voiceType}
              onChange={(e) => setVoiceType(e.target.value)}
              style={{
                width: "100%",
                padding: "clamp(6px, 1vw, 8px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="default">Predeterminada</option>
              {useAdvancedVoice ? (
                <>
                  <option value="spanish_male">Masculino (Español)</option>
                  <option value="spanish_female">Femenino (Español)</option>
                </>
              ) : (
                <>
                  <option value="Brian">Brian (Masculino, UK)</option>
                  <option value="Emma">Emma (Femenino, UK)</option>
                  <option value="Matthew">Matthew (Masculino, US)</option>
                  <option value="Amy">Amy (Femenino, UK)</option>
                </>
              )}
            </select>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Velocidad de voz (0.5-2.0):
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(e.target.value)}
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
              {voiceSpeed}
            </span>
          </div>
          <div style={{ marginBottom: "clamp(8px, 1.5vw, 12px)" }}>
            <label
              style={{
                display: "block",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                marginBottom: "4px",
              }}
            >
              Volumen de voz (0-100):
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={voiceVolume}
              onChange={(e) => setVoiceVolume(e.target.value)}
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>
              {voiceVolume}%
            </span>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div>
          <h3
            style={{
              fontSize: "clamp(16px, 3vw, 20px)",
              marginBottom: "clamp(8px, 1.5vw, 12px)",
            }}
          >
            Logs del Sistema
          </h3>
          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "clamp(8px, 1.5vw, 12px)",
              borderRadius: "4px",
              height: "clamp(200px, 40vh, 300px)",
              overflowY: "auto",
              fontSize: "clamp(12px, 2.5vw, 14px)",
              border: "1px solid #ddd",
            }}
          >
            {logs.map((log, index) => (
              <div
                key={index}
                style={{
                  color:
                    log.type === "error"
                      ? "#dc3545"
                      : log.type === "warning"
                        ? "#ffc107"
                        : log.type === "success"
                          ? "#28a745"
                          : log.type === "info"
                            ? "#17a2b8"
                            : "#343a40",
                  marginBottom: "4px",
                }}
              >
                [{log.timestamp}] {log.message}{" "}
                {log.details && (
                  <span
                    style={{ fontSize: "clamp(10px, 2vw, 12px)", opacity: 0.8 }}
                  >
                    {log.details}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={clearLogs}
            style={{
              marginTop: "clamp(10px, 2vw, 15px)",
              padding: "clamp(6px, 1vw, 8px) clamp(12px, 2vw, 16px)",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Limpiar Logs
          </button>
        </div>
      )}

      <button
        onClick={handleSaveSettings}
        style={{
          display: "block",
          margin: "clamp(15px, 3vw, 20px) auto 0",
          padding: "clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Guardar y Cerrar
      </button>
    </div>
  );
};

export default AdminPanel;
