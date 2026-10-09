# Build <SakuraShrineHoloCard /> — a Japanese cosplay gallery in a sakura shrine

You are working in an existing React + Vite app. Build an original 3D scene with Three.js r180 and custom GLSL.

Component: `SakuraShrineHoloCard`
Variants: **Yozakura** (`yozakura`: night sakura, candle-lit stone lanterns, moon and stars) · **Hanami** (`hanami`: daytime cherry-blossom viewing)
Runtime: React 18 + Three.js r180 + custom GLSL. No external models; all geometry is built in code.

Reference brief:
A holographic cosplay photo card standing at the foot of a vermilion torii, inside a shrine filled with cherry blossoms. The focus is showing **as many cosplay photos as possible**.

## Usage

```tsx
import { SakuraShrineHoloCard } from "./shaders/sakura-shrine-holo-card/SakuraShrineHoloCard";
import "./shaders/sakura-shrine-holo-card/sakura-shrine.css";

export function Scene() {
  return (
    <div className="shader-frame">
      <SakuraShrineHoloCard variant="yozakura" />
    </div>
  );
}
```

## Scene (shrine + sakura)

- Three rows of vermilion torii with curved black kasagi, a stone path leading to a shrine hall with glowing doors at the back
- Six stone lanterns (tōrō) with flickering candle-like point lights
- Red and white paper lanterns (chōchin) strung along both sides of the path
- 12 sakura trees with blossoms (instanced) and a carpet of petals on the ground
- **About 1,800 falling sakura petals** animated on the GPU (vertex shader: fall, sway, spin, wind)
- Sky shader: twilight gradient, moon and twinkling stars (yozakura) / clear pink sky (hanami)

## Holographic cosplay card (GLSL)

- Rounded card with a gold frame and a vermilion inner line
- Iridescent foil in a sakura-flower pattern that shifts with view angle and pointer tilt
- Glitter that sparkles as the card tilts, and a glare that follows the pointer
- Back of the card: vermilion seigaiha wave pattern with a gold sakura crest
- Name ribbon printed on the card: character name (Japanese), series, cosplayer, number seal (hanko)

## Showing lots of photos

- The selected photo is a large card in the centre; the others hang like **ema** (wooden prayer plaques) in an arc around the torii
- **Gallery mode** (button or `G`): every card lines up in a grid so you can see them all at once
- Thumbnail strip at the bottom, ‹ › buttons and ← → keys to change photos
- Clicking a hanging card brings it to the centre with a twirl; clicking the centre card spins it
- **Every image in `src/cosplay/` is picked up automatically** (jpg/png/webp, any file name, sorted by name)
- Optional captions per photo go in `captions` in `photos.ts`

## Requirements

- Responsive on desktop and mobile (on narrow screens the camera, card size and info panel adjust)
- Reduce petal speed when `prefers-reduced-motion` is set
- Release every WebGL resource when the component unmounts
- After building, run it and check in a browser: tilt, card selection, gallery mode and both variants
