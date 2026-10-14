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

---

# Part 2: <ShrineGalleryWalk /> — walk through the exhibition in first person

Turn the main page into a game-like experience: you walk through a "cosplay photo exhibition" set in a shrine full of sakura, as if you came out to see a photo show for real.

- **First-person view**: WASD + mouse look (Pointer Lock, with drag-to-look as a fallback), Shift to run, gentle head bob while walking; on mobile, a virtual joystick on the left half and drag to look on the right half
- **Exhibition path**: a stone path through **senbon torii** (a torii every 4 m) with red-white paper lanterns hanging under every gate, sakura trees on both sides, and the shrine hall at the end
- **Display boards**: wooden **ema-style** boards with a small roof, alternating left and right; photos keep their real proportions (no cropping), with a gold frame and a soft foil that glows when you get close, plus a placard with number, character name and series, and a stone lantern lighting each board
- **Entrance**: a big torii and a signboard 桜神社 写真展
- **Viewing**: walk up to and face a photo → the prompt `E` appears → the camera glides in front of the photo and an info panel appears; `←` `→` to move between photos, `1`–`9` to jump to a photo
- **Game-style HUD**: viewed-photo counter + progress bar, a minimap of the path, a start screen with instructions, and a pause screen
- **Performance**: a pool of only 6 lantern lights moves to the lanterns nearest the player; the sky, sun shadows and falling petals follow the player; works with any number of photos
- Keep the old card page at `?view=card`, and share the shrine/sakura builders between the two pages (`world.ts`)

---

# Part 3: central plaza + 6 themed worlds

- **Central plaza**: a circular stone plaza (radius 12 m) where you spawn. A crystal floats over an octagonal pedestal with zone-coloured orbs circling it, the compass floor has an arrow and name toward every zone, a stone balustrade has gaps at the gates, and there is a signpost (zone name + photo count) and a lamp post between every pair of gates
- **6 wings** spread out every 60° (in each zone's local coordinates, so the theme code doesn't need to know the angle). Each zone stays inside its own 60° wedge (`inWedge`) so scenery doesn't leak into the next zone
  1. **桜神社 Japanese shrine**: senbon torii, stone lanterns, sakura, shrine hall · ema boards · sakura petals
  2. **中世の城 Medieval**: cobblestones, crenellated walls, towers, stone arches, banners, wall torches, castle keep · gold frames on stone walls · glowing embers
  3. **モルディブ Maldives**: boardwalk over a turquoise lagoon (water shader with caustics + sun glints), sand islands, palm trees, overwater bungalows, overwater villa · bamboo stands · sparkles
  4. **バンコク Bangkok**: street at night, shophouses with Thai neon signs, tangled power lines, string lights, tuk-tuks, street-food carts, a Thai temple hall with tiered roofs and chofa · gold frames on red lacquer · neon dust
  5. **砂の惑星 Dune**: rolling sand dunes, red rock formations, banded obelisks, two moons, a sandworm arching out of the sand · sandstone slabs with bronze frames · blowing sand
  6. **忍の里 Ninja village**: village gate, houses with red roofs and water tanks, green trees, ramen stall, round red tower with 火 · hanging scroll boards · green leaves
- **Room for future photos**: every zone has at least 12 slots (empty frames waiting for photos); if a zone gets more photos than that, its path grows longer automatically. Photos are sorted per zone by folder `src/cosplay/<zone>/`
- **Atmosphere switching**: each zone has its own `EnvPreset` (sky, fog, sun, hemisphere light, exposure, particle colour and size) that blends smoothly as you walk out of the plaza
- **Performance**: a pool of 8 lights moves to the nearest light points, zones you aren't in are hidden once you're deep inside one, the sky, sun shadow and particles follow the player, and materials and geometry are cached and shared
- Controls: `1`–`6` warp to zones, `H` back to the plaza, ←/→ move between photos within the zone; HUD shows a zone-name banner when you enter a zone, the viewed count per zone and overall, and a minimap of the whole world
