import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AudioToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const toggleAudio = () => {
    if (!isPlaying) {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        
        oscRef.current = audioCtxRef.current.createOscillator();
        gainRef.current = audioCtxRef.current.createGain();
        
        oscRef.current.type = 'sine';
        oscRef.current.frequency.setValueAtTime(55, audioCtxRef.current.currentTime); // Deep space rumble
        
        // Add subtle modulation
        const lfo = audioCtxRef.current.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = audioCtxRef.current.createGain();
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(oscRef.current.frequency);
        lfo.start();

        gainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gainRef.current.gain.linearRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 2);
        
        oscRef.current.connect(gainRef.current);
        gainRef.current.connect(audioCtxRef.current.destination);
        
        oscRef.current.start();
      } else {
        audioCtxRef.current.resume();
        if (gainRef.current) {
          gainRef.current.gain.setTargetAtTime(0.3, audioCtxRef.current.currentTime + 1);
        }
      }
    } else {
      if (audioCtxRef.current && gainRef.current) {
        gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime + 0.5);
        setTimeout(() => {
          audioCtxRef.current?.suspend();
        }, 600);
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button 
      onClick={toggleAudio}
      className="fixed bottom-8 right-8 z-50 p-4 rounded-full glass-panel hover:bg-white/10 transition-colors group"
      aria-label="Toggle ambient audio"
    >
      {isPlaying ? (
        <Volume2 className="w-6 h-6 text-white/80 group-hover:text-white" />
      ) : (
        <VolumeX className="w-6 h-6 text-white/50 group-hover:text-white/80" />
      )}
    </button>
  );
}
