import { createContext, useContext, useCallback, useState, useRef, useEffect, useMemo } from 'react';

// Constants
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8001/ws/assistant';
const MAX_LOGS = 100;

// Context
const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// Custom hooks
const useAudioQueue = (onProcess) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queueRef = useRef([]);

  const processNext = useCallback(() => {
    if (isProcessing || queueRef.current.length === 0) return;
    
    setIsProcessing(true);
    const nextItem = queueRef.current.shift();
    
    const process = async () => {
      try {
        await onProcess(nextItem);
      } finally {
        setIsProcessing(false);
        processNext();
      }
    };

    process();
  }, [isProcessing, onProcess]);

  const addToQueue = useCallback((item) => {
    queueRef.current.push(item);
    processNext();
  }, [processNext]);

  return { addToQueue };
};

const useWebSocket = (url, callbacks) => {
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      callbacks?.onLog?.('WebSocket already connected', 'warn');
      return;
    }

    try {
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }

      setStatus('connecting');
      const socket = new WebSocket(url);
      socket.binaryType = 'blob';

      socket.onopen = () => {
        if (!isMounted.current) return;
        setStatus('connected');
        callbacks?.onConnect?.();
      };

      socket.onmessage = callbacks?.onMessage;
      socket.onerror = (error) => callbacks?.onError?.(error);
      socket.onclose = () => setStatus('disconnected');
      
      socketRef.current = socket;
    } catch (error) {
      callbacks?.onError?.(error);
    }
  }, [url, callbacks]);

  const send = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        socketRef.current.send(message);
        return true;
      } catch (error) {
        callbacks?.onError?.(error);
      }
    }
    return false;
  }, [callbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    send,
    isConnected: status === 'connected',
  };
};

export const AppProvider = ({ children }) => {
  const [conversation, setConversation] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const audioContextRef = useRef(null);

  const addLog = useCallback((message, type = 'info', error = null) => {
    const logEntry = { 
      id: Date.now(), 
      timestamp: new Date().toISOString(), 
      message, 
      type,
      ...(error && { error: error.message || String(error) })
    };
    
    console[type === 'error' ? 'error' : 'log'](`[${type.toUpperCase()}] ${message}`, error || '');
    setLogs(prev => [...prev, logEntry].slice(-MAX_LOGS));
  }, []);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        addLog('AudioContext initialized', 'info');
        return true;
      } catch (error) {
        addLog('Failed to initialize AudioContext', 'error', error);
        return false;
      }
    }
    return true;
  }, [addLog]);

  const processAudio = useCallback(async (audioBlob) => {
    if (!initAudioContext()) return;
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      return new Promise((resolve) => {
        source.onended = () => {
          setIsAssistantSpeaking(false);
          resolve();
        };
        
        source.start(0);
        setIsAssistantSpeaking(true);
      });
    } catch (error) {
      addLog('Error processing audio', 'error', error);
      setIsAssistantSpeaking(false);
    }
  }, [addLog, initAudioContext]);

  const { addToQueue: addAudioToQueue } = useAudioQueue(processAudio);

  const handleWebSocketMessage = useCallback((event) => {
    setTypingIndicator(false);
    
    if (event.data instanceof Blob) {
      addLog(`Audio received (${(event.data.size / 1024).toFixed(2)} KB)`, 'info');
      addAudioToQueue(event.data);
    } else {
      try {
        const data = JSON.parse(event.data);
        
        if (data.transcript && data.id) {
          setConversation(prev => 
            prev.map(msg => 
              msg.id === data.id 
                ? { ...msg, content: data.transcript } 
                : msg
            )
          );
        } else if (data.response) {
          setConversation(prev => [
            ...prev,
            { role: 'assistant', content: data.response, id: `msg-${Date.now()}` }
          ]);
        }
      } catch (error) {
        addLog('Error processing WebSocket message', 'error', error);
      }
    }
  }, [addAudioToQueue, addLog]);

  const {
    status: connectionStatus,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    send: sendWebSocketMessage,
    isConnected
  } = useWebSocket(WS_URL, {
    onLog: addLog,
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      addLog('WebSocket connected successfully', 'success');
      setTypingIndicator(false);
    },
    onError: (error) => {
      addLog('WebSocket error occurred', 'error', error);
      setTypingIndicator(false);
    }
  });

  const toggleConnection = useCallback(() => {
    if (isConnected) {
      disconnectWebSocket();
    } else {
      connectWebSocket();
    }
  }, [isConnected, connectWebSocket, disconnectWebSocket]);

  const handleSendAudio = useCallback((audioBlob) => {
    if (!isConnected) {
      addLog('Cannot send audio: WebSocket not connected', 'error');
      return false;
    }

    const messageId = `msg-${Date.now()}`;
    const message = {
      id: messageId,
      role: 'user',
      content: '[Processing audio...]',
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, message]);
    
    try {
      // Create a FormData object to send both metadata and audio
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({ id: messageId }));
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send the audio data
      sendWebSocketMessage(formData);
      setTypingIndicator(true);
      return true;
    } catch (error) {
      addLog('Failed to send audio', 'error', error);
      return false;
    }
  }, [isConnected, sendWebSocketMessage, addLog]);

  const value = useMemo(() => ({
    connectionStatus,
    conversation,
    logs,
    isAssistantSpeaking,
    typingIndicator,
    addLog,
    toggleConnection,
    handleSendAudio,
    clearLogs: () => setLogs([]),
    isConnected,
    sendMessage: sendWebSocketMessage
  }), [
    connectionStatus,
    conversation,
    logs,
    isAssistantSpeaking,
    typingIndicator,
    addLog,
    toggleConnection,
    handleSendAudio,
    isConnected,
    sendWebSocketMessage
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
