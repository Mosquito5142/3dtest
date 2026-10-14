import * as THREE from "three";
import { PALETTES, buildPath, buildTorii, buildHall, buildToro, buildSakuraTrees } from "../../shaders/sakura-shrine-holo-card/world";
import type { ZoneTheme } from "./types";
import { box, mat, zoneGround, addLight, cyl } from "./kit";

export const shrine: ZoneTheme = {
  id: "shrine",
  folder: "shrine",
  nameJa: "桜神社",
  nameTh: "ศาลเจ้าซากุระ",
  nameEn: "Sakura Shrine",
  color: "#ff7aa2",
  placard: { bg: ["#f4e6cf", "#e2cfae"], border: "#7a4a2a", ink: "#2a1410", sub: "#5a3424", seal: "#c8243b" },
  env: (variant) =>
    variant === "hanami"
      ? {
          skyTop: "#6fa6dc", skyHorizon: "#ffe1ea", moon: "#ffffff", stars: 0, fog: "#f2d6e2", fogDensity: 0.03,
          hemiSky: "#cfe6ff", hemiGround: "#8a6a5a", hemi: 0.9, sunColor: "#fff1e0", sun: 2.4, exposure: 1,
          particleA: "#ff9fbf", particleB: "#ffe6ef", particleGlow: 0, particleScale: 1, particleShape: 0, particleDensity: 1,
        }
      : {
          skyTop: "#090820", skyHorizon: "#5a2550", moon: "#fff2dc", stars: 1, fog: "#24122e", fogDensity: 0.045,
          hemiSky: "#8a78c8", hemiGround: "#2a1420", hemi: 0.95, sunColor: "#9fb0ff", sun: 0.25, exposure: 1.1,
          particleA: "#ffb3cb", particleB: "#fff0f5", particleGlow: 1, particleScale: 1, particleShape: 0, particleDensity: 1,
        },

  buildWorld(ctx) {
    const { root, M, track, length, slotZ } = ctx;
    const P = PALETTES[ctx.variant];
    zoneGround(ctx, mat(ctx, P.ground, { roughness: 0.95 }), 0.001);
    buildPath(root, M, track, 0.5, Math.ceil(length / 1.05));
    buildTorii(root, M, track, 0.4, 1.55);
    ctx.colliders.push(new THREE.Vector2(-2.71, 0.4), new THREE.Vector2(2.71, 0.4));
    // senbon torii between the photos, paper lanterns under each gate
    const torZ = [slotZ[0] + 2, ...slotZ.map((z) => z - 2)];
    for (const [i, z] of torZ.entries()) {
      buildTorii(root, M, track, z, 1.3);
      ctx.colliders.push(new THREE.Vector2(-2.275, z), new THREE.Vector2(2.275, z));
      for (const x of [-1.25, 1.25]) {
        const c = new THREE.Mesh(track(new THREE.SphereGeometry(0.17, 16, 12)), M.chochin[i % 2]);
        c.scale.y = 1.35;
        c.position.set(x, 3.75, z);
        root.add(c);
      }
    }
    // stone lanterns next to each photo
    slotZ.forEach((z, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const t = buildToro(root, M, track, P, side * 2.75, z + 1.25);
      t.group.remove(t.flame.light);
      t.flame.light.dispose();
      addLight(ctx, side * 2.75, 1.36, z + 1.25, "#ff9a4a", P.lantern, 6, true, t.flame.mesh);
      ctx.colliders.push(new THREE.Vector2(side * 2.75, z + 1.25));
    });
    // sakura groves
    const spots: [number, number, number][] = [];
    for (let z = -3; z > -length - 6; z -= 3.2) {
      for (const s of [-1, 1]) {
        spots.push([s * (5.4 + ctx.rand() * 1.4), z + (ctx.rand() - 0.5) * 1.5, 1.15 + ctx.rand() * 0.3]);
        if (ctx.rand() < 0.6) spots.push([s * (8.5 + ctx.rand() * 2.5), z + ctx.rand() * 2, 1.3 + ctx.rand() * 0.3]);
      }
    }
    buildSakuraTrees(root, M, track, P, spots.filter(([x, z, s]) => ctx.inWedge(x, z, 2 * s)), 90, true);
    // shrine hall + offering box + a pair of komainu plinths at the end
    const end = -length + 1.5;
    buildHall(root, M, track, end);
    box(ctx, root, 1.2, 0.7, 0.6, 0, 0.35, end + 2.6, mat(ctx, "#5a3524"));
    for (const x of [-2.2, 2.2]) {
      box(ctx, root, 0.7, 0.9, 0.7, x, 0.45, end + 3.6, M.stone);
      cyl(ctx, root, 0.25, 0.3, 0.6, 8, x, 1.2, end + 3.6, M.lanternStone);
    }
    addLight(ctx, 0, 1.5, end + 3, "#ffb36b", 3, 8, true);
  },

  buildBoard(ctx, w, h) {
    const { M } = ctx;
    const g = new THREE.Group();
    const cy = 1.85;
    const bw = w + 0.45;
    const bh = h + 0.55;
    box(ctx, g, bw, bh, 0.08, 0, cy, 0, M.wood).castShadow = true;
    const postH = cy + bh / 2 + 0.25;
    for (const px of [-bw / 2 - 0.02, bw / 2 + 0.02]) box(ctx, g, 0.12, postH, 0.12, px, postH / 2, 0, M.wood);
    for (const s of [-1, 1]) {
      const roof = box(ctx, g, bw + 0.5, 0.06, 0.62, 0, cy + bh / 2 + 0.3, s * 0.15, M.black);
      roof.rotation.x = s * 0.5;
    }
    box(ctx, g, bw + 0.55, 0.08, 0.08, 0, cy + bh / 2 + 0.42, 0, M.vermilion);
    const cord = cyl(ctx, g, 0.03, 0.03, bw, 8, 0, cy + bh / 2 - 0.02, 0.08, M.chochin[1]);
    cord.rotation.z = Math.PI / 2;
    return { group: g, centerY: cy, frontZ: 0.06 };
  },
};
