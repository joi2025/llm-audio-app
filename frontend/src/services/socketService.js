import { io } from "socket.io-client";

// Leer la URL del backend desde las variables de entorno de Vite
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8001";

// Crear una única instancia del socket para ser compartida en toda la aplicación
const socket = io(SOCKET_URL, {
  autoConnect: false, // Conectar manualmente para mayor control
});

// Opcional: añadir logs de desarrollo para ver el estado del socket
socket.onAny((event, ...args) => {
  console.log(`Socket event: ${event}`, args);
});

export default socket;
