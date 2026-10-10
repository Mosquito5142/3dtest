import { SakuraShrineHoloCard } from "./shaders/sakura-shrine-holo-card/SakuraShrineHoloCard";
import { ShrineGalleryWalk } from "./gallery-walk/ShrineGalleryWalk";
import "./shaders/sakura-shrine-holo-card/sakura-shrine.css";
import "./gallery-walk/shrine-gallery-walk.css";

export function App() {
  const params = new URLSearchParams(location.search);
  // variant: "yozakura" (night sakura, candlelit lanterns) | "hanami" (daytime cherry-blossom viewing)
  const variant = params.get("variant") === "hanami" ? "hanami" : "yozakura";
  return (
    <div className="shader-frame">
      {params.get("view") === "card" ? <SakuraShrineHoloCard variant={variant} /> : <ShrineGalleryWalk variant={variant} />}
    </div>
  );
}
