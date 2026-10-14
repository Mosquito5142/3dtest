import type * as THREE from "three";
import type { Track, ShrineMaterials, ShrineVariant } from "../../shaders/sakura-shrine-holo-card/world";
export type { Track };

/** Atmosphere of a zone; the walk blends between presets as you move. */
export type EnvPreset = {
  skyTop: string;
  skyHorizon: string;
  moon: string;
  stars: number;
  fog: string;
  fogDensity: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sunColor: string;
  sun: number;
  exposure: number;
  particleA: string;
  particleB: string;
  particleGlow: number;
  particleScale: number;
  /** 0 sakura petal, 1 round dot / ember, 2 leaf, 3 sand streak */
  particleShape: number;
  /** share of particles drawn, 0 = none */
  particleDensity: number;
  /** particles float upward (embers) instead of falling */
  particleRise?: boolean;
  /** extra sideways drift (blowing sand) */
  particleGust?: number;
};

/** A point that can borrow one of the pooled real lights when the player is near. */
export type LightPoint = {
  pos: THREE.Vector3;
  color: string;
  intensity: number;
  range: number;
  flicker: boolean;
  /** optional emissive/basic mesh whose colour flickers with the light */
  flame?: THREE.Mesh;
};

export type ZoneCtx = {
  /** zone root: the path starts at z = 0 (plaza edge) and runs toward -z; x = across the path */
  root: THREE.Group;
  track: Track;
  renderer: THREE.WebGLRenderer;
  /** shared shrine materials (wood, stone, vermilion, …) */
  M: ShrineMaterials;
  variant: ShrineVariant;
  /** total path length in metres */
  length: number;
  /** z of every photo slot (negative numbers) */
  slotZ: number[];
  /** distance from the plaza centre to the zone origin */
  hubRadius: number;
  lights: LightPoint[];
  /** round obstacles in zone-local x/z */
  colliders: THREE.Vector2[];
  /** deterministic random for this zone */
  rand: () => number;
  /** true if a prop of half-size `margin` at zone-local (x, z) stays inside this zone's 60° wedge */
  inWedge(x: number, z: number, margin?: number): boolean;
  /** per-frame callbacks (time in seconds) for animated scenery */
  updaters: ((t: number) => void)[];
};

export type PlacardStyle = { bg: [string, string]; border: string; ink: string; sub: string; seal: string };

export type ZoneTheme = {
  id: string;
  folder: string;
  nameJa: string;
  nameTh: string;
  nameEn: string;
  /** UI / minimap colour */
  color: string;
  env(variant: ShrineVariant): EnvPreset;
  placard: PlacardStyle;
  /** gate at z≈0, path, side decoration and the landmark at the end */
  buildWorld(ctx: ZoneCtx): void;
  /**
   * Display stand for one photo, facing +z, centred on x = 0. The photo itself (w × h metres)
   * is placed by the caller at (0, centerY, frontZ).
   */
  buildBoard(ctx: ZoneCtx, w: number, h: number): { group: THREE.Group; centerY: number; frontZ: number };
};
