import { useState, useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './context/useAppContext';

// Main App Component
const App = () => {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ChatInterface />
            </div>
            <div className="md:col-span-1">
              <ConnectionPanel />
              <LogsPanel />
            </div>
          </div>
        </main>
      </div>
    </AppProvider>
  );
};

// Header Component
const Header = () => {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <h1 className="text-2xl font-bold">Voice Assistant</h1>
    </header>
  );
};

// Chat Interface Component
const ChatInterface = () => {
  const { conversation, isAssistantSpeaking, typingIndicator } = useAppContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-[70vh] overflow-y-auto">
      <div className="space-y-4">
        {conversation.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3/4 p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {typingIndicator && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <AudioRecorder isSpeaking={isAssistantSpeaking} />
    </div>
  );
};

// Audio Recorder Component
const AudioRecorder = ({ isSpeaking }: { isSpeaking: boolean }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { handleSendAudio, addLog } = useAppContext();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        handleSendAudio(audioBlob);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setHasPermission(true);
    } catch (error) {
      addLog('Error accessing microphone', 'error', error);
      setHasPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="mt-4 flex justify-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isSpeaking || !hasPermission}
        className={`flex items-center justify-center w-16 h-16 rounded-full ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <span className="w-6 h-6 bg-white rounded-sm"></span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

// Connection Panel Component
const ConnectionPanel = () => {
  const { connectionStatus, toggleConnection, isConnected } = useAppContext();
  
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-lg font-semibold mb-3">Connection</h2>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`}></span>
          <span className="text-sm font-medium">
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
        </div>
        <button
          onClick={toggleConnection}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isConnected
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </div>
  );
};

// Logs Panel Component
const LogsPanel = () => {
  const { logs, clearLogs } = useAppContext();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'success':
        return 'text-green-600';
      case 'warn':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Logs</h2>
        <button
          onClick={clearLogs}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear Logs
        </button>
      </div>
      <div className="h-64 overflow-y-auto font-mono text-sm bg-gray-50 p-2 rounded">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No logs available</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="border-b border-gray-100 py-1">
                <span className="text-gray-400 text-xs">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>{' '}
                <span className={getLogColor(log.type)}>
                  [{log.type.toUpperCase()}]
                </span>{' '}
                {log.message}
                {log.error && (
                  <div className="text-red-400 text-xs mt-1">{log.error}</div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
