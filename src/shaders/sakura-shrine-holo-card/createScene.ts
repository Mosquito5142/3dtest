import * as THREE from "three";
import { cardVertex, cardFragment, cardBackFragment, petalVertex, petalFragment, skyVertex, skyFragment } from "./shaders";

export type ShrineVariant = "yozakura" | "hanami";

const PALETTES = {
  yozakura: {
    skyTop: "#090820", skyHorizon: "#5a2550", fog: "#24122e", fogDensity: 0.045,
    ambient: 0.35, hemiSky: "#6a5aa8", hemiGround: "#1a0d18", sun: 0.25, sunColor: "#9fb0ff",
    lantern: 3.2, moon: "#fff2dc", stars: 1, petalA: "#ffb3cb", petalB: "#fff0f5", petalGlow: 1,
    blossom: "#ffb6cf", blossomEmissive: "#5a1a35", ground: "#1d1418", exposure: 1.1,
  },
  hanami: {
    skyTop: "#6fa6dc", skyHorizon: "#ffe1ea", fog: "#f2d6e2", fogDensity: 0.03,
    ambient: 0.8, hemiSky: "#cfe6ff", hemiGround: "#8a6a5a", sun: 2.4, sunColor: "#fff1e0",
    lantern: 0.6, moon: "#ffffff", stars: 0, petalA: "#ff9fbf", petalB: "#ffe6ef", petalGlow: 0,
    blossom: "#ffc2d6", blossomEmissive: "#3a0f20", ground: "#7d6a5c", exposure: 1.0,
  },
} as const;

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
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(P.fog, P.fogDensity);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const camBase = new THREE.Vector3(0, 1.75, 7.2);
  const lookAt = new THREE.Vector3(0, 1.6, 0);

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

  // ---------- sky ----------
  const skyMat = track(new THREE.ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(P.skyTop) }, uHorizon: { value: new THREE.Color(P.skyHorizon) },
      uMoonColor: { value: new THREE.Color(P.moon) }, uMoonDir: { value: new THREE.Vector3(0.35, 0.42, -1) },
      uStars: { value: P.stars }, uTime: { value: 0 },
    },
  }));
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(90, 32, 16)), skyMat));

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0xffffff, P.ambient * 0.4));
  scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, P.ambient));
  const sun = new THREE.DirectionalLight(P.sunColor, P.sun);
  sun.position.set(-6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  scene.add(sun);
  const cardLight = new THREE.PointLight("#ffd2e0", 4, 6, 1.6);
  cardLight.position.set(0, 2.6, 4.2);
  scene.add(cardLight);

  // ---------- ground + path ----------
  const ground = new THREE.Mesh(
    track(new THREE.CircleGeometry(40, 48)),
    track(new THREE.MeshStandardMaterial({ color: P.ground, roughness: 0.95 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stoneMat = track(new THREE.MeshStandardMaterial({ color: "#8a8079", roughness: 0.9 }));
  const stoneGeo = track(new THREE.BoxGeometry(1, 0.08, 1));
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(stoneGeo, stoneMat);
    s.position.set((Math.random() - 0.5) * 0.15, 0.03, 5 - i * 1.05);
    s.scale.set(1.5 + Math.random() * 0.2, 1, 0.85);
    s.rotation.y = (Math.random() - 0.5) * 0.08;
    s.receiveShadow = true;
    scene.add(s);
  }

  // ---------- torii gates ----------
  const vermilion = track(new THREE.MeshStandardMaterial({ color: "#d4321f", roughness: 0.55, emissive: "#3a0602", emissiveIntensity: 0.4 }));
  const black = track(new THREE.MeshStandardMaterial({ color: "#1b1414", roughness: 0.6 }));
  function torii(z: number, s: number) {
    const g = new THREE.Group();
    const pillarGeo = track(new THREE.CylinderGeometry(0.17, 0.2, 4.2, 20));
    for (const x of [-1.75, 1.75]) {
      const p = new THREE.Mesh(pillarGeo, vermilion);
      p.position.set(x, 2.1, 0);
      p.castShadow = true;
      g.add(p);
      const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.24, 0.35, 20)), black);
      foot.position.set(x, 0.17, 0);
      g.add(foot);
    }
    const nuki = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.22, 0.2)), vermilion);
    nuki.position.y = 3.35;
    g.add(nuki);
    const shimaki = new THREE.Mesh(track(new THREE.BoxGeometry(4.9, 0.26, 0.36)), vermilion);
    shimaki.position.y = 4.05;
    g.add(shimaki);
    // curved kasagi: bent box
    const kasaGeo = track(new THREE.BoxGeometry(5.8, 0.24, 0.5, 24, 1, 1));
    const pos = kasaGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setY(i, pos.getY(i) + Math.pow(Math.abs(x) / 2.9, 2.4) * 0.32);
    }
    kasaGeo.computeVertexNormals();
    const kasagi = new THREE.Mesh(kasaGeo, black);
    kasagi.position.y = 4.3;
    kasagi.castShadow = true;
    g.add(kasagi);
    const plaque = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.6, 0.08)), black);
    plaque.position.set(0, 3.7, 0.12);
    g.add(plaque);
    g.position.z = z;
    g.scale.setScalar(s);
    scene.add(g);
  }
  torii(-0.6, 1);
  torii(-4.2, 0.92);
  torii(-7.8, 0.84);

  // shrine hall silhouette at the end of the path
  const hall = new THREE.Group();
  const hallBody = new THREE.Mesh(track(new THREE.BoxGeometry(5, 2.2, 3)), track(new THREE.MeshStandardMaterial({ color: "#4a1a14", roughness: 0.8 })));
  hallBody.position.y = 1.5;
  hall.add(hallBody);
  const roof = new THREE.Mesh(track(new THREE.ConeGeometry(4.4, 1.8, 4, 1)), black);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.3, 1, 0.85);
  roof.position.y = 3.4;
  hall.add(roof);
  const doorGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, 1.3)), track(new THREE.MeshBasicMaterial({ color: "#ffb36b" })));
  doorGlow.position.set(0, 1.2, 1.51);
  hall.add(doorGlow);
  hall.position.set(0, 0, -12.5);
  scene.add(hall);

  // ---------- stone lanterns (toro) with flickering candle light ----------
  const lanternStone = track(new THREE.MeshStandardMaterial({ color: "#9a948c", roughness: 0.92 }));
  const fireMat = track(new THREE.MeshBasicMaterial({ color: "#ffbf6e" }));
  const flames: { light: THREE.PointLight; mesh: THREE.Mesh; seed: number }[] = [];
  function toro(x: number, z: number) {
    const g = new THREE.Group();
    const parts: [THREE.BufferGeometry, number][] = [
      [new THREE.CylinderGeometry(0.42, 0.5, 0.18, 6), 0.09],
      [new THREE.CylinderGeometry(0.1, 0.13, 0.9, 12), 0.63],
      [new THREE.CylinderGeometry(0.34, 0.24, 0.14, 6), 1.13],
    ];
    for (const [geo, y] of parts) {
      const m = new THREE.Mesh(track(geo), lanternStone);
      m.position.y = y;
      m.castShadow = true;
      g.add(m);
    }
    const fire = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.3, 0.34)), fireMat);
    fire.position.y = 1.36;
    g.add(fire);
    const roofT = new THREE.Mesh(track(new THREE.ConeGeometry(0.55, 0.36, 6)), lanternStone);
    roofT.position.y = 1.69;
    roofT.castShadow = true;
    g.add(roofT);
    const hoju = new THREE.Mesh(track(new THREE.SphereGeometry(0.09, 12, 8)), lanternStone);
    hoju.position.y = 1.92;
    g.add(hoju);
    const light = new THREE.PointLight("#ff9a4a", P.lantern, 5.5, 1.8);
    light.position.y = 1.36;
    g.add(light);
    flames.push({ light, mesh: fire, seed: Math.random() * 100 });
    g.position.set(x, 0, z);
    scene.add(g);
  }
  toro(-2.4, 2.6); toro(2.4, 2.6); toro(-1.9, 0.6); toro(1.9, 0.6); toro(-1.9, -3); toro(1.9, -3);

  // ---------- chochin paper lanterns strung between the trees ----------
  const chochinMats = [
    track(new THREE.MeshStandardMaterial({ color: "#ff3b3b", emissive: "#ff3020", emissiveIntensity: variant === "yozakura" ? 1.4 : 0.3 })),
    track(new THREE.MeshStandardMaterial({ color: "#fff3e0", emissive: "#ffd9a0", emissiveIntensity: variant === "yozakura" ? 1.2 : 0.2 })),
  ];
  const chochinGeo = track(new THREE.SphereGeometry(0.16, 16, 12));
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const z = 4 - i * 1.25;
      const m = new THREE.Mesh(chochinGeo, chochinMats[i % 2]);
      m.scale.y = 1.35;
      m.position.set(side * 3.1, 3.05 - Math.sin((i / 8) * Math.PI) * 0.1, z);
      scene.add(m);
    }
  }

  // ---------- sakura trees ----------
  const barkMat = track(new THREE.MeshStandardMaterial({ color: "#3b2420", roughness: 0.95 }));
  const blossomMat = track(new THREE.MeshStandardMaterial({
    color: P.blossom, roughness: 0.8, emissive: P.blossomEmissive, emissiveIntensity: 0.6, flatShading: true,
  }));
  const blossomGeo = track(new THREE.IcosahedronGeometry(0.42, 1));
  const treeSpots: [number, number, number][] = [
    [-4.2, 3.2, 1.1], [4.3, 2.6, 1.15], [-5.2, -1, 1.25], [5.4, -0.4, 1.2], [-4.6, -5.5, 1.3],
    [4.8, -6, 1.3], [-7.5, 1.8, 1.4], [7.6, 1.2, 1.35], [-8, -4, 1.5], [8.2, -3.6, 1.5], [-3.6, -9.5, 1.2], [3.8, -9.8, 1.2],
  ];
  const blossomCount = treeSpots.length * 70;
  const blossoms = new THREE.InstancedMesh(blossomGeo, blossomMat, blossomCount);
  blossoms.castShadow = true;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const blossomColor = new THREE.Color();
  let bi = 0;
  for (const [tx, tz, s] of treeSpots) {
    const trunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12 * s, 0.26 * s, 3 * s, 8)), barkMat);
    trunk.position.set(tx, 1.5 * s, tz);
    trunk.rotation.z = (Math.random() - 0.5) * 0.25;
    trunk.castShadow = true;
    scene.add(trunk);
    for (let b = 0; b < 3; b++) {
      const br = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.6 * s, 6)), barkMat);
      const a = (b / 3) * Math.PI * 2 + Math.random();
      br.position.set(tx + Math.cos(a) * 0.5 * s, 2.9 * s, tz + Math.sin(a) * 0.5 * s);
      br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      scene.add(br);
    }
    for (let i = 0; i < 70; i++) {
      const u = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      v.set(tx + Math.cos(u) * r * 1.9 * s, (3.1 + (Math.random() - 0.3) * 1.3) * s, tz + Math.sin(u) * r * 1.6 * s);
      q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
      const k = (0.7 + Math.random() * 0.8) * s;
      sc.set(k, k * 0.85, k);
      m4.compose(v, q, sc);
      blossoms.setMatrixAt(bi, m4);
      blossomColor.set(P.blossom).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.12);
      blossoms.setColorAt(bi, blossomColor);
      bi++;
    }
  }
  scene.add(blossoms);

  // ---------- petals: falling (GPU animated) + carpet on the ground ----------
  const PETALS = 1800;
  const petalBase = new THREE.PlaneGeometry(0.09, 0.11);
  const petalGeo = track(new THREE.InstancedBufferGeometry());
  petalGeo.index = petalBase.index;
  petalGeo.setAttribute("position", petalBase.getAttribute("position"));
  petalGeo.setAttribute("uv", petalBase.getAttribute("uv"));
  const offsets = new Float32Array(PETALS * 3);
  const params = new Float32Array(PETALS * 4);
  const box = new THREE.Vector3(18, 7, 16);
  for (let i = 0; i < PETALS; i++) {
    offsets.set([(Math.random() - 0.5) * box.x, Math.random() * box.y, 6 - Math.random() * box.z], i * 3);
    params.set([0.25 + Math.random() * 0.35, Math.random() * 6.28, 0.6 + Math.random() * 1.8, 0.7 + Math.random() * 0.7], i * 4);
  }
  petalGeo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  petalGeo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
  petalGeo.instanceCount = PETALS;
  petalBase.dispose();
  const petalMat = track(new THREE.ShaderMaterial({
    vertexShader: petalVertex, fragmentShader: petalFragment, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uWind: { value: 0.35 }, uBox: { value: box },
      uColorA: { value: new THREE.Color(P.petalA) }, uColorB: { value: new THREE.Color(P.petalB) }, uGlow: { value: P.petalGlow },
    },
  }));
  const petals = new THREE.Mesh(petalGeo, petalMat);
  petals.frustumCulled = false;
  scene.add(petals);

  const carpetMat = track(new THREE.MeshStandardMaterial({ color: P.petalA, roughness: 0.9, side: THREE.DoubleSide }));
  const carpet = new THREE.InstancedMesh(track(new THREE.CircleGeometry(0.05, 5)), carpetMat, 2600);
  for (let i = 0; i < 2600; i++) {
    const nearTree = treeSpots[i % treeSpots.length];
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() < 0.6 ? Math.random() * 2.6 : Math.random() * 9;
    v.set(nearTree[0] * (r > 2.6 ? 0.4 : 1) + Math.cos(a) * r, 0.012, nearTree[1] + Math.sin(a) * r);
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.random() * 6));
    sc.setScalar(0.7 + Math.random());
    m4.compose(v, q, sc);
    carpet.setMatrixAt(i, m4);
  }
  scene.add(carpet);

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
        uAspect: { value: CARD_ASPECT }, uAccent: { value: new THREE.Color(accentPalette[i % 4]) },
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
    for (const f of flames) {
      const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 23 + f.seed * 2) * 0.3 + Math.sin(t * 4.3 + f.seed) * 0.2;
      f.light.intensity = P.lantern * (0.85 + n * 0.15);
      (f.mesh.material as THREE.MeshBasicMaterial).color.setHSL(0.08, 1, 0.68 + n * 0.05);
    }

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
      disposables.forEach((d) => d.dispose());
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      renderer.dispose();
      dom.remove();
    },
  };
}
