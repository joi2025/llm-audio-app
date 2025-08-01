import React, { useRef, useState } from "react";
import api from "../api/client";

const AudioTranscriptionPanel = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Iniciando grabación...`,
    ]);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new window.MediaRecorder(stream);
    audioChunks.current = [];
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.current.push(event.data);
      }
    };
    mediaRecorderRef.current.onstop = handleStop;
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Parando grabación...`,
    ]);
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleStop = () => {
    const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Grabación finalizada.`,
    ]);
  };

  const uploadAudio = async () => {
    if (!audioUrl) return;
    setUploading(true);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Subiendo audio...`,
    ]);
    const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    try {
      const res = await api.post("/api/v1/recordings/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Audio subido: ${res.data.filename}`,
      ]);
      fetchTranscript(res.data.id);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error al subir audio.`,
      ]);
    }
    setUploading(false);
  };

  const fetchTranscript = async (recordingId) => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Buscando transcripción...`,
    ]);
    try {
      const res = await api.get("/api/v1/transcripts/");
      const found = res.data.find((t) => t.recording_id === recordingId);
      if (found) {
        setTranscript(found.text);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Transcripción encontrada.`,
        ]);
      } else {
        setTranscript("No se encontró transcripción.");
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] No se encontró transcripción.`,
        ]);
      }
    } catch (err) {
      setTranscript("Error al obtener transcripción.");
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Error al obtener transcripción.`,
      ]);
    }
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow mt-8">
      <h2 className="text-xl font-bold mb-4">Grabación y Transcripción</h2>
      <div className="flex items-center gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded font-bold text-white ${recording ? "bg-red-600" : "bg-green-600"} shadow`}
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
        >
          {recording ? "Detener" : "Grabar"}
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow font-bold"
          onClick={uploadAudio}
          disabled={!audioUrl || uploading}
        >
          Subir y Transcribir
        </button>
      </div>
      {audioUrl && <audio controls src={audioUrl} className="w-full mb-4" />}
      <div className="mb-4">
        <label className="font-semibold">Transcripción:</label>
        <div className="bg-gray-100 rounded p-2 min-h-[40px] mt-1">
          {transcript || (
            <span className="text-gray-400">(Sin transcripción aún)</span>
          )}
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Logs del flujo</span>
        <button
          onClick={handleCopyLogs}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Copiar logs
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-gray-100 text-xs font-mono resize-none"
        value={logs.join("\n")}
        readOnly
      />
    </div>
  );
};

export default AudioTranscriptionPanel;
