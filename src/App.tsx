import { SakuraShrineHoloCard } from "./shaders/sakura-shrine-holo-card/SakuraShrineHoloCard";
import "./shaders/sakura-shrine-holo-card/sakura-shrine.css";

export function App() {
  // variant: "yozakura" (night sakura, candlelit lanterns) | "hanami" (daytime cherry-blossom viewing)
  const variant = new URLSearchParams(location.search).get("variant") === "hanami" ? "hanami" : "yozakura";
  return (
    <div className="shader-frame">
      <SakuraShrineHoloCard variant={variant} />
    </div>
  );
}
