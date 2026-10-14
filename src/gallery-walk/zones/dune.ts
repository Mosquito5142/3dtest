import * as THREE from "three";
import type { ZoneTheme, ZoneCtx } from "./types";
import { box, cyl, mat, zoneGround, makeCanvas, sign, addLight, sphere } from "./kit";

const SAND = "#d9a466";
const SANDSTONE = "#c08850";
const ROCK = "#9a5a38";
const BRONZE = "#8a6a3a";

function duneHeight(x: number, z: number) {
  const flat = THREE.MathUtils.smoothstep(Math.abs(x), 4.5, 12);
  const h =
    Math.sin(x * 0.18 + z * 0.07) * 2.2 +
    Math.sin(x * 0.07 - z * 0.13 + 1.3) * 3.0 +
    Math.sin(z * 0.21 + x * 0.04) * 0.9;
  return (h + 3.2) * flat;
}

function rock(ctx: ZoneCtx, x: number, z: number, s: number) {
  const m = new THREE.Mesh(ctx.track(new THREE.DodecahedronGeometry(1, 0)), mat(ctx, ROCK, { flat: true }));
  m.scale.set(s * (0.8 + ctx.rand() * 0.6), s * (1.2 + ctx.rand() * 1.6), s * (0.8 + ctx.rand() * 0.6));
  m.rotation.set(ctx.rand(), ctx.rand() * 6, ctx.rand() * 0.3);
  m.position.set(x, duneHeight(x, z) + s * 0.6, z);
  m.castShadow = true;
  ctx.root.add(m);
}

/** A sandworm arching out of the sand, mouth facing the path. */
function sandworm(ctx: ZoneCtx, z: number) {
  const g = new THREE.Group();
  const skin = mat(ctx, "#7a5a40", { flat: true, roughness: 0.95 });
  const R = 9;
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI;
    const ring = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(2.1 - i * 0.04, 0.5, 6, 14)), skin);
    ring.position.set(Math.cos(a) * R, Math.sin(a) * R * 0.9 - 1.5, 0);
    // ring axis follows the body's arc
    ring.quaternion.setFromUnitVectors(zAxis, new THREE.Vector3(-Math.sin(a), Math.cos(a) * 0.9, 0).normalize());
    g.add(ring);
  }
  // open mouth with teeth on the near end
  const mouth = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(3, 0.7, 8, 20)), skin);
  mouth.position.set(R, 2.5, 0);
  mouth.rotation.y = Math.PI / 2;
  g.add(mouth);
  const toothM = mat(ctx, "#f0e2c0", { flat: true });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const t = new THREE.Mesh(ctx.track(new THREE.ConeGeometry(0.16, 0.9, 4)), toothM);
    t.position.set(R + 0.2, 2.5 + Math.sin(a) * 2.5, Math.cos(a) * 2.5);
    t.lookAt(new THREE.Vector3(R + 0.2, 2.5, 0));
    t.rotateX(Math.PI / 2);
    g.add(t);
  }
  const inner = new THREE.Mesh(ctx.track(new THREE.CircleGeometry(2.4, 20)), mat(ctx, "#2a1208"));
  inner.position.set(R - 0.3, 2.5, 0);
  inner.rotation.y = Math.PI / 2;
  g.add(inner);
  g.position.set(9, 0, z - 6);
  g.rotation.y = -0.5;
  ctx.root.add(g);
}

export const dune: ZoneTheme = {
  id: "dune",
  folder: "dune",
  nameJa: "砂の惑星",
  nameTh: "ดูน · ดาวทะเลทราย",
  nameEn: "Desert Planet",
  color: "#f0a050",
  placard: { bg: ["#efd9b0", "#d8b880"], border: BRONZE, ink: "#3a2410", sub: "#6a4a28", seal: "#2a5a8a" },
  env: () => ({
    skyTop: "#b86a3a", skyHorizon: "#f6cf94", moon: "#fff6e8", stars: 0, fog: "#e2a868", fogDensity: 0.028,
    hemiSky: "#ffd8a8", hemiGround: "#8a5a30", hemi: 0.85, sunColor: "#ffd29a", sun: 2.3, exposure: 0.98,
    particleA: "#e8c08a", particleB: "#c89060", particleGlow: 0, particleScale: 0.6, particleShape: 3, particleDensity: 0.8, particleGust: 2.5,
  }),

  buildWorld(ctx) {
    const { root, length, slotZ } = ctx;
    zoneGround(ctx, mat(ctx, SAND, { flat: true, roughness: 1 }), 0.004, duneHeight);
    // packed-sand road with stone slabs
    box(ctx, root, 5, 0.03, length + 1, 0, 0.02, -length / 2 + 0.5, mat(ctx, "#b88a58", { roughness: 1 }));
    for (let z = 0; z > -length; z -= 2.2) box(ctx, root, 1.6 + ctx.rand(), 0.06, 1.2, (ctx.rand() - 0.5) * 2, 0.04, z, mat(ctx, SANDSTONE, { flat: true }));

    // gate: two banded obelisks and a lintel
    const bronze = mat(ctx, BRONZE, { metalness: 0.7, roughness: 0.4 });
    for (const x of [-3, 3]) {
      const ob = cyl(ctx, root, 0.45, 0.75, 6.5, 4, x, 3.25, 0, mat(ctx, SANDSTONE, { flat: true }));
      ob.rotation.y = Math.PI / 4;
      ob.castShadow = true;
      for (const y of [1.5, 3.5, 5.5]) {
        const band = cyl(ctx, root, 0.6, 0.62, 0.18, 4, x, y, 0, bronze);
        band.rotation.y = Math.PI / 4;
      }
    }
    box(ctx, root, 7.6, 0.8, 1.1, 0, 6.7, 0, mat(ctx, SANDSTONE, { flat: true }));
    const gc = makeCanvas(512, 96, (g) => {
      g.fillStyle = "#3a2410"; g.fillRect(0, 0, 512, 96);
      g.fillStyle = "#f6cf94"; g.font = "600 46px serif"; g.textAlign = "center"; g.fillText("ARRAKEEN  ·  ดาวทะเลทราย", 256, 64);
    });
    sign(ctx, root, gc, 5.6, 1.05, 0, 6.7, 0.57, 0.3);

    // rock formations and dunes either side
    for (let z = -4; z > -length - 10; z -= 5) for (const s of [-1, 1]) {
      const x = s * (7 + ctx.rand() * 9);
      const r = 1 + ctx.rand() * 2.2;
      if (ctx.rand() < 0.7 && ctx.inWedge(x, z, r * 1.5)) rock(ctx, x, z + ctx.rand() * 3, r);
    }
    // lanterns: bronze braziers by the photos
    slotZ.forEach((z, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      cyl(ctx, root, 0.05, 0.08, 1.1, 6, side * 2.7, 0.55, z + 1.6, bronze);
      cyl(ctx, root, 0.25, 0.12, 0.25, 8, side * 2.7, 1.2, z + 1.6, bronze);
      const f = sphere(ctx, root, 0.14, side * 2.7, 1.38, z + 1.6, mat(ctx, "#6ab0ff", { basic: true }), 0);
      addLight(ctx, side * 2.7, 1.5, z + 1.6, "#7ab8ff", 1.6, 5, true, f);
    });
    // two moons, unaffected by fog
    for (const [x, y, r, col] of [[-30, 38, 4.5, "#fff6e8"], [-14, 46, 2.2, "#e8d8ff"]] as const) {
      const m = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 24, 16)), ctx.track(new THREE.MeshBasicMaterial({ color: col, fog: false, toneMapped: false })));
      m.position.set(x, y, -length - 40);
      root.add(m);
    }
    sandworm(ctx, -length);
  },

  buildBoard(ctx, w, h) {
    const g = new THREE.Group();
    const cy = 1.9;
    const slab = cyl(ctx, g, (w + 0.9) * 0.62, (w + 1.3) * 0.68, h + 1.9, 4, 0, (h + 1.9) / 2, -0.45, mat(ctx, SANDSTONE, { flat: true }));
    slab.rotation.y = Math.PI / 4;
    slab.scale.z = 0.35;
    slab.castShadow = true;
    const bronze = mat(ctx, BRONZE, { metalness: 0.75, roughness: 0.35 });
    const t = 0.08;
    box(ctx, g, w + 0.24, t, 0.08, 0, cy + h / 2 + 0.07, 0.02, bronze);
    box(ctx, g, w + 0.24, t, 0.08, 0, cy - h / 2 - 0.07, 0.02, bronze);
    box(ctx, g, t, h + 0.24, 0.08, -w / 2 - 0.07, cy, 0.02, bronze);
    box(ctx, g, t, h + 0.24, 0.08, w / 2 + 0.07, cy, 0.02, bronze);
    for (const s of [-1, 1]) box(ctx, g, 0.06, h * 0.7, 0.06, s * (w / 2 + 0.24), cy, 0.02, bronze);
    box(ctx, g, 0.5, 0.08, 0.06, 0, cy + h / 2 + 0.26, 0.02, mat(ctx, "#6ab0ff", { basic: true }));
    return { group: g, centerY: cy, frontZ: 0.05 };
  },
};
