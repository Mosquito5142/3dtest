import * as THREE from "three";
import { cardVertex, cardFragment, cardBackFragment } from "./shaders";
import {
  PALETTES, createTracker, createRenderer, createMaterials, buildEnvironment, buildPath, buildTorii, buildHall,
  buildToro, buildChochinRow, buildSakuraTrees, buildFallingPetals, flicker, type Flame, type ShrineVariant,
} from "./world";

export type { ShrineVariant };

const CARD_ASPECT = 2 / 3;

type CardSlot = {
  group: THREE.Group;
  front: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  back: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  string: THREE.Mesh;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  scale: number;
  targetScale: number;
  yaw: number;
  targetYaw: number;
  spin: number;
  sway: number;
  hover: number;
};

export type ShrineScene = {
  setTexture(index: number, canvas: HTMLCanvasElement): void;
  setSelected(index: number): void;
  setGallery(on: boolean): void;
  dispose(): void;
};

export function createShrineScene(
  container: HTMLElement,
  count: number,
  variant: ShrineVariant,
  onPick: (index: number) => void,
): ShrineScene {
  const P = PALETTES[variant];
  const renderer = createRenderer(P);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const camBase = new THREE.Vector3(0, 1.75, 7.2);
  const lookAt = new THREE.Vector3(0, 1.6, 0);

  const { track, disposeAll } = createTracker();
  const M = createMaterials(P, track);
  const { skyMat } = buildEnvironment(scene, P, track);
  const cardLight = new THREE.PointLight("#ffd2e0", 4, 6, 1.6);
  cardLight.position.set(0, 2.6, 4.2);
  scene.add(cardLight);

  buildPath(scene, M, track, 5, 14);
  buildTorii(scene, M, track, -0.6, 1);
  buildTorii(scene, M, track, -4.2, 0.92);
  buildTorii(scene, M, track, -7.8, 0.84);
  buildHall(scene, M, track, -12.5);

  const flames: Flame[] = [];
  for (const [x, z] of [[-2.4, 2.6], [2.4, 2.6], [-1.9, 0.6], [1.9, 0.6], [-1.9, -3], [1.9, -3]]) {
    flames.push(buildToro(scene, M, track, P, x, z).flame);
  }
  for (const side of [-1, 1]) buildChochinRow(scene, M, track, side * 3.1, 4, 9, 1.25);

  buildSakuraTrees(scene, M, track, P, [
    [-4.2, 3.2, 1.1], [4.3, 2.6, 1.15], [-5.2, -1, 1.25], [5.4, -0.4, 1.2], [-4.6, -5.5, 1.3],
    [4.8, -6, 1.3], [-7.5, 1.8, 1.4], [7.6, 1.2, 1.35], [-8, -4, 1.5], [8.2, -3.6, 1.5], [-3.6, -9.5, 1.2], [3.8, -9.8, 1.2],
  ]);
  const petalMat = buildFallingPetals(scene, track, P, new THREE.Vector3(18, 7, 16), new THREE.Vector3(0, 0, -2));

  // ---------- cosplay photo cards (featured card + hanging ema gallery) ----------
  const cardGeo = track(new THREE.PlaneGeometry(CARD_ASPECT, 1, 1, 1));
  const stringMat = track(new THREE.MeshBasicMaterial({ color: "#f5e6c8" }));
  const stringGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 1, 4));
  const placeholderTex = track(new THREE.DataTexture(new Uint8Array([60, 20, 40, 255]), 1, 1));
  placeholderTex.needsUpdate = true;
  const accentPalette = ["#ff7aa2", "#ffb36b", "#a58bff", "#7fd3e8"];
  const cards: CardSlot[] = [];
  for (let i = 0; i < count; i++) {
    const front = new THREE.Mesh(cardGeo, track(new THREE.ShaderMaterial({
      vertexShader: cardVertex, fragmentShader: cardFragment, toneMapped: false,
      uniforms: {
        uMap: { value: placeholderTex }, uTime: { value: 0 }, uTilt: { value: new THREE.Vector2() },
        uPointer: { value: new THREE.Vector2(0.3, 0.7) }, uActive: { value: 0 }, uHover: { value: 0 },
        uFoil: { value: 1 }, uAspect: { value: CARD_ASPECT }, uAccent: { value: new THREE.Color(accentPalette[i % 4]) },
      },
    })));
    front.userData.index = i;
    const back = new THREE.Mesh(cardGeo, track(new THREE.ShaderMaterial({
      vertexShader: cardVertex, fragmentShader: cardBackFragment, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uAspect: { value: CARD_ASPECT } },
    })));
    back.rotation.y = Math.PI;
    back.userData.index = i;
    const str = new THREE.Mesh(stringGeo, stringMat);
    str.position.y = 1.1; // hangs from the top edge (y = 0.5) like an ema plaque
    str.scale.y = 1.2;
    const group = new THREE.Group();
    group.add(front, back, str);
    scene.add(group);
    cards.push({
      group, front, back, string: str, pos: new THREE.Vector3(0, 6, -2), targetPos: new THREE.Vector3(),
      scale: 0.3, targetScale: 0.5, yaw: 0, targetYaw: 0, spin: 0, sway: Math.random() * 6.28, hover: 0,
    });
  }

  let selected = 0;
  let gallery = false;
  let hovered = -1;
  let aspect = 1;

  function layout() {
    const others = cards.map((_, i) => i).filter((i) => i !== selected);
    const narrow = aspect < 0.9;
    if (gallery) {
      const cols = narrow ? 3 : Math.min(count, 6);
      const rows = Math.ceil(count / cols);
      const cw = narrow ? 0.62 : 0.8;
      const ch = narrow ? 0.95 : 1.12;
      cards.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * cw;
        const yaw = -x * 0.12;
        c.targetPos.set(x, 1.8 + ((rows - 1) / 2 - row) * ch, 2.6 - Math.abs(x) * 0.15);
        c.targetScale = narrow ? 0.85 : 1.0;
        c.targetYaw = yaw;
      });
      return;
    }
    const featured = cards[selected];
    featured.targetPos.set(0, 1.75, narrow ? 3.0 : 3.3);
    featured.targetScale = narrow ? 2.3 : 2.0;
    featured.targetYaw = 0;
    // ema arc: two rows hanging around the gate
    const half = Math.ceil(others.length / 2);
    others.forEach((idx, k) => {
      const side = k < half ? -1 : 1;
      const j = k < half ? k : k - half;
      const perSide = k < half ? half : others.length - half;
      const t = perSide > 1 ? j / (perSide - 1) : 0.5;
      const row = j % 2;
      const angle = side * (0.62 + t * 0.62);
      const radius = narrow ? 2.6 : 3.4;
      const c = cards[idx];
      c.targetPos.set(Math.sin(angle) * radius, row ? 1.05 : 2.35, 1.3 - Math.cos(angle) * radius * 0.55 + (row ? 0.25 : 0));
      c.targetScale = narrow ? 0.62 : 0.78;
      c.targetYaw = -angle * 0.75;
    });
  }

  // ---------- interaction ----------
  const pointer = new THREE.Vector2(0, 0);
  const pointerNdc = new THREE.Vector2(10, 10);
  const tilt = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const dom = renderer.domElement;
  dom.style.touchAction = "pan-y";
  let downAt = { x: 0, y: 0 };

  function pick(): number {
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(cards.flatMap((c) => [c.front, c.back]), false);
    return hits.length ? (hits[0].object.userData.index as number) : -1;
  }
  const onMove = (e: PointerEvent) => {
    const r = dom.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    pointerNdc.copy(pointer);
    hovered = pick();
    dom.style.cursor = hovered >= 0 ? "pointer" : "default";
  };
  const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; onMove(e); };
  const onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
    onMove(e);
    const i = pick();
    if (i < 0) return;
    if (i === selected && !gallery) cards[i].spin += Math.PI * 2; // twirl the featured card
    else onPick(i);
  };
  const onLeave = () => { pointer.set(0, 0); pointerNdc.set(10, 10); hovered = -1; };
  dom.addEventListener("pointermove", onMove);
  dom.addEventListener("pointerdown", onDown);
  dom.addEventListener("pointerup", onUp);
  dom.addEventListener("pointerleave", onLeave);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 0.9 ? 58 : aspect < 1.3 ? 48 : 42;
    camera.updateProjectionMatrix();
    layout();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  // start every card in its slot instead of flying in from the sky
  cards.forEach((c) => {
    c.pos.copy(c.targetPos);
    c.scale = c.targetScale;
    c.yaw = c.targetYaw;
  });

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  const tmpLocal = new THREE.Vector3();
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 4.5);

    tilt.lerp(pointer, 1 - Math.exp(-dt * 6));
    camera.position.set(camBase.x + tilt.x * 0.35, camBase.y + tilt.y * 0.18, camBase.z);
    camera.lookAt(lookAt);

    skyMat.uniforms.uTime.value = t;
    petalMat.uniforms.uTime.value = reduceMotion ? t * 0.3 : t;
    flicker(flames, t, P.lantern);

    cards.forEach((c, i) => {
      const isFeatured = i === selected && !gallery;
      c.pos.lerp(c.targetPos, k);
      c.scale += (c.targetScale - c.scale) * k;
      c.yaw += (c.targetYaw - c.yaw) * k;
      c.spin *= Math.exp(-dt * 2.6);
      c.hover += ((hovered === i ? 1 : 0) - c.hover) * k;
      const sway = isFeatured ? 0 : Math.sin(t * 0.9 + c.sway) * 0.06;
      c.group.position.copy(c.pos);
      c.group.position.y += isFeatured ? Math.sin(t * 1.2) * 0.04 : 0;
      c.group.scale.setScalar(c.scale * (1 + c.hover * 0.06));
      c.group.rotation.set(
        isFeatured ? -tilt.y * 0.32 : sway * 0.4,
        c.yaw + c.spin + (isFeatured ? tilt.x * 0.45 : sway),
        isFeatured ? 0 : sway * 0.5,
      );
      c.string.visible = !isFeatured && !gallery;

      const u = c.front.material.uniforms;
      u.uTime.value = t;
      u.uActive.value += ((isFeatured ? 1 : 0) - u.uActive.value) * k;
      u.uHover.value = c.hover;
      u.uTilt.value.set(isFeatured ? tilt.x : Math.sin(t * 0.5 + c.sway) * 0.5, isFeatured ? tilt.y : Math.cos(t * 0.4 + c.sway) * 0.5);
      // glare follows the pointer projected onto the card plane
      if (isFeatured || hovered === i) {
        raycaster.setFromCamera(pointerNdc.x > 5 ? new THREE.Vector2(0, 0) : pointerNdc, camera);
        const hit = raycaster.intersectObject(c.front, false)[0];
        if (hit?.uv) u.uPointer.value.lerp(hit.uv, k);
        else {
          tmpLocal.set(0.5 + tilt.x * 0.4, 0.5 + tilt.y * 0.4, 0);
          u.uPointer.value.lerp(new THREE.Vector2(tmpLocal.x, tmpLocal.y), k);
        }
      }
      c.back.material.uniforms.uTime.value = t;
    });
    cardLight.intensity = gallery ? 2 : 4;
    renderer.render(scene, camera);
  }
  frame();

  return {
    setTexture(index, canvas) {
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const u = cards[index].front.material.uniforms;
      if (u.uMap.value !== placeholderTex) (u.uMap.value as THREE.Texture).dispose();
      u.uMap.value = tex;
    },
    setSelected(index) {
      if (index === selected) return;
      selected = index;
      cards[index].spin += Math.PI * 2;
      layout();
    },
    setGallery(on) {
      gallery = on;
      layout();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointerleave", onLeave);
      cards.forEach((c) => {
        const m = c.front.material.uniforms.uMap.value as THREE.Texture;
        if (m !== placeholderTex) m.dispose();
      });
      disposeAll();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      renderer.dispose();
      dom.remove();
    },
  };
}
