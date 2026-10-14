import * as THREE from "three";
import type { ZoneTheme, ZoneCtx } from "./types";
import { box, cyl, cone, gable, mat, sphere, makeCanvas, sign, addLight, zoneGround } from "./kit";

const GOLD = "#e8b84a";
const ROOF = "#d9622b";
const ROOF_EDGE = "#2e7d4f";
const NEONS = ["#ff3fa4", "#3ff0ff", "#ffe14a", "#7a5cff", "#ff7a3a"];
const SHOP_WORDS = ["ข้าวมันไก่", "ก๋วยเตี๋ยว", "นวดแผนไทย", "ชาไทย", "ผัดไทย", "ส้มตำ", "โรตี", "ร้านทอง", "ข้าวเหนียวมะม่วง", "กาแฟโบราณ"];

function neonSign(ctx: ZoneCtx, parent: THREE.Object3D, text: string, color: string, x: number, y: number, z: number, ry: number) {
  const c = makeCanvas(512, 160, (g) => {
    g.fillStyle = "#120a18"; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = color; g.lineWidth = 8; g.shadowColor = color; g.shadowBlur = 24; g.strokeRect(12, 12, 488, 136);
    g.fillStyle = "#fff"; g.font = "700 64px 'Noto Sans Thai', sans-serif"; g.textAlign = "center"; g.fillText(text, 256, 102);
    g.fillStyle = color; g.globalAlpha = 0.6; g.fillText(text, 256, 102);
  });
  const s = sign(ctx, parent, c, 2.2, 0.7, x, y, z, 1.2);
  s.rotation.y = ry;
}

function shophouse(ctx: ZoneCtx, side: number, z: number, width: number) {
  const { root } = ctx;
  const h = 7 + Math.floor(ctx.rand() * 3) * 2.4;
  const palette = ["#d8c8a8", "#b8c8c0", "#d8a890", "#a8b0c8", "#c8b890", "#9aa8a0"];
  const x = side * 9.5;
  box(ctx, root, 5, h, width - 0.15, x, h / 2, z, mat(ctx, palette[Math.floor(ctx.rand() * palette.length)], { flat: true }));
  const face = x - side * 2.52;
  // shutters on the ground floor, glowing windows above
  box(ctx, root, 0.05, 2.6, width - 0.8, face, 1.3, z, mat(ctx, ctx.rand() < 0.5 ? "#ffcf80" : "#6a6a70", { basic: ctx.rand() < 0.6 }));
  for (let y = 3.6; y < h - 0.8; y += 2.4) {
    for (const dz of [-width / 4, width / 4]) {
      const lit = ctx.rand() < 0.65;
      box(ctx, root, 0.05, 1.2, 0.9, face, y, z + dz, mat(ctx, lit ? (ctx.rand() < 0.5 ? "#ffd89a" : "#a8e0ff") : "#2a2a34", { basic: lit }));
    }
    box(ctx, root, 0.7, 0.08, width - 0.6, face - side * 0.35, y - 0.75, z, mat(ctx, "#5a5a60"));
    // air-con units
    if (ctx.rand() < 0.5) box(ctx, root, 0.5, 0.45, 0.7, face - side * 0.3, y - 0.4, z + width / 4, mat(ctx, "#d0d0d0"));
  }
  // awning
  const aw = box(ctx, root, 1.6, 0.06, width - 0.4, face - side * 0.8, 2.9, z, mat(ctx, ["#d84040", "#2a7ac8", "#e8a030", "#3a9a5a"][Math.floor(ctx.rand() * 4)]));
  aw.rotation.z = side * 0.25;
  const col = NEONS[Math.floor(ctx.rand() * NEONS.length)];
  neonSign(ctx, root, SHOP_WORDS[Math.floor(ctx.rand() * SHOP_WORDS.length)], col, face - side * 0.05, 4.1, z, side < 0 ? Math.PI / 2 : -Math.PI / 2);
  addLight(ctx, face - side * 1.2, 3.8, z, col, 2.2, 7);
}

function tukTuk(ctx: ZoneCtx, x: number, z: number, ry: number) {
  const g = new THREE.Group();
  const body = ["#1e7ad8", "#e83a3a", "#2ea84a"][Math.floor(ctx.rand() * 3)];
  box(ctx, g, 1.3, 0.7, 2.4, 0, 0.75, 0, mat(ctx, body));
  box(ctx, g, 1.2, 0.5, 0.8, 0, 1.3, 0.75, mat(ctx, body));
  box(ctx, g, 1.4, 0.08, 2.6, 0, 2.05, -0.1, mat(ctx, "#1a1a1a"));
  for (const px of [-0.62, 0.62]) for (const pz of [-1.1, 0.9]) box(ctx, g, 0.05, 1.2, 0.05, px, 1.45, pz, mat(ctx, "#c0c0c0", { metalness: 0.6 }));
  for (const [wx, wz] of [[-0.6, -0.8], [0.6, -0.8], [0, 1.05]]) {
    const wheel = cyl(ctx, g, 0.28, 0.28, 0.2, 10, wx, 0.28, wz, mat(ctx, "#151515"));
    wheel.rotation.z = Math.PI / 2;
  }
  box(ctx, g, 0.5, 0.05, 0.3, 0, 0.85, 1.21, mat(ctx, "#fff6c0", { basic: true }));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  ctx.root.add(g);
}

/** Thai temple hall: stacked orange roofs with green edges and golden chofa. */
function templeHall(ctx: ZoneCtx, z: number) {
  const { root } = ctx;
  const g = new THREE.Group();
  box(ctx, g, 11, 1.2, 9, 0, 0.6, 0, mat(ctx, "#f2ece0"));
  for (let i = 0; i < 6; i++) box(ctx, g, 4, 1.2 - i * 0.2, 0.4, 0, (1.2 - i * 0.2) / 2, 4.7 + i * 0.4, mat(ctx, "#e8e2d4"));
  box(ctx, g, 8.5, 4, 6.5, 0, 3.2, 0, mat(ctx, "#fbf7ee"));
  for (const x of [-3.6, -1.2, 1.2, 3.6]) cyl(ctx, g, 0.28, 0.3, 4, 8, x, 3.2, 3.5, mat(ctx, "#fbf7ee"));
  box(ctx, g, 1.6, 2.6, 0.06, 0, 2.5, 3.26, mat(ctx, GOLD, { metalness: 0.7, roughness: 0.3, emissive: "#a06a10", emissiveIntensity: 0.4 }));
  const roofM = mat(ctx, ROOF, { flat: true });
  const edgeM = mat(ctx, ROOF_EDGE, { flat: true });
  const goldM = mat(ctx, GOLD, { metalness: 0.7, roughness: 0.3, emissive: "#a06a10", emissiveIntensity: 0.5 });
  const tiers: [number, number, number, number][] = [[10, 8.2, 2.6, 5.2], [7.6, 6.6, 2.6, 6.6], [5, 5, 2.4, 8]];
  tiers.forEach(([w, d, h, y], i) => {
    gable(ctx, g, d + 0.2, w + 0.3, h + 0.1, 0, y - 0.05, 0, edgeM, Math.PI / 2);
    gable(ctx, g, d, w, h, 0, y, 0, roofM, Math.PI / 2);
    // chofa: golden horns at both gable ends
    for (const s of [-1, 1]) {
      const horn = cone(ctx, g, 0.12, 1.2, 6, 0, y + h + 0.45, s * (w / 2 + 0.15), goldM);
      horn.rotation.x = -s * 0.5;
      if (i === tiers.length - 1) sphere(ctx, g, 0.18, 0, y + h + 1.0, s * (w / 2 + 0.4), goldM, 0);
    }
  });
  // spire
  cone(ctx, g, 0.5, 3.5, 8, 0, 12.3, 0, goldM);
  g.position.set(0, 0, z);
  g.rotation.y = Math.PI / 2;
  root.add(g);
  addLight(ctx, 0, 3, z + 6, "#ffc870", 4, 10);
  for (const x of [-5, 5]) addLight(ctx, x, 2, z + 4, "#ffb050", 2.5, 8);
}

export const bangkok: ZoneTheme = {
  id: "bangkok",
  folder: "bangkok",
  nameJa: "バンコク",
  nameTh: "กรุงเทพฯ",
  nameEn: "Bangkok Nights",
  color: "#ff3fa4",
  placard: { bg: ["#7a1020", "#5a0a18"], border: GOLD, ink: "#ffe9b0", sub: "#f0c878", seal: GOLD },
  env: () => ({
    skyTop: "#0b0820", skyHorizon: "#46205a", moon: "#ffe8f0", stars: 0.35, fog: "#24123a", fogDensity: 0.032,
    hemiSky: "#9070d0", hemiGround: "#2a1830", hemi: 0.8, sunColor: "#8a90ff", sun: 0.35, exposure: 1.15,
    particleA: "#ff5fc0", particleB: "#5ff0ff", particleGlow: 1.8, particleScale: 0.3,
  }),

  buildWorld(ctx) {
    const { root, length, slotZ } = ctx;
    zoneGround(ctx, mat(ctx, "#2a2a30", { roughness: 0.6, metalness: 0.2 }), 0.003);
    // sidewalk curbs and lane markings
    for (const x of [-5.6, 5.6]) box(ctx, root, 3, 0.18, length, x, 0.09, -length / 2, mat(ctx, "#6a6670"));
    for (let z = -1; z > -length; z -= 3) box(ctx, root, 0.15, 0.02, 1.4, 0, 0.012, z, mat(ctx, "#e8e0b0", { basic: true }));
    for (const x of [-2.5, 2.5]) box(ctx, root, 0.12, 0.02, length, x, 0.012, -length / 2, mat(ctx, "#e8c040"));

    // Thai-style gate at the plaza edge
    const goldM = mat(ctx, GOLD, { metalness: 0.7, roughness: 0.3, emissive: "#a06a10", emissiveIntensity: 0.5 });
    for (const x of [-3, 3]) {
      box(ctx, root, 0.7, 4.6, 0.7, x, 2.3, 0, mat(ctx, "#fbf7ee"));
      box(ctx, root, 0.8, 0.3, 0.8, x, 4.7, 0, goldM);
    }
    gable(ctx, root, 1.6, 7.4, 1.8, 0, 4.8, 0, mat(ctx, ROOF, { flat: true }));
    cone(ctx, root, 0.25, 2.2, 8, 0, 7.6, 0, goldM);
    const gc = makeCanvas(512, 128, (g) => {
      g.fillStyle = "#7a1020"; g.fillRect(0, 0, 512, 128);
      g.strokeStyle = GOLD; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
      g.fillStyle = "#ffe9b0"; g.font = "700 60px 'Noto Sans Thai', sans-serif"; g.textAlign = "center"; g.fillText("กรุงเทพมหานคร", 256, 86);
    });
    sign(ctx, root, gc, 4, 1, 0, 4.2, 0.42, 0.4);

    // shophouses, poles with tangled wires, string lights
    for (const side of [-1, 1]) for (let z = -2; z > -length + 2; z -= 4.2) if (ctx.inWedge(9.5, z - 2.1, 2.6)) shophouse(ctx, side, z - 2.1, 4.2);
    const poleZ: number[] = [];
    for (let z = -3; z > -length + 2; z -= 8) poleZ.push(z);
    for (const z of poleZ) for (const side of [-1, 1]) {
      cyl(ctx, root, 0.1, 0.13, 7, 6, side * 4.6, 3.5, z, mat(ctx, "#8a8a8a"));
      box(ctx, root, 0.12, 0.12, 1.6, side * 4.6, 6.4, z, mat(ctx, "#6a6a6a"));
    }
    const wireM = new THREE.LineBasicMaterial({ color: "#151515" });
    ctx.track(wireM);
    for (let i = 0; i < poleZ.length - 1; i++) for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
      const pts: THREE.Vector3[] = [];
      for (let t = 0; t <= 10; t++) {
        const zz = poleZ[i] + (poleZ[i + 1] - poleZ[i]) * (t / 10);
        pts.push(new THREE.Vector3(side * 4.6 + (k - 1.5) * 0.18, 6.3 - k * 0.12 - Math.sin((t / 10) * Math.PI) * (0.5 + k * 0.15), zz));
      }
      root.add(new THREE.Line(ctx.track(new THREE.BufferGeometry().setFromPoints(pts)), wireM));
    }
    const bulbs = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.07, 6, 4)), mat(ctx, "#ffffff", { basic: true }), poleZ.length * 26);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    let bi = 0;
    for (const z of poleZ) for (let t = 0; t <= 12 && bi < bulbs.count; t++) {
      const x = -4.6 + (t / 12) * 9.2;
      bulbs.setMatrixAt(bi, m4.makeTranslation(x, 5.6 - Math.sin((t / 12) * Math.PI) * 0.9, z));
      bulbs.setColorAt(bi++, c.set(NEONS[t % NEONS.length]));
    }
    bulbs.count = bi;
    root.add(bulbs);
    // parked tuk-tuks + street-food carts between the photos
    slotZ.forEach((z, i) => {
      const side = i % 2 === 0 ? 1 : -1; // opposite side from the photo
      if (i % 2 === 0) tukTuk(ctx, side * 4.6, z - 1, 0);
      else {
        box(ctx, root, 1.6, 0.9, 0.9, side * 4.4, 0.6, z - 1, mat(ctx, "#c8c8c8", { metalness: 0.5, roughness: 0.4 }));
        cyl(ctx, root, 0.03, 0.03, 1.6, 4, side * 4.4, 1.6, z - 1, mat(ctx, "#888"));
        const umb = cone(ctx, root, 1.2, 0.5, 8, side * 4.4, 2.5, z - 1, mat(ctx, "#e84040", { side: THREE.DoubleSide }));
        umb.castShadow = false;
        addLight(ctx, side * 4.2, 1.6, z - 1, "#ffd090", 1.6, 5);
      }
    });
    templeHall(ctx, -length - 2);
  },

  buildBoard(ctx, w, h) {
    const g = new THREE.Group();
    const cy = 1.9;
    const goldM = mat(ctx, GOLD, { metalness: 0.75, roughness: 0.3, emissive: "#a06a10", emissiveIntensity: 0.35 });
    box(ctx, g, w + 0.7, h + 0.8, 0.1, 0, cy, -0.05, mat(ctx, "#8a1024", { roughness: 0.35 }));
    const t = 0.09;
    box(ctx, g, w + 0.26, t, 0.08, 0, cy + h / 2 + 0.08, 0.02, goldM);
    box(ctx, g, w + 0.26, t, 0.08, 0, cy - h / 2 - 0.08, 0.02, goldM);
    box(ctx, g, t, h + 0.26, 0.08, -w / 2 - 0.08, cy, 0.02, goldM);
    box(ctx, g, t, h + 0.26, 0.08, w / 2 + 0.08, cy, 0.02, goldM);
    // pointed kranok crest and side flames
    const crest = cone(ctx, g, 0.32, 0.9, 4, 0, cy + h / 2 + 0.85, -0.05, goldM);
    crest.scale.z = 0.08;
    for (const s of [-1, 1]) {
      const f = cone(ctx, g, 0.14, 0.5, 4, s * (w / 2 + 0.38), cy + h / 2 + 0.55, -0.05, goldM);
      f.scale.z = 0.06;
      f.rotation.z = -s * 0.5;
    }
    // stand
    for (const x of [-w / 2 - 0.2, w / 2 + 0.2]) box(ctx, g, 0.14, cy - h / 2 - 0.3, 0.14, x, (cy - h / 2 - 0.3) / 2, -0.05, goldM);
    box(ctx, g, w + 0.9, 0.18, 0.6, 0, 0.09, -0.05, mat(ctx, "#5a0a18"));
    return { group: g, centerY: cy, frontZ: 0.03 };
  },
};
