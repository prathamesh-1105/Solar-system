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

  const planets = [
    { name: 'Mercury', color: '#9C9C9C', distance: 24, duration: '3s' },
    { name: 'Venus', color: '#E8C66A', distance: 32, duration: '4.5s' },
    { name: 'Earth', color: '#2E86AB', distance: 42, duration: '6s' },
    { name: 'Mars', color: '#CD5C5C', distance: 50, duration: '8s' },
    { name: 'Jupiter', color: '#C88B3A', distance: 64, duration: '12s' },
    { name: 'Saturn', color: '#E4D191', distance: 74, duration: '15s' },
    { name: 'Uranus', color: '#7DE8E8', distance: 82, duration: '18s' },
    { name: 'Neptune', color: '#3E54E8', distance: 90, duration: '20s' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Scanning Line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20 z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-[scan_2s_linear_infinite]" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />

      <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
        {/* Sun */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#FDB813] rounded-full shadow-[0_0_20px_rgba(253,184,19,0.8)] z-10" />
        
        {/* Planets */}
        {planets.map((planet, i) => (
          <div key={planet.name} className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none" style={{
            transform: 'translate(-50%, -50%)',
            animation: `orbit ${planet.duration} linear infinite`
          }}>
            {/* Orbit Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" 
                 style={{ width: planet.distance * 2, height: planet.distance * 2 }} />
            {/* Planet Dot */}
            <div className="absolute rounded-full"
                 style={{ 
                   width: i > 3 ? 6 : 4, 
                   height: i > 3 ? 6 : 4,
                   backgroundColor: planet.color,
                   top: '50%',
                   left: `calc(50% + ${planet.distance}px)`,
                   transform: 'translate(-50%, -50%)',
                   boxShadow: `0 0 6px ${planet.color}`
                 }} 
            />
          </div>
        ))}
      </div>
      
      <h1 className="text-2xl md:text-4xl font-display font-bold tracking-[0.5em] text-white animate-pulse z-10">
        SOLAR SYSTEM
      </h1>
      
      <div className="w-64 h-1 bg-white/10 mt-8 rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-4 text-white/50 text-sm font-mono z-10 tracking-widest">{progress}% SYSTEM INITIALIZATION</p>
    </div>
  );
}
