// Shared layout numbers for the plaza + zone wings, and the photo exhibit builder.
import * as THREE from "three";
import { cardVertex, cardFragment } from "../shaders/sakura-shrine-holo-card/shaders";
import { composeCard } from "../shaders/sakura-shrine-holo-card/cardArt";
import type { CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import type { ZoneCtx, ZoneTheme, PlacardStyle } from "./zones/types";
import { canvasTex, makeCanvas } from "./zones/kit";

export const HUB_R = 12; // plaza radius
export const SPACING = 4; // metres between photo slots
export const FIRST = 4; // first slot distance from the zone gate
export const END_SPACE = 10; // room for the landmark after the last slot
export const MIN_SLOTS = 12; // empty frames waiting for future photos
export const PHOTO_X = 3.1;
export const WALK_HALF = 2.4;
export const EYE = 1.62;

export const slotZ = (i: number) => -(FIRST + i * SPACING);
export const slotSide = (i: number) => (i % 2 === 0 ? -1 : 1);
export const zoneLength = (slots: number) => FIRST + (slots - 1) * SPACING + END_SPACE;

export type Exhibit = {
  id: number;
  zone: number;
  slot: number;
  photo: CosplayPhoto | null;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
  height: number;
  material: THREE.ShaderMaterial | null;
  mesh: THREE.Mesh;
  focus: number;
};

/** Photo texture with the image's real proportions (no cropping). Falls back to the 2:3 card art. */
function photoCanvas(photo: CosplayPhoto, index: number, img: HTMLImageElement | null) {
  if (!img) return composeCard(photo, index, null);
  const max = 1280;
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  return makeCanvas(Math.round(img.naturalWidth * s), Math.round(img.naturalHeight * s), (g) => g.drawImage(img, 0, 0, g.canvas.width, g.canvas.height));
}

function placardCanvas(st: PlacardStyle, num: number, title: string, sub: string, foot: string) {
  return makeCanvas(768, 224, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 224);
    grad.addColorStop(0, st.bg[0]);
    grad.addColorStop(1, st.bg[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, 768, 224);
    g.strokeStyle = st.border;
    g.lineWidth = 10;
    g.strokeRect(5, 5, 758, 214);
    g.fillStyle = st.seal;
    g.fillRect(36, 44, 112, 112);
    g.fillStyle = "#fff";
    g.font = "700 58px 'Shippori Mincho', serif";
    g.textAlign = "center";
    g.fillText(String(num).padStart(2, "0"), 92, 122);
    g.textAlign = "left";
    g.fillStyle = st.ink;
    g.font = "700 62px 'Shippori Mincho', serif";
    g.fillText(title, 178, 100, 560);
    g.fillStyle = st.sub;
    g.font = "600 30px 'Noto Sans Thai', sans-serif";
    g.fillText(sub, 180, 148, 560);
    g.font = "400 26px 'Noto Sans Thai', sans-serif";
    g.fillText(foot, 180, 188, 560);
  });
}

/** "Empty frame" card shown in slots that are waiting for a photo. */
function emptyCanvas(theme: ZoneTheme) {
  return makeCanvas(640, 960, (g) => {
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(0, 0, 640, 960);
    g.strokeStyle = theme.color;
    g.globalAlpha = 0.7;
    g.setLineDash([26, 18]);
    g.lineWidth = 8;
    g.strokeRect(40, 40, 560, 880);
    g.setLineDash([]);
    g.globalAlpha = 1;
    g.fillStyle = theme.color;
    g.font = "700 150px 'Shippori Mincho', serif";
    g.textAlign = "center";
    g.fillText("＋", 320, 470);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "600 40px 'Noto Sans Thai', sans-serif";
    g.fillText("ช่องว่าง รอใส่รูป", 320, 590);
    g.font = "400 28px 'Noto Sans Thai', sans-serif";
    g.fillText(`src/cosplay/${theme.folder}/`, 320, 650);
  });
}

/** Builds the stand (from the theme), the photo and its placard for one slot. Root matrices must be final. */
export function buildExhibit(
  ctx: ZoneCtx, theme: ZoneTheme, zone: number, slot: number, id: number,
  photo: CosplayPhoto | null, img: HTMLImageElement | null,
): Exhibit {
  const side = slotSide(slot);
  const canvas = photo ? photoCanvas(photo, slot, img) : emptyCanvas(theme);
  const aspect = canvas.width / canvas.height;
  let height = 1.75;
  let width = height * aspect;
  if (width > 2.5) { width = 2.5; height = width / aspect; }

  const holder = new THREE.Group();
  holder.position.set(side * PHOTO_X, 0, slotZ(slot));
  holder.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; // face the path
  const board = theme.buildBoard(ctx, width, height);
  holder.add(board.group);

  const pad = 0.07;
  const geo = ctx.track(new THREE.PlaneGeometry(width + pad, height + pad));
  let material: THREE.ShaderMaterial | null = null;
  let mesh: THREE.Mesh;
  if (photo) {
    material = ctx.track(new THREE.ShaderMaterial({
      vertexShader: cardVertex, fragmentShader: cardFragment, toneMapped: false,
      uniforms: {
        uMap: { value: canvasTex(ctx, canvas) }, uTime: { value: 0 }, uTilt: { value: new THREE.Vector2() },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) }, uActive: { value: 0 }, uHover: { value: 0 },
        uFoil: { value: 0.4 }, uAspect: { value: (width + pad) / (height + pad) }, uAccent: { value: new THREE.Color(theme.color) },
      },
    }));
    mesh = new THREE.Mesh(geo, material);
  } else {
    mesh = new THREE.Mesh(geo, ctx.track(new THREE.MeshBasicMaterial({ map: canvasTex(ctx, canvas), transparent: true, opacity: 0.9, toneMapped: false })));
  }
  mesh.position.set(0, board.centerY, board.frontZ + 0.02);
  mesh.userData.dynamic = true; // keeps its own transform (used for focus/inspect), never baked
  holder.add(mesh);

  const st = theme.placard;
  const plc = photo
    ? placardCanvas(st, slot + 1, photo.character, `${photo.subtitle} · ${photo.series}`, photo.cosplayer)
    : placardCanvas(st, slot + 1, "— ว่าง —", `${theme.nameJa} · ${theme.nameTh}`, "พื้นที่สำหรับรูปในอนาคต");
  const placard = new THREE.Mesh(
    ctx.track(new THREE.PlaneGeometry(1.1, 0.32)),
    ctx.track(new THREE.MeshBasicMaterial({ map: canvasTex(ctx, plc), toneMapped: false })),
  );
  placard.position.set(0, board.centerY - height / 2 - 0.42, board.frontZ + 0.04);
  holder.add(placard);

  ctx.root.add(holder);
  holder.updateMatrixWorld(true);
  const center = mesh.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld).setY(0).normalize();
  return { id, zone, slot, photo, center, normal, width, height, material, mesh, focus: 0 };
}
