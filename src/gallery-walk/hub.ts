// The central plaza: a round stone court with a floating crystal monument, a compass floor
// pointing at every zone, a balustrade with gaps for the six gates, signposts and lamps.
import * as THREE from "three";
import type { ZoneTheme, LightPoint, Track } from "./zones/types";
import { box, cyl, cone, mat, sphere, makeCanvas, canvasTex } from "./zones/kit";
import { HUB_R } from "./layout";

type HubCtx = { root: THREE.Object3D; track: Track; renderer: THREE.WebGLRenderer };

/** Direction from the plaza centre toward zone k (matches a zone root rotated by θ = k·60°). */
export const zoneAngle = (k: number, n: number) => (k / n) * Math.PI * 2;
export const zoneDir = (k: number, n: number) => {
  const a = zoneAngle(k, n);
  return new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
};

function compassCanvas(zones: ZoneTheme[]) {
  const S = 2048;
  const R = S / 2;
  return makeCanvas(S, S, (g) => {
    const grad = g.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, "#9a92a0");
    grad.addColorStop(0.75, "#7e7684");
    grad.addColorStop(1, "#5e5664");
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    // paving rings and radial joints
    g.strokeStyle = "rgba(40,30,45,0.35)";
    g.lineWidth = 4;
    for (let r = 120; r < R; r += 110) { g.beginPath(); g.arc(R, R, r, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      g.beginPath(); g.moveTo(R + Math.cos(a) * 230, R + Math.sin(a) * 230); g.lineTo(R + Math.cos(a) * R, R + Math.sin(a) * R); g.stroke();
    }
    // inlaid gold ring
    g.strokeStyle = "#d8b060";
    g.lineWidth = 14;
    g.beginPath(); g.arc(R, R, R * 0.62, 0, Math.PI * 2); g.stroke();
    // a coloured arrow + name toward every zone (canvas x = world x, canvas y = world z)
    zones.forEach((z, k) => {
      const a = zoneAngle(k, zones.length);
      const dx = -Math.sin(a);
      const dy = -Math.cos(a);
      g.save();
      g.translate(R, R);
      g.rotate(Math.atan2(dy, dx) + Math.PI / 2);
      g.fillStyle = z.color;
      g.globalAlpha = 0.85;
      g.beginPath();
      g.moveTo(0, -R * 0.95);
      g.lineTo(70, -R * 0.66);
      g.lineTo(-70, -R * 0.66);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = "#fff6ea";
      g.font = "700 96px 'Shippori Mincho', serif";
      g.textAlign = "center";
      g.fillText(z.nameJa, 0, -R * 0.45);
      g.font = "600 56px 'Noto Sans Thai', sans-serif";
      g.fillText(z.nameTh, 0, -R * 0.45 + 74);
      g.restore();
    });
    g.fillStyle = "#d8b060";
    g.beginPath(); g.arc(R, R, 40, 0, Math.PI * 2); g.fill();
  });
}

function signCanvas(z: ZoneTheme, count: number, slots: number) {
  return makeCanvas(512, 400, (g) => {
    g.fillStyle = "#2a1c24";
    g.fillRect(0, 0, 512, 400);
    g.fillStyle = z.color;
    g.fillRect(0, 0, 512, 22);
    g.fillRect(0, 378, 512, 22);
    g.textAlign = "center";
    g.fillStyle = "#fff6ea";
    g.font = "700 92px 'Shippori Mincho', serif";
    g.fillText(z.nameJa, 256, 140, 470);
    g.font = "600 46px 'Noto Sans Thai', sans-serif";
    g.fillText(z.nameTh, 256, 210, 470);
    g.fillStyle = "rgba(255,240,230,0.7)";
    g.font = "400 32px 'Noto Sans Thai', sans-serif";
    g.fillText(z.nameEn, 256, 260, 470);
    g.fillStyle = z.color;
    g.font = "600 38px 'Noto Sans Thai', sans-serif";
    g.fillText(`${count} รูป · ${slots} ช่อง  →`, 256, 335);
  });
}

export function buildHub(ctx: HubCtx, zones: ZoneTheme[], counts: number[], slots: number[]) {
  const { root, track } = ctx;
  const n = zones.length;
  const lights: LightPoint[] = [];
  const colliders: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  const stone = mat(ctx, "#8a8290", { flat: true });
  const stoneDark = mat(ctx, "#5e5664", { flat: true });
  const gold = mat(ctx, "#d8b060", { metalness: 0.7, roughness: 0.35 });

  // floor
  const floor = new THREE.Mesh(track(new THREE.CircleGeometry(HUB_R + 0.9, 72)), track(new THREE.MeshStandardMaterial({ map: canvasTex(ctx, compassCanvas(zones)), roughness: 0.85 })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.012;
  floor.receiveShadow = true;
  root.add(floor);
  const rim = new THREE.Mesh(track(new THREE.RingGeometry(HUB_R + 0.9, HUB_R + 1.3, 72)), stoneDark);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.014;
  root.add(rim);

  // balustrade with a gap at every gate
  const gap = 3.2 / HUB_R;
  const postR = HUB_R + 0.5;
  for (let k = 0; k < n; k++) {
    const a0 = zoneAngle(k, n) + gap;
    const a1 = zoneAngle(k + 1, n) - gap;
    const steps = Math.ceil(((a1 - a0) * postR) / 1.6);
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const x = -Math.sin(a) * postR;
      const z = -Math.cos(a) * postR;
      box(ctx, root, 0.32, 1.0, 0.32, x, 0.5, z, stone);
      cone(ctx, root, 0.2, 0.25, 4, x, 1.12, z, stoneDark).rotation.y = Math.PI / 4;
      if (i < steps) {
        const b = a0 + ((a1 - a0) * (i + 0.5)) / steps;
        const len = ((a1 - a0) * postR) / steps;
        box(ctx, root, len, 0.12, 0.22, -Math.sin(b) * postR, 0.92, -Math.cos(b) * postR, stoneDark, b);
        box(ctx, root, len, 0.1, 0.18, -Math.sin(b) * postR, 0.25, -Math.cos(b) * postR, stoneDark, b);
      }
    }
    // a lamp post halfway between two gates
    const mid = (zoneAngle(k, n) + zoneAngle(k + 1, n)) / 2;
    const lx = -Math.sin(mid) * (HUB_R - 0.6);
    const lz = -Math.cos(mid) * (HUB_R - 0.6);
    cyl(ctx, root, 0.07, 0.1, 3.2, 8, lx, 1.6, lz, stoneDark);
    const lamp = sphere(ctx, root, 0.24, lx, 3.35, lz, mat(ctx, "#ffe2b0", { basic: true }), 1);
    cone(ctx, root, 0.32, 0.28, 8, lx, 3.68, lz, gold);
    lights.push({ pos: new THREE.Vector3(lx, 3.2, lz), color: "#ffcf90", intensity: 2.6, range: 9, flicker: false, flame: lamp });
    colliders.push(new THREE.Vector2(lx, lz));
  }

  // signposts beside every gate, facing the plaza centre
  zones.forEach((z, k) => {
    const a = zoneAngle(k, n);
    const dir = zoneDir(k, n);
    const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const p = dir.clone().multiplyScalar(HUB_R - 2.4).addScaledVector(right, 3.6);
    const g = new THREE.Group();
    box(ctx, g, 0.14, 2.6, 0.14, 0, 1.3, -0.05, stoneDark);
    const face = new THREE.Mesh(track(new THREE.PlaneGeometry(1.5, 1.17)), track(new THREE.MeshStandardMaterial({ map: canvasTex(ctx, signCanvas(z, counts[k], slots[k])), roughness: 0.7, emissive: "#ffffff", emissiveIntensity: 0.18 })));
    (face.material as THREE.MeshStandardMaterial).emissiveMap = (face.material as THREE.MeshStandardMaterial).map;
    face.position.set(0, 2.1, 0.03);
    g.add(face);
    box(ctx, g, 1.62, 1.29, 0.06, 0, 2.1, -0.02, mat(ctx, z.color));
    g.position.copy(p);
    g.lookAt(0, 0, 0);
    g.rotation.x = 0;
    g.rotation.z = 0;
    root.add(g);
    colliders.push(new THREE.Vector2(p.x, p.z));
  });

  // centre monument: stepped octagonal pedestal + floating crystal + zone-coloured orbs
  cyl(ctx, root, 2.2, 2.4, 0.35, 8, 0, 0.17, 0, stone);
  cyl(ctx, root, 1.6, 1.8, 0.4, 8, 0, 0.55, 0, stoneDark);
  cyl(ctx, root, 0.9, 1.2, 1.4, 8, 0, 1.45, 0, stone);
  cyl(ctx, root, 1.05, 1.05, 0.12, 8, 0, 2.2, 0, gold);
  const crystal = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.75, 0)), track(new THREE.MeshStandardMaterial({
    color: "#ffd6ec", emissive: "#ff7ab8", emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.3, flatShading: true,
  })));
  crystal.scale.y = 1.6;
  crystal.userData.dynamic = true;
  crystal.position.y = 3.6;
  root.add(crystal);
  const orbs = zones.map((z) => {
    const o = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.16, 1)), track(new THREE.MeshBasicMaterial({ color: z.color, toneMapped: false })));
    o.userData.dynamic = true;
    root.add(o);
    return o;
  });
  const glow = new THREE.PointLight("#ff9ad0", 6, 10, 1.6);
  glow.position.set(0, 3.6, 0);
  root.add(glow);

  // sakura in planters between the wings (also hides the seams between zones)
  const trees: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const mid = (zoneAngle(k, n) + zoneAngle(k + 1, n)) / 2;
    for (const r of [HUB_R + 3, HUB_R + 6.5]) trees.push([-Math.sin(mid) * r, -Math.cos(mid) * r, 1.2 + (r - HUB_R) * 0.03]);
  }

  return {
    lights,
    colliders,
    trees,
    update(t: number) {
      crystal.rotation.y = t * 0.6;
      crystal.position.y = 3.6 + Math.sin(t * 1.3) * 0.15;
      (crystal.material as THREE.MeshStandardMaterial).emissive.setHSL((t * 0.04) % 1, 0.8, 0.6);
      orbs.forEach((o, k) => {
        const a = zoneAngle(k, n) + t * 0.35;
        o.position.set(-Math.sin(a) * 1.5, 3.6 + Math.sin(t * 2 + k) * 0.25, -Math.cos(a) * 1.5);
      });
      glow.intensity = 5 + Math.sin(t * 1.3) * 1;
    },
  };
}
