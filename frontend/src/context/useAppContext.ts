import { createContext, useContext, useCallback, useState, useRef, useEffect, useMemo, ReactNode } from 'react';

// Types
type LogType = 'info' | 'error' | 'success' | 'warn';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: LogType;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface AppContextType {
  connectionStatus: ConnectionStatus;
  conversation: Message[];
  logs: LogEntry[];
  isAssistantSpeaking: boolean;
  typingIndicator: boolean;
  addLog: (message: string, type?: LogType, error?: unknown) => void;
  toggleConnection: () => void;
  handleSendAudio: (audioBlob: Blob) => boolean;
  clearLogs: () => void;
  isConnected: boolean;
  sendMessage: (data: unknown) => boolean;
}

// Constants
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8001/ws/assistant';
const MAX_LOGS = 100;

// Context
const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// Custom hooks
const useAudioQueue = (onProcess: (item: Blob) => Promise<void>) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queueRef = useRef<Blob[]>([]);

  const processNext = useCallback(async () => {
    if (isProcessing || queueRef.current.length === 0) return;
    
    setIsProcessing(true);
    const nextItem = queueRef.current.shift();
    if (!nextItem) {
      setIsProcessing(false);
      return;
    }

    try {
      await onProcess(nextItem);
    } finally {
      setIsProcessing(false);
      processNext();
    }
  }, [isProcessing, onProcess]);

  const addToQueue = useCallback((item: Blob) => {
    queueRef.current.push(item);
    processNext();
  }, [processNext]);

  return { addToQueue };
};

const useWebSocket = (url: string, callbacks: {
  onLog?: (message: string, type?: LogType, error?: unknown) => void;
  onMessage?: (event: MessageEvent) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      callbacks.onLog?.('WebSocket already connected', 'warn');
      return;
    }

    try {
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }

      setStatus('connecting');
      const socket = new WebSocket(url);
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        if (!isMounted.current) return;
        setStatus('connected');
        callbacks.onLog?.('WebSocket connected', 'success');
        callbacks.onConnect?.();
      };

      socket.onmessage = (event) => callbacks.onMessage?.(event);
      socket.onerror = (error) => callbacks.onError?.(error);
      socket.onclose = () => setStatus('disconnected');

      socketRef.current = socket;
    } catch (error) {
      callbacks.onLog?.('WebSocket connection failed', 'error', error);
      setStatus('error');
    }
  }, [url, callbacks]);

  const send = useCallback((data: unknown): boolean => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        socketRef.current.send(message);
        return true;
      } catch (error) {
        callbacks.onLog?.('Failed to send message', 'error', error);
      }
    }
    return false;
  }, [callbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onclose = null;
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

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const addLog = useCallback((message: string, type: LogType = 'info', error?: unknown) => {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { id: Date.now(), timestamp, message, type };
    
    if (error) {
      console.error(`[${type.toUpperCase()}] ${message}`, error);
      logEntry.error = error instanceof Error ? error.message : String(error);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    setLogs(prevLogs => [...prevLogs, logEntry].slice(-MAX_LOGS));
  }, []);

  const initAudioContext = useCallback((): boolean => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        addLog('AudioContext initialized', 'info');
        return true;
      } catch (error) {
        addLog('Failed to initialize AudioContext', 'error', error);
        return false;
      }
    }
    return true;
  }, [addLog]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!initAudioContext() || !audioContextRef.current) return;
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      return new Promise<void>((resolve) => {
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

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
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
        addLog('Error processing message', 'error', error);
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
      addLog('Connected to WebSocket', 'success');
      setTypingIndicator(false);
    },
    onError: (error) => {
      addLog('WebSocket error', 'error', error);
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

  const handleSendAudio = useCallback((audioBlob: Blob): boolean => {
    if (!isConnected) {
      addLog('Not connected to WebSocket', 'error');
      return false;
    }

    const messageId = `msg-${Date.now()}`;
    const message = {
      id: messageId,
      role: 'user' as const,
      content: '[Processing audio...]',
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, message]);
    
    try {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({ id: messageId }));
      formData.append('audio', audioBlob, 'recording.webm');
      
      sendWebSocketMessage(formData);
      setTypingIndicator(true);
      return true;
    } catch (error) {
      addLog('Failed to send audio', 'error', error);
      return false;
    }
  }, [isConnected, sendWebSocketMessage, addLog]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const value = useMemo(() => ({
    connectionStatus,
    conversation,
    logs,
    isAssistantSpeaking,
    typingIndicator,
    addLog,
    toggleConnection,
    handleSendAudio,
    clearLogs,
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
    clearLogs,
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
