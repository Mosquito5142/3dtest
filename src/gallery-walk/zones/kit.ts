// Small helpers for building low-poly scenery inside a zone.
import * as THREE from "three";
import type { Track, ZoneCtx } from "./types";
export type { Track };

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MatOpts = { emissive?: string; emissiveIntensity?: number; roughness?: number; metalness?: number; flat?: boolean; side?: THREE.Side; basic?: boolean; transparent?: boolean; opacity?: number };
const matCache = new WeakMap<Track, Map<string, THREE.Material>>();

/** Cached material per colour + options (shared across the zone, disposed with the tracker). */
export function mat(ctx: { track: Track }, color: string, o: MatOpts = {}): THREE.Material {
  let cache = matCache.get(ctx.track);
  if (!cache) matCache.set(ctx.track, (cache = new Map()));
  const key = color + JSON.stringify(o);
  let m = cache.get(key);
  if (!m) {
    m = o.basic
      ? new THREE.MeshBasicMaterial({ color, side: o.side, transparent: o.transparent, opacity: o.opacity ?? 1, toneMapped: false })
      : new THREE.MeshStandardMaterial({
          color, roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0, flatShading: o.flat,
          emissive: o.emissive ?? "#000000", emissiveIntensity: o.emissiveIntensity ?? 1, side: o.side,
          transparent: o.transparent, opacity: o.opacity ?? 1,
        });
    ctx.track(m);
    cache.set(key, m);
  }
  return m;
}

const geoCache = new WeakMap<Track, Map<string, THREE.BufferGeometry>>();
function geo<T extends THREE.BufferGeometry>(ctx: { track: Track }, key: string, make: () => T): T {
  let cache = geoCache.get(ctx.track);
  if (!cache) geoCache.set(ctx.track, (cache = new Map()));
  const hit = cache.get(key) as T | undefined;
  if (hit) return hit;
  const g = ctx.track(make());
  cache.set(key, g);
  return g;
}

export function box(ctx: { track: Track }, parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, ry = 0) {
  const mesh = new THREE.Mesh(geo(ctx, "box", () => new THREE.BoxGeometry(1, 1, 1)), m);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}

export function cyl(ctx: { track: Track }, parent: THREE.Object3D, rTop: number, rBot: number, h: number, seg: number, x: number, y: number, z: number, m: THREE.Material) {
  const g = geo(ctx, `cyl${rTop / rBot}_${seg}`, () => new THREE.CylinderGeometry(rTop / rBot, 1, 1, seg));
  const mesh = new THREE.Mesh(g, m);
  mesh.scale.set(rBot, h, rBot);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function cone(ctx: { track: Track }, parent: THREE.Object3D, r: number, h: number, seg: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(geo(ctx, `cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg)), m);
  mesh.scale.set(r, h, r);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function sphere(ctx: { track: Track }, parent: THREE.Object3D, r: number, x: number, y: number, z: number, m: THREE.Material, detail = 1) {
  const mesh = new THREE.Mesh(geo(ctx, `ico${detail}`, () => new THREE.IcosahedronGeometry(1, detail)), m);
  mesh.scale.setScalar(r);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** Triangular-prism gable roof along x (ridge along x), width w, depth d, height h. */
export function gable(ctx: { track: Track }, parent: THREE.Object3D, w: number, d: number, h: number, x: number, y: number, z: number, m: THREE.Material, ry = 0) {
  const g = geo(ctx, "gable", () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0);
    shape.lineTo(0.5, 0);
    shape.lineTo(0, 1);
    shape.closePath();
    const e = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    e.translate(0, 0, -0.5);
    e.rotateY(Math.PI / 2);
    return e;
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}

/** Wedge of ground (60°) owned by the zone, from the plaza edge outward. Optional height function in zone-local x/z. */
export function zoneGround(ctx: ZoneCtx, m: THREE.Material, y = 0, height?: (x: number, z: number) => number) {
  const inner = ctx.hubRadius - 0.6;
  const outer = ctx.hubRadius + ctx.length + 45;
  const g = ctx.track(new THREE.RingGeometry(inner, outer, height ? 72 : 24, height ? 48 : 1, Math.PI / 2 - Math.PI / 6 - 0.01, Math.PI / 3 + 0.02));
  if (height) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = -pos.getY(i) + ctx.hubRadius;
      pos.setZ(i, height(lx, lz));
    }
    g.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, ctx.hubRadius);
  mesh.receiveShadow = true;
  ctx.root.add(mesh);
  return mesh;
}

export function canvasTex(ctx: { track: Track; renderer: THREE.WebGLRenderer }, c: HTMLCanvasElement) {
  const t = ctx.track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  return t;
}

export function makeCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  return c;
}

/** Flat textured sign facing +z. */
export function sign(ctx: ZoneCtx, parent: THREE.Object3D, c: HTMLCanvasElement, w: number, h: number, x: number, y: number, z: number, glow = 0.15) {
  const m = ctx.track(new THREE.MeshStandardMaterial({ map: canvasTex(ctx, c), roughness: 0.8, emissive: "#ffffff", emissiveMap: null, emissiveIntensity: glow }));
  m.emissiveMap = m.map;
  const mesh = new THREE.Mesh(geo(ctx, "plane", () => new THREE.PlaneGeometry(1, 1)), m);
  mesh.scale.set(w, h, 1);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function addLight(ctx: ZoneCtx, x: number, y: number, z: number, color: string, intensity: number, range = 6, flicker = false, flame?: THREE.Mesh) {
  ctx.lights.push({ pos: new THREE.Vector3(x, y, z), color, intensity, range, flicker, flame });
}

/** Sides of the path: calls fn(x, z, side) every `step` metres on both sides between z0 and z1 (negative). */
export function alongSides(z0: number, z1: number, step: number, fn: (z: number, side: number, i: number) => void) {
  let i = 0;
  for (let z = z0; z > z1; z -= step, i++) for (const side of [-1, 1]) fn(z, side, i);
}
