'use client';

import { useState, useEffect } from 'react';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const handleVoicesChanged = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    // The 'voiceschanged' event is fired when the list of voices is ready.
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    // In some browsers, getVoices() is populated immediately.
    handleVoicesChanged(); 

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  useEffect(() => {
    if (voices.length > 0) {
      // Try to find a preferred Indian English voice.
      let preferredVoice = voices.find(voice => voice.lang === 'en-IN' && voice.name.includes('Google'));
      // Fallback to any Indian English voice.
      if (!preferredVoice) {
        preferredVoice = voices.find(voice => voice.lang === 'en-IN');
      }
      // Fallback to a standard US or GB English voice if no Indian voice is found.
      if (!preferredVoice) {
        preferredVoice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google'));
      }
      if (!preferredVoice) {
        preferredVoice = voices.find(voice => voice.lang === 'en-GB' && voice.name.includes('Google'));
      }
      if (!preferredVoice) {
        preferredVoice = voices.find(voice => voice.default);
      }
      setSelectedVoice(preferredVoice || voices[0]);
    }
  }, [voices]);


  const speak = (text: string) => {
    if (!window.speechSynthesis || !text) {
      return;
    }
    
    // If speaking, cancel the previous utterance.
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const cancel = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return { speak, cancel, isSpeaking };
}
