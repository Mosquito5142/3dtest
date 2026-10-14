import * as THREE from "three";
import type { ZoneTheme, ZoneCtx } from "./types";
import { box, cyl, cone, mat, sphere, makeCanvas, sign, addLight, alongSides } from "./kit";

const WOOD = "#9a6a42";
const WOOD_LIGHT = "#c49a6a";
const THATCH = "#c9a25e";

const waterVertex = /* glsl */ `
uniform float uTime;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec3 p = position;
  vec4 w = modelMatrix * vec4(p, 1.0);
  float wave = sin(w.x * 0.6 + uTime * 1.1) * 0.05 + sin(w.z * 0.8 + uTime * 0.8) * 0.04;
  p.z += wave; // plane is rotated, local z is up
  w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;
const waterFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uPathOrigin;
uniform vec3 uPathDir;
varying vec3 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  // distance from the boardwalk line -> shallow lagoon near it, deeper further away
  vec3 rel = vWorld - uPathOrigin;
  float along = dot(rel.xz, uPathDir.xz);
  float across = length(rel.xz - uPathDir.xz * along);
  float shallow = 1.0 - smoothstep(3.0, 22.0, across);
  vec3 col = mix(uDeep, uShallow, shallow);
  // caustic ripples + sun glints
  vec2 q = vWorld.xz * 0.9;
  float c = sin(q.x * 2.3 + sin(q.y * 1.7 + uTime) * 1.5 + uTime * 0.7) * sin(q.y * 2.1 + sin(q.x * 1.3 - uTime * 0.8) * 1.5);
  col += vec3(0.6, 0.95, 1.0) * smoothstep(0.55, 0.95, c) * 0.22 * (0.4 + shallow);
  vec2 cell = floor(vWorld.xz * 3.0);
  float g = hash(cell);
  col += vec3(1.0) * step(0.992, g) * (0.5 + 0.5 * sin(uTime * 4.0 + g * 50.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function palm(ctx: ZoneCtx, x: number, z: number, h: number, lean: number, ry: number) {
  const g = new THREE.Group();
  const seg = 6;
  let px = 0;
  let py = 0;
  const trunkM = mat(ctx, "#8a6a48", { flat: true });
  for (let i = 0; i < seg; i++) {
    const t = i / seg;
    const nx = Math.sin(t * lean) * h * 0.35;
    const ny = py + h / seg;
    const piece = cyl(ctx, g, 0.13 - t * 0.05, 0.16 - t * 0.05, h / seg + 0.05, 7, (px + nx) / 2, (py + ny) / 2, 0, trunkM);
    piece.rotation.z = -Math.atan2(nx - px, ny - py);
    px = nx;
    py = ny;
  }
  const leafM = mat(ctx, "#3f9a4a", { flat: true, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const leaf = new THREE.Mesh(ctx.track(new THREE.ConeGeometry(0.35, 2.4, 3)), leafM);
    leaf.scale.z = 0.25;
    leaf.position.set(px + Math.cos(a) * 0.9, py - 0.25, Math.sin(a) * 0.9);
    leaf.rotation.set(0, -a, Math.PI / 2 + 0.35);
    leaf.rotateY(0);
    g.add(leaf);
  }
  for (let i = 0; i < 3; i++) sphere(ctx, g, 0.12, px + Math.cos(i * 2) * 0.2, py - 0.2, Math.sin(i * 2) * 0.2, mat(ctx, "#5a4228"), 0);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  ctx.root.add(g);
}

function island(ctx: ZoneCtx, x: number, z: number, r: number) {
  const s = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(r, r * 1.25, 0.6, 18)), mat(ctx, "#f3e2b8", { roughness: 1 }));
  s.position.set(x, -0.18, z);
  s.receiveShadow = true;
  ctx.root.add(s);
  const n = 1 + Math.floor(ctx.rand() * 3);
  for (let i = 0; i < n; i++) palm(ctx, x + (ctx.rand() - 0.5) * r, z + (ctx.rand() - 0.5) * r, 4.5 + ctx.rand() * 2, 1 + ctx.rand(), ctx.rand() * 6);
}

function bungalow(ctx: ZoneCtx, x: number, z: number, s: number, ry: number) {
  const g = new THREE.Group();
  for (const dx of [-1.4, 1.4]) for (const dz of [-1.2, 1.2]) cyl(ctx, g, 0.08, 0.08, 1.6, 6, dx, 0.3, dz, mat(ctx, WOOD));
  box(ctx, g, 3.6, 0.15, 3.2, 0, 1.1, 0, mat(ctx, WOOD_LIGHT));
  box(ctx, g, 2.6, 1.6, 2.2, 0, 1.95, -0.2, mat(ctx, "#f2ead8"));
  box(ctx, g, 0.8, 1.1, 0.04, 0, 1.75, 0.92, mat(ctx, "#ffd9a0", { basic: true }));
  const roof = cone(ctx, g, 2.4, 1.6, 4, 0, 3.5, -0.2, mat(ctx, THATCH, { flat: true }));
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.9;
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.scale.setScalar(s);
  ctx.root.add(g);
}

export const maldives: ZoneTheme = {
  id: "maldives",
  folder: "maldives",
  nameJa: "モルディブ",
  nameTh: "เกาะมัลดีฟส์",
  nameEn: "Maldives Islands",
  color: "#3fd0d8",
  placard: { bg: ["#fffaf0", "#f0e2c6"], border: "#3a9aa8", ink: "#103a44", sub: "#2a6a74", seal: "#ff7a59" },
  env: () => ({
    skyTop: "#2f86dc", skyHorizon: "#c6ecff", moon: "#ffffff", stars: 0, fog: "#bfe6f2", fogDensity: 0.012,
    hemiSky: "#e0f4ff", hemiGround: "#7ac0c8", hemi: 1.0, sunColor: "#fff4e0", sun: 2.6, exposure: 1.02,
    particleA: "#ffffff", particleB: "#bff6ff", particleGlow: 1, particleScale: 0.35, particleShape: 1, particleDensity: 0,
  }),

  buildWorld(ctx) {
    const { root, length, slotZ, track } = ctx;
    // lagoon
    const waterGeo = track(new THREE.RingGeometry(ctx.hubRadius - 0.6, ctx.hubRadius + length + 45, 48, 24, Math.PI / 2 - Math.PI / 6 - 0.01, Math.PI / 3 + 0.02));
    const water = new THREE.Mesh(waterGeo, track(new THREE.ShaderMaterial({
      vertexShader: waterVertex, fragmentShader: waterFragment, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uDeep: { value: new THREE.Color("#0a5f9a") }, uShallow: { value: new THREE.Color("#3fe0d0") },
        uPathOrigin: { value: new THREE.Vector3() }, uPathDir: { value: new THREE.Vector3() },
      }]),
    })));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.25, ctx.hubRadius);
    water.userData.dynamic = true;
    root.add(water);
    const u = (water.material as THREE.ShaderMaterial).uniforms;
    ctx.updaters.push((t) => {
      u.uTime.value = t;
      root.getWorldPosition(u.uPathOrigin.value);
      u.uPathDir.value.set(0, 0, -1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
    });

    // boardwalk
    const plankM = mat(ctx, WOOD_LIGHT, { roughness: 0.8 });
    const planks = new THREE.InstancedMesh(track(new THREE.BoxGeometry(5.2, 0.08, 0.26)), mat(ctx, "#ffffff", { roughness: 0.8 }), Math.ceil(length / 0.3));
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < planks.count; i++) {
      planks.setMatrixAt(i, m4.makeTranslation(0, -0.02, 1 - i * 0.3));
      planks.setColorAt(i, c.set(WOOD_LIGHT).offsetHSL(0, 0, (ctx.rand() - 0.5) * 0.08));
    }
    planks.receiveShadow = true;
    root.add(planks);
    for (let z = 0.5; z > -length; z -= 2.5) for (const x of [-2.55, 2.55]) {
      cyl(ctx, root, 0.09, 0.09, 1.2, 6, x, -0.5, z, mat(ctx, WOOD));
      cyl(ctx, root, 0.05, 0.05, 1.0, 6, x, 0.5, z, mat(ctx, WOOD));
    }
    for (const x of [-2.55, 2.55]) {
      const rope = cyl(ctx, root, 0.025, 0.025, length, 5, x, 0.95, -length / 2 + 0.5, mat(ctx, "#d8c49a"));
      rope.rotation.x = Math.PI / 2;
    }
    // little platforms under each photo
    slotZ.forEach((z, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      box(ctx, root, 1.6, 0.1, 3.2, side * 3.4, -0.03, z, plankM);
      // tiki torch
      cyl(ctx, root, 0.04, 0.05, 1.6, 5, side * 2.75, 0.8, z + 1.7, mat(ctx, "#6a4a2a"));
      const f = sphere(ctx, root, 0.1, side * 2.75, 1.68, z + 1.7, mat(ctx, "#ffb060", { basic: true }), 0);
      addLight(ctx, side * 2.75, 1.7, z + 1.7, "#ffb070", 1.2, 5, true, f);
    });

    // gate: two palms with a driftwood sign
    for (const x of [-3.2, 3.2]) palm(ctx, x, 0.2, 5, 0.6 * Math.sign(-x), 0);
    box(ctx, root, 0.12, 3.2, 0.12, -2.4, 1.6, 0.3, mat(ctx, WOOD));
    box(ctx, root, 0.12, 3.2, 0.12, 2.4, 1.6, 0.3, mat(ctx, WOOD));
    const sc = makeCanvas(512, 128, (g) => {
      g.fillStyle = "#c49a6a"; g.fillRect(0, 0, 512, 128);
      g.fillStyle = "#3a2410"; g.font = "700 54px 'Noto Sans Thai', sans-serif"; g.textAlign = "center";
      g.fillText("MALDIVES · มัลดีฟส์", 256, 84);
    });
    sign(ctx, root, sc, 4.4, 1.1, 0, 3.0, 0.38);

    // islands, bungalows and the overwater villa at the end
    alongSides(-6, -length - 6, 9, (z, side) => {
      const x = side * (9 + ctx.rand() * 6);
      const r = 1.6 + ctx.rand() * 1.4;
      if (ctx.rand() < 0.75 && ctx.inWedge(x, z, r + 2)) island(ctx, x, z + ctx.rand() * 3, r);
    });
    alongSides(-12, -length, 14, (z, side) => {
      const x = side * (7 + ctx.rand() * 2);
      if (ctx.inWedge(x, z, 2.2)) bungalow(ctx, x, z, 1, side * Math.PI / 2);
    });
    const end = -length + 1;
    box(ctx, root, 8, 0.15, 6, 0, -0.02, end - 1.5, plankM);
    bungalow(ctx, 0, end - 3, 2, 0);
    for (const x of [-3, 3]) {
      box(ctx, root, 1.2, 0.35, 0.6, x, 0.2, end, mat(ctx, "#f4f0e6"));
      cyl(ctx, root, 0.03, 0.03, 2, 5, x, 1.1, end - 0.6, mat(ctx, "#f4f0e6"));
      cone(ctx, root, 1, 0.5, 8, x, 2.2, end - 0.6, mat(ctx, "#ff8a6a"));
    }
  },

  buildBoard(ctx, w, h) {
    const g = new THREE.Group();
    const cy = 1.8;
    const bamboo = mat(ctx, "#b8a060", { roughness: 0.6 });
    box(ctx, g, w + 0.3, h + 0.3, 0.05, 0, cy, -0.04, mat(ctx, "#efe2c8"));
    const topY = cy + h / 2 + 0.35;
    for (const x of [-w / 2 - 0.22, w / 2 + 0.22]) {
      cyl(ctx, g, 0.06, 0.07, topY + 0.2, 7, x, (topY + 0.2) / 2, 0, bamboo);
      for (let y = 0.5; y < topY; y += 0.55) cyl(ctx, g, 0.075, 0.075, 0.04, 7, x, y, 0, mat(ctx, "#8a7438"));
    }
    for (const y of [cy + h / 2 + 0.2, cy - h / 2 - 0.2]) {
      const bar = cyl(ctx, g, 0.05, 0.05, w + 0.6, 7, 0, y, 0.02, bamboo);
      bar.rotation.z = Math.PI / 2;
    }
    const roof = cone(ctx, g, (w + 1) * 0.72, 0.6, 4, 0, topY + 0.45, -0.05, mat(ctx, THATCH, { flat: true }));
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.5;
    // flower lei
    for (let i = 0; i < 7; i++) sphere(ctx, g, 0.06, -w / 2 + (i / 6) * w, cy + h / 2 + 0.12 - Math.sin((i / 6) * Math.PI) * 0.12, 0.06, mat(ctx, i % 2 ? "#ff7aa2" : "#ffd23f"), 0);
    return { group: g, centerY: cy, frontZ: 0.04 };
  },
};
