import React, { useState } from "react";
import api from "../api/client";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [serviceStatus, setServiceStatus] = useState({
    backend: null, // true/false/null
    websocket: null,
    redis: null,
    postgres: null,
  });
  const [logs, setLogs] = useState([]);

  const handleStart = async () => {
    setLoading(true);
    let now = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${now}] Iniciando chequeos de servicios...`]);

    // 1. Chequeo Backend
    let backendOk = false;
    try {
      const res = await api.get("/healthz");
      backendOk = res.data.status === "ok";
      setServiceStatus((prev) => ({ ...prev, backend: backendOk }));
      setLogs((prev) => [
        ...prev,
        `[${now}] Backend: ${backendOk ? "OK" : "No OK"}`,
      ]);
    } catch {
      setServiceStatus((prev) => ({ ...prev, backend: false }));
      setLogs((prev) => [...prev, `[${now}] Backend: No disponible`]);
    }

    // 2. Chequeo WebSocket
    let wsOk = false;
    try {
      await new Promise((resolve, reject) => {
        const ws = new window.WebSocket(
          import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/test",
        );
        ws.onopen = () => {
          wsOk = true;
          setServiceStatus((prev) => ({ ...prev, websocket: true }));
          setLogs((prev) => [...prev, `[${now}] WebSocket: OK`]);
          ws.close();
          resolve();
        };
        ws.onerror = () => {
          setServiceStatus((prev) => ({ ...prev, websocket: false }));
          setLogs((prev) => [...prev, `[${now}] WebSocket: No disponible`]);
          reject();
        };
      });
    } catch {
      setServiceStatus((prev) => ({ ...prev, websocket: false }));
    }

    // 3. Chequeo Redis y PostgreSQL vía backend
    try {
      const res = await api.get("/healthz");
      setServiceStatus((prev) => ({
        ...prev,
        redis: res.data.redis === "ok",
        postgres: res.data.postgres === "ok",
      }));
      setLogs((prev) => [
        ...prev,
        `[${now}] Redis: ${res.data.redis === "ok" ? "OK" : "No disponible"}`,
        `[${now}] PostgreSQL: ${res.data.postgres === "ok" ? "OK" : "No disponible"}`,
      ]);
    } catch {
      setServiceStatus((prev) => ({ ...prev, redis: false, postgres: false }));
      setLogs((prev) => [
        ...prev,
        `[${now}] Redis: No disponible`,
        `[${now}] PostgreSQL: No disponible`,
      ]);
    }

    // Estado general
    if (backendOk && wsOk && serviceStatus.redis && serviceStatus.postgres) {
      setStatus("¡Todo listo! Puedes grabar y transcribir.");
    } else {
      setStatus("Uno o más servicios no están disponibles.");
    }
    setLoading(false);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
  };

  return (
    <div className="p-8">
      <button
        className={`px-6 py-3 rounded-lg font-bold text-xl shadow-lg focus:outline-none transition-colors duration-200 ${
          Object.values(serviceStatus).every((v) => v === null)
            ? "bg-gray-400 text-white"
            : Object.values(serviceStatus).every((v) => v === true)
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
        }`}
        onClick={handleStart}
        disabled={loading}
      >
        {loading
          ? "Comprobando..."
          : Object.values(serviceStatus).every((v) => v === null)
            ? "Arrancar y Usar"
            : Object.values(serviceStatus).every((v) => v === true)
              ? "¡Funciona!"
              : "No Funciona"}
      </button>
      <div className="flex gap-5 mt-6 mb-2 items-center flex-wrap">
        {[
          { key: "backend", label: "Backend" },
          { key: "websocket", label: "WebSocket" },
          { key: "redis", label: "Redis" },
          { key: "postgres", label: "PostgreSQL" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2" title={label}>
            <span
              className={`inline-block w-4 h-4 rounded-full border-2 ${
                serviceStatus[key] === null
                  ? "bg-gray-300 border-gray-400"
                  : serviceStatus[key]
                    ? "bg-green-500 border-green-700"
                    : "bg-red-500 border-red-700"
              }`}
            ></span>
            <span className="text-sm select-none">{label}</span>
          </div>
        ))}
      </div>
      {status && <div className="mt-2 text-lg">{status}</div>}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Logs del sistema</span>
          <button
            onClick={handleCopyLogs}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Copiar logs
          </button>
        </div>
        <textarea
          className="w-full h-40 p-2 border rounded bg-gray-100 text-xs font-mono resize-none"
          value={logs.join("\n")}
          readOnly
        />
      </div>
      <AudioTranscriptionPanel />
    </div>
  );
};

import AudioTranscriptionPanel from "./AudioTranscriptionPanel";
export default AdminDashboard;
