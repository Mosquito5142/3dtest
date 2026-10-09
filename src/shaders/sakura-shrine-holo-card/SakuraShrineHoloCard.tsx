import { useCallback, useEffect, useRef, useState } from "react";
import { createShrineScene, type ShrineScene, type ShrineVariant } from "./createScene";
import { composeCard, loadImage } from "./cardArt";
import { cosplayPhotos, type CosplayPhoto } from "./photos";

type Props = {
  variant?: ShrineVariant;
  photos?: CosplayPhoto[];
  title?: string;
};

export function SakuraShrineHoloCard({ variant = "yozakura", photos = cosplayPhotos, title = "桜神社 コスプレ" }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ShrineScene | null>(null);
  const [selected, setSelected] = useState(0);
  const [gallery, setGallery] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);

  const select = useCallback((i: number) => {
    setSelected(i);
    setGallery(false);
  }, []);

  useEffect(() => {
    const mount = mountRef.current!;
    const s = createShrineScene(mount, photos.length, variant, select);
    sceneRef.current = s;
    let alive = true;
    document.fonts.ready.then(() =>
      Promise.all(
        photos.map(async (p, i) => {
          const img = p.src ? await loadImage(p.src) : null;
          if (!alive) return "";
          const canvas = composeCard(p, i, img);
          s.setTexture(i, canvas);
          return canvas.toDataURL("image/jpeg", 0.7);
        }),
      ).then((urls) => alive && setThumbs(urls)),
    );
    return () => {
      alive = false;
      s.dispose();
      sceneRef.current = null;
    };
  }, [photos, variant, select]);

  useEffect(() => sceneRef.current?.setSelected(selected), [selected]);
  useEffect(() => sceneRef.current?.setGallery(gallery), [gallery]);

  const step = useCallback((d: number) => select((selected + d + photos.length) % photos.length), [selected, photos.length, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key.toLowerCase() === "g") setGallery((g) => !g);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const p = photos[selected];
  return (
    <div className={`sakura-shrine sakura-shrine--${variant}`}>
      <div ref={mountRef} className="sakura-shrine__canvas" />

      <header className="sakura-shrine__header">
        <div className="sakura-shrine__mon" aria-hidden>✿</div>
        <div>
          <h1>{title}</h1>
          <p>Sakura Shrine Cosplay Gallery · แกลเลอรีคอสเพลย์ใต้ต้นซากุระ</p>
        </div>
      </header>

      {!gallery && (
        <aside className="sakura-shrine__info" key={selected}>
          <span className="sakura-shrine__no">No. {String(selected + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
          <h2>{p.character}</h2>
          <p className="sakura-shrine__sub">{p.subtitle}</p>
          <dl>
            <dt>作品</dt><dd>{p.series}</dd>
            <dt>コスプレイヤー</dt><dd>{p.cosplayer}</dd>
            {p.photographer && (<><dt>撮影</dt><dd>{p.photographer}</dd></>)}
          </dl>
        </aside>
      )}

      <nav className="sakura-shrine__controls">
        <button onClick={() => step(-1)} aria-label="Previous photo">‹</button>
        <button className="sakura-shrine__gallery-btn" onClick={() => setGallery((g) => !g)} aria-pressed={gallery}>
          {gallery ? "一枚表示 · ดูทีละรูป" : "ギャラリー · ดูทั้งหมด"}
        </button>
        <button onClick={() => step(1)} aria-label="Next photo">›</button>
      </nav>

      <div className="sakura-shrine__strip" role="list">
        {photos.map((ph, i) => (
          <button
            key={i}
            role="listitem"
            className={i === selected ? "is-active" : ""}
            onClick={() => select(i)}
            aria-label={ph.character}
            style={{ backgroundImage: thumbs[i] ? `url(${thumbs[i]})` : undefined }}
          />
        ))}
      </div>

      <p className="sakura-shrine__hint">เลื่อนเมาส์เพื่อเอียงการ์ด · คลิกการ์ดเพื่อหมุน/เลือก · ← → เปลี่ยนรูป · G แกลเลอรี</p>
    </div>
  );
}
