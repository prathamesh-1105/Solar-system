import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AudioToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  
  // Audio nodes refs for cleanup
  const nodesRef = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const createReverb = (ctx: AudioContext) => {
    const length = ctx.sampleRate * 3;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 1.5));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  };

  const toggleAudio = () => {
    if (!isPlaying) {
      if (!audioCtxRef.current) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        const convolver = ctx.createConvolver();
        convolver.buffer = createReverb(ctx);
        
        filter.connect(convolver);
        convolver.connect(masterGain);
        // also direct dry signal
        filter.connect(masterGain);

        // 3 drone oscillators
        const freqs = [40, 60, 80];
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f + (Math.random() * 0.5 - 0.25);
          osc.connect(filter);
          osc.start();
          nodesRef.current.push(osc);
          
          if (f === 40) {
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.05;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 2; // modulates between 38-42
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            nodesRef.current.push(lfo, lfoGain);
          }
        });
        
        // 4th haunting presence
        const oscHigh = ctx.createOscillator();
        oscHigh.type = 'sine';
        oscHigh.frequency.value = 220;
        const gainHigh = ctx.createGain();
        gainHigh.gain.value = 0.05;
        oscHigh.connect(gainHigh);
        gainHigh.connect(convolver);
        oscHigh.start();
        nodesRef.current.push(oscHigh, gainHigh);

        masterGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 3);
      } else {
        audioCtxRef.current.resume();
        if (masterGainRef.current) {
          masterGainRef.current.gain.setTargetAtTime(0.12, audioCtxRef.current.currentTime, 1);
        }
      }
    } else {
      if (audioCtxRef.current && masterGainRef.current) {
        masterGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.5);
        setTimeout(() => {
          audioCtxRef.current?.suspend();
        }, 1000);
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button 
      onClick={toggleAudio}
      className="fixed bottom-8 right-8 z-50 p-4 rounded-full glass-panel hover:bg-white/10 transition-colors group interactive"
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
