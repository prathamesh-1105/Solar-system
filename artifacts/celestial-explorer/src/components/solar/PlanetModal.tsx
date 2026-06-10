import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface PlanetData {
  name: string;
  type: string;
  distance: string;
  diameter: string;
  moons: string;
  atmosphere: string;
  fact: string;
  color: string;
  mass?: string;
  gravity?: string;
  temperature?: string;
  orbitalPeriod?: string;
  description?: string;
  coreComposition?: string;
}

interface PlanetModalProps {
  planet: PlanetData | null;
  onClose: () => void;
}

export default function PlanetModal({ planet, onClose }: PlanetModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (planet) {
      // Small delay to allow display block before opacity animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [planet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!planet && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ${isVisible && planet ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md z-0"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative z-10 w-full max-w-3xl glass-panel p-8 md:p-12 overflow-hidden pointer-events-auto transition-all duration-500 transform ${isVisible && planet ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
        style={{ boxShadow: `0 0 40px ${planet?.color || 'rgba(255,255,255,0.1)'}` }}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors z-30 pointer-events-auto"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative z-10">
          <p className="text-sm md:text-base text-white/60 font-mono mb-2 uppercase tracking-widest">{planet?.type}</p>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 tracking-wider uppercase">
            {planet?.name}
          </h2>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 text-white/80">
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">DISTANCE FROM SUN</p>
              <p className="text-lg font-medium">{planet?.distance}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">DIAMETER</p>
              <p className="text-lg font-medium">{planet?.diameter}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">ORBITAL PERIOD</p>
              <p className="text-lg font-medium">{planet?.orbitalPeriod || 'N/A'}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">MOONS</p>
              <p className="text-lg font-medium">{planet?.moons}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">SURFACE GRAVITY</p>
              <p className="text-lg font-medium">{planet?.gravity || 'N/A'}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">SURFACE TEMP</p>
              <p className="text-lg font-medium">{planet?.temperature || 'N/A'}</p>
            </div>
          </div>

          {/* Description Paragraph */}
          {planet?.description && (
            <div className="pt-6 border-t border-white/10 mb-6">
              <p className="text-white/40 text-[10px] font-mono mb-2 tracking-widest">MISSION BRIEF / TELEMETRY SUMMARY</p>
              <p className="text-base text-white/90 leading-relaxed font-sans">
                {planet?.description}
              </p>
            </div>
          )}

          {/* Core & Atmosphere Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10 mb-6">
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">ATMOSPHERIC COMPOSITION</p>
              <p className="text-sm text-white/85 leading-relaxed">{planet?.atmosphere}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-mono mb-1 tracking-widest">CORE STRUCTURE</p>
              <p className="text-sm text-white/85 leading-relaxed">{planet?.coreComposition || 'Unknown'}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-white/40 text-[10px] font-mono mb-2 tracking-widest">NOTABLE CELESTIAL FACT</p>
            <p className="text-base text-white/90 italic leading-relaxed pl-4 border-l-2" style={{ borderColor: planet?.color || 'rgba(255,255,255,0.2)' }}>
              "{planet?.fact}"
            </p>
          </div>
        </div>

        {/* Decorative background glow */}
        <div 
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ backgroundColor: planet?.color }}
        />
      </div>
    </div>
  );
}
