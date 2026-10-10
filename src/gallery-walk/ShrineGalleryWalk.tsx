import { useEffect, useRef, useState } from "react";
import { createGalleryWalk, type GalleryWalk } from "./createGalleryWalk";
import { loadImage } from "../shaders/sakura-shrine-holo-card/cardArt";
import { cosplayPhotos, type CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import type { ShrineVariant } from "../shaders/sakura-shrine-holo-card/world";

type Props = { variant?: ShrineVariant; photos?: CosplayPhoto[] };

export function ShrineGalleryWalk({ variant = "yozakura", photos = cosplayPhotos }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const walkRef = useRef<GalleryWalk | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [inspecting, setInspecting] = useState(-1);
  const [viewed, setViewed] = useState<number[]>([]);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    let alive = true;
    let walk: GalleryWalk | null = null;
    setReady(false);
    document.fonts.ready
      .then(() => Promise.all(photos.map((p) => (p.src ? loadImage(p.src) : Promise.resolve(null)))))
      .then((images) => {
        if (!alive) return;
        walk = createGalleryWalk(mountRef.current!, mapRef.current!, photos, images, variant, {
          onFocus: setFocused,
          onInspect: setInspecting,
          onViewed: setViewed,
          onLockChange: setLocked,
        });
        walkRef.current = walk;
        setIsTouch(walk.isTouch);
        setReady(true);
      });
    return () => {
      alive = false;
      walk?.dispose();
      walkRef.current = null;
    };
  }, [photos, variant]);

  const start = () => {
    walkRef.current?.start();
    setStarted(true);
  };

  const paused = started && !locked && inspecting < 0 && !isTouch;
  const p = inspecting >= 0 ? photos[inspecting] : focused >= 0 ? photos[focused] : null;

  return (
    <div className={`walk walk--${variant}${inspecting >= 0 ? " is-inspecting" : ""}`}>
      <div ref={mountRef} className="walk__canvas" />

      <header className="walk__top">
        <div className="walk__mon" aria-hidden>✿</div>
        <div>
          <h1>桜神社 写真展</h1>
          <p>Sakura Shrine Cosplay Exhibition</p>
        </div>
        <div className="walk__count">
          ชมแล้ว <b>{viewed.length}</b> / {photos.length}
          <span className="walk__bar"><i style={{ width: `${(viewed.length / Math.max(photos.length, 1)) * 100}%` }} /></span>
        </div>
      </header>

      <canvas ref={mapRef} className="walk__map" width={150} height={150} aria-label="แผนที่" />

      {started && inspecting < 0 && <div className="walk__crosshair" aria-hidden />}

      {started && inspecting < 0 && focused >= 0 && p && (
        <button className="walk__prompt" onClick={() => walkRef.current?.inspect(focused)}>
          <kbd>{isTouch ? "แตะ" : "E"}</kbd> ดูใกล้ · <span>{p.character}</span>
        </button>
      )}

      {inspecting >= 0 && p && (
        <aside className="walk__info" key={inspecting}>
          <span className="walk__no">No. {String(inspecting + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
          <h2>{p.character}</h2>
          <p className="walk__sub">{p.subtitle}</p>
          <dl>
            <dt>作品</dt><dd>{p.series}</dd>
            <dt>コスプレイヤー</dt><dd>{p.cosplayer}</dd>
            {p.photographer && (<><dt>撮影</dt><dd>{p.photographer}</dd></>)}
          </dl>
          <div className="walk__nav">
            <button onClick={() => walkRef.current?.step(-1)} aria-label="รูปก่อนหน้า">‹</button>
            <button onClick={() => walkRef.current?.exitInspect(true)}>กลับไปเดิน <kbd>E</kbd></button>
            <button onClick={() => walkRef.current?.step(1)} aria-label="รูปถัดไป">›</button>
          </div>
        </aside>
      )}

      {!started && (
        <div className="walk__overlay">
          <div className="walk__card">
            <div className="walk__mon walk__mon--big" aria-hidden>✿</div>
            <h1>桜神社 写真展</h1>
            <p className="walk__lead">เดินชมนิทรรศการภาพคอสเพลย์ ท่ามกลางซากุระและศาลเจ้าญี่ปุ่น</p>
            <button className="walk__start" onClick={start} disabled={!ready}>
              {ready ? "เริ่มเดินชม ⛩" : "กำลังเตรียมงาน…"}
            </button>
            {isTouch ? (
              <ul className="walk__help">
                <li><b>ลากด้านซ้าย</b> เดิน</li>
                <li><b>ลากด้านขวา</b> หันมอง</li>
                <li><b>แตะ</b> ดูภาพใกล้</li>
              </ul>
            ) : (
              <ul className="walk__help">
                <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> เดิน</li>
                <li><kbd>เมาส์</kbd> หันมอง</li>
                <li><kbd>Shift</kbd> วิ่ง</li>
                <li><kbd>E</kbd> / คลิก ดูภาพใกล้</li>
                <li><kbd>←</kbd><kbd>→</kbd> ภาพถัดไป</li>
                <li><kbd>1</kbd>–<kbd>9</kbd> วาร์ปไปภาพ</li>
                <li><kbd>Esc</kbd> พัก</li>
              </ul>
            )}
          </div>
        </div>
      )}

      {paused && (
        <button className="walk__overlay walk__overlay--pause" onClick={start}>
          <span className="walk__card walk__card--small">
            <b>พักชม</b>
            คลิกเพื่อเดินต่อ
          </span>
        </button>
      )}
    </div>
  );
}
