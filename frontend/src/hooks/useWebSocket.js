import { useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';

/**
 * Hook personalizado para gestionar la interacción con el backend vía Socket.IO.
 * Encapsula la lógica de conexión, envío de mensajes y recepción de eventos.
 */
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [response, setResponse] = useState(null); // Última respuesta completa del backend
  const [error, setError] = useState(null);

  useEffect(() => {
    // Conectar manualmente al montar el hook
    socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = (err) => {
      setError(err.message);
    };

    const onResponse = (data) => {
      if (data.done && data.full_response) {
        setResponse(data);
      }
    };

    // Registrar listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('response', onResponse);

    // Limpiar listeners al desmontar el componente
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('response', onResponse);
      socket.disconnect();
    };
  }, []);

  // Función para enviar mensajes al backend
  const sendMessage = useCallback((text) => {
    socket.emit('message', { text });
  }, []);

  return { isConnected, response, error, sendMessage };
};
