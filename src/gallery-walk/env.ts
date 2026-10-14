// Blends sky, fog, lights, exposure and particles between zone presets as the player walks.
import * as THREE from "three";
import type { EnvPreset } from "./zones/types";

export const HUB_ENV: EnvPreset = {
  skyTop: "#151433", skyHorizon: "#8a4f7e", moon: "#fff2dc", stars: 0.7, fog: "#3e2e4e", fogDensity: 0.022,
  hemiSky: "#b0a0e8", hemiGround: "#3a2838", hemi: 0.9, sunColor: "#c8c0ff", sun: 0.8, exposure: 1.08,
  particleA: "#ffc2d8", particleB: "#fff0f6", particleGlow: 0.8, particleScale: 0.8,
};

type Resolved = {
  skyTop: THREE.Color; skyHorizon: THREE.Color; moon: THREE.Color; fog: THREE.Color; hemiSky: THREE.Color;
  hemiGround: THREE.Color; sunColor: THREE.Color; particleA: THREE.Color; particleB: THREE.Color;
  stars: number; fogDensity: number; hemi: number; sun: number; exposure: number; particleGlow: number; particleScale: number;
};
const COLOR_KEYS = ["skyTop", "skyHorizon", "moon", "fog", "hemiSky", "hemiGround", "sunColor", "particleA", "particleB"] as const;
const NUM_KEYS = ["stars", "fogDensity", "hemi", "sun", "exposure", "particleGlow", "particleScale"] as const;

export function resolve(p: EnvPreset): Resolved {
  const r = {} as Resolved;
  for (const k of COLOR_KEYS) r[k] = new THREE.Color(p[k]);
  for (const k of NUM_KEYS) r[k] = p[k];
  return r;
}

function lerpInto(out: Resolved, a: Resolved, b: Resolved, t: number) {
  for (const k of COLOR_KEYS) out[k].copy(a[k]).lerp(b[k], t);
  for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
}

export type EnvTargets = {
  renderer: THREE.WebGLRenderer;
  fog: THREE.FogExp2;
  sky: THREE.ShaderMaterial;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  particles: THREE.ShaderMaterial;
};

export function createEnvBlender(t: EnvTargets, start: Resolved) {
  const cur = resolve(HUB_ENV);
  lerpInto(cur, start, start, 0);
  const target = resolve(HUB_ENV);
  return {
    /** target = mix(a, b, w); the applied values ease toward it so warps fade instead of popping */
    update(a: Resolved, b: Resolved, w: number, dt: number) {
      lerpInto(target, a, b, w);
      lerpInto(cur, cur, target, 1 - Math.exp(-dt * 2.5));
      t.sky.uniforms.uTop.value.copy(cur.skyTop);
      t.sky.uniforms.uHorizon.value.copy(cur.skyHorizon);
      t.sky.uniforms.uMoonColor.value.copy(cur.moon);
      t.sky.uniforms.uStars.value = cur.stars;
      t.fog.color.copy(cur.fog);
      t.fog.density = cur.fogDensity;
      t.hemi.color.copy(cur.hemiSky);
      t.hemi.groundColor.copy(cur.hemiGround);
      t.hemi.intensity = cur.hemi;
      t.sun.color.copy(cur.sunColor);
      t.sun.intensity = cur.sun;
      t.renderer.toneMappingExposure = cur.exposure;
      t.particles.uniforms.uColorA.value.copy(cur.particleA);
      t.particles.uniforms.uColorB.value.copy(cur.particleB);
      t.particles.uniforms.uGlow.value = cur.particleGlow;
      t.particles.uniforms.uScale.value = cur.particleScale;
    },
  };
}
