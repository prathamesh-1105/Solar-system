import React, { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border border-white/20 animate-[spin_3s_linear_infinite_reverse]" />
        <div className="absolute inset-4 rounded-full border border-white/30 animate-[spin_2s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(253,184,19,0.8)]" />
      </div>
      
      <h1 className="text-2xl md:text-4xl font-display font-bold tracking-[0.5em] text-white animate-pulse">
        SOLAR SYSTEM
      </h1>
      
      <div className="w-64 h-1 bg-white/10 mt-8 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-4 text-white/50 text-sm font-mono">{progress}% SYSTEM INITIALIZATION</p>
    </div>
  );
}
