# 桜神社 コスプレ — Sakura Shrine Cosplay Gallery

A holographic cosplay photo card in a shrine full of sakura (React + Three.js r180 + custom GLSL). See the full brief in [PROMPT.md](PROMPT.md).

## Run

```bash
npm install
npm run dev
```

- http://localhost:5173: **walk through the exhibition** in first person (night)
- http://localhost:5173/?variant=hanami: daytime version
- http://localhost:5173/?view=card: the original holographic-card page

## World layout

You spawn in the **central plaza (写真の広場)**, a circle with a glowing crystal in the middle. **6 paths** branch off to different worlds:

| Key | Zone | Photo folder |
|---|---|---|
| `1` | 桜神社 Japanese shrine (night sakura) | `src/cosplay/shrine/` |
| `2` | 中世の城 Medieval | `src/cosplay/medieval/` |
| `3` | モルディブ Maldives islands | `src/cosplay/maldives/` |
| `4` | バンコク Bangkok | `src/cosplay/bangkok/` |
| `5` | 砂の惑星 Dune / desert planet | `src/cosplay/dune/` |
| `6` | 忍の里 Ninja village (Naruto) | `src/cosplay/naruto/` |

## Adding cosplay photos

1. Put your photos in the folder for the zone you want them in, e.g. `src/cosplay/medieval/`
   ```powershell
   Copy-Item "C:\Users\mos\Pictures\55\*" -Destination ".\src\cosplay\naruto\" -Include *.jpg,*.jpeg,*.png,*.webp
   ```
2. Refresh the page. Photos appear automatically, sorted by file name. Every zone has **12 slots** ready. Slots without a photo show an empty frame marked "ช่องว่าง รอใส่รูป" (empty, waiting for a photo). If you add more than 12, the path grows longer on its own.
3. (Optional) Add character, series and cosplayer names in `captions` in `src/shaders/sakura-shrine-holo-card/photos.ts`, keyed by path, e.g. `"naruto/01.jpg"`.

## Walk mode controls

| Computer | Mobile | |
|---|---|---|
| `W` `A` `S` `D` / arrow keys | drag on the left half of the screen (joystick) | walk |
| mouse (click once to start) | drag on the right half of the screen | look around |
| `Shift` | push the joystick all the way | run |
| `E` / click a photo | tap | view the photo up close |
| `←` `→` (while viewing) | buttons ‹ › | previous / next photo in the same zone |
| `1`–`6` | | warp to a zone's gate |
| `H` | button ⌂ | back to the central plaza |
| `Esc` | | take a break / leave the close-up view |

Top right shows how many photos you have viewed, in this zone and overall. Bottom right is a minimap of the plaza and every path (photos you have seen turn the zone's colour). The sky, fog, light and falling particles change smoothly as you walk into each zone.

**Performance:** static scenery in each zone is merged into just a few meshes (static batching), all shaders are compiled before you start walking, and resolution adjusts automatically when the frame rate drops below about 48 fps (it goes back up once there's headroom). Falling particles differ per zone: sakura only in the shrine, embers in medieval, sand in Dune, leaves in the ninja village, neon dust in Bangkok, and none in the plaza or the Maldives.

## Card page controls (`?view=card`)

- Move the mouse: tilt the card and see the holographic foil
- Click a hanging card: bring it to the centre · click the centre card: spin it
- ← → change photos · `G` or the "ギャラリー" button shows every photo
