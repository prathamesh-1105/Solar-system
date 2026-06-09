import React, { useEffect, useState } from 'react';
import PlanetScene from '../components/solar/PlanetScene';
import LoadingScreen from '../components/solar/LoadingScreen';
import AudioToggle from '../components/solar/AudioToggle';

export default function SolarSystem() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Artificial load time to show the cool loading screen
    const timer = setTimeout(() => {
      setLoaded(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full bg-black text-white selection:bg-primary selection:text-black">
      {!loaded && <LoadingScreen />}
      
      {/* The 3D Canvas Background */}
      <PlanetScene loaded={loaded} />
      
      {/* Audio Control */}
      <AudioToggle />
    </div>
  );
}
