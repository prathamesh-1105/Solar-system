import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AudioToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  
  // Audio nodes refs for dynamic scroll velocity modulation
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const oscHighRef = useRef<OscillatorNode | null>(null);
  const gainHighRef = useRef<GainNode | null>(null);
  
  // Audio nodes refs for cleanup
  const nodesRef = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Poll scroll velocity to modulate synth filters and pitch
  useEffect(() => {
    let animId: number;
    const updateModulation = () => {
      if (isPlaying && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const velocity = (window as any).scrollVelocity || 0;
        
        // Modulate low-pass filter frequency (opens up during travel)
        if (filterRef.current) {
          const targetFreq = 160 + Math.min(840, velocity * 0.65);
          filterRef.current.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
        }
        
        // Modulate engine pitch and volume
        if (oscHighRef.current && gainHighRef.current) {
          const targetPitch = 220 + Math.min(160, velocity * 0.12);
          const targetGain = 0.03 + Math.min(0.1, velocity * 0.00012);
          
          oscHighRef.current.frequency.setTargetAtTime(targetPitch, ctx.currentTime, 0.12);
          gainHighRef.current.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.12);
        }
      }
      animId = requestAnimationFrame(updateModulation);
    };
    
    if (isPlaying) {
      updateModulation();
    }
    
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

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
        filter.frequency.value = 160;
        filterRef.current = filter;
        
        const convolver = ctx.createConvolver();
        convolver.buffer = createReverb(ctx);
        
        filter.connect(convolver);
        convolver.connect(masterGain);
        filter.connect(masterGain); // dry path

        // 3 drone oscillators for the base ambient hum
        const freqs = [40, 60, 80];
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f + (Math.random() * 0.4 - 0.2);
          osc.connect(filter);
          osc.start();
          nodesRef.current.push(osc);
          
          if (f === 40) {
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.05;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 2; // modulates between 38-42 Hz
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            nodesRef.current.push(lfo, lfoGain);
          }
        });
        
        // Haunting high presence (our speed-modulated warp whistle)
        const oscHigh = ctx.createOscillator();
        oscHigh.type = 'sine';
        oscHigh.frequency.value = 220;
        oscHighRef.current = oscHigh;

        const gainHigh = ctx.createGain();
        gainHigh.gain.value = 0.03;
        gainHighRef.current = gainHigh;

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
        }, 800);
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
        <Volume2 className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-500" style={{ filter: 'drop-shadow(0 0 4px currentColor)' }} />
      ) : (
        <VolumeX className="w-6 h-6 text-white/50 group-hover:text-white/80" />
      )}
    </button>
  );
}
