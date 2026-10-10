import * as THREE from "three";
import type { CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import {
  PALETTES, createTracker, createRenderer, createMaterials, buildEnvironment, buildPath, buildTorii, buildHall,
  buildToro, buildSakuraTrees, buildFallingPetals, type ShrineVariant,
} from "../shaders/sakura-shrine-holo-card/world";
import { createControls } from "./controls";
import {
  SPACING, PHOTO_X, WALK_HALF_WIDTH, EYE, exhibitZ, exhibitSide, buildExhibit, buildSign, type Exhibit,
} from "./layout";

export type WalkEvents = {
  onFocus(index: number): void;
  onInspect(index: number): void;
  onViewed(viewed: number[]): void;
  onLockChange(locked: boolean): void;
};

export type GalleryWalk = {
  start(): void;
  inspect(index: number): void;
  exitInspect(relock: boolean): void;
  step(delta: number): void;
  readonly isTouch: boolean;
  dispose(): void;
};

const ACCENTS = ["#ff7aa2", "#ffb36b", "#a58bff", "#7fd3e8"];
const FOCUS_DIST = 3.6;
const LIGHT_POOL = 6;

export function createGalleryWalk(
  container: HTMLElement,
  minimap: HTMLCanvasElement,
  photos: CosplayPhoto[],
  images: (HTMLImageElement | null)[],
  variant: ShrineVariant,
  ev: WalkEvents,
): GalleryWalk {
  const P = PALETTES[variant];
  const n = photos.length;
  const renderer = createRenderer(P);
  container.appendChild(renderer.domElement);
  const dom = renderer.domElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
  camera.rotation.order = "YXZ";
  const { track, disposeAll } = createTracker();
  const M = createMaterials(P, track);

  const lastZ = exhibitZ(n - 1);
  const hallZ = lastZ - SPACING / 2 - 6;
  const zMax = 9;
  const zMin = hallZ + 3;
  const midZ = (zMax + hallZ) / 2;
  const length = zMax - hallZ;

  const { skyMat, sky, sun, ground } = buildEnvironment(scene, P, track, Math.max(40, length / 2 + 30));
  ground.position.z = midZ;
  // a little extra moonlight so the corridor reads well at walking height
  scene.add(new THREE.HemisphereLight("#9a88d8", "#3a1a28", variant === "yozakura" ? 0.7 : 0.25));

  // ---------- path, torii corridor, hall ----------
  buildPath(scene, M, track, zMax - 0.5, Math.ceil((zMax - zMin) / 1.05) + 2);
  buildTorii(scene, M, track, 5, 1.55);
  buildSign(scene, M, track, renderer, n, -2.7, 6.2);
  const pillars: THREE.Vector2[] = [];
  const TORII_SCALE = 1.3;
  for (let i = 0; i <= n; i++) {
    const z = exhibitZ(i) + SPACING / 2;
    buildTorii(scene, M, track, z, TORII_SCALE);
    pillars.push(new THREE.Vector2(-1.75 * TORII_SCALE, z), new THREE.Vector2(1.75 * TORII_SCALE, z));
    // a pair of paper lanterns under each gate
    for (const x of [-1.25, 1.25]) {
      const c = new THREE.Mesh(track(new THREE.SphereGeometry(0.17, 16, 12)), M.chochin[i % 2]);
      c.scale.y = 1.35;
      c.position.set(x, 3.75, z);
      scene.add(c);
    }
  }
  buildHall(scene, M, track, hallZ);

  // ---------- stone lanterns (lights come from a small pool that follows the player) ----------
  type Lantern = { pos: THREE.Vector3; mesh: THREE.Mesh; seed: number };
  const lanterns: Lantern[] = [];
  const addToro = (x: number, z: number) => {
    const t = buildToro(scene, M, track, P, x, z);
    t.group.remove(t.flame.light);
    t.flame.light.dispose();
    lanterns.push({ pos: new THREE.Vector3(x, 1.36, z), mesh: t.flame.mesh, seed: t.flame.seed });
    pillars.push(new THREE.Vector2(x, z));
  };
  addToro(-2.4, 7.4);
  addToro(2.4, 7.4);
  for (let i = 0; i < n; i++) addToro(exhibitSide(i) * 2.75, exhibitZ(i) + 1.25);
  addToro(-2.4, hallZ + 4);
  addToro(2.4, hallZ + 4);
  const pool = Array.from({ length: LIGHT_POOL }, () => {
    const l = new THREE.PointLight("#ff9a4a", P.lantern, 6, 1.8);
    scene.add(l);
    return l;
  });

  // ---------- sakura trees along both sides ----------
  const spots: [number, number, number][] = [];
  for (let z = zMax + 2; z > hallZ - 4; z -= 3.2) {
    for (const s of [-1, 1]) {
      spots.push([s * (5.4 + Math.random() * 1.4), z + (Math.random() - 0.5) * 1.5, 1.15 + Math.random() * 0.3]);
      if (Math.random() < 0.6) spots.push([s * (9 + Math.random() * 3), z + Math.random() * 2, 1.3 + Math.random() * 0.3]);
    }
  }
  buildSakuraTrees(scene, M, track, P, spots, 120);
  const petalMat = buildFallingPetals(scene, track, P, new THREE.Vector3(16, 7, 22), new THREE.Vector3(0, 0, zMax), 2200);

  // ---------- exhibits ----------
  const exhibits: Exhibit[] = photos.map((p, i) =>
    buildExhibit(scene, M, track, renderer, p, i, images[i], new THREE.Color(ACCENTS[i % ACCENTS.length])),
  );

  // ---------- player ----------
  const player = { pos: new THREE.Vector3(0, EYE, 8), yaw: 0, pitch: -0.04, vel: new THREE.Vector2(), bob: 0 };
  let started = false;
  let focused = -1;
  let inspecting = -1;
  let returning = 0;
  const viewed = new Set<number>();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const facePhoto = (i: number) => {
    const e = exhibits[i];
    player.pos.set(e.side * 0.9, EYE, e.center.z);
    player.yaw = -e.side * (Math.PI / 2);
    player.pitch = -0.05;
  };

  const api: GalleryWalk = {
    get isTouch() { return controls.isTouch; },
    start() {
      started = true;
      controls.requestLock();
    },
    inspect(i) {
      if (i < 0 || i >= n) return;
      inspecting = i;
      facePhoto(i);
      if (!viewed.has(i)) { viewed.add(i); ev.onViewed([...viewed]); }
      controls.releaseLock();
      ev.onInspect(i);
    },
    exitInspect(relock) {
      if (inspecting < 0) return;
      inspecting = -1;
      returning = 1;
      ev.onInspect(-1);
      if (relock) controls.requestLock();
    },
    step(d) {
      if (inspecting >= 0) api.inspect((inspecting + d + n) % n);
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
      else if (/^[1-9]$/.test(k)) api.inspect(Number(k) - 1); // quick travel to photo N
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

  // ---------- minimap ----------
  const mm = minimap.getContext("2d")!;
  function drawMinimap() {
    const W = minimap.width;
    const H = minimap.height;
    const scale = H / 26; // metres visible vertically
    const toX = (x: number) => W / 2 + x * scale;
    const toY = (z: number) => H / 2 + (z - player.pos.z) * scale;
    mm.clearRect(0, 0, W, H);
    mm.fillStyle = "rgba(20,8,20,0.6)";
    mm.fillRect(0, 0, W, H);
    mm.fillStyle = "rgba(200,180,170,0.35)";
    mm.fillRect(toX(-0.8), toY(zMax), 1.6 * scale, (zMax - hallZ) * scale);
    mm.fillStyle = "#d4321f";
    for (let i = 0; i <= n; i++) {
      const y = toY(exhibitZ(i) + SPACING / 2);
      mm.fillRect(toX(-2.4), y - 1, 4.8 * scale, 2);
    }
    mm.fillStyle = "#4a1a14";
    mm.fillRect(toX(-2.5), toY(hallZ + 1.5), 5 * scale, 3 * scale);
    exhibits.forEach((e, i) => {
      mm.beginPath();
      mm.arc(toX(e.side * PHOTO_X), toY(e.center.z), 5, 0, Math.PI * 2);
      mm.fillStyle = viewed.has(i) ? "#ff7aa2" : "rgba(255,255,255,0.15)";
      mm.fill();
      mm.strokeStyle = i === focused ? "#ffd27a" : "rgba(255,220,232,0.8)";
      mm.lineWidth = i === focused ? 2.5 : 1.2;
      mm.stroke();
    });
    mm.save();
    mm.translate(toX(player.pos.x), toY(player.pos.z));
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
  let raf = 0;
  let minimapTimer = 0;

  camera.position.copy(player.pos);

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    controls.update();

    // look + move
    const look = controls.consumeLook();
    if (inspecting < 0 && started) {
      player.yaw += look.yaw;
      player.pitch = THREE.MathUtils.clamp(player.pitch + look.pitch, -1.2, 1.2);
      const speed = controls.running ? 5 : 2.6;
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      const mx = controls.move.x;
      const my = controls.move.y;
      const tx = (mx * cos - my * sin) * speed;
      const tz = (-mx * sin - my * cos) * speed;
      const kv = 1 - Math.exp(-dt * 10);
      player.vel.x += (tx - player.vel.x) * kv;
      player.vel.y += (tz - player.vel.y) * kv;
      player.pos.x += player.vel.x * dt;
      player.pos.z += player.vel.y * dt;
      // stay on the path and out of pillars / lanterns
      player.pos.x = THREE.MathUtils.clamp(player.pos.x, -WALK_HALF_WIDTH, WALK_HALF_WIDTH);
      player.pos.z = THREE.MathUtils.clamp(player.pos.z, zMin, zMax);
      for (const p of pillars) {
        const dx = player.pos.x - p.x;
        const dz = player.pos.z - p.y;
        const d = Math.hypot(dx, dz);
        if (d < 0.5 && d > 1e-4) {
          player.pos.x = p.x + (dx / d) * 0.5;
          player.pos.z = p.y + (dz / d) * 0.5;
        }
      }
      const moving = player.vel.length();
      if (!reduceMotion) player.bob += dt * moving * 2.4;
    }

    // walk pose
    const bobY = reduceMotion ? 0 : Math.sin(player.bob) * 0.035 * Math.min(player.vel.length() / 2.6, 1);
    euler.set(player.pitch, player.yaw, 0);
    walkQuat.setFromEuler(euler);

    // focus: nearest photo in front of the player within reach
    fwd.set(0, 0, -1).applyQuaternion(walkQuat);
    let best = -1;
    let bestScore = Infinity;
    if (inspecting < 0) {
      for (const e of exhibits) {
        toPhoto.subVectors(e.center, player.pos);
        const d = toPhoto.length();
        if (d > FOCUS_DIST) continue;
        toPhoto.normalize();
        const facing = fwd.dot(toPhoto);
        if (facing < 0.72) continue;
        const score = d * (2 - facing);
        if (score < bestScore) { bestScore = score; best = e.index; }
      }
    } else best = inspecting;
    if (best !== focused) {
      focused = best;
      ev.onFocus(focused);
      if (focused >= 0 && !viewed.has(focused)) { viewed.add(focused); ev.onViewed([...viewed]); }
    }

    // camera: follow the walk pose, or glide in front of the inspected photo
    if (inspecting >= 0) {
      const e = exhibits[inspecting];
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const fitH = (e.height + 0.9) / 2 / Math.tan(vfov / 2);
      const fitW = (e.width + 0.6) / 2 / (Math.tan(vfov / 2) * camera.aspect);
      desiredPos.copy(e.center).addScaledVector(e.normal, Math.max(fitH, fitW, 1.2));
      desiredPos.y -= 0.12;
      lookM.lookAt(desiredPos, e.center.clone().setY(e.center.y - 0.12), up);
      desiredQuat.setFromRotationMatrix(lookM);
    } else {
      desiredPos.copy(player.pos);
      desiredPos.y = EYE + bobY;
      desiredQuat.copy(walkQuat);
    }
    returning = Math.max(0, returning - dt);
    const smooth = inspecting >= 0 || returning > 0 ? 1 - Math.exp(-dt * 5) : 1 - Math.exp(-dt * 30);
    camera.position.lerp(desiredPos, smooth);
    camera.quaternion.slerp(desiredQuat, smooth);

    // world follows the viewer
    sky.position.copy(camera.position);
    sun.position.set(camera.position.x - 6, 10, camera.position.z + 4);
    sun.target.position.set(camera.position.x, 0, camera.position.z);
    skyMat.uniforms.uTime.value = t;
    petalMat.uniforms.uTime.value = reduceMotion ? t * 0.3 : t;
    (petalMat.uniforms.uCenter.value as THREE.Vector3).set(camera.position.x, 0, camera.position.z - 4);

    // light pool: nearest lanterns get real lights; every flame flickers
    const sorted = lanterns
      .map((l) => ({ l, d: l.pos.distanceToSquared(camera.position) }))
      .sort((a, b) => a.d - b.d);
    sorted.forEach(({ l }, i) => {
      const nse = Math.sin(t * 9 + l.seed) * 0.5 + Math.sin(t * 23 + l.seed * 2) * 0.3 + Math.sin(t * 4.3 + l.seed) * 0.2;
      (l.mesh.material as THREE.MeshBasicMaterial).color.setHSL(0.08, 1, 0.68 + nse * 0.05);
      if (i < LIGHT_POOL) {
        pool[i].position.copy(l.pos);
        pool[i].intensity = P.lantern * (0.85 + nse * 0.15);
      }
    });

    // photo shaders: foil reacts to where you stand
    for (const e of exhibits) {
      const u = e.material.uniforms;
      const target = e.index === focused ? 1 : 0;
      e.focus += (target - e.focus) * (1 - Math.exp(-dt * 5));
      u.uTime.value = t;
      u.uActive.value = 0.15 + e.focus * 0.55;
      u.uHover.value = e.focus * 0.5;
      e.mesh.worldToLocal(localCam.copy(camera.position));
      u.uTilt.value.set(THREE.MathUtils.clamp(localCam.x / 3, -1, 1), THREE.MathUtils.clamp(localCam.y / 3, -1, 1));
      u.uPointer.value.set(0.5 - u.uTilt.value.x * 0.35, 0.5 - u.uTilt.value.y * 0.35);
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
