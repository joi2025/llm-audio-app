import React, { useState, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import "./AudioRecorder.css";
import { FiSquare, FiMic } from "react-icons/fi";

const AudioRecorder = ({
  isRecording,
  setIsRecording,
  disabled,
  microphoneStatus,
}) => {
  const { handleSendAudio } = useAppContext();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);

  const startRecording = async () => {
    if (microphoneStatus !== "granted") {
      alert(
        "No se puede grabar audio. Por favor, concede permisos al micrófono.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        handleSendAudio(audioBlob);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      const intervalId = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      return intervalId;
    } catch (error) {
      console.error("Error al iniciar la grabación:", error);
      alert(
        "Error al iniciar la grabación. Por favor, revisa la consola para más detalles.",
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div
      className="audio-recorder"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={handleToggleRecording}
        disabled={disabled}
        className={`record-button ${isRecording ? "recording" : ""}`}
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: isRecording
            ? "#ff5252"
            : disabled
              ? "#ccc"
              : "#4caf50",
          color: "white",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "5px",
          fontSize: "1.2rem",
        }}
      >
        {isRecording ? <FiSquare /> : <FiMic />}
      </button>
      <span
        style={{ fontSize: "0.8rem", color: isRecording ? "#ff5252" : "#333" }}
      >
        {isRecording ? `Grabando... (${recordingTime}s)` : "Toca para hablar"}
      </span>
      {microphoneStatus !== "granted" && (
        <p style={{ color: "red", marginTop: "5px", fontSize: "0.8rem" }}>
          {microphoneStatus === "denied"
            ? "Permiso de micrófono denegado. Habilítalo en la configuración."
            : microphoneStatus === "unavailable"
              ? "Micrófono no disponible."
              : "Esperando permiso del micrófono..."}
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;
