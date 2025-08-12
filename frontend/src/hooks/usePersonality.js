import { useState, useEffect } from 'react'
import { PERSONALITIES } from '../data/personalities'

export default function usePersonality() {
  const [currentPersonality, setCurrentPersonality] = useState(null)
  const [settings, setSettings] = useState({})

  // Load personality from localStorage on mount
  useEffect(() => {
    const savedPersonality = localStorage.getItem('voice_personality')
    const savedSettings = localStorage.getItem('voice_settings')
    
    if (savedPersonality && PERSONALITIES[savedPersonality]) {
      setCurrentPersonality(savedPersonality)
    }
    
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.warn('Failed to parse saved settings:', e)
      }
    }
  }, [])

  // Apply personality and save to localStorage
  const applyPersonality = (personalityKey) => {
    if (!PERSONALITIES[personalityKey]) {
      console.warn('Unknown personality:', personalityKey)
      return false
    }

    const personality = PERSONALITIES[personalityKey]
    
    // Update current personality
    setCurrentPersonality(personalityKey)
    
    // Update settings with personality data
    const newSettings = {
      ...settings,
      personality: personalityKey,
      voice_name: personality.voice,
      system_prompt: personality.systemPrompt,
      personality_name: personality.name,
      personality_emoji: personality.emoji,
      personality_color: personality.color
    }
    
    setSettings(newSettings)
    
    // Save to localStorage
    localStorage.setItem('voice_personality', personalityKey)
    localStorage.setItem('voice_settings', JSON.stringify(newSettings))
    
    console.log(`🎭 Applied personality: ${personality.emoji} ${personality.name}`)
    return true
  }

  // Get current personality data
  const getPersonalityData = () => {
    if (!currentPersonality || !PERSONALITIES[currentPersonality]) {
      return null
    }
    
    return {
      key: currentPersonality,
      ...PERSONALITIES[currentPersonality],
      settings
    }
  }

  // Update individual setting
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('voice_settings', JSON.stringify(newSettings))
  }

  // Get greeting message based on personality
  const getGreeting = () => {
    const personality = getPersonalityData()
    if (!personality) return "¡Hola! ¿En qué puedo ayudarte?"
    
    const greetings = {
      comedian: "¡Hola! Espero que estés listo para reírte un poco mientras resolvemos tus dudas 😄",
      meme_lord: "¡Ey! ¿Qué tal? Listo para una conversación épica 🤪",
      sarcastic: "Oh, mira quién decidió hablar conmigo... ¿En qué puedo 'ayudarte'? 🙄",
      professor: "Buenos días. Soy tu asistente académico. ¿Qué tema te gustaría explorar hoy? 🎓",
      consultant: "Excelente. Estoy aquí para optimizar tu productividad. ¿Cuál es tu objetivo? 💼",
      scientist: "Saludos. Preparado para analizar datos y resolver problemas sistemáticamente 🔬",
      romantic: "Hola, querido... ¿En qué puedo ayudarte hoy de la manera más encantadora? 💕",
      mysterious: "Hmm... has venido buscando respuestas. Interesante... 🌙",
      confident: "Por supuesto que elegiste bien al hablar conmigo. ¿Qué necesitas? 😏",
      philosopher: "Ah, otro buscador de sabiduría. ¿Qué verdades exploraremos hoy? 🤔",
      analyst: "Datos cargados. Sistema listo. Procedo a analizar tu consulta 📊",
      mentor: "Bienvenido, joven aprendiz. ¿Qué sabiduría buscas hoy? 🧙‍♂️",
      artist: "¡Qué hermoso día para crear y explorar ideas! ¿Qué inspiración buscas? 🎨",
      storyteller: "Érase una vez... un usuario que tenía una pregunta fascinante... 📚"
    }
    
    return greetings[personality.key] || `¡Hola! Soy tu asistente ${personality.name} ${personality.emoji}`
  }

  return {
    currentPersonality,
    personalityData: getPersonalityData(),
    settings,
    applyPersonality,
    updateSetting,
    getGreeting,
    isPersonalityActive: !!currentPersonality
  }
}
