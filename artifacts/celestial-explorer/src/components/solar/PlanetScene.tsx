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
  Sun: { name: 'The Sun', type: 'Yellow Dwarf Star', distance: '0 km', diameter: '1,392,684 km', moons: '0', atmosphere: 'Hydrogen, Helium', fact: 'The Sun accounts for 99.86% of the mass in the solar system.', color: '#FF6600' },
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
      float disp = fbm(position * 0.4 + vec3(0.0, 0.0, time * 0.5)) * 0.4;
      vec3 displaced = position + normal * disp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float time;
    ${noiseGLSL}
    void main() {
      vec3 p = normalize(vPosition) * 4.0 + vec3(0.0, 0.0, time * 0.2);
      float n1 = fbm(p);
      float n2 = fbm(p * 2.0 - vec3(time * 0.15, time * 0.1, 0.0));
      vec3 colorCore = vec3(1.0, 0.9, 0.45);
      vec3 colorMid = vec3(1.0, 0.45, 0.0);
      vec3 colorOuter = vec3(0.85, 0.05, 0.0);
      float mixFactor = smoothstep(0.15, 0.75, n1 + n2 * 0.25);
      vec3 color = mix(colorOuter, colorMid, mixFactor);
      color = mix(color, colorCore, smoothstep(0.45, 0.85, n1));
      float flare = smoothstep(0.72, 0.95, n2);
      color += vec3(1.0, 0.95, 0.8) * flare * 0.7;
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 3.5);
      color += vec3(1.0, 0.4, 0.0) * rim * 1.8;
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
    uniform sampler2D tClouds;
    uniform vec3 uSunPosition;
    uniform float time;
    ${noiseGLSL}
    void main() {
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(vWorldNormal);
      vec4 dayTex = texture2D(tDiffuse, vUv);
      vec3 dayColor = dayTex.rgb;
      bool isOcean = dayColor.b > 0.35 && dayColor.r < 0.25;
      vec3 pForNoise = vWorldPosition * 20.0;
      float detailNoise = fbm(pForNoise);
      if (!isOcean) {
        dayColor *= 0.68 + 0.45 * detailNoise;
      } else {
        dayColor *= 0.85;
      }
      float spec = 0.0;
      if (isOcean) {
        vec3 halfDir = normalize(lightDir + viewDir);
        spec = pow(max(0.0, dot(normal, halfDir)), 48.0) * 1.5;
      }
      float diffuse = dot(normal, lightDir);
      float dayFactor = smoothstep(-0.15, 0.15, diffuse);
      float cityNoise = step(0.65, fbm(vWorldPosition * 85.0 + vec3(12.0)));
      float isLandVal = isOcean ? 0.0 : 1.0;
      vec3 cityLightsColor = vec3(1.0, 0.72, 0.32) * cityNoise * isLandVal * 2.5;
      vec3 nightColor = vec3(0.003, 0.006, 0.012) + cityLightsColor;
      vec2 cloudUv = vUv + vec2(time * 0.0018, 0.0);
      vec4 cloudTex = texture2D(tClouds, cloudUv);
      vec3 cloudColor = cloudTex.rgb * max(diffuse, 0.0);
      float cloudAlpha = cloudTex.a;
      vec3 baseTerrain = mix(nightColor, dayColor * (max(diffuse, 0.0) + 0.05) + vec3(0.85, 0.92, 1.0) * spec, dayFactor);
      vec3 finalColor = mix(baseTerrain, cloudColor, cloudAlpha * dayFactor * 0.88);
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
    ${noiseGLSL}
    void main() {
      vec3 lightDir = normalize(uSunPosition - vWorldPosition);
      vec3 normal = normalize(vWorldNormal);
      float diffuse = max(dot(normal, lightDir), 0.0);
      vec2 uv = vUv;
      float distortion = fbm(vec3(uv * 12.0, time * 0.12)) * 0.06;
      float bandCoord = uv.y * 7.5 + distortion;
      float bandNoise = fbm(vec3(uv.x * 2.2, bandCoord, time * 0.04));
      vec3 colDark = vec3(0.5, 0.32, 0.18);
      vec3 colLight = vec3(0.9, 0.8, 0.7);
      vec3 colRed = vec3(0.68, 0.22, 0.08);
      float bandVal = sin(bandCoord * 3.14159) * 0.5 + 0.5;
      vec3 color = mix(colDark, colLight, bandVal);
      color = mix(color, colRed, bandNoise * 0.42);
      vec2 spotCenter = vec2(0.38, 0.34);
      vec2 d = uv - spotCenter;
      if (d.x > 0.5) d.x -= 1.0;
      if (d.x < -0.5) d.x += 1.0;
      vec2 ovalD = d * vec2(1.6, 1.0);
      float dist = length(ovalD);
      if (dist < 0.08) {
        float factor = 1.0 - dist / 0.08;
        float angle = factor * 4.8 - time * 0.7;
        float s = sin(angle);
        float c = cos(angle);
        vec2 rotD = vec2(ovalD.x * c - ovalD.y * s, ovalD.x * s + ovalD.y * c);
        float stormLines = sin(length(rotD) * 75.0 + time * 2.5) * 0.5 + 0.5;
        vec3 spotColor = mix(vec3(0.55, 0.08, 0.04), vec3(0.8, 0.28, 0.12), stormLines);
        color = mix(color, spotColor, smoothstep(0.08, 0.065, dist));
      }
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
      color += vec3(0.82, 0.68, 0.52) * fresnel * 0.28;
      gl_FragColor = vec4(color * (diffuse + 0.08), 1.0);
    }
  `
};

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
      vec3 starColor = vec3(0.0);
      float starDensity = 0.9965;
      float h = hash(dir.xy * 1400.0 + dir.z * 700.0);
      if (h > starDensity) {
        float brightness = pow((h - starDensity) / (1.0 - starDensity), 4.5);
        brightness *= 0.45 + 0.55 * sin(time * 3.5 + h * 12.0);
        vec3 starTemp = mix(vec3(0.72, 0.85, 1.0), vec3(1.0, 0.88, 0.78), hash(h));
        starColor = starTemp * brightness * 1.8;
      }
      float band = dot(dir, normalize(vec3(1.0, 1.3, 0.45)));
      float bandGlow = exp(-band*band * 12.0);
      float dust = fbm(dir * 4.5 + vec3(0.0, time * 0.008, 0.0));
      float dustLane = smoothstep(0.25, 0.65, fbm(dir * 10.0));
      vec3 bandCol = mix(vec3(0.05, 0.015, 0.08), vec3(0.18, 0.09, 0.07), dust);
      bandCol = mix(bandCol, vec3(0.008, 0.0, 0.018), dustLane);
      float neb1 = fbm(dir * 2.8 + vec3(15.0));
      float neb2 = fbm(dir * 1.8 - vec3(0.0, 0.0, time * 0.004));
      vec3 nebCol = mix(vec3(0.0), vec3(0.018, 0.004, 0.038), neb1);
      nebCol += mix(vec3(0.0), vec3(0.004, 0.012, 0.018), neb2);
      vec3 finalBg = starColor + bandGlow * bandCol + nebCol;
      gl_FragColor = vec4(finalBg, 1.0);
    }
  `
};

export default function PlanetScene({ loaded }: PlanetSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // HUD element refs for high-frequency direct DOM manipulation
  const hudContainerRef = useRef<HTMLDivElement>(null);
  const hudCoordsRef = useRef<HTMLDivElement>(null);
  const hudSpeedRef = useRef<HTMLDivElement>(null);
  const hudTargetRef = useRef<HTMLDivElement>(null);
  const hudScanDataRef = useRef<HTMLDivElement>(null);
  const hudWarnRef = useRef<HTMLDivElement>(null);
  const hudProgressRef = useRef<SVGCircleElement>(null);
  const hudActivePlanetInfoRef = useRef<HTMLDivElement>(null);
  
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
      lerp: 0.06, // even smoother easing
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

    // Enable high-end render features
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

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

    // --- GENERATE DETAILED MAPS ---
    const texSun = createTexture(512, 512, ctx => {
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, '#FFFCE0');
      grad.addColorStop(0.5, '#FF7700');
      grad.addColorStop(1, '#FF1100');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      drawNoise(ctx, 512, 512, 10);
    });

    const texMercury = createTexture(512, 512, ctx => {
      ctx.fillStyle = '#6E6E6E'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#5A5A5A';
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(${50 + Math.random() * 20}, ${50 + Math.random() * 20}, ${50 + Math.random() * 20}, 0.45)`;
        ctx.beginPath(); ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 4, 0, Math.PI * 2); ctx.fill();
      }
      drawNoise(ctx, 512, 512, 45);
    });

    const texMercuryBump = createTexture(512, 512, ctx => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 15 + 3;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.8, '#505050');
        grad.addColorStop(0.95, '#ffffff');
        grad.addColorStop(1, '#808080');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    });

    const texVenus = createTexture(512, 512, ctx => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      ['#E6BA80', '#C29862', '#E6BA80', '#D4A870', '#E6BA80'].forEach((c, i) => grad.addColorStop(i / 4, c));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 15; i++) {
        ctx.beginPath(); ctx.ellipse(Math.random() * 512, Math.random() * 512, Math.random() * 100 + 40, Math.random() * 20 + 8, Math.random() * 0.5 - 0.25, 0, Math.PI * 2); ctx.fill();
      }
      drawNoise(ctx, 512, 512, 12);
    });

    const texEarth = createTexture(1024, 512, ctx => {
      ctx.fillStyle = '#0f2b5c'; ctx.fillRect(0, 0, 1024, 512);
      ctx.fillStyle = '#22543d';
      const drawContinent = (x: number, y: number, sx: number, sy: number) => {
        ctx.beginPath(); ctx.ellipse(x, y, sx, sy, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 6; i++) {
          ctx.beginPath(); ctx.ellipse(x + (Math.random() - 0.5) * sx, y + (Math.random() - 0.5) * sy, sx * 0.4, sy * 0.4, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
        }
      };
      drawContinent(250, 200, 120, 140);
      drawContinent(380, 360, 80, 110);
      drawContinent(560, 240, 95, 125);
      drawContinent(760, 210, 160, 110);
      drawContinent(850, 370, 65, 55);
      drawNoise(ctx, 1024, 512, 10);
    });

    const texEarthClouds = createTexture(1024, 512, ctx => {
      ctx.clearRect(0, 0, 1024, 512);
      const grad = ctx.createLinearGradient(0, 0, 1024, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.72)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.8)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      for (let i = 0; i < 28; i++) {
        ctx.beginPath(); ctx.ellipse(Math.random() * 1024, Math.random() * 512, Math.random() * 140 + 40, Math.random() * 30 + 10, Math.random() * 0.6 - 0.3, 0, Math.PI * 2); ctx.fill();
      }
      drawNoise(ctx, 1024, 512, 15);
    });

    const texMars = createTexture(512, 512, ctx => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#FFF0EB');
      grad.addColorStop(0.1, '#B84514');
      grad.addColorStop(0.4, '#99330B');
      grad.addColorStop(0.7, '#A83B0E');
      grad.addColorStop(0.9, '#B84514');
      grad.addColorStop(1, '#FFF0EB');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = 'rgba(60, 15, 5, 0.4)';
      ctx.beginPath(); ctx.ellipse(280, 260, 130, 20, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(120, 240, 22, 0, Math.PI * 2); ctx.fill();
      drawNoise(ctx, 512, 512, 25);
    });

    const texMarsBump = createTexture(512, 512, ctx => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(280, 260, 130, 20, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(120, 240, 22, 0, Math.PI * 2); ctx.fill();
    });

    const texSaturn = createTexture(512, 512, ctx => {
      const bands = ['#E4D191', '#D4C181', '#E8D49A', '#C8B676', '#E4D191', '#C5B373', '#E8D49A'];
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      bands.forEach((c, i) => grad.addColorStop(i / (bands.length - 1), c));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      drawNoise(ctx, 512, 512, 10);
    });

    const texSaturnRings = createTexture(1024, 128, ctx => {
      ctx.clearRect(0, 0, 1024, 128);
      const grad = ctx.createLinearGradient(0, 0, 1024, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.12, 'rgba(215,195,130,0.05)');
      grad.addColorStop(0.25, 'rgba(228,210,145,0.7)');
      grad.addColorStop(0.48, 'rgba(212,193,129,0.3)');
      grad.addColorStop(0.68, 'rgba(150,135,90,0.8)');
      grad.addColorStop(0.72, 'rgba(0,0,0,0.95)'); // Cassini Division
      grad.addColorStop(0.75, 'rgba(212,193,129,0.55)');
      grad.addColorStop(0.95, 'rgba(180,162,100,0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 128);
      drawNoise(ctx, 1024, 128, 18);
    });

    const texUranus = createTexture(512, 512, ctx => {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#B2ECEC'); grad.addColorStop(0.5, '#8BE2E2'); grad.addColorStop(1, '#62CECE');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
      drawNoise(ctx, 512, 512, 5);
    });

    const texNeptune = createTexture(512, 512, ctx => {
      ctx.fillStyle = '#214AE6'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#11299C';
      ctx.beginPath(); ctx.ellipse(300, 280, 48, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(80, 120, 120, 3);
      ctx.fillRect(320, 380, 90, 2.5);
      drawNoise(ctx, 512, 512, 10);
    });

    const texGlow = createTexture(128, 128, ctx => {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.18, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.25)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
    });

    // --- INFINITE BACKGROUND SKYBOX ---
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

    // --- COOP-LAYER SPACE DUST ---
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

    // --- WARP PARTICLES ---
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

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.04);
    scene.add(ambientLight);
    
    // Core Sun light source
    const sunLight = new THREE.PointLight(0xffffff, 4.2, 1200);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 400;
    scene.add(sunLight);

    // Dynamic camera-tracking fill light to simulate ambient scattering on dark sides
    const fillLight = new THREE.DirectionalLight(0x93C5FD, 0.18);
    scene.add(fillLight);

    // --- PLANETS SETUP ---
    const planets: Record<string, THREE.Mesh | THREE.Group> = {};
    const interactableMeshes: THREE.Mesh[] = [];

    // Helper to generate atmospheric scattering shells
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
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), uPower);
            float lit = dot(vNormal, lightDir);
            float scatter = fresnel * uIntensity * smoothstep(-0.2, 0.3, lit);
            gl_FragColor = vec4(uColor, scatter);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        depthWrite: false
      }));
    };

    // 1. SUN (Custom Shader)
    const sunGeo = addDisposable(new THREE.SphereGeometry(6, 64, 64));
    const sunMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: sunShaders.vertexShader,
      fragmentShader: sunShaders.fragmentShader
    }));
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 0, 0);
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

    // God rays
    for (let i = 0; i < 15; i++) {
      const rayGeo = addDisposable(new THREE.PlaneGeometry(0.12, 22));
      const rayMat = addDisposable(new THREE.MeshBasicMaterial({
        color: 0xFF8800,
        transparent: true,
        opacity: 0.045,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      }));
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.rotation.z = (Math.PI / 15) * i;
      sun.add(ray);
    }

    // 2. MERCURY (Standard Material PBR + Atmosphere)
    const mercury = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.5, 64, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMercury,
        bumpMap: texMercuryBump,
        bumpScale: 0.015,
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

    // 3. VENUS (Standard Material PBR + Yellow Scattering)
    const venus = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.2, 64, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texVenus,
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

    // Venus atmospheric glow
    const vAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.23, 64, 64)),
      createAtmosphereMaterial(new THREE.Color('#E8C66A'), 0.45, 1.8)
    );
    venus.add(vAtmos);

    // 4. EARTH (Custom day/night, spec, city lights shader + Atmosphere + clouds)
    const earthGeo = addDisposable(new THREE.SphereGeometry(1.3, 64, 64));
    const earthMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texEarth },
        tClouds: { value: texEarthClouds },
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

    // Earth blue atmospheric scatter
    const eAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.35, 64, 64)),
      createAtmosphereMaterial(new THREE.Color('#4FAAFF'), 0.55, 2.5)
    );
    earth.add(eAtmos);

    // 5. MARS (PBR + Atmos)
    const mars = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.7, 64, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMars,
        bumpMap: texMarsBump,
        bumpScale: 0.016,
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

    // Mars thin red atmospheric scatter
    const mAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(0.725, 64, 64)),
      createAtmosphereMaterial(new THREE.Color('#FF5522'), 0.35, 3.2)
    );
    mars.add(mAtmos);

    // 6. ASTEROID BELT (Separated rings)
    const asteroidCount = 2000;
    const astGeo = addDisposable(new THREE.BufferGeometry());
    const astPos = new Float32Array(asteroidCount * 3);
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 9;
      astPos[i * 3] = Math.cos(angle) * radius;
      astPos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      astPos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    astGeo.setAttribute('position', new THREE.BufferAttribute(astPos, 3));
    const astMat = addDisposable(new THREE.PointsMaterial({
      size: 0.12,
      color: 0xA1A1AA,
      transparent: true,
      opacity: 0.65
    }));
    const asteroidBelt = new THREE.Points(astGeo, astMat);
    asteroidBelt.position.set(0, 0, -190);
    scene.add(asteroidBelt);

    // 7. JUPITER (Custom turbulent cloud band & red spot shader)
    const jupGeo = addDisposable(new THREE.SphereGeometry(3.5, 64, 64));
    const jupMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uSunPosition: { value: new THREE.Vector3(0, 0, 0) }
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

    // Jupiter warm glow atmospheric scatter
    const jAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(3.55, 64, 64)),
      createAtmosphereMaterial(new THREE.Color('#F59E0B'), 0.35, 2.2)
    );
    jupiter.add(jAtmos);

    // 8. SATURN (PBR + Detailed ring system casting shadows)
    const saturnGroup = new THREE.Group();
    saturnGroup.position.set(0, 0, -290);
    const saturnMesh = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.8, 64, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texSaturn,
        roughness: 0.72,
        metalness: 0.05
      }))
    );
    saturnMesh.userData = { name: 'Saturn', isHovered: false };
    saturnMesh.castShadow = true;
    saturnMesh.receiveShadow = true;
    saturnGroup.add(saturnMesh);

    const ringGeo = addDisposable(new THREE.RingGeometry(3.8, 6.8, 128));
    const ringGeoPos = ringGeo.attributes.position;
    const ringGeoUvs = ringGeo.attributes.uv;
    for (let i = 0; i < ringGeoPos.count; i++) {
      const x = ringGeoPos.getX(i);
      const y = ringGeoPos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      ringGeoUvs.setXY(i, (r - 3.8) / (6.8 - 3.8), 0.5);
    }
    const ringMat = addDisposable(new THREE.MeshStandardMaterial({
      map: texSaturnRings,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      roughness: 0.65,
      metalness: 0.1,
      alphaTest: 0.05
    }));
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;
    saturnGroup.add(ringMesh);
    saturnGroup.rotation.z = 0.46; // Axial tilt
    scene.add(saturnGroup);
    planets['Saturn'] = saturnGroup;
    interactableMeshes.push(saturnMesh);

    // 9. URANUS (PBR + Rings + Atmos)
    const uranusGroup = new THREE.Group();
    uranusGroup.position.set(0, 0, -360);
    const uranusMesh = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.0, 64, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texUranus,
        roughness: 0.88,
        metalness: 0.0
      }))
    );
    uranusMesh.userData = { name: 'Uranus', isHovered: false };
    uranusMesh.castShadow = true;
    uranusMesh.receiveShadow = true;
    uranusGroup.add(uranusMesh);

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
    uranusGroup.rotation.z = 1.7; // Rotates on its side!
    scene.add(uranusGroup);
    planets['Uranus'] = uranusGroup;
    interactableMeshes.push(uranusMesh);

    const uAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(2.04, 64, 64)),
      createAtmosphereMaterial(new THREE.Color('#93E3E3'), 0.42, 2.0)
    );
    uranusMesh.add(uAtmos);

    // 10. NEPTUNE (PBR + Atmos)
    const neptune = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.9, 64, 64)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texNeptune,
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

    const nAtmos = new THREE.Mesh(
      addDisposable(new THREE.SphereGeometry(1.94, 64, 64)),
      createAtmosphereMaterial(new THREE.Color('#3B82F6'), 0.52, 2.1)
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

      // Make skybox float with camera position
      skybox.position.copy(camera.position);

      // Rotate background nebulae
      asteroidBelt.rotation.y += 0.0002;

      // Comet trajectory logic
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
      let nearestColor = "#10B981"; // emerald default
      
      Object.entries(planets).forEach(([name, obj]) => {
        const d = Math.abs(obj.position.z - camera.position.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestName = name;
          nearestColor = planetData[name as keyof typeof planetData]?.color || "#10B981";
        }
      });

      // Natural auto-rotation of planets (independent of mouse movement)
      // Rotational speeds scaled relative to Earth (1 day)
      sun.rotation.y += 0.0006;         // Slow rotation
      mercury.rotation.y += 0.00015;    // Extremely slow
      venus.rotation.y -= 0.00008;      // Extremely slow retrograde
      earth.rotation.y += 0.0028;       // 1.0x baseline
      mars.rotation.y += 0.0027;        // ~1.03x
      jupiter.rotation.y += 0.0068;     // Fast! (~2.4x)
      saturnMesh.rotation.y += 0.0062;  // Fast! (~2.2x)
      
      // Uranus rotating on its side (retrograde)
      const uMesh = planets['Uranus']?.children[0];
      if (uMesh) uMesh.rotation.y -= 0.0039;
      
      neptune.rotation.y += 0.0042;     // Fast! (~1.5x)

      // Space dust tracking camera
      const dustPosAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        dustOffsets[i * 3] += dustVels[i * 3];
        dustOffsets[i * 3 + 1] += dustVels[i * 3 + 1];
        dustOffsets[i * 3 + 2] += dustVels[i * 3 + 2];
        
        // Wrap around bounds
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
        (window as any).scrollVelocity = velocity; // for audio toggle module
        
        // Stretch camera field-of-view during warp speed
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

      // Sun and Jupiter high-gravity camera buffet shakes
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

      // Dynamic camera alignment (look ahead with curving motion)
      const lookTarget = new THREE.Vector3(0, 0, camera.position.z - 18);
      camera.lookAt(lookTarget);

      // Follow lights
      fillLight.position.copy(camera.position);

      // Direct DOM updates for High-Frequency HUD display (Avoids React re-renders!)
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
      
      // Warning overlay when too close to the Sun
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

      // HUD Theme Color Interpolation
      document.documentElement.style.setProperty('--hud-color', nearestColor);

      // Orbital progress bar
      if (hudProgressRef.current) {
        const progress = Math.max(0, Math.min(1, Math.abs(camera.position.z - 32) / 470));
        const strokeDashOffset = 188 - (progress * 188);
        hudProgressRef.current.style.strokeDashoffset = String(strokeDashOffset);
      }

      renderer.render(scene, camera);
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

    // Curving camera slalom path through the Solar System (keeps planets centered at key stops)
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
      .to(camera.position, { z: -276, x: 0.4, y: 0.75, ease: "power2.inOut" }, 6)   // Saturn (Frames rings beautifully!)
      .to(camera.position, { z: -322, x: -14.0, y: 5.0, ease: "power2.inOut" }, 6.5) // Swoop 7 (Slalom past Saturn)
      .to(camera.position, { z: -348, x: -0.2, y: 0.1, ease: "power2.inOut" }, 7)   // Uranus
      .to(camera.position, { z: -392, x: 12.0, y: -4.5, ease: "power2.inOut" }, 7.5) // Swoop 8 (Slalom past Uranus)
      .to(camera.position, { z: -418, x: 0.25, y: -0.1, ease: "power2.inOut" }, 8)  // Neptune
      .to(camera.position, { z: -220, y: 150, x: 0, ease: "power2.inOut" }, 9);     // Dynamic overview angle

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
        
        {/* Futuristic Spacecraft HUD Overlay (Pipes CSS variable custom hex color) */}
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
                {/* HUD orbital progress track */}
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
              
              {/* Inner locks */}
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
        
        {/* Info panels / text layouts overlay */}
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
          
          {/* Final cinematic screen */}
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