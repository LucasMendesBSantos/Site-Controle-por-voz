import { useState, useRef, useCallback } from 'react';
import { playMicStart, playMicStop } from '../utils/sounds';

const ERROR_MESSAGES = {
  'not-allowed': 'Permissão de microfone negada. Permita o acesso ao microfone nas configurações do navegador.',
  'no-speech': 'Nenhuma fala detectada. Tente novamente.',
  'network': 'Erro de rede. Verifique sua conexão com a internet.',
  'audio-capture': 'Microfone não encontrado. Verifique se está conectado.',
};

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef(null);
  const cbRef = useRef(null);

  const startListening = useCallback((onResult, onError) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      onError?.('Seu navegador não suporta reconhecimento de voz. Use o Google Chrome.');
      return;
    }

    cbRef.current = { onResult, onError };

    try { recRef.current?.stop(); } catch {}

    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      playMicStart();
    };

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setIsListening(false);
      cbRef.current?.onResult?.(text);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      playMicStop();
      const msg = ERROR_MESSAGES[e.error] || `Erro de reconhecimento: ${e.error}`;
      cbRef.current?.onError?.(msg);
    };

    recognition.onend = () => {
      setIsListening(false);
      playMicStop();
    };

    recRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      onError?.('Não foi possível iniciar o microfone. Tente novamente.');
    }
  }, []);

  return { isListening, startListening };
}
