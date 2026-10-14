import * as THREE from "three";
import type { ZoneTheme, ZoneCtx } from "./types";
import { box, cyl, cone, mat, zoneGround, addLight, sphere, makeCanvas, sign } from "./kit";

const STONE = "#8d867d";
const STONE_DARK = "#6b655e";
const SLATE = "#3d4766";
const GOLD = "#d9a640";

function crenellatedWall(ctx: ZoneCtx, x: number, z0: number, z1: number, h: number) {
  const { root } = ctx;
  const len = z0 - z1;
  const wall = box(ctx, root, 1.1, h, len, x, h / 2, (z0 + z1) / 2, mat(ctx, STONE, { flat: true }));
  wall.castShadow = true;
  for (let z = z0 - 0.4; z > z1; z -= 1.1) box(ctx, root, 1.1, 0.6, 0.6, x, h + 0.3, z, mat(ctx, STONE_DARK));
  // stone courses for texture
  for (let y = 0.9; y < h; y += 0.9) box(ctx, root, 1.14, 0.06, len, x, y, (z0 + z1) / 2, mat(ctx, STONE_DARK));
}

function tower(ctx: ZoneCtx, x: number, z: number, r: number, h: number) {
  cyl(ctx, ctx.root, r, r * 1.08, h, 12, x, h / 2, z, mat(ctx, STONE, { flat: true })).castShadow = true;
  cone(ctx, ctx.root, r * 1.25, r * 2.2, 12, x, h + r * 1.1, z, mat(ctx, SLATE, { flat: true }));
  cyl(ctx, ctx.root, 0.03, 0.03, 1.4, 4, x, h + r * 2.2 + 0.6, z, mat(ctx, "#333333"));
  const flag = box(ctx, ctx.root, 0.02, 0.45, 0.8, x, h + r * 2.2 + 1.05, z - 0.4, mat(ctx, "#2b4ab8", { side: THREE.DoubleSide }));
  flag.castShadow = false;
}

export const medieval: ZoneTheme = {
  id: "medieval",
  folder: "medieval",
  nameJa: "中世の城",
  nameTh: "ยุคกลาง",
  nameEn: "Medieval Castle",
  color: "#e0a24a",
  placard: { bg: ["#efe2c4", "#d8c49a"], border: "#5a4630", ink: "#2a2018", sub: "#4a3a28", seal: "#2b4ab8" },
  env: () => ({
    skyTop: "#232445", skyHorizon: "#e8834a", moon: "#ffe8c8", stars: 0.3, fog: "#5e4248", fogDensity: 0.03,
    hemiSky: "#ffc89a", hemiGround: "#3a2a28", hemi: 0.75, sunColor: "#ffb27a", sun: 1.3, exposure: 1.05,
    particleA: "#ffb050", particleB: "#ff6a20", particleGlow: 1.6, particleScale: 0.45,
  }),

  buildWorld(ctx) {
    const { root, length, slotZ } = ctx;
    zoneGround(ctx, mat(ctx, "#4f4a3e", { roughness: 1 }), 0.002);
    // cobbled road
    box(ctx, root, 5.4, 0.04, length + 1, 0, 0.02, -length / 2 + 0.5, mat(ctx, "#6f685f", { roughness: 1 })).receiveShadow = true;
    const cob = new THREE.InstancedMesh(ctx.track(new THREE.BoxGeometry(0.42, 0.06, 0.32)), mat(ctx, "#ffffff", { flat: true }), Math.floor(length * 22));
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < cob.count; i++) {
      m4.makeRotationY((ctx.rand() - 0.5) * 0.4).setPosition((ctx.rand() - 0.5) * 5.2, 0.05, 0.5 - ctx.rand() * length);
      cob.setMatrixAt(i, m4);
      cob.setColorAt(i, c.set("#8a8278").offsetHSL(0, 0, (ctx.rand() - 0.5) * 0.12));
    }
    cob.receiveShadow = true;
    root.add(cob);

    // gatehouse at the plaza edge
    for (const x of [-3.7, 3.7]) {
      box(ctx, root, 2.2, 7, 2.2, x, 3.5, -0.4, mat(ctx, STONE, { flat: true })).castShadow = true;
      for (const dx of [-0.75, 0, 0.75]) for (const dz of [-0.75, 0.75]) box(ctx, root, 0.5, 0.6, 0.5, x + dx, 7.3, -0.4 + dz, mat(ctx, STONE_DARK));
    }
    box(ctx, root, 5.2, 1.8, 2, 0, 5.6, -0.4, mat(ctx, STONE, { flat: true }));
    for (let x = -2.2; x <= 2.2; x += 0.44) box(ctx, root, 0.07, 1.1, 0.07, x, 4.35, -0.4, mat(ctx, "#2a2622", { metalness: 0.6, roughness: 0.5 }));
    const crest = makeCanvas(256, 256, (g) => {
      g.fillStyle = "#2b4ab8"; g.beginPath(); g.moveTo(40, 30); g.lineTo(216, 30); g.lineTo(216, 140); g.quadraticCurveTo(128, 250, 40, 140); g.closePath(); g.fill();
      g.strokeStyle = GOLD; g.lineWidth = 12; g.stroke();
      g.fillStyle = GOLD; g.font = "700 110px serif"; g.textAlign = "center"; g.fillText("♛", 128, 150);
    });
    sign(ctx, root, crest, 1.1, 1.1, 0, 5.6, 0.62, 0.25);
    for (const x of [-2.6, 2.6]) {
      cyl(ctx, root, 0.07, 0.05, 0.5, 6, x, 3.2, 0.75, mat(ctx, "#3a2a20"));
      const f = sphere(ctx, root, 0.14, x, 3.55, 0.75, mat(ctx, "#ffb060", { basic: true }), 0);
      addLight(ctx, x, 3.6, 1, "#ff9040", 3, 7, true, f);
    }

    // curtain walls, towers and arches along the road
    for (const x of [-6.6, 6.6]) crenellatedWall(ctx, x, -1.6, -length + 4, 4.6);
    for (let z = -10; z > -length + 4; z -= 16) for (const x of [-6.6, 6.6]) tower(ctx, x, z, 1.5, 7.5);
    for (let z = slotZ[0] + 2; z > -length + 6; z -= 8) {
      for (const x of [-2.6, 2.6]) {
        box(ctx, root, 0.6, 4.2, 0.6, x, 2.1, z, mat(ctx, STONE, { flat: true })).castShadow = true;
        ctx.colliders.push(new THREE.Vector2(x, z));
      }
      const arch = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(2.6, 0.3, 6, 18, Math.PI)), mat(ctx, STONE, { flat: true }));
      arch.position.set(0, 4.2, z);
      root.add(arch);
    }
    // banners + torches on the inner wall faces
    slotZ.forEach((z, i) => {
      for (const side of [-1, 1]) {
        const x = side * 6.02;
        const bz = z - 2;
        const banner = box(ctx, root, 0.03, 2.4, 1.0, x, 2.9, bz, mat(ctx, i % 2 ? "#2b4ab8" : "#a32030", { side: THREE.DoubleSide }));
        banner.castShadow = false;
        box(ctx, root, 0.04, 2.4, 0.12, x - side * 0.01, 2.9, bz, mat(ctx, GOLD, { metalness: 0.6, roughness: 0.4 }));
        cyl(ctx, root, 0.06, 0.04, 0.45, 6, x - side * 0.15, 2.4, z + 1.6, mat(ctx, "#3a2a20"));
        const f = sphere(ctx, root, 0.12, x - side * 0.15, 2.72, z + 1.6, mat(ctx, "#ffb060", { basic: true }), 0);
        if (side === (i % 2 === 0 ? -1 : 1)) addLight(ctx, x - side * 0.4, 2.8, z + 1.6, "#ff8a3a", 3.2, 7, true, f);
      }
    });
    // pine forest outside the walls
    for (let z = -2; z > -length - 10; z -= 3.5) {
      for (const s of [-1, 1]) {
        const x = s * (9 + ctx.rand() * 7);
        const h = 4 + ctx.rand() * 3;
        if (!ctx.inWedge(x, z, 1.4)) continue;
        cyl(ctx, root, 0.15, 0.22, 1.2, 6, x, 0.6, z, mat(ctx, "#4a3426"));
        cone(ctx, root, 1.3, h, 7, x, 1.2 + h / 2, z, mat(ctx, "#2d4a34", { flat: true }));
      }
    }
    // castle keep at the end
    const end = -length + 1;
    const keep = box(ctx, root, 10, 9, 7, 0, 4.5, end - 3, mat(ctx, STONE, { flat: true }));
    keep.castShadow = true;
    for (const x of [-5, 5]) tower(ctx, x, end + 0.5, 1.8, 11);
    tower(ctx, 0, end - 5, 2.2, 14);
    for (let x = -4.4; x <= 4.4; x += 1.1) box(ctx, root, 0.6, 0.7, 0.6, x, 9.35, end + 0.3, mat(ctx, STONE_DARK));
    for (const [x, y] of [[-2.5, 6.5], [2.5, 6.5], [0, 7.2], [-3.5, 3.5], [3.5, 3.5]]) box(ctx, root, 0.5, 0.9, 0.05, x, y, end + 0.53, mat(ctx, "#ffc070", { basic: true }));
    const door = new THREE.Mesh(ctx.track(new THREE.CircleGeometry(1.5, 16, 0, Math.PI)), mat(ctx, "#2a1c14"));
    door.position.set(0, 2.5, end + 0.52);
    root.add(door);
    box(ctx, root, 3, 2.5, 0.05, 0, 1.25, end + 0.52, mat(ctx, "#2a1c14"));
    addLight(ctx, 0, 2.5, end + 2.5, "#ffa050", 4, 9, true);
  },

  buildBoard(ctx, w, h) {
    const g = new THREE.Group();
    const cy = 1.9;
    // stone plinth wall with a tapestry and an ornate gold frame
    box(ctx, g, w + 1.1, h + 1.6, 0.4, 0, (h + 1.6) / 2, -0.25, mat(ctx, STONE, { flat: true })).castShadow = true;
    box(ctx, g, w + 0.5, h + 1.0, 0.03, 0, cy + 0.1, -0.03, mat(ctx, "#7a1424"));
    const goldM = mat(ctx, GOLD, { metalness: 0.75, roughness: 0.35 });
    const t = 0.1;
    box(ctx, g, w + 0.24, t, 0.1, 0, cy + h / 2 + 0.07, 0.01, goldM);
    box(ctx, g, w + 0.24, t, 0.1, 0, cy - h / 2 - 0.07, 0.01, goldM);
    box(ctx, g, t, h + 0.24, 0.1, -w / 2 - 0.07, cy, 0.01, goldM);
    box(ctx, g, t, h + 0.24, 0.1, w / 2 + 0.07, cy, 0.01, goldM);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) sphere(ctx, g, 0.09, sx * (w / 2 + 0.07), cy + sy * (h / 2 + 0.07), 0.05, goldM, 0);
    // little shield on top
    box(ctx, g, 0.36, 0.42, 0.06, 0, cy + h / 2 + 0.42, 0.0, mat(ctx, "#2b4ab8"));
    box(ctx, g, 0.08, 0.3, 0.07, 0, cy + h / 2 + 0.42, 0.01, goldM);
    return { group: g, centerY: cy, frontZ: 0.08 };
  },
};
