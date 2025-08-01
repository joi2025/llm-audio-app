import { useState, useRef, useCallback } from 'react';

/**
 * Hook para gestionar la reproducción de audio.
 * @returns {{ audioRef: React.RefObject<HTMLAudioElement>, isPlaying: boolean, playAudio: (url: string) => void }}
 */
export const useAudioPlayer = () => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = useCallback((url) => {
    if (!audioRef.current) return;

    const player = audioRef.current;
    player.pause();
    player.src = url;

    player.onplay = () => setIsPlaying(true);
    player.onended = () => setIsPlaying(false);
    player.onerror = () => setIsPlaying(false); // También detener en caso de error

    player.play().catch((e) => {
      console.error("Error al reproducir audio:", e);
      setIsPlaying(false);
    });
  }, []);

  return { audioRef, isPlaying, playAudio };
};
