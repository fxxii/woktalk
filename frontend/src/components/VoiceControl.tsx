'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRecipeStore } from '@/store/recipeStore';
import { COMMAND_PATTERNS, MESSAGES } from '@/constants/i18n';

interface VoiceControlProps {
  onCommand?: (command: string) => void;
}

function matchCommand(transcript: string): string | null {
  const normalized = transcript.toLowerCase().trim();
  
  for (const [command, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        return command;
      }
    }
  }
  return null;
}

export default function VoiceControl({ onCommand }: VoiceControlProps) {
  const { isListening, setListening, nextStep, prevStep, language } = useRecipeStore();
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const t = MESSAGES[language];

  const speakFeedback = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hk' ? 'zh-HK' : 'en-US';
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  const handleCommand = useCallback((command: string) => {
    const feedbackText = MESSAGES[language][command as keyof typeof MESSAGES['en']];
    
    switch (command) {
      case 'next':
        nextStep();
        if (typeof feedbackText === 'string') speakFeedback(feedbackText);
        break;
      case 'prev':
        prevStep();
        if (typeof feedbackText === 'string') speakFeedback(feedbackText);
        break;
      case 'repeat':
        if (typeof feedbackText === 'string') speakFeedback(feedbackText);
        break;
      case 'timer':
        if (typeof feedbackText === 'string') speakFeedback(feedbackText);
        break;
      case 'stop':
        if (typeof feedbackText === 'string') speakFeedback(feedbackText);
        break;
    }
    onCommand?.(command);
  }, [nextStep, prevStep, onCommand, language, speakFeedback]);

  // Check browser support and init recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'hk' ? 'zh-HK' : 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        const command = matchCommand(text);
        if (command) {
          handleCommand(command);
        }
        setTimeout(() => {
          setTranscript('');
          setListening(false);
        }, 1000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [setListening, language, handleCommand]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.abort();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [isListening, setListening]);

  if (!isSupported) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-4 py-2 bg-wok-coal/90 border border-wok-steam/10 rounded-lg shadow-lg flex items-center gap-2">
           <span className="text-wok-steam/40">🚫</span>
           <p className="text-xs text-wok-steam/50">{t.voiceNotSupported}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {/* Transcript display */}
      {transcript && (
        <div className="mb-4 px-6 py-3 rounded-full bg-wok-coal/90 border border-wok-steam/20 backdrop-blur-sm">
          <p className="font-chinese text-wok-ginger">{transcript}</p>
        </div>
      )}

      {/* Voice button with tooltip */}
      <div className="relative group">
        <button
          onClick={toggleListening}
          className={`voice-button relative ${isListening ? 'listening' : ''}`}
          aria-label={isListening ? 'Stop listening' : 'Start voice command'}
        >
          {isListening ? (
            <>
              <span className="text-3xl">🎤</span>
              <span className="absolute inset-0 rounded-full border-2 border-wok-flame animate-ping opacity-50" />
            </>
          ) : (
            <span className="text-3xl">🗣️</span>
          )}
        </button>

        {/* Tooltip - shown on hover */}
        {!isListening && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-wok-coal/95 border border-wok-steam/20 rounded-xl px-4 py-3 backdrop-blur-sm shadow-xl min-w-[200px]">
              <p className="text-xs text-wok-steam/60 mb-2 font-semibold">{t.voiceCommands}</p>
              <ul className="text-sm text-wok-steam space-y-1">
                <li>• {language === 'hk' ? '下一步' : 'Next'} ({MESSAGES.en.next})</li>
                <li>• {language === 'hk' ? '上一步' : 'Previous'} ({MESSAGES.en.prev})</li>
                <li>• {language === 'hk' ? '重複' : 'Repeat'} ({MESSAGES.en.repeat})</li>
                <li>• {language === 'hk' ? '計時' : 'Timer'} ({MESSAGES.en.timer})</li>
                <li>• {language === 'hk' ? '停止' : 'Stop'} ({MESSAGES.en.stop})</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Hint text */}
      <p className="mt-3 text-xs text-wok-steam/40">
        {isListening ? t.listening : t.tapToTalk}
      </p>
    </div>
  );
}
