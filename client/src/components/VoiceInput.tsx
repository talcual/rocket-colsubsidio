import { useState, useRef, useCallback } from 'react';

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

// Extend Window to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }

  interface SpeechRecognitionInstance extends EventTarget {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErr) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionResultEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErr {
    error: string;
  }
}

export default function VoiceInput({ onResult, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Su navegador no soporta reconocimiento de voz');
      return;
    }
    setError('');
    setTranscript('');

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = 'es-CO';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).trim().toUpperCase();
      setTranscript(text);

      if (finalTranscript) {
        // Clean up the text - remove spaces and special chars for product codes
        const cleanCode = finalTranscript.trim().replace(/\s+/g, '').toUpperCase();
        onResult(cleanCode);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErr) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Permiso de micrófono denegado. Por favor habilítelo en el navegador.');
      } else if (event.error === 'no-speech') {
        setError('No se detectó voz. Intente de nuevo.');
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isSupported, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  if (!isSupported) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
        <p className="text-gray-500 text-sm">
          🎙️ Su navegador no soporta reconocimiento de voz.<br />
          Use Chrome en Android para esta función.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          )}
          <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
            {isListening ? (
              // Stop icon
              <rect x="6" y="6" width="12" height="12" />
            ) : (
              // Microphone icon
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm-1 3a1 1 0 012 0v8a1 1 0 01-2 0V4zm6 8a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 6v2H9v2h6v-2h-3v-2h.07A7.01 7.01 0 0019 12h-2a5 5 0 01-10 0H5a7.01 7.01 0 006.93 6H12z" />
            )}
          </svg>
        </button>

        <p className="text-sm text-gray-600 text-center">
          {isListening
            ? '🔴 Escuchando... Diga el código del producto'
            : 'Toque para hablar el código del producto'}
        </p>
      </div>

      {transcript && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-600 font-medium mb-1">Reconocido:</p>
          <p className="text-blue-800 font-mono font-semibold text-lg">{transcript}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        💡 Diga claramente el código: "ARROZ CERO CERO UNO" o "POLLO CERO CERO UNO"
      </p>
    </div>
  );
}
