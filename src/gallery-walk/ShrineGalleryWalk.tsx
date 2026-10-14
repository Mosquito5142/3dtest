import { useEffect, useMemo, useRef, useState } from "react";
import { createGalleryWalk, type GalleryWalk, type ExhibitMeta } from "./createGalleryWalk";
import { loadImage } from "../shaders/sakura-shrine-holo-card/cardArt";
import { cosplayPhotos, type CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import type { ShrineVariant } from "../shaders/sakura-shrine-holo-card/world";
import { ZONES } from "./zones";
import { photosByZone } from "./zonePhotos";

type Props = { variant?: ShrineVariant; photos?: CosplayPhoto[] };

export function ShrineGalleryWalk({ variant = "yozakura", photos = cosplayPhotos }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const walkRef = useRef<GalleryWalk | null>(null);
  const groups = useMemo(() => photosByZone(photos), [photos]);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [inspecting, setInspecting] = useState(-1);
  const [viewed, setViewed] = useState<number[]>([]);
  const [zone, setZone] = useState(-1);
  const [meta, setMeta] = useState<ExhibitMeta[]>([]);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    let alive = true;
    let walk: GalleryWalk | null = null;
    setReady(false);
    document.fonts.ready
      .then(() => Promise.all(groups.map((g) => Promise.all(g.map((p) => (p.src ? loadImage(p.src) : Promise.resolve(null)))))))
      .then((images) => {
        if (!alive) return;
        walk = createGalleryWalk(mountRef.current!, mapRef.current!, groups, images, variant, {
          onFocus: setFocused,
          onInspect: setInspecting,
          onViewed: setViewed,
          onLockChange: setLocked,
          onZone: setZone,
        });
        walkRef.current = walk;
        if (import.meta.env.DEV) (window as unknown as { __walk?: GalleryWalk }).__walk = walk; // handy for testing
        setMeta(walk.exhibits);
        setIsTouch(walk.isTouch);
        setReady(true);
      });
    return () => {
      alive = false;
      walk?.dispose();
      walkRef.current = null;
    };
  }, [groups, variant]);

  const start = () => {
    walkRef.current?.start();
    setStarted(true);
  };

  const total = photos.length;
  const viewedPhotos = viewed.filter((id) => meta[id]?.photo);
  const zoneTotal = zone >= 0 ? groups[zone].length : 0;
  const zoneViewed = viewedPhotos.filter((id) => meta[id].zone === zone).length;
  const paused = started && !locked && inspecting < 0 && !isTouch;
  const shown = inspecting >= 0 ? meta[inspecting] : focused >= 0 ? meta[focused] : null;
  const p = shown?.photo ?? null;
  const z = zone >= 0 ? ZONES[zone] : null;

  return (
    <div className={`walk walk--${variant}${inspecting >= 0 ? " is-inspecting" : ""}`} style={{ ["--zone" as string]: z?.color ?? "#ff7aa2" }}>
      <div ref={mountRef} className="walk__canvas" />

      <header className="walk__top">
        <div className="walk__mon" aria-hidden>✿</div>
        <div>
          <h1>{z ? z.nameJa : "写真の広場"}</h1>
          <p>{z ? `${z.nameTh} · ${z.nameEn}` : "ลานกลาง · เลือกทางที่อยากไปชม"}</p>
        </div>
        <div className="walk__count">
          {z && (<>โซนนี้ <b>{zoneViewed}</b>/{zoneTotal}<span className="walk__sep" /></>)}
          ชมแล้ว <b>{viewedPhotos.length}</b>/{total}
          <span className="walk__bar"><i style={{ width: `${(viewedPhotos.length / Math.max(total, 1)) * 100}%` }} /></span>
        </div>
      </header>

      {started && z && inspecting < 0 && (
        <div className="walk__banner" key={zone}>
          <span>{z.nameJa}</span>
          <small>{z.nameTh}</small>
        </div>
      )}

      <canvas ref={mapRef} className="walk__map" width={150} height={150} aria-label="แผนที่" />

      {started && inspecting < 0 && <div className="walk__crosshair" aria-hidden />}

      {started && inspecting < 0 && focused >= 0 && p && (
        <button className="walk__prompt" onClick={() => walkRef.current?.inspect(focused)}>
          <kbd>{isTouch ? "แตะ" : "E"}</kbd> ดูใกล้ · <span>{p.character}</span>
        </button>
      )}

      {inspecting >= 0 && p && shown && (
        <aside className="walk__info" key={inspecting}>
          <span className="walk__no">{ZONES[shown.zone].nameJa} · No. {String(shown.slot + 1).padStart(2, "0")}</span>
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
            <h1>コスプレ写真展</h1>
            <p className="walk__lead">เริ่มที่ลานกลาง แล้วเลือกทางเดินไปชมภาพคอสเพลย์ในแต่ละโลก</p>
            <ul className="walk__zones">
              {ZONES.map((zz, k) => (
                <li key={zz.id} style={{ ["--c" as string]: zz.color }}>
                  <kbd>{k + 1}</kbd>
                  <span className="walk__zname"><b>{zz.nameJa}</b>{zz.nameTh}</span>
                  <span className="walk__zcount">{groups[k].length ? `${groups[k].length} รูป` : "รอรูป"}</span>
                </li>
              ))}
            </ul>
            <button className="walk__start" onClick={start} disabled={!ready}>
              {ready ? "เริ่มเดินชม ⛩" : "กำลังสร้างโลก…"}
            </button>
            {isTouch ? (
              <ul className="walk__help">
                <li><b>ลากด้านซ้าย</b> เดิน</li>
                <li><b>ลากด้านขวา</b> หันมอง</li>
                <li><b>แตะ</b> ดูภาพใกล้</li>
              </ul>
            ) : (
              <ul className="walk__help">
                <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> เดิน · <kbd>Shift</kbd> วิ่ง</li>
                <li><kbd>เมาส์</kbd> หันมอง</li>
                <li><kbd>E</kbd> / คลิก ดูภาพใกล้</li>
                <li><kbd>←</kbd><kbd>→</kbd> ภาพถัดไปในโซน</li>
                <li><kbd>1</kbd>–<kbd>6</kbd> วาร์ปไปโซน · <kbd>H</kbd> กลับลานกลาง</li>
                <li><kbd>Esc</kbd> พัก</li>
              </ul>
            )}
          </div>
        </div>
      )}

      {isTouch && started && inspecting < 0 && (
        <button className="walk__home" onClick={() => walkRef.current?.warp(-1)}>⌂ ลานกลาง</button>
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
