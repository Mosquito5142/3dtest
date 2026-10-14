import * as THREE from "three";
import type { CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import {
  createTracker, createRenderer, createMaterials, buildEnvironment, buildFallingPetals, buildSakuraTrees, PALETTES,
  type ShrineVariant,
} from "../shaders/sakura-shrine-holo-card/world";
import { createControls } from "./controls";
import { HUB_R, MIN_SLOTS, WALK_HALF, EYE, zoneLength, slotZ, buildExhibit, type Exhibit } from "./layout";
import { ZONES } from "./zones";
import type { LightPoint, ZoneCtx } from "./zones/types";
import { seeded } from "./zones/kit";
import { buildHub, zoneAngle, zoneDir } from "./hub";
import { HUB_ENV, createEnvBlender, resolve } from "./env";

export type ExhibitMeta = { zone: number; slot: number; photo: CosplayPhoto | null };

export type WalkEvents = {
  onFocus(id: number): void;
  onInspect(id: number): void;
  onViewed(ids: number[]): void;
  onLockChange(locked: boolean): void;
  /** zone index the player is in, -1 = central plaza */
  onZone(zone: number): void;
};

export type GalleryWalk = {
  readonly exhibits: ExhibitMeta[];
  readonly isTouch: boolean;
  start(): void;
  inspect(id: number): void;
  exitInspect(relock: boolean): void;
  step(delta: number): void;
  /** warp to a zone gate, or -1 for the plaza */
  warp(zone: number): void;
  dispose(): void;
};

const FOCUS_DIST = 3.6;
const LIGHT_POOL = 8;

type ZoneRuntime = {
  root: THREE.Group;
  origin: THREE.Vector3;
  xAxis: THREE.Vector3;
  zAxis: THREE.Vector3;
  length: number;
  exhibits: Exhibit[];
};

export function createGalleryWalk(
  container: HTMLElement,
  minimap: HTMLCanvasElement,
  photosPerZone: CosplayPhoto[][],
  imagesPerZone: (HTMLImageElement | null)[][],
  variant: ShrineVariant,
  ev: WalkEvents,
): GalleryWalk {
  const n = ZONES.length;
  const P = PALETTES[variant];
  const renderer = createRenderer(P);
  container.appendChild(renderer.domElement);
  const dom = renderer.domElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 260);
  const { track, disposeAll } = createTracker();
  const M = createMaterials(P, track);

  // ---------- sky, lights, base ground ----------
  const { skyMat, sky, sun, ground } = buildEnvironment(scene, P, track, 260);
  ground.position.y = -0.6;
  (ground.material as THREE.MeshStandardMaterial).color.set("#2a2230");
  const hemi = new THREE.HemisphereLight("#ffffff", "#000000", 1);
  scene.add(hemi);
  scene.children.filter((o) => o instanceof THREE.HemisphereLight && o !== hemi).forEach((o) => scene.remove(o));
  sun.shadow.camera.left = sun.shadow.camera.bottom = -16;
  sun.shadow.camera.right = sun.shadow.camera.top = 16;
  sun.shadow.camera.updateProjectionMatrix();
  const particles = buildFallingPetals(scene, track, P, new THREE.Vector3(18, 7, 22), new THREE.Vector3(), 2400);

  // ---------- zones ----------
  const lightPoints: LightPoint[] = [];
  const colliders: THREE.Vector2[] = [];
  const updaters: ((t: number) => void)[] = [];
  const exhibits: Exhibit[] = [];
  const zones: ZoneRuntime[] = ZONES.map((theme, k) => {
    const photos = photosPerZone[k] ?? [];
    const slots = Math.max(MIN_SLOTS, photos.length + (photos.length >= MIN_SLOTS ? 2 : 0));
    const length = zoneLength(slots);
    const root = new THREE.Group();
    const a = zoneAngle(k, n);
    const dir = zoneDir(k, n);
    root.position.copy(dir).multiplyScalar(HUB_R);
    root.rotation.y = a;
    scene.add(root);
    root.updateMatrixWorld(true);
    const ctx: ZoneCtx = {
      root, track, renderer, M, variant, length, hubRadius: HUB_R,
      slotZ: Array.from({ length: slots }, (_, i) => slotZ(i)),
      lights: [], colliders: [], rand: seeded(k * 977 + 13), updaters,
      inWedge: (x, z, margin = 1) => Math.abs(x) + margin <= Math.tan(Math.PI / n) * (HUB_R - z) - 0.5,
    };
    theme.buildWorld(ctx);
    const zx: Exhibit[] = [];
    for (let s = 0; s < slots; s++) {
      zx.push(buildExhibit(ctx, theme, k, s, exhibits.length + zx.length, photos[s] ?? null, imagesPerZone[k]?.[s] ?? null));
    }
    exhibits.push(...zx);
    root.updateMatrixWorld(true);
    for (const l of ctx.lights) lightPoints.push({ ...l, pos: root.localToWorld(l.pos.clone()) });
    for (const c of ctx.colliders) {
      const w = root.localToWorld(new THREE.Vector3(c.x, 0, c.y));
      colliders.push(new THREE.Vector2(w.x, w.z));
    }
    return {
      root, origin: root.position.clone(), length, exhibits: zx,
      xAxis: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)),
      zAxis: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
    };
  });

  // ---------- central plaza ----------
  const hubRoot = new THREE.Group();
  scene.add(hubRoot);
  const hub = buildHub({ root: hubRoot, track, renderer }, ZONES, photosPerZone.map((p) => p.length), zones.map((z) => z.exhibits.length));
  lightPoints.push(...hub.lights);
  colliders.push(...hub.colliders.slice(1));
  buildSakuraTrees(hubRoot, M, track, P, hub.trees, 60);

  const pool = Array.from({ length: LIGHT_POOL }, () => {
    const l = new THREE.PointLight("#ffffff", 0, 7, 1.8);
    scene.add(l);
    return l;
  });

  // ---------- environment blending ----------
  const hubEnv = resolve(HUB_ENV);
  const zoneEnvs = ZONES.map((z) => resolve(z.env(variant)));
  const env = createEnvBlender(
    { renderer, fog: scene.fog as THREE.FogExp2, sky: skyMat, hemi, sun, particles },
    hubEnv,
  );

  // ---------- player state ----------
  const player = { pos: new THREE.Vector3(0, EYE, 7.5), yaw: 0, pitch: 0.08, vel: new THREE.Vector2(), bob: 0 };
  let started = false;
  let focused = -1;
  let inspecting = -1;
  let returning = 0;
  let currentZone = -2;
  const viewed = new Set<number>();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const withPhoto = (e: Exhibit) => e.photo !== null;

  const local = (p: THREE.Vector3, z: ZoneRuntime) => {
    const dx = p.x - z.origin.x;
    const dz = p.z - z.origin.z;
    return { x: dx * z.xAxis.x + dz * z.xAxis.z, z: dx * z.zAxis.x + dz * z.zAxis.z };
  };
  /** walkable = inside the plaza or on one of the zone paths */
  const walkable = (x: number, z: number) => {
    if (Math.hypot(x, z) <= HUB_R - 0.35) return true;
    const p = new THREE.Vector3(x, 0, z);
    return zones.some((zr) => {
      const l = local(p, zr);
      return Math.abs(l.x) <= WALK_HALF && l.z <= 2.5 && l.z >= -zr.length + 3.5;
    });
  };
  const zoneAt = (p: THREE.Vector3) => {
    const r = Math.hypot(p.x, p.z);
    if (r < HUB_R - 1) return { zone: -1, w: 0 };
    let best = 0;
    let bestDot = -Infinity;
    zones.forEach((zr, k) => {
      const d = (p.x * -zr.zAxis.x + p.z * -zr.zAxis.z) / r;
      if (d > bestDot) { bestDot = d; best = k; }
    });
    return { zone: best, w: THREE.MathUtils.smoothstep(r, HUB_R - 1.5, HUB_R + 3) };
  };

  const faceExhibit = (e: Exhibit) => {
    player.pos.copy(e.center).addScaledVector(e.normal, 2.1).setY(EYE);
    player.yaw = Math.atan2(e.normal.x, e.normal.z);
    player.pitch = -0.05;
  };

  const api: GalleryWalk = {
    exhibits: exhibits.map((e) => ({ zone: e.zone, slot: e.slot, photo: e.photo })),
    get isTouch() { return controls.isTouch; },
    start() {
      started = true;
      controls.requestLock();
    },
    inspect(id) {
      const e = exhibits[id];
      if (!e || !withPhoto(e)) return;
      inspecting = id;
      faceExhibit(e);
      if (!viewed.has(id)) { viewed.add(id); ev.onViewed([...viewed]); }
      controls.releaseLock();
      ev.onInspect(id);
    },
    exitInspect(relock) {
      if (inspecting < 0) return;
      inspecting = -1;
      returning = 1;
      ev.onInspect(-1);
      if (relock) controls.requestLock();
    },
    step(d) {
      if (inspecting < 0) return;
      const list = zones[exhibits[inspecting].zone].exhibits.filter(withPhoto);
      const i = list.findIndex((e) => e.id === inspecting);
      api.inspect(list[(i + d + list.length) % list.length].id);
    },
    warp(k) {
      api.exitInspect(false);
      if (k < 0 || k >= n) {
        player.pos.set(0, EYE, 7.5);
        player.yaw = 0;
      } else {
        const zr = zones[k];
        player.pos.copy(zr.origin).addScaledVector(zr.zAxis, -2.5).setY(EYE);
        player.yaw = zoneAngle(k, n);
      }
      player.pitch = 0.02;
      player.vel.set(0, 0);
      returning = 1;
    },
    dispose() {},
  };

  const controls = createControls(dom, container, {
    onTap() {
      if (!started) return;
      if (inspecting >= 0) api.exitInspect(true);
      else if (focused >= 0) api.inspect(focused);
      else if (!controls.locked) controls.requestLock();
    },
    onKey(k) {
      if (!started) return;
      if (k === "e" || k === "Enter") {
        if (inspecting >= 0) api.exitInspect(true);
        else if (focused >= 0) api.inspect(focused);
      } else if (k === "Escape" || k === "q") api.exitInspect(false);
      else if (k === "h") api.warp(-1);
      else if (/^[1-9]$/.test(k)) api.warp(Number(k) - 1);
      else if (inspecting >= 0 && (k === "ArrowRight" || k === "d")) api.step(1);
      else if (inspecting >= 0 && (k === "ArrowLeft" || k === "a")) api.step(-1);
    },
    onLockChange: ev.onLockChange,
  });

  // ---------- resize ----------
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 78 : 68;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---------- minimap (north-up, centred on the player) ----------
  const mm = minimap.getContext("2d")!;
  function drawMinimap() {
    const W = minimap.width;
    const H = minimap.height;
    const s = W / 56; // pixels per metre
    const tx = (x: number) => W / 2 + (x - player.pos.x) * s;
    const ty = (z: number) => H / 2 + (z - player.pos.z) * s;
    mm.clearRect(0, 0, W, H);
    mm.fillStyle = "rgba(20,10,24,0.65)";
    mm.fillRect(0, 0, W, H);
    zones.forEach((zr, k) => {
      mm.save();
      mm.translate(tx(zr.origin.x), ty(zr.origin.z));
      mm.rotate(-zoneAngle(k, n));
      mm.fillStyle = ZONES[k].color;
      mm.globalAlpha = 0.35;
      mm.fillRect(-WALK_HALF * s, -zr.length * s, WALK_HALF * 2 * s, zr.length * s);
      mm.restore();
    });
    mm.globalAlpha = 1;
    mm.fillStyle = "rgba(200,190,210,0.35)";
    mm.beginPath();
    mm.arc(tx(0), ty(0), HUB_R * s, 0, Math.PI * 2);
    mm.fill();
    mm.fillStyle = "#ffd6ec";
    mm.beginPath();
    mm.arc(tx(0), ty(0), 3, 0, Math.PI * 2);
    mm.fill();
    for (const e of exhibits) {
      const x = tx(e.center.x);
      const y = ty(e.center.z);
      if (x < -5 || y < -5 || x > W + 5 || y > H + 5) continue;
      mm.beginPath();
      mm.arc(x, y, e.photo ? 3.6 : 2, 0, Math.PI * 2);
      mm.fillStyle = !e.photo ? "rgba(255,255,255,0.18)" : viewed.has(e.id) ? ZONES[e.zone].color : "rgba(255,255,255,0.15)";
      mm.fill();
      if (e.photo) {
        mm.strokeStyle = e.id === focused ? "#ffd27a" : "rgba(255,235,240,0.85)";
        mm.lineWidth = e.id === focused ? 2.2 : 1;
        mm.stroke();
      }
    }
    mm.save();
    mm.translate(W / 2, H / 2);
    mm.rotate(-player.yaw);
    mm.fillStyle = "#ffd27a";
    mm.beginPath();
    mm.moveTo(0, -8);
    mm.lineTo(5.5, 6);
    mm.lineTo(-5.5, 6);
    mm.closePath();
    mm.fill();
    mm.restore();
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const fwd = new THREE.Vector3();
  const toPhoto = new THREE.Vector3();
  const walkQuat = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const desiredPos = new THREE.Vector3();
  const desiredQuat = new THREE.Quaternion();
  const lookM = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const localCam = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let raf = 0;
  let minimapTimer = 0;
  let poolTimer = 0;
  let assigned: LightPoint[] = [];
  camera.position.copy(player.pos);

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    controls.update();

    // look + move with collision against the walkable area and round obstacles
    const look = controls.consumeLook();
    if (inspecting < 0 && started) {
      player.yaw += look.yaw;
      player.pitch = THREE.MathUtils.clamp(player.pitch + look.pitch, -1.2, 1.2);
      const speed = controls.running ? 5.5 : 2.8;
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      const { x: mx, y: my } = controls.move;
      const kv = 1 - Math.exp(-dt * 10);
      player.vel.x += ((mx * cos - my * sin) * speed - player.vel.x) * kv;
      player.vel.y += ((-mx * sin - my * cos) * speed - player.vel.y) * kv;
      const nx = player.pos.x + player.vel.x * dt;
      const nz = player.pos.z + player.vel.y * dt;
      if (walkable(nx, nz)) { player.pos.x = nx; player.pos.z = nz; }
      else if (walkable(nx, player.pos.z)) player.pos.x = nx;
      else if (walkable(player.pos.x, nz)) player.pos.z = nz;
      for (const c of colliders) {
        const dx = player.pos.x - c.x;
        const dz = player.pos.z - c.y;
        const d = Math.hypot(dx, dz);
        if (d < 0.5 && d > 1e-4) { player.pos.x = c.x + (dx / d) * 0.5; player.pos.z = c.y + (dz / d) * 0.5; }
      }
      const dc = Math.hypot(player.pos.x, player.pos.z);
      if (dc < 2.7) { player.pos.x *= 2.7 / dc; player.pos.z *= 2.7 / dc; } // monument
      if (!reduceMotion) player.bob += dt * player.vel.length() * 2.4;
    }

    const bobY = reduceMotion ? 0 : Math.sin(player.bob) * 0.035 * Math.min(player.vel.length() / 2.8, 1);
    euler.set(player.pitch, player.yaw, 0);
    walkQuat.setFromEuler(euler);

    // zone + atmosphere
    const where = zoneAt(player.pos);
    if (where.zone !== currentZone) { currentZone = where.zone; ev.onZone(currentZone); }
    env.update(hubEnv, where.zone >= 0 ? zoneEnvs[where.zone] : hubEnv, where.w, dt);
    const deep = Math.hypot(player.pos.x, player.pos.z) > HUB_R + 8;
    zones.forEach((zr, k) => { zr.root.visible = !deep || k === where.zone; });

    // focus: nearest photo in front of the player within reach
    fwd.set(0, 0, -1).applyQuaternion(walkQuat);
    let best = -1;
    let bestScore = Infinity;
    if (inspecting < 0) {
      const pool = where.zone >= 0 ? zones[where.zone].exhibits : [];
      for (const e of pool) {
        if (!e.photo) continue;
        toPhoto.subVectors(e.center, player.pos);
        const d = toPhoto.length();
        if (d > FOCUS_DIST) continue;
        const facing = fwd.dot(toPhoto.normalize());
        if (facing < 0.72) continue;
        const score = d * (2 - facing);
        if (score < bestScore) { bestScore = score; best = e.id; }
      }
    } else best = inspecting;
    if (best !== focused) {
      focused = best;
      ev.onFocus(focused);
      if (focused >= 0 && !viewed.has(focused)) { viewed.add(focused); ev.onViewed([...viewed]); }
    }

    // camera: walk pose, or glide in front of the inspected photo
    if (inspecting >= 0) {
      const e = exhibits[inspecting];
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const fitH = (e.height + 0.9) / 2 / Math.tan(vfov / 2);
      const fitW = (e.width + 0.6) / 2 / (Math.tan(vfov / 2) * camera.aspect);
      desiredPos.copy(e.center).addScaledVector(e.normal, Math.max(fitH, fitW, 1.2));
      desiredPos.y -= 0.12;
      lookTarget.copy(e.center).setY(e.center.y - 0.12);
      lookM.lookAt(desiredPos, lookTarget, up);
      desiredQuat.setFromRotationMatrix(lookM);
    } else {
      desiredPos.copy(player.pos).setY(EYE + bobY);
      desiredQuat.copy(walkQuat);
    }
    returning = Math.max(0, returning - dt);
    const smooth = inspecting >= 0 || returning > 0 ? 1 - Math.exp(-dt * 5) : 1 - Math.exp(-dt * 30);
    camera.position.lerp(desiredPos, smooth);
    camera.quaternion.slerp(desiredQuat, smooth);

    // world follows the viewer
    sky.position.copy(camera.position);
    sun.position.set(camera.position.x - 8, 14, camera.position.z + 6);
    sun.target.position.set(camera.position.x, 0, camera.position.z);
    skyMat.uniforms.uTime.value = t;
    particles.uniforms.uTime.value = reduceMotion ? t * 0.3 : t;
    (particles.uniforms.uCenter.value as THREE.Vector3).set(camera.position.x + fwd.x * 6, 0, camera.position.z + fwd.z * 6);
    hub.update(t);
    for (const u of updaters) u(t);

    // light pool: nearest light points borrow a real light; flames flicker
    poolTimer -= dt;
    if (poolTimer <= 0) {
      poolTimer = 0.25;
      assigned = lightPoints
        .map((l) => ({ l, d: l.pos.distanceToSquared(camera.position) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, LIGHT_POOL)
        .map((x) => x.l);
      assigned.forEach((l, i) => {
        pool[i].position.copy(l.pos);
        pool[i].color.set(l.color);
        pool[i].distance = l.range;
      });
    }
    pool.forEach((p, i) => {
      const l = assigned[i];
      if (!l) { p.intensity = 0; return; }
      const nse = l.flicker ? Math.sin(t * 9 + i * 7.1) * 0.5 + Math.sin(t * 23 + i * 3.3) * 0.3 + Math.sin(t * 4.3 + i) * 0.2 : 0;
      p.intensity = l.intensity * (0.85 + nse * 0.15);
      if (l.flame && l.flicker) {
        const m = l.flame.material as THREE.MeshBasicMaterial;
        if (m.isMeshBasicMaterial) m.color.setHSL(0.08, 1, 0.68 + nse * 0.05);
      }
    });

    // photo shaders: foil reacts to where you stand
    if (where.zone >= 0) {
      for (const e of zones[where.zone].exhibits) {
        if (!e.material) continue;
        const u = e.material.uniforms;
        e.focus += ((e.id === focused ? 1 : 0) - e.focus) * (1 - Math.exp(-dt * 5));
        u.uTime.value = t;
        u.uActive.value = 0.15 + e.focus * 0.55;
        u.uHover.value = e.focus * 0.5;
        e.mesh.worldToLocal(localCam.copy(camera.position));
        u.uTilt.value.set(THREE.MathUtils.clamp(localCam.x / 3, -1, 1), THREE.MathUtils.clamp(localCam.y / 3, -1, 1));
        u.uPointer.value.set(0.5 - u.uTilt.value.x * 0.35, 0.5 - u.uTilt.value.y * 0.35);
      }
    }

    minimapTimer -= dt;
    if (minimapTimer <= 0) { drawMinimap(); minimapTimer = 1 / 30; }
    renderer.render(scene, camera);
  }
  frame();

  api.dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    disposeAll();
    scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    pool.forEach((l) => l.dispose());
    renderer.dispose();
    dom.remove();
  };
  return api;
}
