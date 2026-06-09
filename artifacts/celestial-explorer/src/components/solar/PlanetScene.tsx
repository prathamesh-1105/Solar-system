import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import PlanetModal from './PlanetModal';

// Post-processing imports
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

gsap.registerPlugin(ScrollTrigger);

interface PlanetSceneProps {
  loaded: boolean;
}

const planetData = {
  Sun: { name: 'The Sun', type: 'Yellow Dwarf Star', distance: '0 km', diameter: '1,392,684 km', moons: '0', atmosphere: 'Hydrogen, Helium', fact: 'The Sun accounts for 99.86% of the mass in the solar system.', color: '#FF5500' },
  Mercury: { name: 'Mercury', type: 'Terrestrial Planet', distance: '57.9M km', diameter: '4,879 km', moons: '0', atmosphere: 'None', fact: 'A year on Mercury is 88 Earth days, but a solar day lasts 176 Earth days.', color: '#9C9C9C' },
  Venus: { name: 'Venus', type: 'Terrestrial Planet', distance: '108.2M km', diameter: '12,104 km', moons: '0', atmosphere: 'Carbon Dioxide, Nitrogen', fact: 'Venus rotates backwards compared to most other planets.', color: '#E8C66A' },
  Earth: { name: 'Earth', type: 'Terrestrial Planet', distance: '149.6M km', diameter: '12,742 km', moons: '1', atmosphere: 'Nitrogen, Oxygen', fact: 'The only known planet to harbor life.', color: '#3b82f6' },
  Mars: { name: 'Mars', type: 'Terrestrial Planet', distance: '227.9M km', diameter: '6,779 km', moons: '2', atmosphere: 'Carbon Dioxide, Argon', fact: 'Home to Olympus Mons, the largest volcano in the solar system.', color: '#EF4444' },
  Jupiter: { name: 'Jupiter', type: 'Gas Giant', distance: '778.5M km', diameter: '139,820 km', moons: '95', atmosphere: 'Hydrogen, Helium', fact: 'Jupiter\'s Great Red Spot is a giant storm larger than Earth.', color: '#F59E0B' },
  Saturn: { name: 'Saturn', type: 'Gas Giant', distance: '1.43B km', diameter: '116,460 km', moons: '146', atmosphere: 'Hydrogen, Helium', fact: 'Saturn is the only planet that could float in water.', color: '#E5E7EB' },
  Uranus: { name: 'Uranus', type: 'Ice Giant', distance: '2.87B km', diameter: '50,724 km', moons: '28', atmosphere: 'Hydrogen, Helium, Methane', fact: 'Uranus rotates on its side, making its seasons last 21 Earth years.', color: '#06B6D4' },
  Neptune: { name: 'Neptune', type: 'Ice Giant', distance: '4.5B km', diameter: '49,244 km', moons: '16', atmosphere: 'Hydrogen, Helium, Methane', fact: 'Neptune has supersonic winds reaching speeds of 2,100 km/h.', color: '#3B82F6' }
};

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

// --- GLSL SHADERS ---
const noiseGLSL = `
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(in vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f*f*(3.0-2.0*f);
      float n = p.x + p.y*157.0 + 113.0*p.z;
      return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                      mix( hash(n+157.0), hash(n+158.0),f.x),f.y),
                  mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                      mix( hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
  }
  float fbm(in vec3 p) {
      float f = 0.0;
      f += 0.5000*noise(p); p = p*2.01;
      f += 0.2500*noise(p); p = p*2.02;
      f += 0.1250*noise(p); p = p*2.03;
      f += 0.0625*noise(p);
      return f;
  }
`;

const skyboxShaders = {
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vWorldPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    uniform float time;
    ${noiseGLSL}
    void main() {
      vec3 dir = normalize(vWorldPosition);
      
      // Starfield (high frequency noise)
      float stars = 0.0;
      float starHash = hash(dir.x * 123.45 + dir.y * 345.67 + dir.z * 567.89);
      if (starHash > 0.993) {
        float brightness = hash(starHash * 23.45) * (0.5 + 0.5 * sin(time * 1.5 + starHash * 10.0));
        stars = brightness;
      }
      
      // Secondary layer of finer, denser stars
      float fineStarHash = hash(dir.x * 234.56 + dir.y * 456.78 + dir.z * 678.90);
      if (fineStarHash > 0.997) {
        stars += hash(fineStarHash * 45.67) * 0.45;
      }
      
      // Nebulae clouds (FBM noise with deep color layers)
      vec3 nebPos = dir * 2.8 + vec3(time * 0.003, 0.0, 0.0);
      float nebVal1 = fbm(nebPos);
      float nebVal2 = fbm(nebPos * 1.6 - vec3(0.0, time * 0.002, time * 0.001));
      
      // Space nebula colors
      vec3 spaceBlue = vec3(0.01, 0.03, 0.12);
      vec3 spacePurple = vec3(0.06, 0.01, 0.10);
      vec3 spaceMagenta = vec3(0.12, 0.02, 0.07);
      vec3 spaceOrange = vec3(0.12, 0.05, 0.01);
      
      vec3 nebulaColor = mix(spaceBlue, spacePurple, nebVal1);
      nebulaColor = mix(nebulaColor, spaceMagenta, nebVal2 * 0.5);
      nebulaColor = mix(nebulaColor, spaceOrange, smoothstep(0.48, 0.78, nebVal1 + nebVal2) * 0.4);
      
      // Dense Milky Way dust lane band along the galactic plane
      float galBand = smoothstep(0.35, 0.0, abs(dir.y + 0.12 * sin(dir.x * 3.5 + dir.z * 2.5)));
      vec3 milkyWayColor = vec3(0.22, 0.15, 0.11) * galBand * (0.3 + 0.7 * fbm(dir * 4.2));
      
      vec3 finalColor = nebulaColor * 0.75 + milkyWayColor + vec3(1.0) * stars;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const sunShaders = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float time;
    ${noiseGLSL}
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      float disp = fbm(position * 0.45 + vec3(0.0, 0.0, time * 0.5)) * 0.45;
      vec3 displaced = position + normal * disp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float time;
    uniform sampler2D uTexture;
    ${noiseGLSL}
    void main() {
      vec3 p = normalize(vPosition) * 4.2 + vec3(0.0, 0.0, time * 0.25);
      float n1 = fbm(p);
      float n2 = fbm(p * 2.2 - vec3(time * 0.18, time * 0.12, 0.0));
      
      // Blend procedural plasma with NASA sunspots texture
      vec4 texColor = texture2D(uTexture, vUv);
      
      vec3 colorCore = vec3(1.0, 0.95, 0.5) * texColor.rgb;
      vec3 colorMid = vec3(1.0, 0.48, 0.0) * texColor.rgb;
      vec3 colorOuter = vec3(0.85, 0.04, 0.0) * texColor.rgb;
      
      float mixFactor = smoothstep(0.12, 0.78, n1 + n2 * 0.28);
      vec3 color = mix(colorOuter, colorMid, mixFactor);
      color = mix(color, colorCore, smoothstep(0.42, 0.88, n1));
      
      float flare = smoothstep(0.70, 0.96, n2);
      color += vec3(1.0, 0.98, 0.85) * flare * 0.75;
      
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 3.8);
      color += vec3(1.0, 0.45, 0.0) * rim * 2.0;
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const earthShaders = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tCityLights;
    uniform sampler2D tWater;
    uniform sampler2D tTopology;
    uniform vec3 uSunPosition;
    uniform float time;
    ${noiseGLSL}
    void main() {
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // Calculate bumped normal using topology heightmap
      vec3 normal = normalize(vWorldNormal);
      float heightCenter = texture2D(tTopology, vUv).r;
      float heightRight = texture2D(tTopology, vUv + vec2(0.001, 0.0)).r;
      float heightTop = texture2D(tTopology, vUv + vec2(0.0, 0.001)).r;
      vec3 bumpNormal = normalize(normal + 0.04 * vec3(heightCenter - heightRight, heightCenter - heightTop, 0.0));
      
      vec4 dayTex = texture2D(tDiffuse, vUv);
      vec3 dayColor = dayTex.rgb;
      
      // Sample water specular mask
      float waterVal = texture2D(tWater, vUv).r;
      
      // Specular ocean reflections
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(0.0, dot(bumpNormal, halfDir)), 48.0) * waterVal * 1.8;
      
      float diffuse = dot(bumpNormal, lightDir);
      float dayFactor = smoothstep(-0.15, 0.15, diffuse);
      
      // Sample twinkling city lights
      vec4 cityTex = texture2D(tCityLights, vUv);
      float twinkle = 0.82 + 0.18 * sin(time * 4.0 + vWorldPosition.x * 12.0);
      vec3 cityLightsColor = cityTex.rgb * twinkle * 2.6;
      vec3 nightColor = vec3(0.002, 0.004, 0.008) + cityLightsColor;
      
      // Earth atmosphere scatter rim glow (blue marble haze)
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 3.5);
      vec3 atmosGlow = vec3(0.35, 0.65, 1.0) * rim * 1.2 * max(diffuse, 0.0);
      
      vec3 terrainColor = dayColor * (max(diffuse, 0.0) + 0.05) + vec3(0.8, 0.9, 1.0) * spec;
      vec3 finalColor = mix(nightColor, terrainColor, dayFactor) + atmosGlow;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const jupiterShaders = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    uniform float time;
    uniform vec3 uSunPosition;
    uniform sampler2D uTexture;
    ${noiseGLSL}
    void main() {
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);
      vec3 normal = normalize(vWorldNormal);
      float diffuse = max(dot(normal, lightDir), 0.0);
      
      // Animate bands moving at different speeds depending on latitude (y coordinate)
      vec2 uv = vUv;
      float bandSpeed = sin(uv.y * 12.0) * 0.012;
      uv.x += time * bandSpeed;
      
      // Add fine turbulent noise distortion to simulate gas storms
      float turbulence = fbm(vec3(uv * 18.0, time * 0.08)) * 0.015;
      uv.x += turbulence;
      uv.y += turbulence;
      
      // Great Red Spot vortex swirl
      vec2 spotCenter = vec2(0.62, 0.30); // Center of the GRS on the texture
      vec2 d = uv - spotCenter;
      // Handle UV wrapping
      if (d.x > 0.5) d.x -= 1.0;
      if (d.x < -0.5) d.x += 1.0;
      
      vec2 ovalD = d * vec2(1.8, 1.0);
      float dist = length(ovalD);
      if (dist < 0.065) {
        float swirl = (1.0 - dist / 0.065) * 4.8 - time * 0.6;
        float s = sin(swirl);
        float c = cos(swirl);
        vec2 rotD = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
        uv = spotCenter + rotD;
      }
      
      vec4 texColor = texture2D(uTexture, uv);
      
      // Fresnel limb darkening
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
      vec3 finalColor = texColor.rgb * (diffuse + 0.06);
      finalColor += vec3(0.85, 0.72, 0.55) * fresnel * 0.25 * diffuse;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const saturnShaders = {
  body: {
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vLocalPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      varying vec3 vLocalPosition;
      varying vec2 vUv;
      uniform sampler2D map;
      uniform sampler2D tRingMap;
      uniform vec3 uLocalSunPos;
      void main() {
        vec4 bodyColor = texture2D(map, vUv);
        vec3 normal = normalize(vWorldNormal);
        vec3 lightDir = normalize(vec3(0.0) - vWorldPosition);
        float diffuse = max(dot(normal, lightDir), 0.0);
        
        // Analytical Ring Shadow cast onto Saturn's sphere
        vec3 P = vLocalPosition;
        vec3 d = normalize(uLocalSunPos - P);
        float shadow = 1.0;
        
        if (abs(d.y) > 0.0001) {
          float t = -P.y / d.y;
          if (t > 0.0) {
            vec3 I = P + t * d;
            float r = length(I.xz);
            if (r >= 3.8 && r <= 6.8) {
              float ringU = (r - 3.8) / (6.8 - 3.8);
              float ringAlpha = texture2D(tRingMap, vec2(ringU, 0.5)).a;
              shadow = 1.0 - ringAlpha * 0.82;
            }
          }
        }
        
        vec3 finalColor = bodyColor.rgb * (diffuse * shadow + 0.05);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  },
  ring: {
    vertexShader: `
      varying vec3 vPosition;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform sampler2D map;
      uniform vec3 uLocalSunPos;
      void main() {
        vec4 ringColor = texture2D(map, vUv);
        if (ringColor.a < 0.05) discard;
        
        // Analytical Saturn body shadow cast onto the Ring plane
        vec3 P = vPosition;
        float R = 2.8; // Saturn body radius
        vec3 d = normalize(uLocalSunPos - P);
        float PdotD = dot(P, d);
        float disc = PdotD * PdotD - (dot(P, P) - R * R);
        float shadow = 1.0;
        
        if (disc >= 0.0) {
          float t = -PdotD - sqrt(disc);
          if (t > 0.0) {
            // Dark shadows with soft penumbra edge
            shadow = smoothstep(0.0, 0.35, t) * 0.12;
          }
        }
        
        gl_FragColor = vec4(ringColor.rgb * shadow, ringColor.a);
      }
    `
  }
};

export default function PlanetScene({ loaded }: PlanetSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // HUD element refs
  const hudContainerRef = useRef<HTMLDivElement>(null);
  const hudCoordsRef = useRef<HTMLDivElement>(null);
  const hudSpeedRef = useRef<HTMLDivElement>(null);
  const hudTargetRef = useRef<HTMLDivElement>(null);
  const hudScanDataRef = useRef<HTMLDivElement>(null);
  const hudWarnRef = useRef<HTMLDivElement>(null);
  const hudProgressRef = useRef<SVGCircleElement>(null);
  
  const [selectedPlanet, setSelectedPlanet] = useState<any | null>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!loaded || !canvasRef.current || !containerRef.current) return;

    if (!isWebGLAvailable()) {
      setWebglError(true);
      return;
    }

    // --- LENIS SETUP ---
    const lenis = new Lenis({
      lerp: 0.05,
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
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2500);
    
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebglError(true);
      lenis.destroy();
      return;
    }

    // Enable high-end render settings
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const clock = new THREE.Clock();

    const disposables: { dispose: () => void }[] = [];
    const addDisposable = (obj: any) => { if (obj && obj.dispose) disposables.push(obj); return obj; };

    // --- EFFECT COMPOSER POST-PROCESSING ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    // Volumetric space bloom pass
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.48,  // Strength
      0.35,  // Radius
      0.82   // Threshold (only glowing sun/corona/atmosphere shells bloom)
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

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

    // --- TEXTURE LOADER & REAL textures ---
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path: string) => {
      const tex = textureLoader.load(path);
      tex.colorSpace = THREE.SRGBColorSpace;
      addDisposable(tex);
      return tex;
    };

    // Glow sprite texture generator
    const texGlow = createTexture(64, 64, ctx => {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    });

    const texSun = loadTexture('/2k_sun.jpg');
    const texMercury = loadTexture('/2k_mercury.jpg');
    const texVenus = loadTexture('/2k_venus.jpg');
    const texEarth = loadTexture('/2k_earth_daymap.jpg');
    const texEarthCityLights = loadTexture('/2k_earth_night.jpg');
    const texEarthTopology = loadTexture('/2k_earth_topology.png');
    const texEarthWater = loadTexture('/2k_earth_water.png');

    const texEarthClouds = createTexture(1024, 512, ctx => {
      ctx.clearRect(0, 0, 1024, 512);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath(); ctx.ellipse(Math.random() * 1024, Math.random() * 512, Math.random() * 160 + 50, Math.random() * 35 + 12, Math.random() * 0.5 - 0.25, 0, Math.PI * 2); ctx.fill();
      }
      const drawNoiseLocal = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
        const imgData = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * amount;
          imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
          imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
          imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
      };
      drawNoiseLocal(ctx, 1024, 512, 12);
    });

    const texMars = loadTexture('/2k_mars.jpg');
    const texSaturn = loadTexture('/2k_saturn.jpg');
    const texSaturnRings = loadTexture('/2k_saturn_ring.png');
    const texUranus = loadTexture('/2k_uranus.jpg');
    const texNeptune = loadTexture('/2k_neptune.jpg');

    // --- INFINITE SPACE DUST ---
    const dustCount = 800;
    const dustGeo = addDisposable(new THREE.BufferGeometry());
    const dustOffsets = new Float32Array(dustCount * 3);
    const dustVels = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustOffsets[i * 3] = (Math.random() - 0.5) * 45;
      dustOffsets[i * 3 + 1] = (Math.random() - 0.5) * 45;
      dustOffsets[i * 3 + 2] = (Math.random() - 0.5) * 45;
      dustVels[i * 3] = (Math.random() - 0.5) * 0.006;
      dustVels[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
      dustVels[i * 3 + 2] = (Math.random() - 0.5) * 0.006;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dustCount * 3), 3));
    const dustMat = addDisposable(new THREE.PointsMaterial({
      size: 0.05,
      color: 0x93C5FD,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending
    }));
    const spaceDust = new THREE.Points(dustGeo, dustMat);
    scene.add(spaceDust);

    // --- WARP TRANSITION STREAKS ---
    const warpGeo = addDisposable(new THREE.BufferGeometry());
    const warpPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600 * 3; i++) warpPos[i] = (Math.random() - 0.5) * 60;
    warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
    const warpMat = addDisposable(new THREE.PointsMaterial({
      size: 0.12,
      color: 0x60A5FA,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    }));
    const warpSystem = new THREE.Points(warpGeo, warpMat);
    scene.add(warpSystem);

    // --- SPACE SHADER BACKDROP ---
    const skyboxGeo = addDisposable(new THREE.SphereGeometry(950, 32, 32));
    const skyboxMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: skyboxShaders.vertexShader,
      fragmentShader: skyboxShaders.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    }));
    const skybox = new THREE.Mesh(skyboxGeo, skyboxMat);
    scene.add(skybox);

    // --- LIGHTING ENVIRONMENT ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.04);
    scene.add(ambientLight);
    
    // Core Sun light source
    const sunLight = new THREE.PointLight(0xffffff, 4.5, 1200);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 450;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x93C5FD, 0.18);
    scene.add(fillLight);

    // --- PLANETS & ATMOSPHERES SETUP ---
    const planets: Record<string, THREE.Mesh | THREE.Group> = {};
    const interactableMeshes: THREE.Mesh[] = [];

    // Helper to generate atmospheric scattering shells (BackSide volumetric glow)
    const createAtmosphereMaterial = (color: THREE.Color, intensity: number, powVal: number) => {
      return addDisposable(new THREE.ShaderMaterial({
        uniforms: {
          uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
          uColor: { value: color },
          uIntensity: { value: intensity },
          uPower: { value: powVal }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          uniform vec3 uSunPosition;
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uPower;
          void main() {
            vec3 lightDir = normalize(uSunPosition - vWorldPosition);
            // Volumetric backface glow
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), uPower);
            float lit = dot(vNormal, lightDir);
            float scatter = fresnel * uIntensity * smoothstep(-0.25, 0.25, lit);
            gl_FragColor = vec4(uColor, scatter);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      }));
    };

    // 1. SUN
    const sunGeo = addDisposable(new THREE.SphereGeometry(6, 64, 64));
    const sunMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uTexture: { value: texSun }
      },
      vertexShader: sunShaders.vertexShader,
      fragmentShader: sunShaders.fragmentShader
    }));
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);
    planets['Sun'] = sun;
    interactableMeshes.push(sun);
 
    // Sun Volumetric Corona Glow
    [15, 22, 34, 52].forEach((size, i) => {
      const glowMat = addDisposable(new THREE.SpriteMaterial({
        map: texGlow,
        color: 0xFF5500,
        transparent: true,
        opacity: [0.36, 0.18, 0.08, 0.04][i],
        blending: THREE.AdditiveBlending
      }));
      const sprite = new THREE.Sprite(glowMat);
      sprite.scale.set(size, size, 1);
      sun.add(sprite);
    });
 
    // 2. MERCURY (Low segment far, high near - lod balance)
    const mercury = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.5, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMercury,
        bumpMap: texMercury,
        bumpScale: 0.008,
        roughness: 0.88,
        metalness: 0.1
      }))
    );
    mercury.position.set(0, 0, -40);
    mercury.castShadow = true;
    mercury.receiveShadow = true;
    scene.add(mercury);
    planets['Mercury'] = mercury;
    interactableMeshes.push(mercury);
 
    // 3. VENUS
    const venus = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.2, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texVenus,
        bumpMap: texVenus,
        bumpScale: 0.004,
        roughness: 0.9,
        metalness: 0.0
      }))
    );
    venus.position.set(0, 0, -80);
    venus.castShadow = true;
    venus.receiveShadow = true;
    scene.add(venus);
    planets['Venus'] = venus;
    interactableMeshes.push(venus);
 
    // Venus atmosphere shell
    const vAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.26, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#E8C66A'), 0.45, 2.0)
    );
    venus.add(vAtmos);
 
    // 4. EARTH (PBR + custom shader for day/night city lights, elevation bump, water specular, and cloud shadows)
    const earthGeo = addDisposable(new THREE.SphereGeometry(1.3, 48, 48));
    const earthMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texEarth },
        tCityLights: { value: texEarthCityLights },
        tWater: { value: texEarthWater },
        tTopology: { value: texEarthTopology },
        uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
        time: { value: 0 }
      },
      vertexShader: earthShaders.vertexShader,
      fragmentShader: earthShaders.fragmentShader
    }));
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(0, 0, -120);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);
    planets['Earth'] = earth;
    interactableMeshes.push(earth);
 
    // Earth blue atmosphere
    const eAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.38, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#4FAAFF'), 0.52, 2.5)
    );
    earth.add(eAtmos);

    // Separate Earth clouds layer
    const cloudGeo = addDisposable(new THREE.SphereGeometry(1.315, 48, 48));
    const cloudMat = addDisposable(new THREE.MeshStandardMaterial({
      alphaMap: texEarthClouds,
      transparent: true,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      blending: THREE.NormalBlending,
      depthWrite: false
    }));
    const earthClouds = new THREE.Mesh(cloudGeo, cloudMat);
    earthClouds.castShadow = true;
    earth.add(earthClouds);
 
    // 5. MARS
    const mars = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.7, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMars,
        bumpMap: texMars,
        bumpScale: 0.012,
        roughness: 0.85,
        metalness: 0.05
      }))
    );
    mars.position.set(0, 0, -160);
    mars.castShadow = true;
    mars.receiveShadow = true;
    scene.add(mars);
    planets['Mars'] = mars;
    interactableMeshes.push(mars);
 
    // Mars atmosphere shell
    const mAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.74, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#FF5522'), 0.32, 3.2)
    );
    mars.add(mAtmos);
 
    // 6. INSTANCED 3D ASTEROID BELT (Awwwards optimization - 1 draw call!)
    const asteroidCount = 1200;
    // Create random displaced rock geometries
    const rockGeo = addDisposable(new THREE.DodecahedronGeometry(0.08, 1));
    const rockPosAttr = rockGeo.attributes.position;
    for (let i = 0; i < rockPosAttr.count; i++) {
      const x = rockPosAttr.getX(i);
      const y = rockPosAttr.getY(i);
      const z = rockPosAttr.getZ(i);
      const deform = 0.75 + Math.random() * 0.5;
      rockPosAttr.setXYZ(i, x * deform, y * deform, z * deform);
    }
    rockGeo.computeVertexNormals();
 
    const rockMat = addDisposable(new THREE.MeshStandardMaterial({
      color: 0x7E7E7E,
      roughness: 0.9,
      metalness: 0.1
    }));
 
    const asteroidBelt = new THREE.InstancedMesh(rockGeo, rockMat, asteroidCount);
    asteroidBelt.position.set(0, 0, -190);
    asteroidBelt.castShadow = true;
    asteroidBelt.receiveShadow = true;
    
    // Position instances along orbital rings
    const dummy = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 9;
      const x = Math.cos(angle) * radius;
      const y = (Math.random() - 0.5) * 3.8;
      const z = Math.sin(angle) * radius;
      
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.5 + Math.random() * 1.0;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      asteroidBelt.setMatrixAt(i, dummy.matrix);
    }
    asteroidBelt.instanceMatrix.needsUpdate = true;
    scene.add(asteroidBelt);
 
    // 7. JUPITER (swirling storms + bands)
    const texJupiter = loadTexture('/2k_jupiter.jpg');
    const jupGeo = addDisposable(new THREE.SphereGeometry(3.5, 54, 54));
    const jupMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
        uTexture: { value: texJupiter }
      },
      vertexShader: jupiterShaders.vertexShader,
      fragmentShader: jupiterShaders.fragmentShader
    }));
    const jupiter = new THREE.Mesh(jupGeo, jupMat);
    jupiter.position.set(0, 0, -220);
    jupiter.castShadow = true;
    jupiter.receiveShadow = true;
    scene.add(jupiter);
    planets['Jupiter'] = jupiter;
    interactableMeshes.push(jupiter);
 
    // Jupiter atmosphere shell
    const jAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(3.7, 54, 54)),
      createAtmosphereMaterial(new THREE.Color('#F59E0B'), 0.32, 2.2)
    );
    jupiter.add(jAtmos);
 
    // 8. SATURN (Custom analytical shadows)
    const saturnGroup = new THREE.Group();
    saturnGroup.position.set(0, 0, -290);
    
    // Saturn Body
    const saturnMesh = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.8, 54, 54)),
      addDisposable(new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texSaturn },
          tRingMap: { value: texSaturnRings },
          uLocalSunPos: { value: new THREE.Vector3(0, 0, 290) }
        },
        vertexShader: saturnShaders.body.vertexShader,
        fragmentShader: saturnShaders.body.fragmentShader
      }))
    );
    saturnMesh.userData = { name: 'Saturn', isHovered: false };
    saturnMesh.castShadow = true;
    saturnMesh.receiveShadow = true;
    saturnGroup.add(saturnMesh);
 
    // Saturn Rings
    const ringGeo = addDisposable(new THREE.RingGeometry(3.8, 6.8, 128));
    const ringGeoPos = ringGeo.attributes.position;
    const ringGeoUvs = ringGeo.attributes.uv;
    for (let i = 0; i < ringGeoPos.count; i++) {
      const x = ringGeoPos.getX(i);
      const y = ringGeoPos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      ringGeoUvs.setXY(i, (r - 3.8) / (6.8 - 3.8), 0.5);
    }
    const ringMesh = new THREE.Mesh(
      ringGeo,
      addDisposable(new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texSaturnRings },
          uLocalSunPos: { value: new THREE.Vector3(0, 0, 290) }
        },
        vertexShader: saturnShaders.ring.vertexShader,
        fragmentShader: saturnShaders.ring.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true
      }))
    );
    ringMesh.rotation.x = -Math.PI / 2;
    saturnGroup.add(ringMesh);
    saturnGroup.rotation.z = 0.46; // tilt
    scene.add(saturnGroup);
    planets['Saturn'] = saturnGroup;
    interactableMeshes.push(saturnMesh);
 
    // Saturn atmosphere shell
    const sAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(3.0, 54, 54)),
      createAtmosphereMaterial(new THREE.Color('#E8D49A'), 0.3, 2.0)
    );
    saturnMesh.add(sAtmos);
 
    // 9. URANUS
    const uranusGroup = new THREE.Group();
    uranusGroup.position.set(0, 0, -360);
    const uranusMesh = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.0, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texUranus,
        bumpMap: texUranus,
        bumpScale: 0.005,
        roughness: 0.88,
        metalness: 0.0
      }))
    );
    uranusMesh.userData = { name: 'Uranus', isHovered: false };
    uranusMesh.castShadow = true;
    uranusMesh.receiveShadow = true;
    uranusGroup.add(uranusMesh);
 
    // Uranus thin ring
    const uRing = new THREE.Mesh(
      addDisposable(new THREE.RingGeometry(2.5, 3.2, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x93E3E3,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: true
      }))
    );
    uRing.rotation.x = Math.PI / 2;
    uranusGroup.add(uRing);
    uranusGroup.rotation.z = 1.7; // rot side
    scene.add(uranusGroup);
    planets['Uranus'] = uranusGroup;
    interactableMeshes.push(uranusMesh);
 
    // Uranus atmosphere shell
    const uAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.14, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#93E3E3'), 0.42, 2.0)
    );
    uranusMesh.add(uAtmos);
 
    // 10. NEPTUNE
    const neptune = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.9, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texNeptune,
        bumpMap: texNeptune,
        bumpScale: 0.006,
        roughness: 0.85,
        metalness: 0.05
      }))
    );
    neptune.position.set(0, 0, -430);
    neptune.castShadow = true;
    neptune.receiveShadow = true;
    scene.add(neptune);
    planets['Neptune'] = neptune;
    interactableMeshes.push(neptune);
 
    // Neptune atmosphere shell
    const nAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.02, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#3B82F6'), 0.5, 2.0)
    );
    neptune.add(nAtmos);

    // --- COMET ---
    const cometGroup = new THREE.Group();
    const cometHead = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.12, 16, 16)),
      addDisposable(new THREE.MeshBasicMaterial({ color: 0xffffff }))
    );
    cometGroup.add(cometHead);
    const cometTailMat = addDisposable(new THREE.SpriteMaterial({
      map: texGlow,
      color: 0x93C5FD,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    }));
    for (let i = 0; i < 80; i++) {
      const tail = new THREE.Sprite(cometTailMat);
      const scale = 0.45 * (1 - i / 80);
      tail.scale.set(scale, scale, 1);
      tail.position.set(i * 0.08, 0, 0);
      cometGroup.add(tail);
    }
    scene.add(cometGroup);
    let cometActive = false;
    let cometProgress = 0;
    setInterval(() => { if (!cometActive) { cometActive = true; cometProgress = 0; } }, 18000);

    // Set initial camera
    camera.position.set(0, 0, 32);

    // --- INTERACTION & SELECTION ---
    const raycaster = new THREE.Raycaster();
    raycaster.camera = camera;
    const mouse = new THREE.Vector2();
    let currentMouseNDCX = 0, currentMouseNDCY = 0;

    const onMouseClick = () => {
      const intersects = raycaster.intersectObjects(interactableMeshes, false);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        let name = mesh.userData.name;
        if (!name && mesh.parent) name = mesh.parent.children[0].userData.name;
        if (name && planetData[name as keyof typeof planetData]) {
          setSelectedPlanet(planetData[name as keyof typeof planetData]);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      currentMouseNDCX = (e.clientX / window.innerWidth) * 2 - 1;
      currentMouseNDCY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.x = currentMouseNDCX;
      mouse.y = currentMouseNDCY;
      
      const intersects = raycaster.intersectObjects(interactableMeshes, false);
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

      // Update shader materials
      if (sunMat.uniforms) sunMat.uniforms.time.value = time;
      if (earthMat.uniforms) earthMat.uniforms.time.value = time;
      if (jupMat.uniforms) jupMat.uniforms.time.value = time;
      if (skyboxMat.uniforms) skyboxMat.uniforms.time.value = time;

      // Update local sun positions for analytical shadows
      if (saturnMesh.material && (saturnMesh.material as THREE.ShaderMaterial).uniforms) {
        const localSunPos = saturnMesh.worldToLocal(new THREE.Vector3(0, 0, 0));
        (saturnMesh.material as THREE.ShaderMaterial).uniforms.uLocalSunPos.value.copy(localSunPos);
      }
      if (ringMesh.material && (ringMesh.material as THREE.ShaderMaterial).uniforms) {
        const localSunPos = ringMesh.worldToLocal(new THREE.Vector3(0, 0, 0));
        (ringMesh.material as THREE.ShaderMaterial).uniforms.uLocalSunPos.value.copy(localSunPos);
      }

      // Make skybox float with camera position
      skybox.position.copy(camera.position);

      // Rotate asteroid belt
      asteroidBelt.rotation.y += 0.00018;

      // Comet logic
      if (cometActive) {
        cometProgress += dt * 0.15;
        if (cometProgress > 1) cometActive = false;
        else {
          const start = new THREE.Vector3(-220, 60, camera.position.z - 40);
          const end = new THREE.Vector3(220, -40, camera.position.z - 120);
          cometGroup.position.lerpVectors(start, end, cometProgress);
          const dir = new THREE.Vector3().subVectors(end, start).normalize();
          cometGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.negate());
        }
      } else {
        cometGroup.position.set(0, 1000, 0);
      }

      // Track nearest planet to display info on HUD
      let nearestDist = Infinity;
      let nearestName = "DEEP SPACE";
      let nearestColor = "#10B981";
      
      Object.entries(planets).forEach(([name, obj]) => {
        const d = Math.abs(obj.position.z - camera.position.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestName = name;
          nearestColor = planetData[name as keyof typeof planetData]?.color || "#10B981";
        }
      });

      // Natural axis auto-rotations (relative relative speeds)
      sun.rotation.y += 0.0006;
      mercury.rotation.y += 0.00015;
      venus.rotation.y -= 0.00008; // retrograde
      earth.rotation.y += 0.0028;
      earthClouds.rotation.y += 0.0004; // independent cloud drift
      mars.rotation.y += 0.0027;
      jupiter.rotation.y += 0.0068;
      saturnMesh.rotation.y += 0.0062;
      
      const uMesh = planets['Uranus']?.children[0];
      if (uMesh) uMesh.rotation.y -= 0.0039; // side retrograde
      
      neptune.rotation.y += 0.0042;

      // Space dust tracking
      const dustPosAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        dustOffsets[i * 3] += dustVels[i * 3];
        dustOffsets[i * 3 + 1] += dustVels[i * 3 + 1];
        dustOffsets[i * 3 + 2] += dustVels[i * 3 + 2];
        
        if (Math.abs(dustOffsets[i * 3]) > 25) dustOffsets[i * 3] = (Math.random() - 0.5) * 50;
        if (Math.abs(dustOffsets[i * 3 + 1]) > 25) dustOffsets[i * 3 + 1] = (Math.random() - 0.5) * 50;
        if (Math.abs(dustOffsets[i * 3 + 2]) > 25) dustOffsets[i * 3 + 2] = (Math.random() - 0.5) * 50;
        
        dustPosAttr.setXYZ(i, camera.position.x + dustOffsets[i * 3], camera.position.y + dustOffsets[i * 3 + 1], camera.position.z + dustOffsets[i * 3 + 2]);
      }
      dustPosAttr.needsUpdate = true;

      // Dynamic Warp Easing based on scroll speed
      const st = ScrollTrigger.getAll()[0];
      let velocity = 0;
      if (st) {
        velocity = Math.abs(st.getVelocity());
        (window as any).scrollVelocity = velocity; // for audio toggle
        
        // FOV stretching
        camera.fov = 60 + Math.min(26, velocity * 0.012);
        camera.updateProjectionMatrix();

        // Warp particles fade-in and animate
        if (velocity > 120) {
          warpMat.opacity = Math.min(0.85, (velocity - 120) / 400);
          const wPosAttr = warpGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < 600; i++) {
            let z = wPosAttr.getZ(i) + velocity * 0.008;
            if (z > camera.position.z + 10) z = camera.position.z - 80;
            wPosAttr.setXYZ(i, camera.position.x + (Math.random() - 0.5) * 40, camera.position.y + (Math.random() - 0.5) * 40, z);
          }
          wPosAttr.needsUpdate = true;
        } else {
          warpMat.opacity *= 0.85;
        }
      }

      // Camera drift & shake based on scroll speed + ambient hover
      const hoverShake = velocity * 0.00018;
      camera.position.x += (currentMouseNDCX * 1.2 - camera.position.x) * 0.03 + (Math.random() - 0.5) * hoverShake;
      camera.position.y += (currentMouseNDCY * 0.5 - camera.position.y) * 0.03 + (Math.random() - 0.5) * hoverShake;

      // Sun and Jupiter high-gravity shakes
      const sunProx = Math.max(0, 1 - Math.abs(camera.position.z) / 22) * 0.016;
      if (sunProx > 0) {
        camera.position.x += (Math.random() - 0.5) * sunProx;
        camera.position.y += (Math.random() - 0.5) * sunProx;
      }
      const jupProx = Math.max(0, 1 - Math.abs(camera.position.z + 220) / 28) * 0.014;
      if (jupProx > 0) {
        camera.position.x += (Math.random() - 0.5) * jupProx;
        camera.position.y += (Math.random() - 0.5) * jupProx;
      }

      // Dynamic camera look at target (slalom auto-tracking)
      const lookTarget = new THREE.Vector3(0, 0, camera.position.z - 18);
      camera.lookAt(lookTarget);

      fillLight.position.copy(camera.position);

      // Direct DOM updates for High-Frequency HUD display
      if (hudCoordsRef.current) {
        hudCoordsRef.current.innerText = `COORD: X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;
      }
      if (hudSpeedRef.current && st) {
        const lySpeed = (velocity * 0.024).toFixed(1);
        hudSpeedRef.current.innerText = `VELOCITY: ${lySpeed} LY/S`;
      }
      if (hudTargetRef.current) {
        hudTargetRef.current.innerText = nearestDist < 25 ? `SCAN LOCK: ${nearestName.toUpperCase()}` : `SCANNING DEEP SPACE...`;
        hudTargetRef.current.style.color = nearestColor;
      }
      if (hudScanDataRef.current) {
        if (nearestDist < 25) {
          const info = planetData[nearestName as keyof typeof planetData];
          hudScanDataRef.current.innerHTML = `
            ATMOS: ${info.atmosphere.toUpperCase()}<br/>
            DIA: ${info.diameter}<br/>
            MOONS: ${info.moons}<br/>
            TYPE: ${info.type.toUpperCase()}
          `;
          hudScanDataRef.current.style.opacity = '1';
        } else {
          hudScanDataRef.current.style.opacity = '0';
        }
      }
      
      // Warning overlay when too close to Sun
      if (hudWarnRef.current) {
        if (nearestName === 'Sun' && nearestDist < 20) {
          hudWarnRef.current.style.opacity = '1';
          hudWarnRef.current.innerText = `CRITICAL WARNING: HIGH SOLAR DYNAMICS`;
        } else if (velocity > 350) {
          hudWarnRef.current.style.opacity = '1';
          hudWarnRef.current.innerText = `HYPERDRIVE ACTIVE - FOV DISTORTION`;
        } else {
          hudWarnRef.current.style.opacity = '0';
        }
      }

      // HUD Color variables
      document.documentElement.style.setProperty('--hud-color', nearestColor);

      // Orbital progress bar
      if (hudProgressRef.current) {
        const progress = Math.max(0, Math.min(1, Math.abs(camera.position.z - 32) / 470));
        const strokeDashOffset = 188 - (progress * 188);
        hudProgressRef.current.style.strokeDashoffset = String(strokeDashOffset);
      }

      // Render composer instead of raw renderer (applies post-processing bloom!)
      composer.render();
    };
    animate();

    // --- GSAP SCROLL SLALOM TIMELINE ---
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
      }
    });

    // Curving camera slalom path (keeps planets centered at key stops)
    tl.to(camera.position, { z: 18, x: 0, y: 0.3, ease: "power2.inOut" }, 0)       // Sun
      .to(camera.position, { z: -12, x: -6.0, y: 2.0, ease: "power2.inOut" }, 0.5)  // Swoop 1 (Slalom past Sun)
      .to(camera.position, { z: -34, x: 0.1, y: -0.05, ease: "power2.inOut" }, 1)   // Mercury
      .to(camera.position, { z: -58, x: 7.0, y: -2.2, ease: "power2.inOut" }, 1.5)  // Swoop 2 (Slalom past Mercury)
      .to(camera.position, { z: -74, x: -0.15, y: 0.05, ease: "power2.inOut" }, 2)  // Venus
      .to(camera.position, { z: -98, x: -8.0, y: 3.0, ease: "power2.inOut" }, 2.5)  // Swoop 3 (Slalom past Venus)
      .to(camera.position, { z: -113, x: 0, y: 0.15, ease: "power2.inOut" }, 3)     // Earth
      .to(camera.position, { z: -138, x: 8.0, y: -2.8, ease: "power2.inOut" }, 3.5) // Swoop 4 (Slalom past Earth)
      .to(camera.position, { z: -153, x: 0.1, y: -0.05, ease: "power2.inOut" }, 4)  // Mars
      .to(camera.position, { z: -188, x: -12.0, y: 4.5, ease: "power2.inOut" }, 4.5) // Swoop 5 (Belt passing)
      .to(camera.position, { z: -212, x: -0.3, y: 0.15, ease: "power2.inOut" }, 5)  // Jupiter
      .to(camera.position, { z: -252, x: 15.0, y: -6.0, ease: "power2.inOut" }, 5.5) // Swoop 6 (Slalom past Jupiter)
      .to(camera.position, { z: -276, x: 0.4, y: 0.75, ease: "power2.inOut" }, 6)   // Saturn
      .to(camera.position, { z: -322, x: -14.0, y: 5.0, ease: "power2.inOut" }, 6.5) // Swoop 7 (Slalom past Saturn)
      .to(camera.position, { z: -348, x: -0.2, y: 0.1, ease: "power2.inOut" }, 7)   // Uranus
      .to(camera.position, { z: -392, x: 12.0, y: -4.5, ease: "power2.inOut" }, 7.5) // Swoop 8 (Slalom past Uranus)
      .to(camera.position, { z: -418, x: 0.25, y: -0.1, ease: "power2.inOut" }, 8)  // Neptune
      .to(camera.position, { z: -220, y: 150, x: 0, ease: "power2.inOut" }, 9);     // Overview angle

    gsap.utils.toArray('.reveal-text').forEach((el: any) => {
      gsap.fromTo(el, 
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, duration: 0.8, scrollTrigger: { trigger: el, start: "top 85%", end: "top 25%", toggleActions: "play reverse play reverse" } }
      );
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', onMouseClick);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frame);
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
      
      composer.dispose();
      disposables.forEach(d => d.dispose());
      scene.children.forEach(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
    };
  }, [loaded]);

  const renderInfoPanel = (key: keyof typeof planetData, alignment: 'start'|'end', planetColor: string) => {
    const data = planetData[key];
    return (
      <section className={`h-screen w-full flex items-center justify-${alignment} px-12 md:px-24 xl:px-48`}>
        <div className="reveal-text glass-panel p-8 max-w-sm pointer-events-auto relative overflow-hidden" 
             style={{ borderLeft: `3px solid ${planetColor}`, boxShadow: `0 0 30px -10px ${planetColor}33` }}>
          <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-mono tracking-wider text-white/40 bg-white/5">
            {data.type.toUpperCase()}
          </div>
          <h2 className="text-4xl font-display font-black mb-5 tracking-wide" style={{ color: planetColor }}>{data.name.toUpperCase()}</h2>
          <div className="space-y-3 font-mono text-[11px] text-white/70 uppercase">
            <div className="flex justify-between border-b border-white/5 pb-1.5"><span>Diameter</span> <span className="text-white font-medium">{data.diameter}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1.5"><span>Distance</span> <span className="text-white font-medium">{data.distance}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1.5"><span>Moons</span> <span className="text-white font-medium">{data.moons}</span></div>
            <div className="flex justify-between pb-1.5"><span>Atmos</span> <span className="text-white font-medium">{data.atmosphere}</span></div>
          </div>
          <button 
            className="explore-btn interactive"
            onClick={() => setSelectedPlanet(data)}
          >
            Access Core Files
          </button>
        </div>
      </section>
    );
  };

  if (webglError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white text-center px-8">
        <div className="text-6xl mb-6" style={{ color: '#FF6600' }}>&#9728;</div>
        <h2 className="text-2xl font-display font-bold tracking-widest mb-4">SYSTEM RUNTIME FAILURE</h2>
        <p className="text-white/50 font-mono text-sm max-w-sm">
          A WebGL 3D context could not be initiated in this ship configuration.<br /><br />
          Please verify hardware acceleration settings.
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative w-full" style={{ height: "1000vh" }}>
        <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-screen z-0 outline-none" />
        
        {/* Futuristic Spacecraft HUD Overlay */}
        <div 
          ref={hudContainerRef}
          className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 font-mono text-[10px] tracking-wider transition-colors duration-500"
          style={{ color: 'var(--hud-color, #10B981)', textShadow: '0 0 5px var(--hud-color)' }}
        >
          {/* HUD Top Bar */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5 bg-black/55 backdrop-blur-md p-3 border border-white/10 rounded-lg max-w-xs transition-colors duration-500"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>SYS ID: <span className="text-white font-semibold">NASA-APL-CE-09</span></div>
              <div>SECTOR: <span className="text-white">SOLAR SYSTEM</span></div>
              <div ref={hudCoordsRef}>COORD: SCANNING...</div>
            </div>

            {/* Warning overlay alerts */}
            <div ref={hudWarnRef} className="text-[12px] font-bold text-red-500 animate-pulse bg-red-950/40 border border-red-500/20 px-4 py-2.5 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none select-none max-w-sm text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              ALERT: ENCOUNTERING HIGH SOLAR THERMAL RESISTANCE
            </div>
            
            <div className="flex flex-col items-end gap-1.5 bg-black/55 backdrop-blur-md p-3 border border-white/10 rounded-lg text-right"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div ref={hudSpeedRef}>VELOCITY: 0.0 LY/S</div>
              <div>AUTOPILOT: <span className="text-white font-semibold">WARP ACTIVE</span></div>
              <div className="text-[8px] text-white/50">SECURE CONTEXT / PROMPT VALIDATED</div>
            </div>
          </div>

          {/* HUD Middle Reticle and Progress Lock */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full opacity-35" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', color: 'var(--hud-color)' }}>
                <circle cx="50" cy="50" r="30" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" fill="none" />
                <circle 
                  ref={hudProgressRef} 
                  cx="50" 
                  cy="50" 
                  r="30" 
                  stroke="currentColor" 
                  strokeWidth="1.2" 
                  fill="none" 
                  strokeDasharray="188" 
                  strokeDashoffset="188" 
                  className="transition-all duration-300"
                />
              </svg>
              
              <div className="absolute w-24 h-24 border border-dashed rounded-full opacity-15 animate-spin" style={{ animationDuration: '40s', borderColor: 'var(--hud-color)' }} />
              <div className="absolute w-12 h-12 border rounded-full opacity-25" style={{ borderColor: 'var(--hud-color)' }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white opacity-80" />
              <div ref={hudTargetRef} className="absolute mt-24 text-[8px] text-center font-bold tracking-widest w-40 text-white/80">LOCKING...</div>
            </div>
          </div>

          {/* HUD Bottom telemetry */}
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1 bg-black/55 backdrop-blur-md p-3 border border-white/10 rounded-lg max-w-[190px]"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="font-bold text-[9px] text-white/40 mb-1">NAV TELEMETRY</div>
              <div ref={hudScanDataRef} className="text-white/80 leading-relaxed text-[9px] transition-all duration-300 opacity-0">
                ATMOS: UNKNOWN<br/>
                DIA: 0KM<br/>
                MOONS: 0<br/>
                STATUS: DEEP SPACE
              </div>
            </div>
            
            <div className="text-right text-[8px] text-white/30 max-w-xs pointer-events-none select-none">
              HUD SYSTEMS v4.11 / VERIFIED PILOT CONTEXT
            </div>
          </div>
        </div>
        
        {/* Info panels overlay */}
        <div className="relative z-10 w-full pointer-events-none">
          <section className="h-screen w-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="reveal-text text-5xl md:text-7xl lg:text-9xl font-display font-black tracking-[0.25em] text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]">
              CELESTIAL<br/>EXPLORER
            </h1>
            <p className="reveal-text mt-8 text-lg md:text-xl text-white/50 font-sans max-w-xl tracking-[0.3em] uppercase">
              Voyage through the cosmic architecture
            </p>
            <div className="absolute bottom-10 animate-bounce text-white/20 font-mono text-[9px] tracking-widest">
              ↓ SCROLL ENGINES TO IGNITE WARP DRIVE ↓
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
          
          <section className="h-screen w-full flex flex-col items-center justify-center text-center px-4 relative">
            <h2 className="reveal-text text-4xl md:text-6xl font-display font-black tracking-[0.2em] text-white/90">
              DEEP EXPEDITION COMPLETE
            </h2>
            <p className="reveal-text mt-4 text-xs md:text-sm text-white/45 font-mono max-w-md uppercase tracking-widest">
              System monitoring active. You have completed the orbital transit path.
            </p>
          </section>
        </div>
      </div>

      <PlanetModal 
        planet={selectedPlanet} 
        onClose={() => setSelectedPlanet(null)} 
      />
    </>
  );
}