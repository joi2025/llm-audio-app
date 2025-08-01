import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

// Importar componentes de UI
import Conversation from '../components/Conversation';
import Logs from '../components/Logs';
import AudioRecorder from '../components/AudioRecorder';

/**
 * Página principal de la aplicación de chat de voz.
 * Orquesta los hooks de WebSocket y audio, y gestiona el estado de la conversación.
 */
const VoiceAppPage = () => {
  // Estado local de la página
  const [conversation, setConversation] = useState([]);
  const [logs, setLogs] = useState([]);

  // Hooks personalizados
  const { isConnected, response, error, sendMessage } = useWebSocket();
  const { audioRef, isPlaying, playAudio } = useAudioPlayer();

  // Función para añadir logs
  const addLog = (message, type = 'info') => {
    setLogs((prev) => [
      { message, type, timestamp: new Date().toLocaleTimeString() },
      ...prev,
    ].slice(0, 200));
  };

  // Efecto para manejar la conexión y errores del WebSocket
  useEffect(() => {
    if (isConnected) {
      addLog('Conectado al backend', 'success');
    } else {
      addLog('Desconectado del backend', 'warning');
    }
    if (error) {
      addLog(`Error de conexión: ${error}`, 'error');
    }
  }, [isConnected, error]);

  // Efecto para manejar las respuestas del backend
  useEffect(() => {
    if (response) {
      const { full_response, audio_path } = response;
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: full_response },
      ]);
      addLog('Respuesta recibida, reproduciendo audio.');

      if (audio_path) {
        const audioUrl = `${import.meta.env.VITE_SOCKET_URL}/audio/${audio_path}`;
        playAudio(audioUrl);
      }
    }
  }, [response]); // Se ejecuta solo cuando llega una nueva respuesta completa

  // Callback para cuando el usuario termina de hablar
  const handleTranscriptFinal = (finalTxt) => {
    setConversation((prev) => [...prev, { role: 'user', content: finalTxt }]);
    sendMessage(finalTxt);
    addLog(`Enviando: "${finalTxt}"`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-full">
      <div className="md:col-span-2 flex flex-col bg-white rounded-lg shadow-md">
        <Conversation conversation={conversation} />
        <AudioRecorder
          isAssistantSpeaking={isPlaying}
          onTranscriptFinal={handleTranscriptFinal}
        />
      </div>
      <div className="md:col-span-1 bg-gray-800 text-white rounded-lg shadow-md">
        <Logs logs={logs} />
      </div>
      {/* Elemento de audio invisible para la reproducción */}
      <audio ref={audioRef} />
    </div>
  );
};

export default VoiceAppPage;
