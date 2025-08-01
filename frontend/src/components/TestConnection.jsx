import React from 'react';
import { useAppContext } from '../context/AppContext';

const TestConnection = () => {
  const { 
    connectionStatus, 
    testWebSocketConnection,
    testAudioPlayback,
    testSTTService,
    testTTSService
  } = useAppContext();

  const runAllTests = async () => {
    try {
      await testWebSocketConnection();
      await testSTTService();
      await testTTSService();
      await testAudioPlayback();
    } catch (error) {
      console.error('Error during tests:', error);
    }
  };

  return (
    <div className="test-connection-container">
      <h3>Pruebas de Conexión</h3>
      <div className="test-buttons">
        <button 
          onClick={testWebSocketConnection}
          className={`test-button ${connectionStatus === 'connected' ? 'success' : 'error'}`}
        >
          Probar WebSocket
        </button>
        <button 
          onClick={testSTTService}
          className="test-button"
        >
          Probar STT
        </button>
        <button 
          onClick={testTTSService}
          className="test-button"
        >
          Probar TTS
        </button>
        <button 
          onClick={testAudioPlayback}
          className="test-button"
        >
          Probar Audio
        </button>
        <button 
          onClick={runAllTests}
          className="test-button primary"
        >
          Ejecutar Todas las Pruebas
        </button>
      </div>
      <style jsx>{`
        .test-connection-container {
          padding: 1rem;
          margin: 1rem 0;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background-color: #f8fafc;
        }
        .test-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .test-button {
          padding: 0.5rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .test-button:hover {
          background-color: #f1f5f9;
        }
        .test-button.primary {
          background-color: #3b82f6;
          color: white;
          border-color: #2563eb;
        }
        .test-button.primary:hover {
          background-color: #2563eb;
        }
        .test-button.success {
          background-color: #10b981;
          color: white;
          border-color: #059669;
        }
        .test-button.error {
          background-color: #ef4444;
          color: white;
          border-color: #dc2626;
        }
      `}</style>
    </div>
  );
};

export default TestConnection;
