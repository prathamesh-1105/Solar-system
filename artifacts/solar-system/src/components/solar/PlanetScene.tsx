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
  Sun: { name: 'The Sun', type: 'Yellow Dwarf Star', distance: '0 km', diameter: '1,392,684 km', moons: '0', atmosphere: 'Hydrogen, Helium', fact: 'The Sun accounts for 99.86% of the mass in the solar system.', color: '#FDB813' },
  Mercury: { name: 'Mercury', type: 'Terrestrial Planet', distance: '57.9M km', diameter: '4,879 km', moons: '0', atmosphere: 'None', fact: 'A year on Mercury is 88 Earth days, but a solar day lasts 176 Earth days.', color: '#9C9C9C' },
  Venus: { name: 'Venus', type: 'Terrestrial Planet', distance: '108.2M km', diameter: '12,104 km', moons: '0', atmosphere: 'Carbon Dioxide, Nitrogen', fact: 'Venus rotates backwards compared to most other planets.', color: '#E8C66A' },
  Earth: { name: 'Earth', type: 'Terrestrial Planet', distance: '149.6M km', diameter: '12,742 km', moons: '1', atmosphere: 'Nitrogen, Oxygen', fact: 'The only known planet to harbor life.', color: '#2E86AB' },
  Mars: { name: 'Mars', type: 'Terrestrial Planet', distance: '227.9M km', diameter: '6,779 km', moons: '2', atmosphere: 'Carbon Dioxide, Argon', fact: 'Home to Olympus Mons, the largest volcano in the solar system.', color: '#CD5C5C' },
  Jupiter: { name: 'Jupiter', type: 'Gas Giant', distance: '778.5M km', diameter: '139,820 km', moons: '95', atmosphere: 'Hydrogen, Helium', fact: 'Jupiter\'s Great Red Spot is a giant storm larger than Earth.', color: '#C88B3A' },
  Saturn: { name: 'Saturn', type: 'Gas Giant', distance: '1.43B km', diameter: '116,460 km', moons: '146', atmosphere: 'Hydrogen, Helium', fact: 'Saturn is the only planet that could float in water.', color: '#E4D191' },
  Uranus: { name: 'Uranus', type: 'Ice Giant', distance: '2.87B km', diameter: '50,724 km', moons: '28', atmosphere: 'Hydrogen, Helium, Methane', fact: 'Uranus rotates on its side, making its seasons last 21 Earth years.', color: '#7DE8E8' },
  Neptune: { name: 'Neptune', type: 'Ice Giant', distance: '4.5B km', diameter: '49,244 km', moons: '16', atmosphere: 'Hydrogen, Helium, Methane', fact: 'Neptune has supersonic winds reaching speeds of 2,100 km/h.', color: '#3E54E8' }
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
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const clock = new THREE.Clock();

    const disposables: { dispose: () => void }[] = [];
    const addDisposable = (obj: any) => { if (obj && obj.dispose) disposables.push(obj); return obj; };

    // --- TEXTURE GENERATORS ---
    const createTexture = (w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      drawFn(ctx);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      addDisposable(tex);
      return tex;
    };

    const drawNoise = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
      const imgData = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount;
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
        imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
        imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
    };

    const texSun = createTexture(512, 512, ctx => {
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, '#FFF5C0');
      grad.addColorStop(0.5, '#FF6600');
      grad.addColorStop(1, '#FF2200');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      for(let i=0; i<10; i++) {
        ctx.fillStyle = 'rgba(100,0,0,0.1)';
        ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, Math.random()*40+20, 0, Math.PI*2); ctx.fill();
      }
      drawNoise(ctx, 512, 512, 30);
    });

    const texMercury = createTexture(512, 512, ctx => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0,0,512,512);
      for(let i=0; i<40; i++) {
        ctx.fillStyle = 'rgba(50,50,50,0.3)';
        ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*512, Math.random()*15+5, 0, Math.PI*2); ctx.fill();
      }
      drawNoise(ctx, 512, 512, 60);
    });

    const texVenus = createTexture(512, 512, ctx => {
      const grad = ctx.createLinearGradient(0,0,0,512);
      ['#D4A056','#B88A44','#D4A056','#C2924A','#D4A056'].forEach((c,i)=>grad.addColorStop(i/4,c));
      ctx.fillStyle = grad; ctx.fillRect(0,0,512,512);
      drawNoise(ctx, 512, 512, 20);
    });

    const texEarth = createTexture(1024, 512, ctx => {
      ctx.fillStyle = '#1A3A5C'; ctx.fillRect(0,0,1024,512);
      ctx.fillStyle = '#2D5A27';
      const drawBlob = (x:number, y:number, sx:number, sy:number) => {
        ctx.beginPath(); ctx.ellipse(x, y, sx, sy, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
      };
      drawBlob(250, 200, 100, 150); // NA
      drawBlob(380, 350, 70, 100);  // SA
      drawBlob(550, 250, 80, 120);  // EU/AF
      drawBlob(750, 200, 150, 100); // AS
      drawBlob(850, 380, 60, 50);   // AU
      drawNoise(ctx, 1024, 512, 20);
    });

    const texEarthClouds = createTexture(512, 512, ctx => {
      ctx.clearRect(0,0,512,512);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for(let i=0; i<30; i++) {
        ctx.beginPath(); ctx.ellipse(Math.random()*512, Math.random()*512, Math.random()*60+20, Math.random()*20+10, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
      }
      drawNoise(ctx, 512, 512, 50);
    });

    const texMars = createTexture(512, 512, ctx => {
      const grad = ctx.createLinearGradient(0,0,0,512);
      grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.08, '#CC4400');
      grad.addColorStop(0.92, '#993300'); grad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = grad; ctx.fillRect(0,0,512,512);
      ctx.fillStyle = 'rgba(50,0,0,0.3)'; ctx.fillRect(200, 240, 200, 15); // Valles Marineris
      ctx.beginPath(); ctx.arc(80, 230, 20, 0, Math.PI*2); ctx.fill(); // Olympus Mons
      drawNoise(ctx, 512, 512, 40);
    });

    const texJupiter = createTexture(1024, 512, ctx => {
      const bands = ['#C88B3A', '#E6CCA3', '#A36724', '#D4AA70', '#8B5E1A', '#F0D9A0', '#C88B3A', '#E6CCA3'];
      const grad = ctx.createLinearGradient(0,0,0,512);
      bands.forEach((c,i)=>grad.addColorStop(i/(bands.length-1), c));
      ctx.fillStyle = grad; ctx.fillRect(0,0,1024,512);
      ctx.fillStyle = '#8B2500';
      ctx.beginPath(); ctx.ellipse(300, 256, 40, 25, 0, 0, Math.PI*2); ctx.fill(); // Great Red Spot
      drawNoise(ctx, 1024, 512, 30);
    });

    const texSaturn = createTexture(512, 512, ctx => {
      const bands = ['#E4D191', '#D4C181', '#E4D191', '#BCA96A'];
      const grad = ctx.createLinearGradient(0,0,0,512);
      bands.forEach((c,i)=>grad.addColorStop(i/(bands.length-1), c));
      ctx.fillStyle = grad; ctx.fillRect(0,0,512,512);
      drawNoise(ctx, 512, 512, 20);
    });

    const texSaturnRings = createTexture(512, 128, ctx => {
      const grad = ctx.createLinearGradient(0,0,512,0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.2, 'rgba(212,193,129,0.8)');
      grad.addColorStop(0.3, 'rgba(228,209,145,0.4)'); // gap
      grad.addColorStop(0.5, 'rgba(212,193,129,0.9)');
      grad.addColorStop(0.7, 'rgba(188,169,106,0.7)');
      grad.addColorStop(0.8, 'transparent'); // Cassini div
      grad.addColorStop(0.85, 'rgba(212,193,129,0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.fillRect(0,0,512,128);
      drawNoise(ctx, 512, 128, 20);
    });

    const texUranus = createTexture(512, 512, ctx => {
      const grad = ctx.createLinearGradient(0,0,0,512);
      grad.addColorStop(0, '#7FDBDB'); grad.addColorStop(1, '#4FBDBD');
      ctx.fillStyle = grad; ctx.fillRect(0,0,512,512);
      drawNoise(ctx, 512, 512, 10);
    });

    const texNeptune = createTexture(512, 512, ctx => {
      ctx.fillStyle = '#1A3BCC'; ctx.fillRect(0,0,512,512);
      ctx.fillStyle = '#0D1F8A'; ctx.beginPath(); ctx.ellipse(300, 200, 40, 20, 0, 0, Math.PI*2); ctx.fill(); // Great Dark Spot
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(100, 150, 100, 2); ctx.fillRect(350, 300, 80, 2); // Streaks
      drawNoise(ctx, 512, 512, 15);
    });

    const texGlow = createTexture(128, 128, ctx => {
      const grad = ctx.createRadialGradient(64,64,0,64,64,64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(0,0,128,128);
    });

    const texNebula = createTexture(256, 256, ctx => {
      const grad = ctx.createRadialGradient(128,128,0,128,128,128);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(0,0,256,256);
      drawNoise(ctx, 256, 256, 50);
    });

    // --- MULTI-LAYER STAR FIELD ---
    const createStarLayer = (count: number, size: number, color: number) => {
      const geo = addDisposable(new THREE.BufferGeometry());
      const pos = new Float32Array(count * 3);
      for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * 2000;
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = addDisposable(new THREE.PointsMaterial({ size, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
      const mesh = new THREE.Points(geo, mat);
      scene.add(mesh);
      return mesh;
    };
    const stars1 = createStarLayer(6000, 0.05, 0xffffff);
    const stars2 = createStarLayer(4000, 0.12, 0xffffff);
    const stars3 = createStarLayer(2000, 0.2, 0xAAAAFF);

    const brightStarsGroup = new THREE.Group();
    const starMat = addDisposable(new THREE.SpriteMaterial({ map: texGlow, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending }));
    for(let i=0; i<30; i++) {
      const sprite = new THREE.Sprite(starMat);
      sprite.position.set((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, (Math.random()-0.5)*1000);
      const s = Math.random()*2+1;
      sprite.scale.set(s,s,1);
      brightStarsGroup.add(sprite);
    }
    scene.add(brightStarsGroup);

    // --- NEBULA CLOUDS ---
    const nebulaColors = [0x4a0080, 0x001a4a, 0x003333, 0x0d0030, 0x1a0040, 0x000d33, 0x003344, 0x1a0010];
    const nebulaSprites: THREE.Sprite[] = [];
    nebulaColors.forEach(c => {
      const mat = addDisposable(new THREE.SpriteMaterial({ map: texNebula, color: c, transparent: true, opacity: Math.random()*0.07+0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
      const sprite = new THREE.Sprite(mat);
      sprite.position.set((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, (Math.random()-0.5)*1000);
      const s = Math.random()*70 + 80;
      sprite.scale.set(s,s,1);
      scene.add(sprite);
      nebulaSprites.push(sprite);
    });

    // --- ASTEROID BELT ---
    const asteroidCount = 1500;
    const astGeo = addDisposable(new THREE.BufferGeometry());
    const astPos = new Float32Array(asteroidCount * 3);
    for(let i=0; i<asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 8;
      astPos[i*3] = Math.cos(angle) * radius;
      astPos[i*3+1] = (Math.random() - 0.5) * 4;
      astPos[i*3+2] = Math.sin(angle) * radius;
    }
    astGeo.setAttribute('position', new THREE.BufferAttribute(astPos, 3));
    const astMat = addDisposable(new THREE.PointsMaterial({ size: 0.1, color: 0xcccccc, transparent: true, opacity: 0.6 }));
    const asteroidBelt = new THREE.Points(astGeo, astMat);
    asteroidBelt.position.set(0, 0, -95);
    scene.add(asteroidBelt);

    // --- COMET ---
    const cometGroup = new THREE.Group();
    const cometHead = new THREE.Mesh(addDisposable(new THREE.SphereGeometry(0.15, 16, 16)), addDisposable(new THREE.MeshBasicMaterial({ color: 0xffffff })));
    cometGroup.add(cometHead);
    const cometTailMat = addDisposable(new THREE.SpriteMaterial({ map: texGlow, color: 0xaaffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
    for(let i=0; i<80; i++) {
      const tail = new THREE.Sprite(cometTailMat);
      const scale = 0.5 * (1 - i/80);
      tail.scale.set(scale, scale, 1);
      tail.position.set(i*0.1, 0, 0); // behind head
      cometGroup.add(tail);
    }
    scene.add(cometGroup);
    let cometActive = false;
    let cometProgress = 0;
    setInterval(() => { if (!cometActive) { cometActive = true; cometProgress = 0; } }, 20000);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 1000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // --- PLANETS ---
    const planets: Record<string, THREE.Mesh | THREE.Group> = {};
    const interactableMeshes: THREE.Mesh[] = [];

    const createPlanet = (name: string, radius: number, z: number, tex?: THREE.Texture) => {
      const geo = addDisposable(new THREE.SphereGeometry(radius, 64, 64));
      let mat;
      if (name === 'Sun') {
        mat = addDisposable(new THREE.ShaderMaterial({
          uniforms: { time: { value: 0 }, tDiffuse: { value: texSun } },
          vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform float time; uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec2 uv = vUv; uv.y += sin(uv.x*20.0+time)*0.02; gl_FragColor = texture2D(tDiffuse, uv); }`
        }));
      } else {
        mat = addDisposable(new THREE.MeshStandardMaterial({ map: tex || null, roughness: 0.8, emissive: 0x000000 }));
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, z);
      mesh.userData = { name, isHovered: false };
      scene.add(mesh);
      planets[name] = mesh;
      interactableMeshes.push(mesh);
      return mesh;
    };

    const sun = createPlanet('Sun', 6, 0, texSun);
    
    // Sun Glow
    [14, 20, 30, 50].forEach((size, i) => {
      const mat = addDisposable(new THREE.SpriteMaterial({ map: texGlow, color: 0xFF6600, transparent: true, opacity: [0.3, 0.15, 0.08, 0.04][i], blending: THREE.AdditiveBlending }));
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(size, size, 1);
      sun.add(sprite);
    });
    // Rays
    for(let i=0; i<12; i++) {
      const rayGeo = addDisposable(new THREE.PlaneGeometry(0.15, 18));
      const rayMat = addDisposable(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.rotation.z = (Math.PI / 12) * i;
      sun.add(ray);
    }

    createPlanet('Mercury', 0.5, -20, texMercury);
    const venus = createPlanet('Venus', 1.2, -40, texVenus);
    
    // Venus Atmos
    const vAtmosMat = addDisposable(new THREE.MeshBasicMaterial({ color: 0xD4A056, transparent: true, opacity: 0.3, side: THREE.FrontSide, blending: THREE.AdditiveBlending }));
    const vAtmos = new THREE.Mesh(addDisposable(new THREE.SphereGeometry(1.22, 32, 32)), vAtmosMat);
    venus.add(vAtmos);

    const earth = createPlanet('Earth', 1.3, -60, texEarth);
    const eCloudsMat = addDisposable(new THREE.MeshStandardMaterial({ map: texEarthClouds, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    const eClouds = new THREE.Mesh(addDisposable(new THREE.SphereGeometry(1.32, 32, 32)), eCloudsMat);
    earth.add(eClouds);
    
    // Earth Fresnel Atmos
    const eAtmosMat = addDisposable(new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; void main() { float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5); gl_FragColor = vec4(0.3, 0.6, 1.0, fresnel * 0.5); }`,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.FrontSide, depthWrite: false
    }));
    earth.add(new THREE.Mesh(addDisposable(new THREE.SphereGeometry(1.36, 32, 32)), eAtmosMat));

    const mars = createPlanet('Mars', 0.7, -80, texMars);
    const mAtmos = new THREE.Mesh(addDisposable(new THREE.SphereGeometry(0.71, 32, 32)), addDisposable(new THREE.MeshBasicMaterial({ color: 0xcc4400, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending })));
    mars.add(mAtmos);

    const jupMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, tDiffuse: { value: texJupiter } },
      vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition; void main() { vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; vNormal = normalMatrix * normal; gl_Position = projectionMatrix * mvPosition; }`,
      fragmentShader: `uniform float time; uniform sampler2D tDiffuse; varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition; void main() { vec2 uv = vUv; uv.x -= time*0.01; vec4 texColor = texture2D(tDiffuse, uv); vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); float diffuse = max(dot(normal, vec3(0.0,0.0,1.0)), 0.0); gl_FragColor = vec4(texColor.rgb * (diffuse + 0.1), 1.0); }`
    }));
    const jupiter = new THREE.Mesh(addDisposable(new THREE.SphereGeometry(3.5, 64, 64)), jupMat);
    jupiter.position.set(0, 0, -110);
    jupiter.userData = { name: 'Jupiter', isHovered: false };
    scene.add(jupiter);
    planets['Jupiter'] = jupiter;
    interactableMeshes.push(jupiter);

    // Saturn
    const saturnGroup = new THREE.Group();
    saturnGroup.position.set(0, 0, -140);
    const saturnGeo = addDisposable(new THREE.SphereGeometry(2.8, 64, 64));
    const saturnMat = addDisposable(new THREE.MeshStandardMaterial({ map: texSaturn, roughness: 0.7 }));
    const saturnMesh = new THREE.Mesh(saturnGeo, saturnMat);
    saturnMesh.userData = { name: 'Saturn', isHovered: false };
    interactableMeshes.push(saturnMesh);
    saturnGroup.add(saturnMesh);
    
    const ringGeo = addDisposable(new THREE.RingGeometry(3.8, 6.5, 128));
    const pos = ringGeo.attributes.position;
    const uvs = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); const y = pos.getY(i); const r = Math.sqrt(x*x + y*y);
        uvs.setXY(i, (r - 3.8) / (6.5 - 3.8), 0.5);
    }
    const ringMat = addDisposable(new THREE.MeshBasicMaterial({ map: texSaturnRings, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    saturnGroup.rotation.z = 0.47;
    saturnGroup.add(ringMesh);
    scene.add(saturnGroup);
    planets['Saturn'] = saturnGroup;

    const uranus = createPlanet('Uranus', 2, -170, texUranus);
    uranus.rotation.z = Math.PI / 2;
    const uRing = new THREE.Mesh(addDisposable(new THREE.RingGeometry(2.4, 2.6, 64)), addDisposable(new THREE.MeshBasicMaterial({ color: 0x4FBDBD, transparent: true, opacity: 0.2, side: THREE.DoubleSide })));
    uRing.rotation.x = Math.PI/2;
    uranus.add(uRing);

    createPlanet('Neptune', 1.9, -200, texNeptune);

    camera.position.set(0, 0, 30);

    // --- SPACE DUST ---
    const dustCount = 500;
    const dustGeo = addDisposable(new THREE.BufferGeometry());
    const dustOffsets = new Float32Array(dustCount * 3);
    const dustVels = new Float32Array(dustCount * 3);
    for(let i=0; i<dustCount; i++) {
      dustOffsets[i*3] = (Math.random()-0.5)*30;
      dustOffsets[i*3+1] = (Math.random()-0.5)*30;
      dustOffsets[i*3+2] = (Math.random()-0.5)*30;
      dustVels[i*3] = (Math.random()-0.5)*0.005;
      dustVels[i*3+1] = (Math.random()-0.5)*0.005;
      dustVels[i*3+2] = (Math.random()-0.5)*0.005;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dustCount*3), 3));
    const dustMat = addDisposable(new THREE.PointsMaterial({ size: 0.04, color: 0xffffff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending }));
    const spaceDust = new THREE.Points(dustGeo, dustMat);
    scene.add(spaceDust);

    // --- WARP PARTICLES ---
    const warpGeo = addDisposable(new THREE.BufferGeometry());
    const warpPos = new Float32Array(500 * 3);
    for(let i=0; i<500*3; i++) warpPos[i] = (Math.random()-0.5)*50;
    warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
    const warpMat = addDisposable(new THREE.PointsMaterial({ size: 0.1, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    const warpSystem = new THREE.Points(warpGeo, warpMat);
    scene.add(warpSystem);

    // --- INTERACTION & INERTIA ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseVelX = 0, mouseVelY = 0;
    let lastMouseX = window.innerWidth/2, lastMouseY = window.innerHeight/2;
    let currentMouseNDCX = 0, currentMouseNDCY = 0;

    const onMouseClick = () => {
      const intersects = raycaster.intersectObjects(interactableMeshes);
      if (intersects.length > 0) {
        const name = intersects[0].object.userData.name;
        if (name && planetData[name as keyof typeof planetData]) {
          setSelectedPlanet(planetData[name as keyof typeof planetData]);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseVelX = (e.clientX - lastMouseX) * 0.002;
      mouseVelY = (e.clientY - lastMouseY) * 0.002;
      currentMouseNDCX = (e.clientX / window.innerWidth) * 2 - 1;
      currentMouseNDCY = -(e.clientY / window.innerHeight) * 2 + 1;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      mouse.x = currentMouseNDCX;
      mouse.y = currentMouseNDCY;
      
      const intersects = raycaster.intersectObjects(interactableMeshes);
      let hoveredObj = null;
      if (intersects.length > 0) {
        hoveredObj = intersects[0].object;
      }

      interactableMeshes.forEach(mesh => {
        if (mesh === hoveredObj) {
          if (!mesh.userData.isHovered) {
            mesh.userData.isHovered = true;
            gsap.to(mesh.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.4, ease: "power2.out" });
          }
        } else {
          if (mesh.userData.isHovered) {
            mesh.userData.isHovered = false;
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
          }
        }
      });
    };

    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);

    // --- ANIMATION LOOP ---
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Sun shader
      if ((sun.material as THREE.ShaderMaterial).uniforms) {
        (sun.material as THREE.ShaderMaterial).uniforms.time.value = time;
      }
      if ((jupiter.material as THREE.ShaderMaterial).uniforms) {
        (jupiter.material as THREE.ShaderMaterial).uniforms.time.value = time;
      }

      // Parallax Stars
      stars1.rotation.y += 0.00005;
      stars2.rotation.y += 0.00003;
      stars3.rotation.y += 0.00001;
      brightStarsGroup.rotation.y += 0.00002;

      nebulaSprites.forEach(s => s.rotation.z += 0.0005);
      asteroidBelt.rotation.y += 0.0003;

      // Comet logic
      if (cometActive) {
        cometProgress += dt * 0.12;
        if (cometProgress > 1) cometActive = false;
        else {
          const start = new THREE.Vector3(-200, 50, camera.position.z - 30);
          const end = new THREE.Vector3(200, -30, camera.position.z - 80);
          cometGroup.position.lerpVectors(start, end, cometProgress);
          // orient tail away from motion
          const dir = new THREE.Vector3().subVectors(end, start).normalize();
          cometGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0), dir.negate());
        }
      } else {
        cometGroup.position.set(0, 1000, 0); // hide
      }

      // Find nearest planet to camera
      let nearestDist = Infinity;
      let nearestPlanet: any = null;
      Object.values(planets).forEach(p => {
        const d = Math.abs(p.position.z - camera.position.z);
        if (d < nearestDist) { nearestDist = d; nearestPlanet = p; }
      });

      // Apply mouse inertia to nearest
      if (nearestPlanet) {
        nearestPlanet.rotation.y += mouseVelX;
        nearestPlanet.rotation.x += mouseVelY;
      }
      
      // Auto rotations
      Object.entries(planets).forEach(([name, obj]) => {
        if (name === 'Sun') obj.rotation.y += 0.001;
        else if (name === 'Saturn') obj.rotation.y += 0.002;
        else if (name !== 'Jupiter') obj.rotation.y += 0.003; // Jupiter done via shader
      });
      eClouds.rotation.y += 0.0005;
      mAtmos.rotation.y += 0.001;

      // Space Dust logic
      const dustPosAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      for(let i=0; i<dustCount; i++) {
        dustOffsets[i*3] += dustVels[i*3];
        dustOffsets[i*3+1] += dustVels[i*3+1];
        dustOffsets[i*3+2] += dustVels[i*3+2];
        dustPosAttr.setXYZ(i, camera.position.x + dustOffsets[i*3], camera.position.y + dustOffsets[i*3+1], camera.position.z + dustOffsets[i*3+2]);
      }
      dustPosAttr.needsUpdate = true;

      // Warp effect based on scroll velocity (simulated via ScrollTrigger proxy)
      const st = ScrollTrigger.getAll()[0];
      if (st) {
        const velocity = Math.abs(st.getVelocity());
        if (velocity > 100) {
          warpMat.opacity = Math.min(1, velocity / 1000);
          (stars1.material as THREE.PointsMaterial).size = 0.25;
          const wPosAttr = warpGeo.attributes.position as THREE.BufferAttribute;
          for(let i=0; i<500; i++) {
            let z = wPosAttr.getZ(i) + velocity * 0.01;
            if (z > camera.position.z) z = camera.position.z - 100;
            wPosAttr.setXYZ(i, camera.position.x + (Math.random()-0.5)*30, camera.position.y + (Math.random()-0.5)*30, z);
          }
          wPosAttr.needsUpdate = true;
        } else {
          warpMat.opacity *= 0.9;
          (stars1.material as THREE.PointsMaterial).size = 0.05;
        }
      }

      // Camera drift & shake
      camera.position.x += (currentMouseNDCX * 0.8 - camera.position.x) * 0.02;
      camera.position.y += (currentMouseNDCY * 0.3 - camera.position.y) * 0.02;
      
      const sunProx = Math.max(0, 1 - Math.abs(camera.position.z - 0) / 15) * 0.025;
      if (sunProx > 0) {
        camera.position.x += (Math.random() - 0.5) * sunProx;
        camera.position.y += (Math.random() - 0.5) * sunProx;
      }
      const jupProx = Math.max(0, 1 - Math.abs(camera.position.z + 110) / 20) * 0.015;
      if (jupProx > 0) {
        camera.position.x += (Math.random() - 0.5) * jupProx;
        camera.position.y += (Math.random() - 0.5) * jupProx;
      }

      mouseVelX *= 0.95;
      mouseVelY *= 0.95;

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

    tl.to(camera.position, { z: 15, x: 2, ease: "power2.inOut" }, 0)
      .to(camera.position, { z: -18, x: -2, ease: "power2.inOut" }, 1)
      .to(camera.position, { z: -38, x: 2, ease: "power2.inOut" }, 2)
      .to(camera.position, { z: -57, x: -2, ease: "power2.inOut" }, 3)
      .to(camera.position, { z: -78, x: 2, ease: "power2.inOut" }, 4)
      .to(camera.position, { z: -102, x: -3, ease: "power2.inOut" }, 5)
      .to(camera.rotation, { z: -0.015, ease: "power2.inOut" }, 5)
      .to(camera.position, { z: -133, x: 3, ease: "power2.inOut" }, 6)
      .to(camera.rotation, { z: 0.015, ease: "power2.inOut" }, 6)
      .to(camera.position, { z: -165, x: -2, ease: "power2.inOut" }, 7)
      .to(camera.rotation, { z: 0, ease: "power2.inOut" }, 7)
      .to(camera.position, { z: -195, x: 2, ease: "power2.inOut" }, 8)
      .to(camera.position, { z: -100, y: 120, x: 0, ease: "power2.inOut" }, 9)
      .to(camera.rotation, { x: -Math.PI / 2, ease: "power2.inOut" }, 9);

    gsap.utils.toArray('.reveal-text').forEach((el: any) => {
      gsap.fromTo(el, 
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, scrollTrigger: { trigger: el, start: "top 80%", end: "top 20%", toggleActions: "play reverse play reverse" } }
      );
    });

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
      
      disposables.forEach(d => d.dispose());
      scene.children.forEach(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) ((child as THREE.Mesh).material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [loaded]);

  const renderInfoPanel = (key: keyof typeof planetData, alignment: 'start'|'end', planetColor: string) => {
    const data = planetData[key];
    return (
      <section className={`h-screen w-full flex items-center justify-${alignment} px-12 md:px-24 xl:px-48`}>
        <div className="reveal-text glass-panel p-8 max-w-md pointer-events-auto relative overflow-hidden" 
             style={{ borderLeft: `4px solid ${planetColor}`, boxShadow: `-10px 0 30px -10px ${planetColor}` }}>
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full border border-white/20 text-[10px] font-mono tracking-wider text-white/50 bg-white/5">
            {data.type.toUpperCase()}
          </div>
          <h2 className="text-5xl font-display font-bold mb-6" style={{ color: planetColor }}>{data.name.toUpperCase()}</h2>
          <div className="space-y-4 font-mono text-sm text-white/80 uppercase">
            <div className="flex justify-between border-b border-white/10 pb-2"><span>Diameter</span> <span className="text-white">{data.diameter}</span></div>
            <div className="flex justify-between border-b border-white/10 pb-2"><span>Distance</span> <span className="text-white">{data.distance}</span></div>
            <div className="flex justify-between border-b border-white/10 pb-2"><span>Moons</span> <span className="text-white">{data.moons}</span></div>
            <div className="flex justify-between pb-2"><span>Atmos</span> <span className="text-white">{data.atmosphere}</span></div>
          </div>
          <button 
            className="explore-btn interactive"
            onClick={() => setSelectedPlanet(data)}
          >
            Explore Data
          </button>
        </div>
      </section>
    );
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full" style={{ height: "1100vh" }}>
        <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-screen z-0 outline-none" />
        
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

          {renderInfoPanel('Sun', 'start', planetData.Sun.color)}
          {renderInfoPanel('Mercury', 'end', planetData.Mercury.color)}
          {renderInfoPanel('Venus', 'start', planetData.Venus.color)}
          {renderInfoPanel('Earth', 'end', planetData.Earth.color)}
          {renderInfoPanel('Mars', 'start', planetData.Mars.color)}
          {renderInfoPanel('Jupiter', 'end', planetData.Jupiter.color)}
          {renderInfoPanel('Saturn', 'start', planetData.Saturn.color)}
          {renderInfoPanel('Uranus', 'end', planetData.Uranus.color)}
          {renderInfoPanel('Neptune', 'start', planetData.Neptune.color)}
        </div>
      </div>

      <PlanetModal 
        planet={selectedPlanet} 
        onClose={() => setSelectedPlanet(null)} 
      />
    </>
  );
}