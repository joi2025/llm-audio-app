import { useEffect, useRef } from "react";

export const AudioRecorder = ({
  isRecording,
  isAssistantSpeaking,
  onStart,
  onStop,
  onTranscriptChange,
  onTranscriptFinal,
  onError,
}) => {
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      onError("El reconocimiento de voz no es compatible con este navegador");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");

      onTranscriptChange(currentTranscript);

      if (event.results[event.results.length - 1].isFinal) {
        const finalTranscript = currentTranscript.trim();
        if (finalTranscript) {
          onTranscriptFinal(finalTranscript);
        }
      }
    };

    recognition.onerror = (event) => {
      onError(`Error en reconocimiento: ${event.error}`);
      if (event.error === "not-allowed") {
        onError(
          "Por favor, permite el acceso al micrófono para usar el reconocimiento de voz.",
        );
      }
      onStop();
    };

    recognition.onend = () => {
      if (isRecording && !isAssistantSpeaking) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isAssistantSpeaking]);

  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.start();
    } else if (!isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  return null;
};

export default AudioRecorder;
