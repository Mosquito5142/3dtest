// Exhibition layout: a stone path through senbon torii with framed cosplay photos on
// wooden ema-style display boards, alternating left and right.
import * as THREE from "three";
import { cardVertex, cardFragment } from "../shaders/sakura-shrine-holo-card/shaders";
import { composeCard } from "../shaders/sakura-shrine-holo-card/cardArt";
import type { CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import type { ShrineMaterials, Track } from "../shaders/sakura-shrine-holo-card/world";

export const SPACING = 4; // metres between exhibits along the path
export const PHOTO_X = 3.1; // distance of each display board from the path centre
export const WALK_HALF_WIDTH = 2.45;
export const EYE = 1.62;
export const FIRST_Z = 1;

export const exhibitZ = (i: number) => FIRST_Z - i * SPACING;
export const exhibitSide = (i: number) => (i % 2 === 0 ? -1 : 1);

export type Exhibit = {
  index: number;
  side: number;
  /** centre of the photo */
  center: THREE.Vector3;
  /** unit vector the photo faces (toward the path) */
  normal: THREE.Vector3;
  width: number;
  height: number;
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
  focus: number;
};

/** Photo texture with the image's real proportions (no cropping). Falls back to the 2:3 card art. */
function photoCanvas(photo: CosplayPhoto, index: number, img: HTMLImageElement | null) {
  if (!img) return composeCard(photo, index, null);
  const max = 1280;
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Small wooden placard under each photo: number seal, character, series and cosplayer. */
function placardCanvas(photo: CosplayPhoto, index: number) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 224;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, "#f4e6cf");
  grad.addColorStop(1, "#e2cfae");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#7a4a2a";
  g.lineWidth = 10;
  g.strokeRect(5, 5, c.width - 10, c.height - 10);
  g.fillStyle = "#c8243b";
  g.fillRect(36, 44, 112, 112);
  g.fillStyle = "#fff";
  g.font = "700 58px 'Shippori Mincho', serif";
  g.textAlign = "center";
  g.fillText(String(index + 1).padStart(2, "0"), 92, 122);
  g.textAlign = "left";
  g.fillStyle = "#2a1410";
  g.font = "700 66px 'Shippori Mincho', serif";
  g.fillText(photo.character, 178, 100);
  g.fillStyle = "#5a3424";
  g.font = "600 32px 'Noto Sans Thai', sans-serif";
  g.fillText(`${photo.subtitle} · ${photo.series}`, 180, 148);
  g.fillStyle = "#8a5a40";
  g.font = "400 28px 'Noto Sans Thai', sans-serif";
  g.fillText(photo.cosplayer, 180, 188);
  return c;
}

function canvasTexture(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer, track: Track) {
  const t = track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

export function buildExhibit(
  scene: THREE.Scene, M: ShrineMaterials, track: Track, renderer: THREE.WebGLRenderer,
  photo: CosplayPhoto, index: number, img: HTMLImageElement | null, accent: THREE.Color,
): Exhibit {
  const side = exhibitSide(index);
  const z = exhibitZ(index);
  const canvas = photoCanvas(photo, index, img);
  const aspect = canvas.width / canvas.height;
  // portrait photos are 1.75 m tall; landscape ones are capped at 2.5 m wide
  let height = 1.75;
  let width = height * aspect;
  if (width > 2.5) { width = 2.5; height = width / aspect; }
  const cy = 1.85;

  const group = new THREE.Group();
  group.position.set(side * PHOTO_X, 0, z);
  group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; // face the path

  const material = track(new THREE.ShaderMaterial({
    vertexShader: cardVertex, fragmentShader: cardFragment, toneMapped: false,
    uniforms: {
      uMap: { value: canvasTexture(canvas, renderer, track) }, uTime: { value: 0 }, uTilt: { value: new THREE.Vector2() },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) }, uActive: { value: 0 }, uHover: { value: 0 },
      uFoil: { value: 0.4 }, uAspect: { value: aspect }, uAccent: { value: accent },
    },
  }));
  // the card shader draws its frame inside the uv square, so add a little margin around the photo
  const pad = 0.07;
  const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(width + pad, height + pad)), material);
  mesh.position.set(0, cy, 0.06);
  material.uniforms.uAspect.value = (width + pad) / (height + pad);
  group.add(mesh);

  // wooden backing board, posts and a small gabled roof (ema stand)
  const bw = width + 0.45;
  const bh = height + 0.55;
  const board = new THREE.Mesh(track(new THREE.BoxGeometry(bw, bh, 0.08)), M.wood);
  board.position.set(0, cy, 0);
  board.castShadow = true;
  group.add(board);
  const postGeo = track(new THREE.BoxGeometry(0.12, cy + bh / 2 + 0.25, 0.12));
  for (const px of [-bw / 2 - 0.02, bw / 2 + 0.02]) {
    const post = new THREE.Mesh(postGeo, M.wood);
    post.position.set(px, (cy + bh / 2 + 0.25) / 2, 0);
    post.castShadow = true;
    group.add(post);
  }
  const roofGeo = track(new THREE.BoxGeometry(bw + 0.5, 0.06, 0.62));
  for (const s of [-1, 1]) {
    const roof = new THREE.Mesh(roofGeo, M.black);
    roof.position.set(0, cy + bh / 2 + 0.3, s * 0.15);
    roof.rotation.x = s * 0.5;
    roof.castShadow = true;
    group.add(roof);
  }
  const ridge = new THREE.Mesh(track(new THREE.BoxGeometry(bw + 0.55, 0.08, 0.08)), M.vermilion);
  ridge.position.set(0, cy + bh / 2 + 0.42, 0);
  group.add(ridge);
  // red-white shimenawa-style cord across the top
  const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, bw, 8)), M.chochin[1]);
  cord.rotation.z = Math.PI / 2;
  cord.position.set(0, cy + bh / 2 - 0.02, 0.08);
  group.add(cord);

  const placard = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.1, 0.32)),
    track(new THREE.MeshBasicMaterial({ map: canvasTexture(placardCanvas(photo, index), renderer, track), toneMapped: false })),
  );
  placard.position.set(0, cy - height / 2 - 0.42, 0.05);
  group.add(placard);

  scene.add(group);
  group.updateMatrixWorld(true);
  const center = mesh.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(-side, 0, 0);
  return { index, side, center, normal, width, height, material, mesh, focus: 0 };
}

/** Signboard at the entrance. */
export function buildSign(scene: THREE.Scene, M: ShrineMaterials, track: Track, renderer: THREE.WebGLRenderer, count: number, x: number, z: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f3e3c6";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#6a3a22";
  g.lineWidth = 16;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = "#2a1410";
  g.textAlign = "center";
  g.font = "700 92px 'Shippori Mincho', serif";
  ["桜", "神", "社"].forEach((ch, i) => g.fillText(ch, 150, 150 + i * 110));
  ["写", "真", "展"].forEach((ch, i) => g.fillText(ch, 360, 150 + i * 110));
  g.fillStyle = "#c8243b";
  g.fillRect(96, 500, 320, 6);
  g.fillStyle = "#4a2a1a";
  g.font = "600 34px 'Noto Sans Thai', sans-serif";
  g.fillText("นิทรรศการภาพคอสเพลย์", 256, 572);
  g.font = "400 28px 'Noto Sans Thai', sans-serif";
  g.fillText(`Sakura Shrine · ${count} photos`, 256, 624);
  g.fillText("เดินตามทางเพื่อชมภาพ →", 256, 676);

  const group = new THREE.Group();
  const face = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.0, 1.5)),
    track(new THREE.MeshStandardMaterial({ map: canvasTexture(c, renderer, track), roughness: 0.8, emissive: "#ffffff", emissiveIntensity: 0.12 })),
  );
  face.position.set(0, 1.55, 0.05);
  group.add(face);
  const board = new THREE.Mesh(track(new THREE.BoxGeometry(1.16, 1.66, 0.08)), M.wood);
  board.position.set(0, 1.55, 0);
  group.add(board);
  const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.8, 0.12)), M.wood);
  leg.position.set(0, 0.4, 0);
  group.add(leg);
  group.position.set(x, 0, z);
  group.rotation.y = x < 0 ? 0.5 : -0.5;
  scene.add(group);
}
