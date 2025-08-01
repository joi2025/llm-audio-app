import { useState, useEffect } from "react";

export const useAiSettings = () => {
  const [aiName, setAiName] = useState(
    localStorage.getItem("aiName") || "Amigo",
  );
  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "Usuario",
  );
  const [responseStyle, setResponseStyle] = useState(
    localStorage.getItem("responseStyle") || "casual",
  );
  const [attitude, setAttitude] = useState(
    localStorage.getItem("attitude") || "amigable",
  );
  const [maxTokens, setMaxTokens] = useState(
    localStorage.getItem("maxTokens") || "150",
  );
  const [temperature, setTemperature] = useState(
    localStorage.getItem("temperature") || "0.7",
  );
  const [systemPrompt, setSystemPrompt] = useState(
    localStorage.getItem("systemPrompt") ||
      "Eres un amigo cercano y conversas de manera natural y casual. Habla como si estuviéramos charlando relajados, sin formalidades.",
  );

  const settings = {
    aiName,
    userName,
    responseStyle,
    attitude,
    maxTokens,
    temperature,
    systemPrompt,
  };

  const setters = {
    setAiName,
    setUserName,
    setResponseStyle,
    setAttitude,
    setMaxTokens,
    setTemperature,
    setSystemPrompt,
  };

  const handleSave = () => {
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  };

  return { ...settings, ...setters, handleSave };
};
