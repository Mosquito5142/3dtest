import type { CosplayPhoto } from "./photos";

export const CARD_W = 640;
export const CARD_H = 960;

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function petal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(r * 0.9, r * 0.4, r * 0.7, -r * 0.8, r * 0.18, -r);
  ctx.lineTo(0, -r * 0.72);
  ctx.lineTo(-r * 0.18, -r);
  ctx.bezierCurveTo(-r * 0.7, -r * 0.8, -r * 0.9, r * 0.4, 0, r);
  ctx.fill();
  ctx.restore();
}

function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * Math.PI * 2;
    petal(ctx, x + Math.sin(a) * r * 0.55, y - Math.cos(a) * r * 0.55, r * 0.55, a, color);
  }
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

/** Stylised "photo" used until the real cosplay photo is dropped into /public/cosplay. */
function paintPlaceholder(ctx: CanvasRenderingContext2D, photo: CosplayPhoto, index: number) {
  const w = CARD_W;
  const h = CARD_H;
  const r = rand(index + 3);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#1a1240");
  sky.addColorStop(0.55, photo.accent);
  sky.addColorStop(1, "#ffd6e4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // moon
  const moon = ctx.createRadialGradient(w * 0.7, h * 0.2, 10, w * 0.7, h * 0.2, 150);
  moon.addColorStop(0, "rgba(255,248,230,1)");
  moon.addColorStop(0.45, "rgba(255,240,220,0.9)");
  moon.addColorStop(0.5, "rgba(255,220,230,0.25)");
  moon.addColorStop(1, "rgba(255,200,220,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, w, h);

  // distant torii silhouette
  ctx.fillStyle = "rgba(40,10,30,0.55)";
  ctx.fillRect(w * 0.08, h * 0.42, 14, h * 0.3);
  ctx.fillRect(w * 0.3, h * 0.42, 14, h * 0.3);
  ctx.fillRect(w * 0.02, h * 0.4, w * 0.4, 16);
  ctx.fillRect(w * 0.05, h * 0.46, w * 0.34, 9);

  // figure: hair, head, kimono with obi and long sleeves
  const cx = w * 0.52;
  ctx.fillStyle = "rgba(25,10,30,0.92)";
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.37, 92, 112, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 92, h * 0.37, 184, 230);
  ctx.fillStyle = "#f6dccd";
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.38, 62, 76, 0, 0, Math.PI * 2);
  ctx.fill();
  // fringe
  ctx.fillStyle = "rgba(25,10,30,0.95)";
  ctx.beginPath();
  ctx.ellipse(cx, h * 0.33, 70, 44, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // kanzashi flower
  blossom(ctx, cx + 64, h * 0.3, 34, 0.3, "#ffc1d6");
  // kimono
  const kimono = ctx.createLinearGradient(0, h * 0.5, 0, h);
  kimono.addColorStop(0, "#ffffff");
  kimono.addColorStop(1, "#f3d5df");
  ctx.fillStyle = kimono;
  ctx.beginPath();
  ctx.moveTo(cx - 70, h * 0.5);
  ctx.lineTo(cx + 70, h * 0.5);
  ctx.lineTo(cx + 230, h);
  ctx.lineTo(cx - 230, h);
  ctx.closePath();
  ctx.fill();
  // hakama / skirt
  ctx.fillStyle = photo.accent;
  ctx.beginPath();
  ctx.moveTo(cx - 120, h * 0.74);
  ctx.lineTo(cx + 120, h * 0.74);
  ctx.lineTo(cx + 210, h);
  ctx.lineTo(cx - 210, h);
  ctx.closePath();
  ctx.fill();
  // collar
  ctx.strokeStyle = photo.accent;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(cx - 52, h * 0.5);
  ctx.lineTo(cx, h * 0.62);
  ctx.lineTo(cx + 52, h * 0.5);
  ctx.stroke();
  // obi
  ctx.fillStyle = "#2a1530";
  ctx.fillRect(cx - 118, h * 0.68, 236, 44);
  ctx.fillStyle = "#e9c46a";
  ctx.fillRect(cx - 118, h * 0.69, 236, 6);

  // branches + blossoms
  ctx.strokeStyle = "rgba(50,20,30,0.85)";
  ctx.lineCap = "round";
  for (let b = 0; b < 3; b++) {
    ctx.lineWidth = 12 - b * 3;
    ctx.beginPath();
    const y0 = 40 + b * 70;
    ctx.moveTo(-10, y0);
    ctx.bezierCurveTo(w * 0.2, y0 + 30, w * 0.3, y0 - 30, w * (0.45 + b * 0.08), y0 + 40);
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    blossom(ctx, r() * w * 0.6, 20 + r() * 260, 14 + r() * 18, r() * 6, i % 3 ? "#ffc7da" : "#ffe3ec");
  }
  for (let i = 0; i < 40; i++) {
    petal(ctx, r() * w, r() * h, 6 + r() * 8, r() * 6, `rgba(255,${190 + r() * 40},${210 + r() * 30},0.85)`);
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 22px 'Noto Sans Thai', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ใส่รูปคอสของคุณในโฟลเดอร์ src/cosplay/", w / 2, h * 0.115);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const s = Math.max(CARD_W / img.naturalWidth, CARD_H / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (CARD_W - dw) / 2, (CARD_H - dh) / 2, dw, dh);
}

/** Composes the printed face of the card: photo + name ribbon. Returns the canvas. */
export function composeCard(photo: CosplayPhoto, index: number, img: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  if (img) drawCover(ctx, img);
  else paintPlaceholder(ctx, photo, index);

  // bottom ribbon
  const g = ctx.createLinearGradient(0, CARD_H * 0.72, 0, CARD_H);
  g.addColorStop(0, "rgba(20,6,20,0)");
  g.addColorStop(0.45, "rgba(20,6,20,0.72)");
  g.addColorStop(1, "rgba(20,6,20,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, CARD_H * 0.72, CARD_W, CARD_H * 0.28);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff4f7";
  ctx.font = "700 62px 'Shippori Mincho', serif";
  ctx.fillText(photo.character, 56, CARD_H - 126);
  ctx.fillStyle = photo.accent;
  ctx.fillRect(56, CARD_H - 104, 64, 4);
  ctx.fillStyle = "rgba(255,235,242,0.92)";
  ctx.font = "600 26px 'Noto Sans Thai', sans-serif";
  ctx.fillText(`${photo.subtitle} · ${photo.series}`, 56, CARD_H - 66);
  ctx.fillStyle = "rgba(255,220,232,0.7)";
  ctx.font = "400 22px 'Noto Sans Thai', sans-serif";
  ctx.fillText(photo.cosplayer, 56, CARD_H - 34);

  // number seal (hanko)
  ctx.fillStyle = "#c8243b";
  ctx.fillRect(CARD_W - 120, CARD_H - 150, 64, 64);
  ctx.fillStyle = "#fff";
  ctx.font = "700 30px 'Shippori Mincho', serif";
  ctx.textAlign = "center";
  ctx.fillText(String(index + 1).padStart(2, "0"), CARD_W - 88, CARD_H - 106);

  // top-right blossom mark
  blossom(ctx, CARD_W - 80, 88, 30, 0.2, "rgba(255,214,228,0.95)");
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
