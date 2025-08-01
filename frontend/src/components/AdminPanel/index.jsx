import { useState, useEffect, useCallback } from "react";
import {
  FaServer,
  FaPlug,
  FaMicrophone,
  FaTerminal,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import "./AdminPanel.css";

const AdminPanel = () => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState({
    backend: "checking",
    websocket: "disconnected",
    microphone: "checking",
    audioContext: null,
  });
  const [copied, setCopied] = useState(false);

  // Agregar un nuevo log
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toISOString();
    setLogs((prev) => [{ message, type, timestamp }, ...prev].slice(0, 100));
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // Verificar estado del backend con control de estado
  const checkBackendStatus = useCallback(async () => {
    if (isChecking.backend) return;

    setIsChecking((prev) => ({ ...prev, backend: true }));
    addLog("Verificando conexión con el backend...", "info");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("http://localhost:8000/health", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setStatus((prev) => ({ ...prev, backend: "online" }));
        addLog(
          `Backend conectado correctamente: ${JSON.stringify(data)}`,
          "success",
        );
        return true;
      } else {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage =
        error.name === "AbortError"
          ? "Tiempo de espera agotado al conectar con el backend"
          : `Error al conectar con el backend: ${error.message}`;

      setStatus((prev) => ({ ...prev, backend: "error" }));
      addLog(errorMessage, "error");
      return false;
    } finally {
      setIsChecking((prev) => ({ ...prev, backend: false }));
    }
  }, [isChecking.backend]);

  // Verificar estado del micrófono con control de estado
  const checkMicrophone = useCallback(async () => {
    if (isChecking.microphone) return;

    setIsChecking((prev) => ({ ...prev, microphone: true }));
    addLog("Verificando permisos del micrófono...", "info");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStatus((prev) => ({
        ...prev,
        microphone: "available",
        audioContext:
          prev.audioContext ||
          new (window.AudioContext || window.webkitAudioContext)(),
      }));

      addLog("Micrófono disponible", "success");

      // Liberar recursos después de un breve retraso
      setTimeout(() => {
        stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      }, 100);
    } catch (error) {
      setStatus((prev) => ({ ...prev, microphone: "unavailable" }));
      addLog(`No se pudo acceder al micrófono: ${error.message}`, "error");
    } finally {
      setIsChecking((prev) => ({ ...prev, microphone: false }));
    }
  }, [isChecking.microphone]);

  // Inicializar WebSocket con reconexión
  const MAX_RETRIES = 5;
  const BASE_DELAY = 1000;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connectWebSocket = () => {
    if (reconnectAttempts >= MAX_RETRIES) {
      addLog("Max intentos de reconexión alcanzado", "error");
      return;
    }

    const ws = new WebSocket(
      import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8000/ws",
    );

    ws.onopen = () => {
      setReconnectAttempts(0);
      setStatus((prev) => ({ ...prev, websocket: "connected" }));
      addLog("Conexión establecida", "success");
    };

    ws.onerror = (error) => {
      const delay = BASE_DELAY * Math.pow(2, reconnectAttempts);
      setStatus((prev) => ({ ...prev, websocket: "error" }));
      addLog(
        `Error: ${error.message}. Reintentando en ${delay / 1000}s...`,
        "warning",
      );
      setTimeout(connectWebSocket, delay);
      setReconnectAttempts((prev) => prev + 1);
    };

    ws.onclose = () => {
      setStatus((prev) => ({ ...prev, websocket: "disconnected" }));
      addLog("Conexión cerrada", "warning");
    };
  };

  useEffect(() => {
    connectWebSocket();
  }, []);

  // Estado para evitar múltiples verificaciones simultáneas
  const [isChecking, setIsChecking] = useState({
    microphone: false,
    backend: false,
    audio: false,
  });

  // Ejecutar verificaciones iniciales
  useEffect(() => {
    checkBackendStatus();
    checkMicrophone();
  }, [checkBackendStatus, checkMicrophone]);

  // Función para probar el audio
  const testAudio = useCallback(async () => {
    if (isChecking.audio) return;

    setIsChecking((prev) => ({ ...prev, audio: true }));
    addLog("Iniciando prueba de audio...", "info");

    try {
      const audio = new Audio(
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      );
      audio.volume = 0.5;

      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
        audio.load();

        // Timeout para la carga
        setTimeout(
          () => reject(new Error("Tiempo de carga del audio excedido")),
          5000,
        );
      });

      await audio.play();
      addLog("Prueba de audio completada con éxito", "success");

      // Detener después de 3 segundos
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 3000);
    } catch (error) {
      addLog(`Error en la prueba de audio: ${error.message}`, "error");
    } finally {
      setIsChecking((prev) => ({ ...prev, audio: false }));
    }
  }, [isChecking.audio]);

  // Copiar logs al portapapeles
  const copyLogs = () => {
    const logText = logs
      .map((log) => `[${log.timestamp}] ${log.message}`)
      .join("\n");
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Estado de los componentes
  const statusIcons = {
    online: "🟢",
    checking: "🟡",
    error: "🔴",
    disconnected: "⚫",
    available: "🎤",
    unavailable: "🔇",
    connected: "🔌",
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Panel de Control - Voice Advance</h2>
        <div className="header-actions">
          <button
            onClick={() => {
              checkBackendStatus();
              checkMicrophone();
            }}
            className="btn btn-primary"
            disabled={isChecking.backend || isChecking.microphone}
          >
            {isChecking.backend || isChecking.microphone
              ? "Verificando..."
              : "Verificar Todo"}
          </button>
        </div>
      </div>

      <div className="status-grid">
        <StatusCard
          icon={<FaServer />}
          title="Backend"
          status={status.backend}
          onRetry={checkBackendStatus}
          isChecking={isChecking.backend}
        />
        <StatusCard
          icon={<FaPlug />}
          title="WebSocket"
          status={status.websocket}
          isChecking={false}
        />
        <StatusCard
          icon={<FaMicrophone />}
          title="Micrófono"
          status={status.microphone}
          onRetry={checkMicrophone}
          isChecking={isChecking.microphone}
        />
        <StatusCard
          icon={<FaTerminal />}
          title="Audio"
          status={status.audioContext ? "available" : "unavailable"}
          onTest={testAudio}
          isTesting={isChecking.audio}
        />
      </div>

      <div className="log-section">
        <div className="log-header">
          <h3>Registro de Eventos</h3>
          <button
            onClick={copyLogs}
            className="copy-button"
            title="Copiar logs"
          >
            {copied ? <FaCheck /> : <FaCopy />}
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
        <div className="log-container">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.type}`}>
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tools-section">
        <h3>Herramientas de Diagnóstico</h3>
        <div className="tool-buttons">
          <button
            onClick={() => {
              addLog("Ejecutando prueba de audio...", "info");
              const audio = new Audio(
                "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
              );
              audio.play().catch((e) => {
                addLog(`Error al reproducir audio: ${e.message}`, "error");
              });
            }}
          >
            Probar Audio
          </button>
          <button
            onClick={async () => {
              addLog("Probando conexión con el backend...", "info");
              await checkBackendStatus();
            }}
          >
            Probar Backend
          </button>
          <button
            onClick={async () => {
              addLog("Verificando permisos del micrófono...", "info");
              await checkMicrophone();
            }}
          >
            Probar Micrófono
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({
  icon,
  title,
  status,
  onRetry,
  onTest,
  isChecking = false,
  isTesting = false,
}) => {
  const statusText = {
    online: "En Línea",
    checking: "Verificando...",
    error: "Error",
    disconnected: "Desconectado",
    available: "Disponible",
    unavailable: "No Disponible",
    connected: "Conectado",
  };

  const getStatusIndicator = () => {
    if (isChecking || isTesting) return "🟡";
    if (status === "online" || status === "available" || status === "connected")
      return "🟢";
    if (status === "error" || status === "unavailable") return "🔴";
    return "⚪";
  };

  const getStatusClass = () => {
    if (isChecking || isTesting) return "checking";
    if (status === "online" || status === "available" || status === "connected")
      return "online";
    if (status === "error" || status === "unavailable") return "error";
    return "";
  };

  return (
    <div className={`status-card ${getStatusClass()}`}>
      <div className="status-icon">
        {icon}
        <span className="status-indicator">{getStatusIndicator()}</span>
      </div>
      <h4>{title}</h4>
      <p>
        {isChecking
          ? "Verificando..."
          : isTesting
            ? "Probando..."
            : statusText[status] || status}
      </p>

      <div className="card-actions">
        {onRetry &&
          (status === "error" ||
            status === "unavailable" ||
            status === "disconnected") && (
            <button
              onClick={onRetry}
              className="action-button retry"
              disabled={isChecking}
            >
              {isChecking ? "Verificando..." : "Reintentar"}
            </button>
          )}

        {onTest && (
          <button
            onClick={onTest}
            className="action-button test"
            disabled={isTesting}
          >
            {isTesting ? "Probando..." : "Probar"}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
