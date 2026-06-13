import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Optimized mobile-friendly geometry class wrapper to downgrade segments on mobile for major FPS speedups
class MobileSphereGeometry extends THREE.SphereGeometry {
  constructor(radius?: number, widthSegments?: number, heightSegments?: number, phiStart?: number, phiLength?: number, thetaStart?: number, thetaLength?: number) {
    const isMobile = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
    let wSeg = widthSegments;
    let hSeg = heightSegments;
    if (isMobile) {
      if (wSeg === 64) { wSeg = 24; hSeg = 24; }
      else if (wSeg === 54) { wSeg = 20; hSeg = 20; }
      else if (wSeg === 48) { wSeg = 16; hSeg = 16; }
      else if (wSeg === 32) { wSeg = 12; hSeg = 12; }
      else if (wSeg === 24) { wSeg = 8; hSeg = 8; }
      else if (wSeg === 20) { wSeg = 8; hSeg = 8; }
      else if (wSeg === 16) { wSeg = 6; hSeg = 6; }
    }
    super(radius, wSeg, hSeg, phiStart, phiLength, thetaStart, thetaLength);
  }
}

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
  Sun: {
    name: 'The Sun',
    type: 'Yellow Dwarf Star',
    distance: '0 km',
    diameter: '1,392,684 km',
    moons: '0',
    atmosphere: '73% Hydrogen, 25% Helium, 2% trace elements',
    fact: 'The Sun accounts for 99.86% of the mass in the entire solar system.',
    color: '#FF5500',
    mass: '1.989 × 10^30 kg',
    gravity: '274 m/s²',
    temperature: '5,500°C to 15M°C',
    orbitalPeriod: '230M Years (Galactic)',
    coreComposition: 'Superdense plasma core undergoing proton-proton chain nuclear fusion.',
    description: 'The Sun is a nearly perfect sphere of hot plasma at the center of our solar system, heated to incandescence by nuclear fusion reactions in its core. It radiates energy mainly as visible light, ultraviolet light, and infrared radiation. It is by far the most important source of energy for life on Earth, and its massive gravitational pull keeps all planets locked in their orbits.'
  },
  Mercury: {
    name: 'Mercury',
    type: 'Terrestrial Planet',
    distance: '57.9M km',
    diameter: '4,879 km',
    moons: '0',
    atmosphere: 'Ultra-thin exosphere of Helium, Sodium, and Oxygen',
    fact: 'A year on Mercury is 88 Earth days, but a solar day lasts 176 Earth days.',
    color: '#9C9C9C',
    mass: '3.285 × 10^23 kg',
    gravity: '3.7 m/s²',
    temperature: '-180°C to 430°C',
    orbitalPeriod: '88 Days',
    coreComposition: 'Massive metallic iron core (representing 85% of its radius) with a thin rocky shell.',
    description: 'Mercury is the smallest and closest planet to the Sun. Lacking a substantial atmosphere to trap heat, it experiences the most extreme temperature swings in the solar system. Its surface is heavily cratered, old, and geologically inactive, closely resembling Earth\'s Moon.'
  },
  Venus: {
    name: 'Venus',
    type: 'Terrestrial Planet',
    distance: '108.2M km',
    diameter: '12,104 km',
    moons: '0',
    atmosphere: 'Dense Carbon Dioxide (96.5%) and Nitrogen (3.5%)',
    fact: 'Venus rotates backwards (retrograde) compared to most other planets.',
    color: '#E8C66A',
    mass: '4.867 × 10^24 kg',
    gravity: '8.87 m/s²',
    temperature: '465°C (Average)',
    orbitalPeriod: '225 Days',
    coreComposition: 'Iron-nickel core surrounded by a convective rocky mantle and thin silicate crust.',
    description: 'Venus is often described as Earth\'s sister planet due to their similar size and mass. However, a runaway greenhouse effect makes it the hottest planet in the solar system, with surface pressures 92 times that of Earth. Basaltic volcanic plains and thick sulfuric acid cloud decks cover its hostile landscape.'
  },
  Earth: {
    name: 'Earth',
    type: 'Terrestrial Planet',
    distance: '149.6M km',
    diameter: '12,742 km',
    moons: '1 (Luna)',
    atmosphere: '78% Nitrogen, 21% Oxygen, 1% Argon & trace gases',
    fact: 'The only known planet in the universe to harbor life and active liquid water oceans.',
    color: '#3b82f6',
    mass: '5.972 × 10^24 kg',
    gravity: '9.81 m/s²',
    temperature: '-89°C to 58°C',
    orbitalPeriod: '365.25 Days',
    coreComposition: 'Solid iron-nickel inner core, liquid outer core, viscous mantle, and solid crust.',
    description: 'Earth is our home planet and the third body from the Sun. It is unique in hosting a dynamic biosphere capable of supporting complex life. Its active plate tectonics, strong magnetosphere, and oxygen-rich atmosphere create a balanced feedback loop that maintains liquid surface water.'
  },
  Mars: {
    name: 'Mars',
    type: 'Terrestrial Planet',
    distance: '227.9M km',
    diameter: '6,779 km',
    moons: '2 (Phobos, Deimos)',
    atmosphere: '95.3% Carbon Dioxide, 2.7% Nitrogen, 1.6% Argon',
    fact: 'Home to Olympus Mons, the largest volcano in the solar system, and Valles Marineris canyon.',
    color: '#EF4444',
    mass: '6.390 × 10^23 kg',
    gravity: '3.71 m/s²',
    temperature: '-140°C to 20°C',
    orbitalPeriod: '687 Days',
    coreComposition: 'Solid iron, nickel, and sulfur core, rocky silicate mantle, and iron-oxide crust.',
    description: 'Mars is a cold, dry desert world often called the Red Planet due to the iron-oxide dust coating its surface. While its atmosphere is thin, Mars features polar ice caps, ancient lake beds, and giant volcanic formations, suggesting it once had a warm, wet environment suitable for life.'
  },
  Jupiter: {
    name: 'Jupiter',
    type: 'Gas Giant',
    distance: '778.5M km',
    diameter: '139,820 km',
    moons: '95 (Io, Europa, Ganymede, Callisto)',
    atmosphere: '89.8% Hydrogen, 10.2% Helium',
    fact: 'Jupiter\'s Great Red Spot is a giant anticyclonic storm wider than the planet Earth.',
    color: '#F59E0B',
    mass: '1.898 × 10^27 kg',
    gravity: '24.79 m/s²',
    temperature: '-110°C (Average)',
    orbitalPeriod: '11.86 Years',
    coreComposition: 'Dense central rock-and-ice core under high pressure, wrapped in liquid metallic hydrogen.',
    description: 'Jupiter is the largest planet in our solar system, carrying more mass than all other planets combined. Lacking a solid surface, it consists of layered hydrogen and helium. Its rapid rotation creates strong jet streams, swirling cloud belts, and a powerful magnetosphere that holds 95 moons.'
  },
  Saturn: {
    name: 'Saturn',
    type: 'Gas Giant',
    distance: '1.43B km',
    diameter: '116,460 km',
    moons: '146 (Titan, Enceladus, Mimas)',
    atmosphere: '96.3% Hydrogen, 3.2% Helium, minor methane',
    fact: 'Saturn\'s density is so low that the entire planet would float in water.',
    color: '#E5E7EB',
    mass: '5.683 × 10^26 kg',
    gravity: '10.44 m/s²',
    temperature: '-140°C (Average)',
    orbitalPeriod: '29.45 Years',
    coreComposition: 'Rocky-iron core surrounded by liquid metallic hydrogen and a thick gaseous outer envelope.',
    description: 'Saturn is the sixth planet from the Sun, renowned for its extensive, brilliant ring system composed of billions of ice particles and rock fragments. It has the lowest density of any planet. Its moon Titan is the second largest in the solar system and features liquid methane lakes.'
  },
  Uranus: {
    name: 'Uranus',
    type: 'Ice Giant',
    distance: '2.87B km',
    diameter: '50,724 km',
    moons: '28 (Titania, Oberon, Ariel, Umbriel)',
    atmosphere: '82.5% Hydrogen, 15.2% Helium, 2.3% Methane',
    fact: 'Uranus rotates on an extreme 98-degree tilt, effectively rolling on its side.',
    color: '#06B6D4',
    mass: '8.681 × 10^25 kg',
    gravity: '8.69 m/s²',
    temperature: '-224°C (Coldest)',
    orbitalPeriod: '84 Years',
    coreComposition: 'Rocky core, icy mantle of water, ammonia, and methane mud, and gaseous envelope.',
    description: 'Uranus is an ice giant with a blue-green tint caused by methane gas in its atmosphere. Its extraordinary tilt causes extreme seasonal changes, resulting in 42 years of continuous sunlight followed by 42 years of darkness at its poles. It features a system of 13 vertical rings.'
  },
  Neptune: {
    name: 'Neptune',
    type: 'Ice Giant',
    distance: '4.5B km',
    diameter: '49,244 km',
    moons: '16 (Triton, Nereid, Proteus)',
    atmosphere: '80% Hydrogen, 19% Helium, 1.5% Methane',
    fact: 'Neptune has the fastest winds in the solar system, reaching speeds up to 2,100 km/h.',
    color: '#3B82F6',
    mass: '1.024 × 10^26 kg',
    gravity: '11.15 m/s²',
    temperature: '-200°C (Average)',
    orbitalPeriod: '164.8 Years',
    coreComposition: 'Nickel-iron core, convective icy mantle, and gaseous outer hydrogen-helium-methane layers.',
    description: 'Neptune is the most distant planet in our solar system. A deep blue ice giant, its atmosphere is driven by internal heat, generating the most violent storms and supersonic winds in the solar system. Its largest moon, Triton, orbits Neptune in the opposite direction of the planet\'s rotation.'
  }
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
      f += 0.6500*noise(p); p = p*2.02;
      f += 0.3500*noise(p);
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
      
      // Specular ocean reflections (subtle, non-blown-out highlight)
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(0.0, dot(bumpNormal, halfDir)), 64.0) * waterVal * 0.15; // Greatly reduced albedo multiplier to prevent washing out the oceans
      
      float diffuse = dot(bumpNormal, lightDir);
      float dayFactor = smoothstep(-0.15, 0.15, diffuse);
      
      // Sample twinkling city lights
      vec4 cityTex = texture2D(tCityLights, vUv);
      float twinkle = 0.82 + 0.18 * sin(time * 4.0 + vWorldPosition.x * 12.0);
      vec3 cityLightsColor = cityTex.rgb * twinkle * 2.6;
      vec3 nightColor = vec3(0.002, 0.004, 0.008) + cityLightsColor;
      
      float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
      rim = pow(rim, 4.2);
      vec3 atmosGlow = vec3(0.25, 0.55, 1.0) * rim * 0.52 * max(diffuse, 0.0); // Toned down atmosGlow to keep continents crisp
      
      vec3 terrainColor = dayColor * (max(diffuse, 0.0) * 1.8 + 0.15) + vec3(0.8, 0.9, 1.0) * spec * 1.5;
      vec3 finalColor = mix(nightColor, terrainColor, dayFactor) + atmosGlow;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const venusShaders = {
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
      
      // Venus fast cloud rotation (super-rotation)
      vec2 uv = vUv;
      uv.x += time * 0.015;
      
      // Chevron-like cloud distortion at the equator
      float latFactor = cos(uv.y * 3.14159 - 1.57079); // 1.0 at equator, 0.0 at poles
      float wave = sin(uv.x * 6.0 - uv.y * 3.0) * 0.012 * latFactor;
      uv.x += wave;
      
      // Add subtle turbulence
      float turbulence = fbm(vec3(uv * 12.0, time * 0.04)) * 0.008;
      uv.x += turbulence;
      uv.y += turbulence;
      
      vec4 texColor = texture2D(uTexture, uv);
      
      // Fresnel limb darkening/thick atmosphere absorption
      float fresnel = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
      
      // Venus albedo is very high
      vec3 finalColor = texColor.rgb * (diffuse * 0.9 + 0.1);
      
      // Hot sulfurous atmosphere haze glow at the limb
      finalColor += vec3(0.92, 0.76, 0.42) * fresnel * 0.42 * (diffuse + 0.08);
      
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

const voiceTelemetryLines = {
  Sun: "Flight deck control. Warning: Proximity danger. Approaching Yellow Dwarf Star, the Sun. Thermal deflectors at maximum output.",
  Mercury: "Telemetry scan lock confirmed on Mercury. Commencing metallic core analysis. Extreme surface heat detected.",
  Venus: "Entering outer atmospheric layers of Venus. Acid storm activity registered. Surface pressure levels extremely high.",
  Earth: "Entering Earth orbital sector. Nitrogen-oxygen atmosphere confirmed. Homeworld connection established. Welcome back, pilot.",
  Mars: "Establishing scan lock on Mars. Red planet dust storms active. Scanning Olympus Mons caldera coordinates.",
  Jupiter: "Caution: Approaching gas giant Jupiter. Severe magnetosphere radiation detected. Tracking Great Red Spot storm vortex.",
  Saturn: "Orbital sweep of Saturn rings initialized. Billions of ice particulate counts recorded. Titan relay link is active.",
  Uranus: "Focused sweep on Uranus complete. Ice giant gas envelope locked. Scanning vertical ring structure.",
  Neptune: "Entering Neptune orbital transit. Supersonic wind activity detected. Tracking storm systems at extreme distance."
};

const playRadioBeep = (type: 'start' | 'end') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Quindar tone: 2525 Hz for start, 2675 Hz for end, duration 250ms
    const freq = type === 'start' ? 2525 : 2675;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.04, ctx.currentTime + 0.22);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.error("Audio error", e);
  }
};

const playRadioStatic = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000; // focused radio band
    filter.Q.value = 1.0;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
  } catch (e) {
    console.error("Static error", e);
  }
};

const triggerAstronautVoice = (planetName: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Cancel any ongoing speech first so they don't overlap
  window.speechSynthesis.cancel();

  // Play intro beep and static click
  playRadioBeep('start');
  setTimeout(() => {
    playRadioStatic();
  }, 250);

  // Get the voice lines
  const phrase = voiceTelemetryLines[planetName as keyof typeof voiceTelemetryLines] || `Entering focused scan coordinates for ${planetName}.`;

  const utterance = new SpeechSynthesisUtterance(phrase);
  
  // Find a suitable voice (prefer a typical male English voice first)
  const voices = window.speechSynthesis.getVoices();
  const enVoices = voices.filter(v => v.lang.startsWith('en'));
  
  // Search for typical male names in the voices list
  const maleNames = ['male', 'david', 'mark', 'george', 'james', 'guy', 'andrew', 'brian', 'stefan', 'richard'];
  const maleVoice = enVoices.find(v => {
    const nameLower = v.name.toLowerCase();
    return maleNames.some(m => nameLower.includes(m));
  });
  
  const enVoice = maleVoice 
                || enVoices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
                || enVoices[0] 
                || voices[0];
  
  if (enVoice) {
    utterance.voice = enVoice;
  }
  
  // Customizations to sound like a radio transmission
  // Slightly lower pitch for a calm, professional male astronaut voice, slow structured rate
  utterance.pitch = 0.92; 
  utterance.rate = 0.88;  
  utterance.volume = 0.85;

  utterance.onend = () => {
    // Play closing beep
    playRadioStatic();
    setTimeout(() => {
      playRadioBeep('end');
    }, 100);
  };

  // Small delay to let the beep play first
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 300);
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
  
  const [webglError, setWebglError] = useState(false);
  const spokenPlanetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loaded || !canvasRef.current || !containerRef.current) return;

    let isMounted = true;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (!isWebGLAvailable()) {
      setWebglError(true);
      return;
    }

    // --- LENIS SETUP ---
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration ease
      smoothWheel: true,
      syncTouch: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

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

    // Enable high-end render settings (limit to 1.5 on desktop, cap at 1.0 on mobile for high FPS)
    renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const clock = new THREE.Clock();

    const disposables: { dispose: () => void }[] = [];
    const addDisposable = (obj: any) => { if (obj && obj.dispose) disposables.push(obj); return obj; };

    // --- EFFECT COMPOSER POST-PROCESSING ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    // Volumetric space bloom pass (optimized at 1/4 resolution for ultra-high FPS glow)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth / 4, window.innerHeight / 4),
      0.48,  // Strength
      0.35,  // Radius
      0.82   // Threshold (only glowing sun/corona/atmosphere shells bloom)
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // Get max anisotropy for high-quality texture rendering
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // --- TEXTURE GENERATORS ---
    const createTexture = (w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      drawFn(ctx);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(maxAnisotropy, 8); // Enable anisotropy for sharp graphics
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
      tex.anisotropy = Math.min(maxAnisotropy, 8); // Enable anisotropy for sharp graphics
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
      const imgData = ctx.createImageData(1024, 512);
      const data = imgData.data;
      
      // Fine-grained multi-octave noise generator for wispy organic clouds
      const noise = (x: number, y: number) => {
        let val = 0;
        let scale = 1.0;
        let weight = 1.0;
        let totalWeight = 0;
        for (let o = 0; o < 5; o++) {
          const nx = x * 0.015 * scale;
          const ny = y * 0.015 * scale;
          const n = (Math.sin(nx * 2.3 + Math.cos(ny * 1.8)) + 
                     Math.sin(nx * 1.2 - ny * 2.8) + 
                     Math.cos(nx * 1.9 + ny * 1.5)) / 3.0;
          val += (n * 0.5 + 0.5) * weight;
          totalWeight += weight;
          scale *= 2.2;
          weight *= 0.45;
        }
        return val / totalWeight;
      };

      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 1024; x++) {
          const idx = (y * 1024 + x) * 4;
          const lat = (y / 512.0) * Math.PI;
          const latScale = Math.sin(lat); // 0 at poles, 1 at equator
          
          // Organic weather bands (clouds concentrate around temperate and equatorial zones)
          const tempBands = 0.3 + 0.7 * Math.pow(Math.sin(lat * 3.0), 2.0);
          const bandFactor = Math.pow(latScale, 2.0) * tempBands;
          
          // Micro-swirl and atmospheric wind shear
          const swirl = Math.sin(x * 0.04 + y * 0.03) * 12.0;
          const nVal = noise(x + swirl, y + Math.cos(x * 0.02) * 15.0);
          
          // Soft alpha transition (no hard blocky edges)
          const alpha = Math.max(0.0, nVal - 0.38) * 0.85 * bandFactor;
          
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = Math.min(220, Math.floor(alpha * 255));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    });

    const texMars = loadTexture('/2k_mars.jpg');
    const texSaturn = loadTexture('/2k_saturn.jpg');
    const texSaturnRings = loadTexture('/2k_saturn_ring.png');
    const texUranus = loadTexture('/2k_uranus.jpg');
    const texNeptune = loadTexture('/2k_neptune.jpg');

    // --- INFINITE SPACE DUST ---
    const dustCount = isMobile ? 250 : 800;
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
    const warpCount = isMobile ? 150 : 600;
    const warpGeo = addDisposable(new THREE.BufferGeometry());
    const warpPos = new Float32Array(warpCount * 3);
    for (let i = 0; i < warpCount * 3; i++) warpPos[i] = (Math.random() - 0.5) * 60;
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
    const skyboxGeo = addDisposable(new MobileSphereGeometry(950, 32, 32));
    const skyboxMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
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
      `,
      side: THREE.BackSide,
      depthWrite: false
    }));
    const skybox = new THREE.Mesh(skyboxGeo, skyboxMat);
    scene.add(skybox);

    // --- LIGHTING ENVIRONMENT ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // Increased base light for realistic planet details
    scene.add(ambientLight);
    
    // Core Sun light source
    const sunLight = new THREE.PointLight(0xffffff, 6.0, 1500, 0); // Intensity 6.0, distance 1500, decay 0 (no light falloff for crisp solar illumination)
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = false;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xa5c4f7, 0.35); // Richer fill light for planet camera-facing side
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
    const sunGeo = addDisposable(new MobileSphereGeometry(6, 64, 64));
    const sunMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uTexture: { value: texSun }
      },
      vertexShader: sunShaders.vertexShader,
      fragmentShader: sunShaders.fragmentShader
    }));
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.userData = { name: 'Sun', isHovered: false };
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

    // NASA's Parker Solar Probe orbiting the Sun (dives through outer corona)
    const parkerProbe = new THREE.Group();
    const probeBody = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.05, 0.05, 0.05)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gold foil bus
        metalness: 0.85,
        roughness: 0.15
      }))
    );
    parkerProbe.add(probeBody);

    const heatShield = new THREE.Mesh(
      addDisposable(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 8)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xfafafa, // White alumina heat shield
        roughness: 0.6,
        metalness: 0.1
      }))
    );
    heatShield.rotation.x = Math.PI / 2;
    heatShield.position.z = 0.03; // Face the Sun
    parkerProbe.add(heatShield);

    const panelLeft = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.12, 0.025, 0.004)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x1a365d, // Blue-grey solar array
        metalness: 0.5,
        roughness: 0.2
      }))
    );
    panelLeft.position.set(-0.08, 0, 0);
    parkerProbe.add(panelLeft);

    const panelRight = panelLeft.clone();
    panelRight.position.set(0.08, 0, 0);
    parkerProbe.add(panelRight);

    scene.add(parkerProbe);
 
    // 2. MERCURY (Low segment far, high near - lod balance)
    const mercury = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.5, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMercury,
        bumpMap: texMercury,
        bumpScale: 0.008,
        roughness: 0.88,
        metalness: 0.1
      }))
    );
    mercury.position.set(0, 0, -40);
    mercury.userData = { name: 'Mercury', isHovered: false };
    mercury.castShadow = false;
    mercury.receiveShadow = true;
    scene.add(mercury);
    planets['Mercury'] = mercury;
    interactableMeshes.push(mercury);

    // NASA's MESSENGER spacecraft orbiting Mercury
    const messengerProbe = new THREE.Group();
    const messengerBody = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.03, 0.03, 0.03)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xa8a8a8, // Silver bus
        metalness: 0.85,
        roughness: 0.15
      }))
    );
    messengerProbe.add(messengerBody);

    const sunshade = new THREE.Mesh(
      addDisposable(new THREE.CylinderGeometry(0.045, 0.045, 0.005, 12, 1, true, 0, Math.PI)), // Curved sunshield
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xeaeaea,
        side: THREE.DoubleSide,
        roughness: 0.6
      }))
    );
    sunshade.position.z = 0.018;
    sunshade.rotation.y = Math.PI / 2;
    messengerProbe.add(sunshade);

    const mPanelLeft = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.07, 0.02, 0.003)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x1a365d,
        metalness: 0.5,
        roughness: 0.3
      }))
    );
    mPanelLeft.position.set(-0.05, 0, 0);
    messengerProbe.add(mPanelLeft);

    const mPanelRight = mPanelLeft.clone();
    mPanelRight.position.set(0.05, 0, 0);
    messengerProbe.add(mPanelRight);

    scene.add(messengerProbe);
 
    // 3. VENUS (Custom volumetric shader simulating hot dense atmosphere & cloud super-rotation)
    const venusMat = addDisposable(new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
        uTexture: { value: texVenus }
      },
      vertexShader: venusShaders.vertexShader,
      fragmentShader: venusShaders.fragmentShader
    }));
    const venus = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(1.2, 48, 48)),
      venusMat
    );
    venus.position.set(0, 0, -80);
    venus.userData = { name: 'Venus', isHovered: false };
    venus.castShadow = false;
    venus.receiveShadow = true;
    scene.add(venus);
    planets['Venus'] = venus;
    interactableMeshes.push(venus);
 
    // Venus atmosphere shell
    const vAtmos = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(1.26, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#E8C66A'), 0.45, 2.0)
    );
    venus.add(vAtmos);

    // NASA's Magellan spacecraft orbiting Venus
    const magellanProbe = new THREE.Group();
    const magellanBody = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.04, 0.04, 0.04)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gold foil bus
        metalness: 0.8,
        roughness: 0.2
      }))
    );
    magellanProbe.add(magellanBody);

    const radarDish = new THREE.Mesh(
      addDisposable(new THREE.ConeGeometry(0.065, 0.025, 16)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xdddddd, // Light grey radar dish
        roughness: 0.5,
        metalness: 0.1
      }))
    );
    radarDish.rotation.x = -Math.PI / 2; // Face towards Venus
    radarDish.position.z = 0.03;
    magellanProbe.add(radarDish);

    const magellanPanelLeft = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.09, 0.03, 0.003)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x1a365d, // Blue solar panels
        metalness: 0.5,
        roughness: 0.3
      }))
    );
    magellanPanelLeft.position.set(-0.07, 0, 0);
    magellanProbe.add(magellanPanelLeft);

    const magellanPanelRight = magellanPanelLeft.clone();
    magellanPanelRight.position.set(0.07, 0, 0);
    magellanProbe.add(magellanPanelRight);

    scene.add(magellanProbe);
 
    // 4. EARTH (PBR + custom shader for day/night city lights, elevation bump, water specular, and cloud shadows)
    const earthGeo = addDisposable(new MobileSphereGeometry(1.3, 48, 48));
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
    earth.userData = { name: 'Earth', isHovered: false };
    earth.castShadow = false;
    earth.receiveShadow = true;
    scene.add(earth);
    planets['Earth'] = earth;
    interactableMeshes.push(earth);
 
    // Earth blue atmosphere (thin, crisp halo)
    const eAtmos = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(1.315, 48, 48)), // Tighten to match cloud layer exactly
      createAtmosphereMaterial(new THREE.Color('#2b80ff'), 0.28, 3.2) // Softer, more integrated blue edge glow
    );
    earth.add(eAtmos);

    // Separate Earth clouds layer (REMOVED as requested by user to keep continents clean)
    /*
    const cloudGeo = addDisposable(new MobileSphereGeometry(1.312, 48, 48)); // Just inside atmosphere
    const cloudMat = addDisposable(new THREE.MeshStandardMaterial({
      alphaMap: texEarthClouds,
      transparent: true,
      opacity: 0.26, // Much softer, semi-transparent clouds to reveal continents clearly
      color: 0xcccccc, // Darker albedo prevents blowing out in the sun
      roughness: 0.98, // Completely rough for realistic diffuse reflection
      metalness: 0.0,
      blending: THREE.NormalBlending,
      depthWrite: false
    }));
    const earthClouds = new THREE.Mesh(cloudGeo, cloudMat);
    earthClouds.castShadow = true;
    earth.add(earthClouds);
    */

    // The Moon (Luna) orbiting Earth
    const moon = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.35, 32, 32)), // 27% Earth's size
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMercury, // Mercury texture is an excellent cratered moon-like match
        bumpMap: texMercury,
        bumpScale: 0.005,
        roughness: 0.9,
        metalness: 0.05
      }))
    );
    moon.castShadow = true;
    moon.receiveShadow = true;
    scene.add(moon);

    // International Space Station (ISS) orbiting Earth
    const iss = new THREE.Group();
    const issBody = new THREE.Mesh(
      addDisposable(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8)), // Main truss structure
      addDisposable(new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 }))
    );
    issBody.rotation.z = Math.PI / 2;
    iss.add(issBody);

    const arrayGeo = addDisposable(new THREE.BoxGeometry(0.02, 0.045, 0.002));
    const arrayMat = addDisposable(new THREE.MeshStandardMaterial({ color: 0xb58a3e, metalness: 0.5, roughness: 0.4 })); // Goldish solar panels
    for (let i = 0; i < 4; i++) {
      const panel1 = new THREE.Mesh(arrayGeo, arrayMat);
      const panel2 = panel1.clone();
      const posX = -0.025 + (i * 0.016);
      panel1.position.set(posX, 0.025, 0);
      panel2.position.set(posX, -0.025, 0);
      iss.add(panel1);
      iss.add(panel2);
    }
    scene.add(iss);
 
    // 5. MARS
    const mars = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.7, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMars,
        bumpMap: texMars,
        bumpScale: 0.012,
        roughness: 0.85,
        metalness: 0.05
      }))
    );
    mars.position.set(0, 0, -160);
    mars.userData = { name: 'Mars', isHovered: false };
    mars.castShadow = false;
    mars.receiveShadow = true;
    scene.add(mars);
    planets['Mars'] = mars;
    interactableMeshes.push(mars);
 
    // Mars atmosphere shell (thin dust layer - tightened for scientific accuracy)
    const mAtmos = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.718, 48, 48)), // Tighter thin atmosphere
      createAtmosphereMaterial(new THREE.Color('#e05934'), 0.35, 3.5)
    );
    mars.add(mAtmos);

    // Mars Moons: Phobos and Deimos
    const phobos = new THREE.Mesh(
      addDisposable(new THREE.DodecahedronGeometry(0.024, 0)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x857d77,
        roughness: 0.95,
        metalness: 0.05
      }))
    );
    phobos.castShadow = true;
    phobos.receiveShadow = true;
    mars.add(phobos);

    const deimos = new THREE.Mesh(
      addDisposable(new THREE.DodecahedronGeometry(0.015, 0)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x7a7470,
        roughness: 0.95,
        metalness: 0.05
      }))
    );
    deimos.castShadow = true;
    deimos.receiveShadow = true;
    mars.add(deimos);

    // NASA's Mars Reconnaissance Orbiter (MRO)
    const mroProbe = new THREE.Group();
    const mroBody = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.025, 0.025, 0.025)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gold foil bus
        metalness: 0.8,
        roughness: 0.2
      }))
    );
    mroProbe.add(mroBody);

    const mroDish = new THREE.Mesh(
      addDisposable(new THREE.ConeGeometry(0.03, 0.015, 12)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xcccccc, // High-gain antenna dish
        roughness: 0.5,
        metalness: 0.1
      }))
    );
    mroDish.rotation.x = -Math.PI / 2; // Point down at Mars for mapping/comms
    mroDish.position.z = 0.02;
    mroProbe.add(mroDish);

    const mroPanelLeft = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.065, 0.018, 0.003)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0x1a365d,
        metalness: 0.5,
        roughness: 0.3
      }))
    );
    mroPanelLeft.position.set(-0.05, 0, 0);
    mroProbe.add(mroPanelLeft);

    const mroPanelRight = mroPanelLeft.clone();
    mroPanelRight.position.set(0.05, 0, 0);
    mroProbe.add(mroPanelRight);

    scene.add(mroProbe);
 
    // 6. INSTANCED 3D ASTEROID BELT (Awwwards optimization - 1 draw call!)
    const asteroidCount = isMobile ? 700 : 2200;
    // Create random displaced rock geometries (deformed non-uniformly for potato-like shapes, scaled up for high visibility)
    const rockGeo = addDisposable(new THREE.DodecahedronGeometry(0.22, 1));
    const rockPosAttr = rockGeo.attributes.position;
    for (let i = 0; i < rockPosAttr.count; i++) {
      const x = rockPosAttr.getX(i);
      const y = rockPosAttr.getY(i);
      const z = rockPosAttr.getZ(i);
      // Irregular rocky deformations
      const rx = 0.75 + Math.random() * 0.5;
      const ry = 0.75 + Math.random() * 0.5;
      const rz = 0.75 + Math.random() * 0.5;
      rockPosAttr.setXYZ(i, x * rx, y * ry, z * rz);
    }
    rockGeo.computeVertexNormals();
 
    const rockMat = addDisposable(new THREE.MeshStandardMaterial({
      bumpMap: texMercury, // Use cratered Mercury texture as a high-graphics bump map
      bumpScale: 0.05,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0x181512) // Subtle ambient glow so shadow-side of rocks is visible against space
    }));
 
    const asteroidBelt = new THREE.InstancedMesh(rockGeo, rockMat, asteroidCount);
    asteroidBelt.position.set(0, 0, 0); // Center at origin to rotate around the Z-axis smoothly
    asteroidBelt.castShadow = false;
    asteroidBelt.receiveShadow = true;
    
    // Position instances scattered throughout the solar system (Main Belt + Inner/Outer system dust)
    const dummy = new THREE.Object3D();
    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      
      const randRegion = Math.random();
      let radius, zVal;
      
      if (randRegion < 0.85) {
        // Main Asteroid Belt (concentrated between Mars -153 and Jupiter -212)
        zVal = -182.5 + (Math.random() - 0.5) * 30; // 30 units wide along Z-axis
        radius = 5.2 + Math.random() * 6.5; // Concentrated ring radius 5.2 to 11.7
      } else {
        // Outer Solar System stray dust (between Jupiter -222 and Neptune -418)
        zVal = -220 - Math.random() * 200;
        radius = 6.0 + Math.random() * 12.0;
      }
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = zVal;
      
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      const s = 0.5 + Math.random() * 1.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      asteroidBelt.setMatrixAt(i, dummy.matrix);
      
      // Random organic color variation for C-type, S-type, and M-type asteroids (boosted brightness)
      const typeRand = Math.random();
      let rColor;
      if (typeRand < 0.65) {
        // C-type (dark carbonaceous): medium-dark grey-brown
        const grey = 0.35 + Math.random() * 0.15;
        rColor = new THREE.Color(grey * 1.05, grey * 0.95, grey * 0.9);
      } else if (typeRand < 0.9) {
        // S-type (stony/silicate): light brownish-grey
        const grey = 0.6 + Math.random() * 0.15;
        rColor = new THREE.Color(grey * 1.1, grey * 1.0, grey * 0.9);
      } else {
        // M-type (metallic): reddish/rusty-grey
        const grey = 0.5 + Math.random() * 0.15;
        rColor = new THREE.Color(grey * 1.25, grey * 0.95, grey * 0.85);
      }
      asteroidBelt.setColorAt(i, rColor);
    }
    asteroidBelt.instanceMatrix.needsUpdate = true;
    if (asteroidBelt.instanceColor) asteroidBelt.instanceColor.needsUpdate = true;
    scene.add(asteroidBelt);
 
    // 7. JUPITER (swirling storms + bands)
    const texJupiter = loadTexture('/2k_jupiter.jpg');
    const jupGeo = addDisposable(new MobileSphereGeometry(3.5, 54, 54));
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
    jupiter.userData = { name: 'Jupiter', isHovered: false };
    jupiter.castShadow = false;
    jupiter.receiveShadow = true;
    scene.add(jupiter);
    planets['Jupiter'] = jupiter;
    interactableMeshes.push(jupiter);
 
    // Jupiter atmosphere shell
    const jAtmos = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(3.7, 54, 54)),
      createAtmosphereMaterial(new THREE.Color('#F59E0B'), 0.32, 2.2)
    );
    jupiter.add(jAtmos);

    // Jupiter's 4 Galilean Moons: Io, Europa, Ganymede, and Callisto
    // Io (Yellow-orange volcanic)
    const io = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.06, 24, 24)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xe6df3c, // Sulfurous yellow-orange
        roughness: 0.8,
        metalness: 0.1
      }))
    );
    io.castShadow = true;
    io.receiveShadow = true;
    scene.add(io);

    // Europa (Icy white-grey)
    const europa = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.05, 24, 24)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd9d7cd, // Reflective ice-white
        roughness: 0.45,
        metalness: 0.05
      }))
    );
    europa.castShadow = true;
    europa.receiveShadow = true;
    scene.add(europa);

    // Ganymede (Grey-brown cratered - largest moon)
    const ganymede = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.08, 24, 24)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMercury, // Reuse Mercury texture for moon-like cratering
        color: 0x8a8479, // Desaturated grey-brown albedo
        roughness: 0.9,
        metalness: 0.1
      }))
    );
    ganymede.castShadow = true;
    ganymede.receiveShadow = true;
    scene.add(ganymede);

    // Callisto (Dark heavily cratered ice-rock)
    const callisto = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.075, 24, 24)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texMercury,
        color: 0x55514c, // Very dark grey-brown
        roughness: 0.95,
        metalness: 0.05
      }))
    );
    callisto.castShadow = true;
    callisto.receiveShadow = true;
    scene.add(callisto);

    // NASA's Juno spacecraft orbiting Jupiter
    const junoProbe = new THREE.Group();
    
    // Main hexagonal body
    const junoBody = new THREE.Mesh(
      addDisposable(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6)), // Hexagonal shape
      addDisposable(new THREE.MeshStandardMaterial({ color: 0x2c2c2c, metalness: 0.8, roughness: 0.2 }))
    );
    junoBody.rotation.x = Math.PI / 2;
    junoProbe.add(junoBody);

    // Juno's famous three-bladed solar array wings (propeller design)
    const bladeGeo = addDisposable(new THREE.BoxGeometry(0.008, 0.08, 0.002));
    const bladeMat = addDisposable(new THREE.MeshStandardMaterial({ color: 0x1e2d42, metalness: 0.6, roughness: 0.3 }));
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.04;
      const bladeContainer = new THREE.Group();
      bladeContainer.rotation.z = (i * Math.PI * 2) / 3;
      bladeContainer.add(blade);
      junoProbe.add(bladeContainer);
    }

    // Magnetometer boom on one of the blades (slightly longer tip)
    const magBoom = new THREE.Mesh(
      addDisposable(new THREE.CylinderGeometry(0.002, 0.002, 0.025, 4)),
      addDisposable(new THREE.MeshStandardMaterial({ color: 0xcccccc }))
    );
    magBoom.position.y = 0.09;
    junoProbe.children[0].add(magBoom); // Attach to first blade

    scene.add(junoProbe);
 
    // 8. SATURN (Custom analytical shadows)
    const saturnGroup = new THREE.Group();
    saturnGroup.position.set(0, 0, -290);
    
    // Saturn Body
    const saturnMesh = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(2.8, 54, 54)),
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
      addDisposable(new MobileSphereGeometry(3.0, 54, 54)),
      createAtmosphereMaterial(new THREE.Color('#E8D49A'), 0.3, 2.0)
    );
    saturnMesh.add(sAtmos);

    // Titan (Orange thick atmosphere moon)
    const titan = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.065, 24, 24)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd1a156, // Golden orange albedo
        roughness: 0.95,
        metalness: 0.0
      }))
    );
    titan.castShadow = false;
    titan.receiveShadow = true;
    saturnGroup.add(titan);

    // Enceladus (Highly reflective icy white moon)
    const enceladus = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.015, 16, 16)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.1
      }))
    );
    enceladus.castShadow = false;
    enceladus.receiveShadow = true;
    saturnGroup.add(enceladus);

    // NASA's Cassini spacecraft
    const cassiniProbe = new THREE.Group();
    const cassiniBody = new THREE.Mesh(
      addDisposable(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gold foil bus
        metalness: 0.8,
        roughness: 0.2
      }))
    );
    cassiniBody.rotation.x = Math.PI / 2;
    cassiniProbe.add(cassiniBody);

    const cassiniDish = new THREE.Mesh(
      addDisposable(new THREE.ConeGeometry(0.02, 0.01, 16)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xffffff, // White high-gain antenna dish
        roughness: 0.6,
        metalness: 0.1
      }))
    );
    cassiniDish.rotation.x = -Math.PI / 2;
    cassiniDish.position.z = 0.018;
    cassiniProbe.add(cassiniDish);
    saturnGroup.add(cassiniProbe);
 
    // 9. URANUS
    const uranusGroup = new THREE.Group();
    uranusGroup.position.set(0, 0, -360);
    const uranusMesh = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(2.0, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texUranus,
        bumpMap: texUranus,
        bumpScale: 0.005,
        roughness: 0.88,
        metalness: 0.0
      }))
    );
    uranusMesh.userData = { name: 'Uranus', isHovered: false };
    uranusMesh.castShadow = false;
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
      addDisposable(new MobileSphereGeometry(2.14, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#93E3E3'), 0.42, 2.0)
    );
    uranusMesh.add(uAtmos);

    // Titania (Grey cratered moon)
    const titania = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.025, 16, 16)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xa0a0a0,
        roughness: 0.9,
        metalness: 0.1
      }))
    );
    titania.castShadow = false;
    titania.receiveShadow = true;
    uranusGroup.add(titania);

    // NASA's Voyager 2 spacecraft (Uranus flyby)
    const voyager2Uranus = new THREE.Group();
    const voyagerBody = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.015, 0.015, 0.015)),
      addDisposable(new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }))
    );
    voyager2Uranus.add(voyagerBody);

    const voyagerDish = new THREE.Mesh(
      addDisposable(new THREE.ConeGeometry(0.02, 0.008, 12)),
      addDisposable(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 }))
    );
    voyagerDish.rotation.x = Math.PI / 2;
    voyagerDish.position.z = 0.01;
    voyager2Uranus.add(voyagerDish);
    uranusGroup.add(voyager2Uranus);
 
    // 10. NEPTUNE
    const neptuneGroup = new THREE.Group();
    neptuneGroup.position.set(0, 0, -430);
    const neptuneMesh = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(1.9, 48, 48)),
      addDisposable(new THREE.MeshStandardMaterial({
        map: texNeptune,
        bumpMap: texNeptune,
        bumpScale: 0.006,
        roughness: 0.85,
        metalness: 0.05
      }))
    );
    neptuneMesh.userData = { name: 'Neptune', isHovered: false };
    neptuneMesh.castShadow = false;
    neptuneMesh.receiveShadow = true;
    neptuneGroup.add(neptuneMesh);
    scene.add(neptuneGroup);
    planets['Neptune'] = neptuneGroup;
    interactableMeshes.push(neptuneMesh);
 
    // Neptune atmosphere shell
    const nAtmos = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(2.02, 48, 48)),
      createAtmosphereMaterial(new THREE.Color('#3B82F6'), 0.5, 2.0)
    );
    neptuneMesh.add(nAtmos);

    // Triton moon (retrograde orbit!)
    const triton = new THREE.Mesh(
      addDisposable(new MobileSphereGeometry(0.038, 20, 20)),
      addDisposable(new THREE.MeshStandardMaterial({
        color: 0xd9d5c5, // Pale pinkish-grey/yellow albedo
        roughness: 0.8,
        metalness: 0.1
      }))
    );
    triton.castShadow = false;
    triton.receiveShadow = true;
    neptuneGroup.add(triton);

    // NASA's Voyager 2 spacecraft (Neptune flyby)
    const voyager2Neptune = new THREE.Group();
    const voyager2NeptuneBody = new THREE.Mesh(
      addDisposable(new THREE.BoxGeometry(0.015, 0.015, 0.015)),
      addDisposable(new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }))
    );
    voyager2Neptune.add(voyager2NeptuneBody);

    const voyager2NeptuneDish = new THREE.Mesh(
      addDisposable(new THREE.ConeGeometry(0.02, 0.008, 12)),
      addDisposable(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 }))
    );
    voyager2NeptuneDish.rotation.x = Math.PI / 2;
    voyager2NeptuneDish.position.z = 0.01;
    voyager2Neptune.add(voyager2NeptuneDish);
    neptuneGroup.add(voyager2Neptune);

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

    const onMouseMove = (e: MouseEvent) => {
      currentMouseNDCX = (e.clientX / window.innerWidth) * 2 - 1;
      currentMouseNDCY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.x = currentMouseNDCX;
      mouse.y = currentMouseNDCY;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Cache the ScrollTrigger reference outside the loop, initialized as null
    let stInstance: any = null;

    // --- ANIMATION LOOP ---
    let frame = 0;
    const animate = () => {
      if (!isMounted) return;
      frame = requestAnimationFrame(animate);
      
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Synchronize Lenis scroll calculation with our frame loop (avoids frame judder)
      lenis.raf(time * 1000);
      ScrollTrigger.update();

      // Hover Raycasting (run once per frame instead of on every mousemove event!)
      raycaster.setFromCamera(mouse, camera);
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

      // Update shader materials
      if (sunMat.uniforms) sunMat.uniforms.time.value = time;
      if (venusMat.uniforms) venusMat.uniforms.time.value = time;
      if (earthMat.uniforms) earthMat.uniforms.time.value = time;
      if (jupMat.uniforms) jupMat.uniforms.time.value = time;
      if (skyboxMat.uniforms) skyboxMat.uniforms.time.value = time;

      // Update local sun positions for analytical shadows
      if (saturnMesh.material && (saturnMesh.material as THREE.ShaderMaterial).uniforms) {
        const localSunPos = (saturnMesh as any).worldToLocal(new THREE.Vector3(0, 0, 0));
        (saturnMesh.material as THREE.ShaderMaterial).uniforms.uLocalSunPos.value.copy(localSunPos);
      }
      if (ringMesh.material && (ringMesh.material as THREE.ShaderMaterial).uniforms) {
        const localSunPos = (ringMesh as any).worldToLocal(new THREE.Vector3(0, 0, 0));
        (ringMesh.material as THREE.ShaderMaterial).uniforms.uLocalSunPos.value.copy(localSunPos);
      }

      // Make skybox float with camera position
      skybox.position.copy(camera.position);

      // Rotate asteroid belt around the Z-axis (swirls around the slalom flight path)
      asteroidBelt.rotation.z += 0.00022;

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

      // Voice announcements trigger when close to a planet
      if (nearestDist < 25) {
        if (spokenPlanetRef.current !== nearestName) {
          spokenPlanetRef.current = nearestName;
          triggerAstronautVoice(nearestName);
        }
      } else {
        spokenPlanetRef.current = null;
      }

      // Natural axis auto-rotations (relative relative speeds)
      sun.rotation.y += 0.0006;
      mercury.rotation.y += 0.00015;
      venus.rotation.y -= 0.00008; // retrograde
      earth.rotation.y += 0.0028;
      // earthClouds.rotation.y += 0.0004; // independent cloud drift (REMOVED)
      mars.rotation.y += 0.0027;
      
      // Orbiting Mars Moons
      phobos.position.x = Math.cos(time * 0.9) * 1.1;
      phobos.position.z = Math.sin(time * 0.9) * 1.1;
      phobos.rotation.y += 0.015;

      deimos.position.x = Math.cos(time * 0.5 + 2.0) * 1.6;
      deimos.position.z = Math.sin(time * 0.5 + 2.0) * 1.6;
      deimos.rotation.y += 0.01;

      // Sun: Parker Solar Probe Orbit (Close solar dive)
      parkerProbe.position.x = Math.cos(time * 0.25) * 8.8;
      parkerProbe.position.z = Math.sin(time * 0.25) * 8.8;
      parkerProbe.position.y = Math.sin(time * 0.12) * 0.8; // Inclined orbital plane
      parkerProbe.lookAt(new THREE.Vector3(0, 0, 0)); // Point white heat shield towards Sun

      // Mercury: MESSENGER Probe Orbit
      messengerProbe.position.x = mercury.position.x + Math.cos(time * 0.6) * 0.92;
      messengerProbe.position.z = mercury.position.z + Math.sin(time * 0.6) * 0.92;
      messengerProbe.position.y = mercury.position.y + Math.sin(time * 0.35) * 0.18; // Highly inclined orbit
      // Always point white sunshade towards the Sun (away from the probe bus center)
      const sunDir = new THREE.Vector3(0, 0, 0).sub(messengerProbe.position).normalize();
      messengerProbe.lookAt(messengerProbe.position.clone().add(sunDir));

      // Venus: Magellan Probe Orbit
      magellanProbe.position.x = venus.position.x + Math.cos(time * 0.4) * 1.65;
      magellanProbe.position.z = venus.position.z + Math.sin(time * 0.4) * 1.65;
      magellanProbe.position.y = venus.position.y + Math.sin(time * 0.25) * 0.15; // Inclination
      // Point high-gain mapping dish directly at Venus center
      magellanProbe.lookAt(venus.position);

      // Earth: Moon Orbit
      moon.position.x = earth.position.x + Math.cos(time * 0.18) * 2.6;
      moon.position.z = earth.position.z + Math.sin(time * 0.18) * 2.6;
      moon.position.y = earth.position.y + Math.sin(time * 0.18 * 0.5) * 0.35; // Inclined orbit (5 degrees in real life)
      moon.rotation.y += 0.001; // Synchronous rotation (approximate)

      // Earth: International Space Station (ISS) Orbit (Low, fast orbit)
      iss.position.x = earth.position.x + Math.cos(time * 0.85) * 1.55;
      iss.position.z = earth.position.z + Math.sin(time * 0.85) * 1.55;
      iss.position.y = earth.position.y + Math.sin(time * 0.85 * 0.8) * 0.25;
      iss.lookAt(earth.position);
      iss.rotateX(Math.PI / 2); // Keep solar panels aligned perpendicular to flight direction

      // Mars: MRO Orbit
      mroProbe.position.x = mars.position.x + Math.cos(time * 0.7) * 1.35;
      mroProbe.position.z = mars.position.z + Math.sin(time * 0.7) * 1.35;
      mroProbe.position.y = mars.position.y + Math.sin(time * 0.7 * 0.9) * 0.3; // Polar inclined orbit
      mroProbe.lookAt(mars.position);

      // Jupiter: Io Orbit
      io.position.x = jupiter.position.x + Math.cos(time * 0.18) * 5.2;
      io.position.z = jupiter.position.z + Math.sin(time * 0.18) * 5.2;
      io.rotation.y += 0.01;

      // Jupiter: Europa Orbit
      europa.position.x = jupiter.position.x + Math.cos(time * 0.13 + 1.5) * 7.2;
      europa.position.z = jupiter.position.z + Math.sin(time * 0.13 + 1.5) * 7.2;
      europa.rotation.y += 0.008;

      // Jupiter: Ganymede Orbit
      ganymede.position.x = jupiter.position.x + Math.cos(time * 0.09 + 3.0) * 9.8;
      ganymede.position.z = jupiter.position.z + Math.sin(time * 0.09 + 3.0) * 9.8;
      ganymede.rotation.y += 0.005;

      // Jupiter: Callisto Orbit
      callisto.position.x = jupiter.position.x + Math.cos(time * 0.05 + 4.5) * 12.5;
      callisto.position.z = jupiter.position.z + Math.sin(time * 0.05 + 4.5) * 12.5;
      callisto.rotation.y += 0.003;

      // Jupiter: Juno Probe Orbit (Highly elliptical polar orbit)
      const junoAngle = time * 0.08;
      const junoRadius = 9.0 + Math.sin(junoAngle) * 5.0; // Varies between 4.0 and 14.0 from Jupiter center
      junoProbe.position.x = jupiter.position.x + Math.cos(junoAngle) * junoRadius * 0.2; // Squashed orbit
      junoProbe.position.z = jupiter.position.z + Math.sin(junoAngle) * junoRadius;
      junoProbe.position.y = jupiter.position.y + Math.cos(junoAngle) * junoRadius * 0.9; // High polar inclination
      junoProbe.lookAt(jupiter.position);

      jupiter.rotation.y += 0.0068;
      saturnMesh.rotation.y += 0.0062;

      // Saturn: Titan Orbit
      titan.position.x = Math.cos(time * 0.08) * 7.5;
      titan.position.z = Math.sin(time * 0.08) * 7.5;
      titan.rotation.y += 0.005;

      // Saturn: Enceladus Orbit (inside/near rings)
      enceladus.position.x = Math.cos(time * 0.18 + 2.0) * 3.3;
      enceladus.position.z = Math.sin(time * 0.18 + 2.0) * 3.3;
      enceladus.rotation.y += 0.01;

      // Saturn: Cassini Probe Orbit
      const cassiniAngle = time * 0.12;
      cassiniProbe.position.x = Math.cos(cassiniAngle) * 7.0;
      cassiniProbe.position.z = Math.sin(cassiniAngle) * 7.0;
      cassiniProbe.position.y = Math.sin(cassiniAngle) * 0.5; // Inclination
      cassiniProbe.lookAt(new THREE.Vector3(0, 0, 0)); // Point antenna dish at Saturn
      
      // Uranus rotation (side retrograde)
      uranusMesh.rotation.y -= 0.0039;

      // Uranus: Titania Orbit
      titania.position.x = Math.cos(time * 0.15) * 3.8;
      titania.position.z = Math.sin(time * 0.15) * 3.8;
      titania.rotation.y += 0.005;

      // Uranus: Voyager 2 Flyby
      const v2TimeU = (time * 0.06) % 6.0;
      voyager2Uranus.position.x = -5.0 + v2TimeU * 2.0;
      voyager2Uranus.position.z = 3.0 - v2TimeU * 1.5;
      voyager2Uranus.position.y = -0.8 + v2TimeU * 0.4;
      voyager2Uranus.lookAt(new THREE.Vector3(0, 0, 0)); // Point towards Uranus center
      
      // Neptune rotation
      neptuneMesh.rotation.y += 0.0042;

      // Neptune: Triton Orbit (retrograde: negative speed multiplier)
      triton.position.x = Math.cos(-time * 0.11) * 3.2;
      triton.position.z = Math.sin(-time * 0.11) * 3.2;
      triton.rotation.y += 0.004;

      // Neptune: Voyager 2 Flyby (past Neptune)
      const v2TimeN = (time * 0.05) % 6.0;
      voyager2Neptune.position.x = -4.5 + v2TimeN * 1.8;
      voyager2Neptune.position.z = 2.5 - v2TimeN * 1.3;
      voyager2Neptune.position.y = -0.6 + v2TimeN * 0.35;
      voyager2Neptune.lookAt(new THREE.Vector3(0, 0, 0)); // Point towards Neptune center

      // Space dust tracking (optimized direct TypedArray edits)
      const dustPosAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      const dArr = dustPosAttr.array as Float32Array;
      const camX = camera.position.x;
      const camY = camera.position.y;
      const camZ = camera.position.z;
      for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        dustOffsets[i3] += dustVels[i3];
        dustOffsets[i3 + 1] += dustVels[i3 + 1];
        dustOffsets[i3 + 2] += dustVels[i3 + 2];
        
        if (Math.abs(dustOffsets[i3]) > 25) dustOffsets[i3] = (Math.random() - 0.5) * 50;
        if (Math.abs(dustOffsets[i3 + 1]) > 25) dustOffsets[i3 + 1] = (Math.random() - 0.5) * 50;
        if (Math.abs(dustOffsets[i3 + 2]) > 25) dustOffsets[i3 + 2] = (Math.random() - 0.5) * 50;
        
        dArr[i3] = camX + dustOffsets[i3];
        dArr[i3 + 1] = camY + dustOffsets[i3 + 1];
        dArr[i3 + 2] = camZ + dustOffsets[i3 + 2];
      }
      dustPosAttr.needsUpdate = true;

      // Dynamic Warp Easing based on scroll speed (using cached ScrollTrigger reference)
      const st = stInstance;
      let velocity = 0;
      if (st) {
        velocity = Math.abs(st.getVelocity());
        (window as any).scrollVelocity = velocity; // for audio toggle
        
        // FOV stretching
        camera.fov = 60 + Math.min(26, velocity * 0.012);
        camera.updateProjectionMatrix();

        // Warp particles fade-in and animate (optimized direct TypedArray edits)
        if (velocity > 120) {
          warpMat.opacity = Math.min(0.85, (velocity - 120) / 400);
          const wPosAttr = warpGeo.attributes.position as THREE.BufferAttribute;
          const wArr = wPosAttr.array as Float32Array;
          const wCount = wPosAttr.count;
          for (let i = 0; i < wCount; i++) {
            const i3 = i * 3;
            let z = wArr[i3 + 2] + velocity * 0.008;
            if (z > camZ + 10) z = camZ - 80;
            wArr[i3] = camX + (Math.random() - 0.5) * 40;
            wArr[i3 + 1] = camY + (Math.random() - 0.5) * 40;
            wArr[i3 + 2] = z;
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

      // Render composer instead of raw renderer (applies post-processing bloom on desktop, direct render on mobile for 60 FPS)
      if (isMobile) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }
    };
    animate();

    // --- GSAP SCROLL SLALOM TIMELINE ---
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.85, // Smooth camera deceleration glide
        snap: {
          snapTo: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // Snaps to each planet stop and the overview
          duration: { min: 0.25, max: 0.65 },
          delay: 0.05,
          ease: "power2.out"
        }
      }
    });
    stInstance = tl.scrollTrigger;

    // Curving camera slalom path - shifted by 1.0 to align perfectly with the 11 HTML sections (10 scroll intervals)
    tl.to(camera.position, { z: 18, x: 0, y: 0.3, ease: "power2.inOut" }, 1)       // Sun
      .to(camera.position, { z: -12, x: -6.0, y: 2.0, ease: "power2.inOut" }, 1.5)  // Swoop 1 (Slalom past Sun)
      .to(camera.position, { z: -34, x: 0.1, y: -0.05, ease: "power2.inOut" }, 2)   // Mercury
      .to(camera.position, { z: -58, x: 7.0, y: -2.2, ease: "power2.inOut" }, 2.5)  // Swoop 2 (Slalom past Mercury)
      .to(camera.position, { z: -74, x: -0.15, y: 0.05, ease: "power2.inOut" }, 3)  // Venus
      .to(camera.position, { z: -98, x: -8.0, y: 3.0, ease: "power2.inOut" }, 3.5)  // Swoop 3 (Slalom past Venus)
      .to(camera.position, { z: -113, x: 0, y: 0.15, ease: "power2.inOut" }, 4)     // Earth
      .to(camera.position, { z: -138, x: 8.0, y: -2.8, ease: "power2.inOut" }, 4.5) // Swoop 4 (Slalom past Earth)
      .to(camera.position, { z: -153, x: 0.1, y: -0.05, ease: "power2.inOut" }, 5)  // Mars
      .to(camera.position, { z: -188, x: -12.0, y: 4.5, ease: "power2.inOut" }, 5.5) // Swoop 5 (Belt passing)
      .to(camera.position, { z: -212, x: -0.3, y: 0.15, ease: "power2.inOut" }, 6)  // Jupiter
      .to(camera.position, { z: -252, x: 15.0, y: -6.0, ease: "power2.inOut" }, 6.5) // Swoop 6 (Slalom past Jupiter)
      .to(camera.position, { z: -276, x: 0.4, y: 0.75, ease: "power2.inOut" }, 7)   // Saturn
      .to(camera.position, { z: -322, x: -14.0, y: 5.0, ease: "power2.inOut" }, 7.5) // Swoop 7 (Slalom past Saturn)
      .to(camera.position, { z: -348, x: -0.2, y: 0.1, ease: "power2.inOut" }, 8)   // Uranus
      .to(camera.position, { z: -392, x: 12.0, y: -4.5, ease: "power2.inOut" }, 8.5) // Swoop 8 (Slalom past Uranus)
      .to(camera.position, { z: -418, x: 0.25, y: -0.1, ease: "power2.inOut" }, 9)  // Neptune
      .to(camera.position, { z: -220, y: 150, x: 0, ease: "power2.inOut" }, 10);     // Overview angle

    gsap.utils.toArray('.reveal-text').forEach((el: any) => {
      gsap.fromTo(el, 
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, duration: 0.8, scrollTrigger: { trigger: el, start: "top 85%", end: "top 25%", toggleActions: "play reverse play reverse" } }
      );
    });

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      // Explicitly downscale bloom pass resolution for performance after composer resize
      if (!isMobile) {
        bloomPass.setSize(w / 4, h / 4);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
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
      <section className={`h-screen w-full flex items-center justify-${alignment} px-6 md:px-16 xl:px-32`}>
        <div className="reveal-text glass-panel p-6 md:p-8 w-full max-w-md pointer-events-auto relative overflow-hidden" 
             style={{ borderLeft: `3px solid ${planetColor}`, boxShadow: `0 0 30px -10px ${planetColor}33` }}>
          <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-mono tracking-wider text-white/40 bg-white/5">
            {data.type.toUpperCase()}
          </div>
          
          <h2 className="text-3xl md:text-4xl font-display font-black mb-3 tracking-wide" style={{ color: planetColor }}>
            {data.name.toUpperCase()}
          </h2>
          
          {data.description && (
            <p className="text-white/80 text-[11px] md:text-xs leading-relaxed mb-4 font-sans">
              {data.description}
            </p>
          )}

          <div className="space-y-2 font-mono text-[9px] md:text-[10px] text-white/70 uppercase mb-4 border-t border-b border-white/5 py-3">
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Diameter</span> <span className="text-white font-medium">{data.diameter}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Distance</span> <span className="text-white font-medium">{data.distance}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Orbit Period</span> <span className="text-white font-medium">{data.orbitalPeriod || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Moons</span> <span className="text-white font-medium">{data.moons}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Gravity</span> <span className="text-white font-medium">{data.gravity || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Surface Temp</span> <span className="text-white font-medium">{data.temperature || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-white/5 pb-1"><span>Atmos</span> <span className="text-white font-medium">{data.atmosphere}</span></div>
            <div className="flex justify-between pb-1"><span>Core</span> <span className="text-white font-medium text-right truncate max-w-[180px]">{data.coreComposition || 'Unknown'}</span></div>
          </div>

          <div className="bg-white/5 rounded p-2.5 border border-white/5">
            <p className="text-white/30 text-[8px] font-mono mb-1 tracking-wider">CELESTIAL FACT</p>
            <p className="text-[10px] md:text-[11px] text-white/80 italic leading-relaxed">
              "{data.fact}"
            </p>
          </div>
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
      <div ref={containerRef} className="relative w-full" style={{ height: "1100vh" }}>
        <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-screen z-0 outline-none" />
        
        {/* Futuristic Spacecraft HUD Overlay */}
        <div 
          ref={hudContainerRef}
          className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 font-mono text-[10px] tracking-wider transition-colors duration-500"
          style={{ color: 'var(--hud-color, #10B981)', textShadow: '0 0 5px var(--hud-color)' }}
        >
          {/* HUD Top Bar */}
          <div className="flex justify-between items-start">
            <div className="hidden md:flex flex-col gap-1.5 bg-black/55 backdrop-blur-md p-3 border border-white/10 rounded-lg max-w-xs transition-colors duration-500"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>SYS ID: <span className="text-white font-semibold">NASA-APL-CE-09</span></div>
              <div>SECTOR: <span className="text-white">SOLAR SYSTEM</span></div>
              <div ref={hudCoordsRef}>COORD: SCANNING...</div>
            </div>

            {/* Warning overlay alerts */}
            <div ref={hudWarnRef} className="text-[10px] md:text-[12px] font-bold text-red-500 animate-pulse bg-red-950/40 border border-red-500/20 px-4 py-2.5 rounded-lg opacity-0 transition-opacity duration-300 pointer-events-none select-none max-w-[80vw] md:max-w-sm text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              ALERT: ENCOUNTERING HIGH SOLAR THERMAL RESISTANCE
            </div>
            
            <div className="hidden md:flex flex-col items-end gap-1.5 bg-black/55 backdrop-blur-md p-3 border border-white/10 rounded-lg text-right"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div ref={hudSpeedRef}>VELOCITY: 0.0 LY/S</div>
              <div>AUTOPILOT: <span className="text-white font-semibold">WARP ACTIVE</span></div>
              <div className="text-[8px] text-white/50">SECURE CONTEXT / PROMPT VALIDATED</div>
            </div>
          </div>

          {/* HUD Middle Reticle and Progress Lock */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
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
              
              <div className="absolute w-20 h-20 md:w-24 md:h-24 border border-dashed rounded-full opacity-15 animate-spin" style={{ animationDuration: '40s', borderColor: 'var(--hud-color)' }} />
              <div className="absolute w-10 h-10 md:w-12 md:h-12 border rounded-full opacity-25" style={{ borderColor: 'var(--hud-color)' }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white opacity-80" />
              <div ref={hudTargetRef} className="absolute mt-20 md:mt-24 text-[7px] md:text-[8px] text-center font-bold tracking-widest w-40 text-white/80">LOCKING...</div>
            </div>
          </div>

          {/* HUD Bottom telemetry */}
          <div className="flex justify-between items-end">
            <div className="hidden md:flex flex-col gap-1 bg-black/55 backdrop-blur-md p-3 border border-white/10 rounded-lg max-w-[190px]"
                 style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="font-bold text-[9px] text-white/40 mb-1">NAV TELEMETRY</div>
              <div ref={hudScanDataRef} className="text-white/80 leading-relaxed text-[9px] transition-all duration-300 opacity-0">
                ATMOS: UNKNOWN<br/>
                DIA: 0KM<br/>
                MOONS: 0<br/>
                STATUS: DEEP SPACE
              </div>
            </div>
            
            <div className="hidden md:block text-right text-[8px] text-white/30 max-w-xs pointer-events-none select-none">
              HUD SYSTEMS v4.11 / VERIFIED PILOT CONTEXT
            </div>
          </div>
        </div>
        
        {/* Info panels overlay */}
        <div className="relative z-10 w-full pointer-events-none">
          <section className="h-screen w-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="reveal-text text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-display font-black tracking-[0.15em] sm:tracking-[0.25em] text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]">
              CELESTIAL<br/>EXPLORER
            </h1>
            <p className="reveal-text mt-6 md:mt-8 text-xs sm:text-lg md:text-xl text-white/50 font-sans max-w-xl tracking-[0.2em] sm:tracking-[0.3em] uppercase">
              Voyage through the cosmic architecture
            </p>
            <div className="absolute bottom-10 animate-bounce text-white/20 font-mono text-[8px] sm:text-[9px] tracking-widest">
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
            <h2 className="reveal-text text-2xl sm:text-4xl md:text-6xl font-display font-black tracking-[0.15em] sm:tracking-[0.2em] text-white/90">
              DEEP EXPEDITION COMPLETE
            </h2>
            <p className="reveal-text mt-4 text-[10px] sm:text-sm text-white/45 font-mono max-w-md uppercase tracking-widest">
              System monitoring active. You have completed the orbital transit path.
            </p>
          </section>
        </div>
      </div>

    </>
  );
}