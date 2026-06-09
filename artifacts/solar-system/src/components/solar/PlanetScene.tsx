import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import PlanetModal from './PlanetModal';

gsap.registerPlugin(ScrollTrigger);

interface PlanetSceneProps {
  loaded: boolean;
}

const planetData = {
  Sun: { name: 'The Sun', type: 'Yellow Dwarf Star', distance: '0 km', diameter: '1,392,684 km', moons: '0', atmosphere: 'Hydrogen, Helium', fact: 'The Sun accounts for 99.86% of the mass in the solar system.', color: 'rgba(253, 184, 19, 0.3)' },
  Mercury: { name: 'Mercury', type: 'Terrestrial Planet', distance: '57.9M km', diameter: '4,879 km', moons: '0', atmosphere: 'None', fact: 'A year on Mercury is 88 Earth days, but a solar day lasts 176 Earth days.', color: 'rgba(156, 156, 156, 0.3)' },
  Venus: { name: 'Venus', type: 'Terrestrial Planet', distance: '108.2M km', diameter: '12,104 km', moons: '0', atmosphere: 'Carbon Dioxide, Nitrogen', fact: 'Venus rotates backwards compared to most other planets.', color: 'rgba(232, 198, 106, 0.3)' },
  Earth: { name: 'Earth', type: 'Terrestrial Planet', distance: '149.6M km', diameter: '12,742 km', moons: '1', atmosphere: 'Nitrogen, Oxygen', fact: 'The only known planet to harbor life.', color: 'rgba(46, 134, 171, 0.3)' },
  Mars: { name: 'Mars', type: 'Terrestrial Planet', distance: '227.9M km', diameter: '6,779 km', moons: '2', atmosphere: 'Carbon Dioxide, Argon', fact: 'Home to Olympus Mons, the largest volcano in the solar system.', color: 'rgba(205, 92, 92, 0.3)' },
  Jupiter: { name: 'Jupiter', type: 'Gas Giant', distance: '778.5M km', diameter: '139,820 km', moons: '95', atmosphere: 'Hydrogen, Helium', fact: 'Jupiter\'s Great Red Spot is a giant storm larger than Earth.', color: 'rgba(200, 139, 58, 0.3)' },
  Saturn: { name: 'Saturn', type: 'Gas Giant', distance: '1.43B km', diameter: '116,460 km', moons: '146', atmosphere: 'Hydrogen, Helium', fact: 'Saturn is the only planet that could float in water.', color: 'rgba(228, 209, 145, 0.3)' },
  Uranus: { name: 'Uranus', type: 'Ice Giant', distance: '2.87B km', diameter: '50,724 km', moons: '28', atmosphere: 'Hydrogen, Helium, Methane', fact: 'Uranus rotates on its side, making its seasons last 21 Earth years.', color: 'rgba(125, 232, 232, 0.3)' },
  Neptune: { name: 'Neptune', type: 'Ice Giant', distance: '4.5B km', diameter: '49,244 km', moons: '16', atmosphere: 'Hydrogen, Helium, Methane', fact: 'Neptune has supersonic winds reaching speeds of 2,100 km/h.', color: 'rgba(62, 84, 232, 0.3)' }
};

export default function PlanetScene({ loaded }: PlanetSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<any | null>(null);

  useEffect(() => {
    if (!loaded || !canvasRef.current || !containerRef.current) return;

    // --- LENIS SETUP ---
    const lenis = new Lenis({
      lerp: 0.08,
      infinite: false,
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // --- THREEJS SETUP ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- STARS ---
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 10000;
    const posArray = new Float32Array(starsCount * 3);
    for(let i = 0; i < starsCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 400;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const starsMesh = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starsMesh);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2.5, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // --- PLANETS ---
    const planets: Record<string, THREE.Mesh | THREE.Group> = {};
    const materials: THREE.Material[] = [];
    const interactableMeshes: THREE.Mesh[] = [];

    // Helper to generate noisy texture for planets
    const generateTexture = (colors: string[], type: 'bands' | 'spots' = 'bands') => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      // Add noise
      const imgData = ctx.getImageData(0, 0, 512, 256);
      for(let i = 0; i < imgData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
        imgData.data[i+1] = Math.max(0, Math.min(255, imgData.data[i+1] + noise));
        imgData.data[i+2] = Math.max(0, Math.min(255, imgData.data[i+2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const earthTex = generateTexture(['#1b4c6e', '#2E86AB', '#4d9c65', '#2E86AB'], 'spots');
    const jupiterTex = generateTexture(['#C88B3A', '#a36724', '#e6cca3', '#C88B3A', '#a36724'], 'bands');

    const createPlanet = (name: string, radius: number, color: number, z: number, emissive?: number, tex?: THREE.Texture) => {
      const geo = new THREE.SphereGeometry(radius, 64, 64);
      let mat;
      if (name === 'Sun') {
        mat = new THREE.MeshBasicMaterial({ color: 0xFDB813 });
      } else {
        mat = new THREE.MeshStandardMaterial({ 
          color: tex ? 0xffffff : color, 
          roughness: 0.8,
          emissive: emissive || 0x000000,
          emissiveIntensity: emissive ? 0.3 : 0,
          map: tex || null
        });
      }
      materials.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, z);
      mesh.userData = { name };
      scene.add(mesh);
      planets[name] = mesh;
      interactableMeshes.push(mesh);
      return mesh;
    };

    // Create planets along Z axis
    createPlanet('Sun', 6, 0xFDB813, 0);
    
    // Volumetric glow for sun
    const glowGeo = new THREE.SphereGeometry(6.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFDB813, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    planets['Sun'].add(glowMesh);

    createPlanet('Mercury', 0.5, 0x9C9C9C, -20);
    createPlanet('Venus', 1.2, 0xE8C66A, -40);
    createPlanet('Earth', 1.3, 0xffffff, -60, 0x001133, earthTex);
    
    // Earth Clouds
    const cloudGeo = new THREE.SphereGeometry(1.32, 32, 32);
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 1 });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    planets['Earth'].add(cloudMesh);

    createPlanet('Mars', 0.7, 0xCD5C5C, -80);
    createPlanet('Jupiter', 3.5, 0xffffff, -110, 0x000000, jupiterTex);
    
    // Saturn with rings
    const saturnGroup = new THREE.Group();
    const saturnGeo = new THREE.SphereGeometry(2.8, 64, 64);
    const saturnMat = new THREE.MeshStandardMaterial({ color: 0xE4D191, roughness: 0.7 });
    materials.push(saturnMat);
    const saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    saturnMesh.userData = { name: 'Saturn' };
    interactableMeshes.push(saturnMesh);
    saturnGroup.add(saturnMesh);
    
    const ringGeo = new THREE.TorusGeometry(4.5, 0.8, 2, 100);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xD4C181, transparent: true, opacity: 0.8 });
    materials.push(ringMat);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.5;
    saturnGroup.add(ringMesh);
    saturnGroup.position.set(0, 0, -140);
    scene.add(saturnGroup);
    planets['Saturn'] = saturnGroup;

    createPlanet('Uranus', 2, 0x7DE8E8, -170);
    createPlanet('Neptune', 1.9, 0x3E54E8, -200);

    // Initial Camera Position (Hero)
    camera.position.set(0, 0, 30);

    // --- RAYCASTER FOR CLICKS ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableMeshes);
      if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        if (name && planetData[name as keyof typeof planetData]) {
          setSelectedPlanet(planetData[name as keyof typeof planetData]);
        }
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableMeshes);
      if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);

    // --- ANIMATION LOOP ---
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      
      starsMesh.rotation.y += 0.0001;
      
      Object.entries(planets).forEach(([name, obj]) => {
        if (name === 'Sun') obj.rotation.y += 0.001;
        else if (name === 'Saturn') obj.rotation.y += 0.005;
        else obj.rotation.y += 0.003;
      });

      if (planets['Earth']) {
        (planets['Earth'].children[0] as THREE.Mesh).rotation.y -= 0.0005; // clouds
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- SCROLL ANIMATIONS ---
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      }
    });

    // We animate camera to view each planet.
    // We add slight x offsets to put the planet on one side of the screen.

    // Hero -> Sun
    tl.to(camera.position, { z: 15, x: 2, ease: "power1.inOut" }, 0)
    // Sun -> Mercury
      .to(camera.position, { z: -18, x: -1, ease: "power1.inOut" }, 1)
    // Mercury -> Venus
      .to(camera.position, { z: -38, x: 1.5, ease: "power1.inOut" }, 2)
    // Venus -> Earth
      .to(camera.position, { z: -57, x: -1.5, ease: "power1.inOut" }, 3)
    // Earth -> Mars
      .to(camera.position, { z: -78, x: 1.5, ease: "power1.inOut" }, 4)
    // Mars -> Jupiter
      .to(camera.position, { z: -102, x: -3, ease: "power1.inOut" }, 5)
    // Jupiter -> Saturn
      .to(camera.position, { z: -133, x: 3, ease: "power1.inOut" }, 6)
    // Saturn -> Uranus & Neptune
      .to(camera.position, { z: -165, x: -2, ease: "power1.inOut" }, 7)
      .to(camera.position, { z: -195, x: 2, ease: "power1.inOut" }, 8)
    // Overview
      .to(camera.position, { z: -100, y: 120, x: 0, ease: "power2.inOut" }, 9)
      .to(camera.rotation, { x: -Math.PI / 2, ease: "power2.inOut" }, 9);

    // Text Reveal Animations
    gsap.utils.toArray('.reveal-text').forEach((el: any) => {
      gsap.fromTo(el, 
        { opacity: 0, y: 50 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 1,
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            end: "top 20%",
            toggleActions: "play reverse play reverse"
          }
        }
      );
    });

    // Cleanup
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frame);
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
      
      starsGeometry.dispose();
      starsMaterial.dispose();
      materials.forEach(m => m.dispose());
      scene.children.forEach(child => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
      renderer.dispose();
    };
  }, [loaded]);

  return (
    <>
      <div ref={containerRef} className="relative w-full" style={{ height: "1100vh" }}>
        <canvas 
          ref={canvasRef} 
          className="fixed top-0 left-0 w-full h-screen z-0 outline-none"
        />
        
        {/* HTML Overlays */}
        <div className="relative z-10 w-full pointer-events-none">
          
          <section className="h-screen w-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="reveal-text text-5xl md:text-7xl lg:text-9xl font-display font-bold tracking-[0.2em] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              EXPLORE OUR<br/>SOLAR SYSTEM
            </h1>
            <p className="reveal-text mt-8 text-xl md:text-2xl text-white/60 font-sans max-w-2xl tracking-wide uppercase">
              A journey through 4.5 billion years of cosmic wonder
            </p>
            <div className="absolute bottom-10 animate-bounce text-white/40">
              ↓ SCROLL TO EXPLORE ↓
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-start px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">Yellow Dwarf Star</p>
              <h2 className="text-5xl font-display font-bold text-primary mb-6">THE SUN</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Diameter</span> <span className="text-white">1,392,684 km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Surface Temp</span> <span className="text-white">5,500°C</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Age</span> <span className="text-white">4.6 Billion Yrs</span></div>
                <div className="flex justify-between pb-2"><span>Mass</span> <span className="text-white">99.86% of System</span></div>
              </div>
              <p className="mt-6 text-white/60 text-xs italic">Click the Sun for more details</p>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-end px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">The Swiftest Planet</p>
              <h2 className="text-5xl font-display font-bold text-gray-400 mb-6">MERCURY</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Diameter</span> <span className="text-white">4,879 km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Day</span> <span className="text-white">58.6 Earth Days</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Dist. to Sun</span> <span className="text-white">57.9M km</span></div>
                <div className="flex justify-between pb-2"><span>Atmosphere</span> <span className="text-white">None</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-start px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">The Evening Star</p>
              <h2 className="text-5xl font-display font-bold text-[#E8C66A] mb-6">VENUS</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Diameter</span> <span className="text-white">12,104 km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Surface Temp</span> <span className="text-white">465°C</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Rotation</span> <span className="text-white">Retrograde</span></div>
                <div className="flex justify-between pb-2"><span>Status</span> <span className="text-white">Brightest Planet</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-end px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">Our Blue Marble</p>
              <h2 className="text-5xl font-display font-bold text-[#2E86AB] mb-6">EARTH</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Population</span> <span className="text-white">7.9 Billion</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Surface Water</span> <span className="text-white">71%</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Moons</span> <span className="text-white">1</span></div>
                <div className="flex justify-between pb-2"><span>Species</span> <span className="text-white">8.7M+</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-start px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">The Red Planet</p>
              <h2 className="text-5xl font-display font-bold text-[#CD5C5C] mb-6">MARS</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Diameter</span> <span className="text-white">6,779 km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Day</span> <span className="text-white">24.6 hrs</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Moons</span> <span className="text-white">2</span></div>
                <div className="flex justify-between pb-2"><span>Feature</span> <span className="text-white">Olympus Mons</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-end px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">The Giant</p>
              <h2 className="text-5xl font-display font-bold text-[#C88B3A] mb-6">JUPITER</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Diameter</span> <span className="text-white">139,820 km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Moons</span> <span className="text-white">95</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Size</span> <span className="text-white">1,300 Earths</span></div>
                <div className="flex justify-between pb-2"><span>Feature</span> <span className="text-white">Great Red Spot</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-start px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">Lord of the Rings</p>
              <h2 className="text-5xl font-display font-bold text-[#E4D191] mb-6">SATURN</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Ring Span</span> <span className="text-white">282,000 km</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Moons</span> <span className="text-white">146</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Density</span> <span className="text-white">Lowest in System</span></div>
                <div className="flex justify-between pb-2"><span>Discovery</span> <span className="text-white">Prehistoric</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-end px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">The Ice Giant</p>
              <h2 className="text-5xl font-display font-bold text-[#7DE8E8] mb-6">URANUS</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Rotation</span> <span className="text-white">On its side</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Year</span> <span className="text-white">84 Earth Yrs</span></div>
                <div className="flex justify-between pb-2"><span>Moons</span> <span className="text-white">28</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-center justify-start px-12 md:px-24 xl:px-48">
            <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-2 uppercase">The Windy Planet</p>
              <h2 className="text-5xl font-display font-bold text-[#3E54E8] mb-6">NEPTUNE</h2>
              <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Winds</span> <span className="text-white">Supersonic</span></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><span>Distance</span> <span className="text-white">4.5B km</span></div>
                <div className="flex justify-between pb-2"><span>Moons</span> <span className="text-white">16</span></div>
              </div>
            </div>
          </section>

          <section className="h-screen w-full flex items-end justify-center pb-32">
            <div className="reveal-text text-center glass-panel p-8 max-w-3xl mx-4 pointer-events-auto">
              <p className="text-white/50 font-mono text-sm tracking-widest mb-4 uppercase">System Overview</p>
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">INFINITE WONDER</h2>
              <div className="flex flex-wrap justify-center gap-8 text-white/80 font-mono uppercase text-sm">
                <span>4.5 Billion Years</span>
                <span className="text-white/30">•</span>
                <span>8 Planets</span>
                <span className="text-white/30">•</span>
                <span>One Star</span>
              </div>
            </div>
          </section>

        </div>
      </div>
      
      <PlanetModal planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
    </>
  );
}
