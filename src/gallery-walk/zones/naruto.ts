import * as THREE from "three";
import { buildSakuraTrees } from "../../shaders/sakura-shrine-holo-card/world";
import type { ZoneTheme, ZoneCtx } from "./types";
import { box, cyl, gable, mat, zoneGround, makeCanvas, sign, addLight, sphere } from "./kit";

const WOOD = "#8a5a36";
const ROOF_RED = "#b8432e";
const GATE_GREEN = "#3a6a4a";

/** Generic leaf emblem with a swirl (drawn, not copied artwork). */
export function leafEmblem(size = 256, color = "#2a2a2a") {
  return makeCanvas(size, size, (g) => {
    const s = size / 256;
    g.scale(s, s);
    g.strokeStyle = color;
    g.lineWidth = 14;
    g.lineCap = "round";
    g.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.05) {
      const r = 8 + a * 14;
      const x = 120 + Math.cos(a) * r;
      const y = 130 + Math.sin(a) * r;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.beginPath();
    g.moveTo(200, 70);
    g.quadraticCurveTo(225, 120, 205, 190);
    g.lineTo(180, 230);
    g.stroke();
  });
}

function house(ctx: ZoneCtx, x: number, z: number, ry: number) {
  const g = new THREE.Group();
  const w = 4 + ctx.rand() * 2;
  const d = 4 + ctx.rand() * 1.5;
  const floors = 1 + Math.floor(ctx.rand() * 2);
  const h = floors * 2.6;
  box(ctx, g, w, h, d, 0, h / 2, 0, mat(ctx, ["#efe2c8", "#e8d4b0", "#f2ead8"][Math.floor(ctx.rand() * 3)], { flat: true })).castShadow = true;
  for (let f = 0; f < floors; f++) {
    box(ctx, g, w + 0.05, 0.14, d + 0.05, 0, f * 2.6 + 0.07, 0, mat(ctx, WOOD));
    for (const dx of [-w / 4, w / 4]) box(ctx, g, 0.9, 0.9, 0.05, dx, f * 2.6 + 1.5, d / 2 + 0.01, mat(ctx, ctx.rand() < 0.4 ? "#ffd89a" : "#5a6a7a", { basic: ctx.rand() < 0.4 }));
  }
  gable(ctx, g, w + 0.8, d + 0.8, 1.4, 0, h, 0, mat(ctx, ROOF_RED, { flat: true }));
  if (ctx.rand() < 0.6) {
    cyl(ctx, g, 0.6, 0.6, 1.1, 10, w / 4, h + 1.3, 0, mat(ctx, "#d8d0c0"));
    sphere(ctx, g, 0.62, w / 4, h + 1.85, 0, mat(ctx, "#c8c0b0"), 1).scale.y *= 0.4;
  }
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  ctx.root.add(g);
}

function ramenStall(ctx: ZoneCtx, x: number, z: number, ry: number) {
  const g = new THREE.Group();
  box(ctx, g, 3, 1, 1.2, 0, 0.5, 0, mat(ctx, WOOD));
  box(ctx, g, 3.2, 0.08, 1.4, 0, 1.04, 0.1, mat(ctx, "#c8a070"));
  for (const px of [-1.45, 1.45]) box(ctx, g, 0.12, 2.6, 0.12, px, 1.3, -0.5, mat(ctx, WOOD));
  gable(ctx, g, 3.6, 1.8, 0.6, 0, 2.6, -0.1, mat(ctx, "#6a4a2a"));
  for (let i = 0; i < 4; i++) box(ctx, g, 0.66, 0.7, 0.02, -1.05 + i * 0.7, 2.2, 0.5, mat(ctx, i % 2 ? "#e8e0d0" : "#c8302a", { side: THREE.DoubleSide }));
  for (const px of [-1, 1]) {
    const lan = sphere(ctx, g, 0.2, px * 1.7, 2.1, 0.55, mat(ctx, "#ff4a3a", { emissive: "#ff3020", emissiveIntensity: 1.2 }));
    lan.scale.y *= 1.3;
  }
  for (let i = 0; i < 3; i++) cyl(ctx, g, 0.2, 0.2, 0.6, 8, -0.8 + i * 0.8, 0.3, 1.1, mat(ctx, "#c8302a"));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  ctx.root.add(g);
  const wp = new THREE.Vector3(0, 2, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, 0, z));
  addLight(ctx, wp.x, wp.y, wp.z, "#ffa070", 2, 6);
}

export const naruto: ZoneTheme = {
  id: "naruto",
  folder: "naruto",
  nameJa: "忍の里",
  nameTh: "หมู่บ้านนินจา · Naruto",
  nameEn: "Hidden Leaf Village",
  color: "#7ad04a",
  placard: { bg: ["#f6efd8", "#e6d8b0"], border: "#3a2a1a", ink: "#1a1410", sub: "#4a3a28", seal: "#d8582a" },
  env: () => ({
    skyTop: "#3f92e6", skyHorizon: "#d6ecff", moon: "#ffffff", stars: 0, fog: "#cfe3f0", fogDensity: 0.018,
    hemiSky: "#d8ecff", hemiGround: "#4a6a2a", hemi: 0.95, sunColor: "#fff3dc", sun: 2.4, exposure: 1,
    particleA: "#6abf4b", particleB: "#c6e86a", particleGlow: 0, particleScale: 1.1, particleShape: 2, particleDensity: 0.5,
  }),

  buildWorld(ctx) {
    const { root, length, slotZ, track, M } = ctx;
    zoneGround(ctx, mat(ctx, "#5f8f3e", { roughness: 1 }), 0.005);
    box(ctx, root, 5, 0.03, length + 1, 0, 0.02, -length / 2 + 0.5, mat(ctx, "#a07a50", { roughness: 1 }));

    // big village gate
    const gateM = mat(ctx, GATE_GREEN, { flat: true });
    for (const x of [-3.4, 3.4]) {
      box(ctx, root, 1, 8, 1, x, 4, -0.3, gateM).castShadow = true;
      const kanji = makeCanvas(128, 256, (g) => {
        g.fillStyle = "#e8e0c8"; g.fillRect(0, 0, 128, 256);
        g.fillStyle = "#b8302a"; g.font = "700 110px 'Shippori Mincho', serif"; g.textAlign = "center"; g.fillText(x < 0 ? "あ" : "ん", 64, 170);
      });
      sign(ctx, root, kanji, 0.7, 1.4, x, 4, 0.22, 0.2);
    }
    box(ctx, root, 8.4, 0.9, 1.3, 0, 8.2, -0.3, gateM);
    box(ctx, root, 9, 0.35, 1.6, 0, 8.8, -0.3, mat(ctx, "#2a4a34"));
    const crest = makeCanvas(256, 256, (g) => { g.fillStyle = "#e8e0c8"; g.fillRect(0, 0, 256, 256); g.drawImage(leafEmblem(256, "#b8302a"), 0, 0); });
    sign(ctx, root, crest, 1.6, 1.6, 0, 6.6, 0.4, 0.2);
    const sc = makeCanvas(512, 128, (g) => {
      g.fillStyle = "#2a4a34"; g.fillRect(0, 0, 512, 128);
      g.fillStyle = "#f6efd8"; g.font = "700 64px 'Shippori Mincho', serif"; g.textAlign = "center"; g.fillText("忍 の 里", 256, 88);
    });
    sign(ctx, root, sc, 3.4, 0.85, 0, 8.2, 0.36, 0.15);

    // village houses and green trees
    for (let z = -3; z > -length; z -= 7) for (const s of [-1, 1]) {
      const x = s * (8.5 + ctx.rand() * 2);
      if (ctx.rand() < 0.85 && ctx.inWedge(x, z, 3.2)) house(ctx, x, z - ctx.rand() * 2, s < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    const leafy = { bark: M.bark, blossom: mat(ctx, "#4f9a3a", { flat: true, emissive: "#0f2a08", emissiveIntensity: 0.4 }) as THREE.MeshStandardMaterial };
    const spots: [number, number, number][] = [];
    for (let z = -2; z > -length - 8; z -= 4.5) for (const s of [-1, 1]) spots.push([s * (5.6 + ctx.rand() * 1.2), z + ctx.rand() * 2, 1.1 + ctx.rand() * 0.3], [s * (13 + ctx.rand() * 4), z, 1.4 + ctx.rand() * 0.4]);
    buildSakuraTrees(root, leafy, track, { blossom: "#4f9a3a", petalA: "#6a9a3a" }, spots.filter(([x, z, s]) => ctx.inWedge(x, z, 2 * s)), 30, true);
    slotZ.forEach((z, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const f = sphere(ctx, root, 0.2, side * 2.75, 2.2, z + 1.6, mat(ctx, "#ff5a3a", { emissive: "#ff3020", emissiveIntensity: 1.3 }));
      f.scale.y *= 1.3;
      cyl(ctx, root, 0.04, 0.05, 2.5, 5, side * 2.75, 1.0, z + 1.6, mat(ctx, WOOD));
      addLight(ctx, side * 2.75, 2.2, z + 1.6, "#ff9060", 1.2, 5, false);
      if (i === 3) ramenStall(ctx, -side * 4.6, z, side < 0 ? -Math.PI / 2 : Math.PI / 2);
    });

    // round red tower at the end
    const end = -length - 3;
    cyl(ctx, root, 5, 5.2, 7, 20, 0, 3.5, end - 2, mat(ctx, "#c8482e", { flat: true })).castShadow = true;
    cyl(ctx, root, 5.6, 5.6, 0.4, 20, 0, 7.2, end - 2, mat(ctx, "#8a2a1a"));
    cyl(ctx, root, 3.6, 4.4, 2.4, 20, 0, 8.6, end - 2, mat(ctx, "#c8482e", { flat: true }));
    const roof = cyl(ctx, root, 0.4, 4.2, 2, 20, 0, 10.8, end - 2, mat(ctx, "#8a2a1a"));
    roof.castShadow = true;
    const fire = makeCanvas(256, 256, (g) => {
      g.fillStyle = "#f6efd8"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#b8302a"; g.font = "700 170px 'Shippori Mincho', serif"; g.textAlign = "center"; g.fillText("火", 128, 190);
    });
    sign(ctx, root, fire, 2.2, 2.2, 0, 8.6, end + 2.05, 0.3);
    box(ctx, root, 2.2, 3, 0.1, 0, 1.5, end + 3.15, mat(ctx, "#4a2a1a"));
    addLight(ctx, 0, 2.5, end + 5, "#ffd0a0", 2.5, 9);
  },

  buildBoard(ctx, w, h) {
    const g = new THREE.Group();
    const cy = 1.9;
    const woodM = mat(ctx, WOOD);
    const topY = cy + h / 2 + 0.45;
    // stand: two posts and a crossbar, the photo hangs as a scroll
    for (const x of [-w / 2 - 0.35, w / 2 + 0.35]) box(ctx, g, 0.14, topY + 0.25, 0.14, x, (topY + 0.25) / 2, -0.15, woodM);
    box(ctx, g, w + 1.1, 0.14, 0.18, 0, topY + 0.15, -0.15, woodM);
    box(ctx, g, w + 1.3, 0.1, 0.3, 0, topY + 0.28, -0.15, mat(ctx, ROOF_RED));
    box(ctx, g, w + 0.3, h + 0.7, 0.03, 0, cy + 0.05, -0.03, mat(ctx, "#f2e8cc"));
    for (const y of [cy + h / 2 + 0.38, cy - h / 2 - 0.3]) {
      const rod = cyl(ctx, g, 0.05, 0.05, w + 0.55, 8, 0, y, 0, mat(ctx, "#3a2a1a"));
      rod.rotation.z = Math.PI / 2;
    }
    for (const x of [-w / 4, w / 4]) cyl(ctx, g, 0.01, 0.01, 0.35, 4, x, topY - 0.05, -0.02, mat(ctx, "#3a2a1a"));
    const tassel = sphere(ctx, g, 0.06, 0, cy - h / 2 - 0.42, 0.02, mat(ctx, "#d8582a"), 0);
    tassel.scale.y *= 1.6;
    return { group: g, centerY: cy, frontZ: 0.03 };
  },
};
