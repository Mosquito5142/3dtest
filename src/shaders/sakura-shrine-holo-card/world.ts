// Shared builders for the sakura shrine: sky, lights, torii, stone lanterns, paper lanterns,
// sakura trees and GPU-animated falling petals. Used by the holo-card page and the gallery walk.
import * as THREE from "three";
import { petalVertex, petalFragment, skyVertex, skyFragment } from "./shaders";

export type ShrineVariant = "yozakura" | "hanami";

export const PALETTES = {
  yozakura: {
    skyTop: "#090820", skyHorizon: "#5a2550", fog: "#24122e", fogDensity: 0.045,
    ambient: 0.35, hemiSky: "#6a5aa8", hemiGround: "#1a0d18", sun: 0.25, sunColor: "#9fb0ff",
    lantern: 3.2, moon: "#fff2dc", stars: 1, petalA: "#ffb3cb", petalB: "#fff0f5", petalGlow: 1,
    blossom: "#ffb6cf", blossomEmissive: "#5a1a35", ground: "#1d1418", exposure: 1.1, chochin: 1.3,
  },
  hanami: {
    skyTop: "#6fa6dc", skyHorizon: "#ffe1ea", fog: "#f2d6e2", fogDensity: 0.03,
    ambient: 0.8, hemiSky: "#cfe6ff", hemiGround: "#8a6a5a", sun: 2.4, sunColor: "#fff1e0",
    lantern: 0.6, moon: "#ffffff", stars: 0, petalA: "#ff9fbf", petalB: "#ffe6ef", petalGlow: 0,
    blossom: "#ffc2d6", blossomEmissive: "#3a0f20", ground: "#7d6a5c", exposure: 1.0, chochin: 0.25,
  },
} as const;
export type Palette = (typeof PALETTES)[ShrineVariant];

export type Track = <T extends { dispose(): void }>(o: T) => T;

export function createTracker() {
  const list: { dispose(): void }[] = [];
  const track: Track = (o) => (list.push(o), o);
  return { track, disposeAll: () => list.forEach((d) => d.dispose()) };
}

export function createRenderer(P: Palette) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function createMaterials(P: Palette, track: Track) {
  return {
    vermilion: track(new THREE.MeshStandardMaterial({ color: "#d4321f", roughness: 0.55, emissive: "#3a0602", emissiveIntensity: 0.4 })),
    black: track(new THREE.MeshStandardMaterial({ color: "#1b1414", roughness: 0.6 })),
    stone: track(new THREE.MeshStandardMaterial({ color: "#8a8079", roughness: 0.9 })),
    lanternStone: track(new THREE.MeshStandardMaterial({ color: "#9a948c", roughness: 0.92 })),
    bark: track(new THREE.MeshStandardMaterial({ color: "#5a3a30", roughness: 0.95 })),
    wood: track(new THREE.MeshStandardMaterial({ color: "#5a3524", roughness: 0.75 })),
    blossom: track(new THREE.MeshStandardMaterial({
      color: P.blossom, roughness: 0.8, emissive: P.blossomEmissive, emissiveIntensity: 0.6, flatShading: true,
    })),
    chochin: [
      track(new THREE.MeshStandardMaterial({ color: "#ff3b3b", emissive: "#ff3020", emissiveIntensity: P.chochin })),
      track(new THREE.MeshStandardMaterial({ color: "#fff3e0", emissive: "#ffd9a0", emissiveIntensity: P.chochin * 0.9 })),
    ],
    hall: track(new THREE.MeshStandardMaterial({ color: "#4a1a14", roughness: 0.8 })),
  };
}
export type ShrineMaterials = ReturnType<typeof createMaterials>;

/** Sky dome, lights and ground. Returns the sky material (needs uTime) and the sun. */
export function buildEnvironment(scene: THREE.Scene, P: Palette, track: Track, groundRadius = 40) {
  scene.fog = new THREE.FogExp2(P.fog, P.fogDensity);
  const skyMat = track(new THREE.ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(P.skyTop) }, uHorizon: { value: new THREE.Color(P.skyHorizon) },
      uMoonColor: { value: new THREE.Color(P.moon) }, uMoonDir: { value: new THREE.Vector3(0.35, 0.42, -1) },
      uStars: { value: P.stars }, uTime: { value: 0 },
    },
  }));
  const sky = new THREE.Mesh(track(new THREE.SphereGeometry(90, 32, 16)), skyMat);
  scene.add(sky);

  scene.add(new THREE.AmbientLight(0xffffff, P.ambient * 0.4));
  scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, P.ambient));
  const sun = new THREE.DirectionalLight(P.sunColor, P.sun);
  sun.position.set(-6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(
    track(new THREE.CircleGeometry(groundRadius, 48)),
    track(new THREE.MeshStandardMaterial({ color: P.ground, roughness: 0.95 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return { skyMat, sky, sun, ground };
}

/** Flagstone path from zStart going toward -z. */
export function buildPath(scene: THREE.Scene, M: ShrineMaterials, track: Track, zStart: number, count: number, step = 1.05) {
  const stoneGeo = track(new THREE.BoxGeometry(1, 0.08, 1));
  for (let i = 0; i < count; i++) {
    const s = new THREE.Mesh(stoneGeo, M.stone);
    s.position.set((Math.random() - 0.5) * 0.15, 0.03, zStart - i * step);
    s.scale.set(1.5 + Math.random() * 0.2, 1, 0.85);
    s.rotation.y = (Math.random() - 0.5) * 0.08;
    s.receiveShadow = true;
    scene.add(s);
  }
}

export function buildTorii(scene: THREE.Scene, M: ShrineMaterials, track: Track, z: number, s: number, x = 0) {
  const g = new THREE.Group();
  const pillarGeo = track(new THREE.CylinderGeometry(0.17, 0.2, 4.2, 20));
  for (const px of [-1.75, 1.75]) {
    const p = new THREE.Mesh(pillarGeo, M.vermilion);
    p.position.set(px, 2.1, 0);
    p.castShadow = true;
    g.add(p);
    const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.24, 0.35, 20)), M.black);
    foot.position.set(px, 0.17, 0);
    g.add(foot);
  }
  const nuki = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.22, 0.2)), M.vermilion);
  nuki.position.y = 3.35;
  g.add(nuki);
  const shimaki = new THREE.Mesh(track(new THREE.BoxGeometry(4.9, 0.26, 0.36)), M.vermilion);
  shimaki.position.y = 4.05;
  g.add(shimaki);
  // curved kasagi: bent box
  const kasaGeo = track(new THREE.BoxGeometry(5.8, 0.24, 0.5, 24, 1, 1));
  const pos = kasaGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    pos.setY(i, pos.getY(i) + Math.pow(Math.abs(px) / 2.9, 2.4) * 0.32);
  }
  kasaGeo.computeVertexNormals();
  const kasagi = new THREE.Mesh(kasaGeo, M.black);
  kasagi.position.y = 4.3;
  kasagi.castShadow = true;
  g.add(kasagi);
  const plaque = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.6, 0.08)), M.black);
  plaque.position.set(0, 3.7, 0.12);
  g.add(plaque);
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

/** Shrine hall with glowing doors, facing +z. */
export function buildHall(scene: THREE.Scene, M: ShrineMaterials, track: Track, z: number) {
  const hall = new THREE.Group();
  const body = new THREE.Mesh(track(new THREE.BoxGeometry(5, 2.2, 3)), M.hall);
  body.position.y = 1.5;
  hall.add(body);
  const roof = new THREE.Mesh(track(new THREE.ConeGeometry(4.4, 1.8, 4, 1)), M.black);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.3, 1, 0.85);
  roof.position.y = 3.4;
  hall.add(roof);
  const doorGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, 1.3)), track(new THREE.MeshBasicMaterial({ color: "#ffb36b" })));
  doorGlow.position.set(0, 1.2, 1.51);
  hall.add(doorGlow);
  hall.position.set(0, 0, z);
  scene.add(hall);
  return hall;
}

export type Flame = { light: THREE.PointLight; mesh: THREE.Mesh; seed: number };

/** Stone lantern (toro) with a flickering candle light. */
export function buildToro(scene: THREE.Scene, M: ShrineMaterials, track: Track, P: Palette, x: number, z: number, lightRange = 5.5) {
  const g = new THREE.Group();
  const parts: [THREE.BufferGeometry, number][] = [
    [new THREE.CylinderGeometry(0.42, 0.5, 0.18, 6), 0.09],
    [new THREE.CylinderGeometry(0.1, 0.13, 0.9, 12), 0.63],
    [new THREE.CylinderGeometry(0.34, 0.24, 0.14, 6), 1.13],
  ];
  for (const [geo, y] of parts) {
    const m = new THREE.Mesh(track(geo), M.lanternStone);
    m.position.y = y;
    m.castShadow = true;
    g.add(m);
  }
  const fire = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.3, 0.34)), track(new THREE.MeshBasicMaterial({ color: "#ffbf6e" })));
  fire.position.y = 1.36;
  g.add(fire);
  const roofT = new THREE.Mesh(track(new THREE.ConeGeometry(0.55, 0.36, 6)), M.lanternStone);
  roofT.position.y = 1.69;
  roofT.castShadow = true;
  g.add(roofT);
  const hoju = new THREE.Mesh(track(new THREE.SphereGeometry(0.09, 12, 8)), M.lanternStone);
  hoju.position.y = 1.92;
  g.add(hoju);
  const light = new THREE.PointLight("#ff9a4a", P.lantern, lightRange, 1.8);
  light.position.y = 1.36;
  g.add(light);
  g.position.set(x, 0, z);
  scene.add(g);
  return { group: g, flame: { light, mesh: fire, seed: Math.random() * 100 } as Flame };
}

export function flicker(flames: Flame[], t: number, base: number) {
  for (const f of flames) {
    const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 23 + f.seed * 2) * 0.3 + Math.sin(t * 4.3 + f.seed) * 0.2;
    f.light.intensity = base * (0.85 + n * 0.15);
    (f.mesh.material as THREE.MeshBasicMaterial).color.setHSL(0.08, 1, 0.68 + n * 0.05);
  }
}

/** A row of red/white chochin paper lanterns along z. */
export function buildChochinRow(scene: THREE.Scene, M: ShrineMaterials, track: Track, x: number, zStart: number, count: number, spacing: number, y = 3.05) {
  const geo = track(new THREE.SphereGeometry(0.16, 16, 12));
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, M.chochin[i % 2]);
    m.scale.y = 1.35;
    m.position.set(x, y - Math.sin((i / Math.max(count - 1, 1)) * Math.PI) * 0.1, zStart - i * spacing);
    scene.add(m);
  }
}

/** Sakura trees: trunks + branches + instanced blossom clusters, plus a carpet of fallen petals. */
export function buildSakuraTrees(scene: THREE.Scene, M: ShrineMaterials, track: Track, P: Palette, spots: [number, number, number][], carpetPerTree = 220) {
  const blossomGeo = track(new THREE.IcosahedronGeometry(0.42, 1));
  const perTree = 70;
  const blossoms = new THREE.InstancedMesh(blossomGeo, M.blossom, spots.length * perTree);
  blossoms.castShadow = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const color = new THREE.Color();
  const trunkGeo = track(new THREE.CylinderGeometry(0.12, 0.26, 3, 8));
  const branchGeo = track(new THREE.CylinderGeometry(0.04, 0.09, 1.6, 6));
  let bi = 0;
  for (const [tx, tz, s] of spots) {
    const trunk = new THREE.Mesh(trunkGeo, M.bark);
    trunk.scale.setScalar(s);
    trunk.position.set(tx, 1.5 * s, tz);
    trunk.rotation.z = (Math.random() - 0.5) * 0.25;
    trunk.castShadow = true;
    scene.add(trunk);
    for (let b = 0; b < 3; b++) {
      const br = new THREE.Mesh(branchGeo, M.bark);
      br.scale.setScalar(s);
      const a = (b / 3) * Math.PI * 2 + Math.random();
      br.position.set(tx + Math.cos(a) * 0.5 * s, 2.9 * s, tz + Math.sin(a) * 0.5 * s);
      br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      scene.add(br);
    }
    for (let i = 0; i < perTree; i++) {
      const u = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      v.set(tx + Math.cos(u) * r * 1.9 * s, (3.1 + (Math.random() - 0.3) * 1.3) * s, tz + Math.sin(u) * r * 1.6 * s);
      q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
      const k = (0.7 + Math.random() * 0.8) * s;
      sc.set(k, k * 0.85, k);
      m4.compose(v, q, sc);
      blossoms.setMatrixAt(bi, m4);
      color.set(P.blossom).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.12);
      blossoms.setColorAt(bi, color);
      bi++;
    }
  }
  scene.add(blossoms);

  const carpetMat = track(new THREE.MeshStandardMaterial({ color: P.petalA, roughness: 0.9, side: THREE.DoubleSide }));
  const total = spots.length * carpetPerTree;
  const carpet = new THREE.InstancedMesh(track(new THREE.CircleGeometry(0.05, 5)), carpetMat, total);
  for (let i = 0; i < total; i++) {
    const [tx, tz] = spots[i % spots.length];
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() < 0.6 ? Math.random() * 2.6 : Math.random() * 6;
    v.set(tx * (r > 2.6 ? 0.4 : 1) + Math.cos(a) * r, 0.012, tz + Math.sin(a) * r);
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.random() * 6));
    sc.setScalar(0.7 + Math.random());
    m4.compose(v, q, sc);
    carpet.setMatrixAt(i, m4);
  }
  scene.add(carpet);
}

/** Falling petals animated entirely in the vertex shader. Move `uCenter` to keep them around the viewer. */
export function buildFallingPetals(scene: THREE.Scene, track: Track, P: Palette, box: THREE.Vector3, center: THREE.Vector3, count = 1800) {
  const base = new THREE.PlaneGeometry(0.09, 0.11);
  const geo = track(new THREE.InstancedBufferGeometry());
  geo.index = base.index;
  geo.setAttribute("position", base.getAttribute("position"));
  geo.setAttribute("uv", base.getAttribute("uv"));
  const offsets = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    offsets.set([(Math.random() - 0.5) * box.x, Math.random() * box.y, (Math.random() - 0.5) * box.z], i * 3);
    params.set([0.25 + Math.random() * 0.35, Math.random() * 6.28, 0.6 + Math.random() * 1.8, 0.7 + Math.random() * 0.7], i * 4);
  }
  geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
  geo.instanceCount = count;
  base.dispose();
  const mat = track(new THREE.ShaderMaterial({
    vertexShader: petalVertex, fragmentShader: petalFragment, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uWind: { value: 0.35 }, uBox: { value: box }, uCenter: { value: center.clone() },
      uColorA: { value: new THREE.Color(P.petalA) }, uColorB: { value: new THREE.Color(P.petalB) }, uGlow: { value: P.petalGlow },
    },
  }));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mat;
}
