# 桜神社 コスプレ — Sakura Shrine Cosplay Gallery

A holographic cosplay photo card in a shrine full of sakura (React + Three.js r180 + custom GLSL). See the full brief in [PROMPT.md](PROMPT.md).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (night version) or http://localhost:5173/?variant=hanami (daytime version)

## Adding your cosplay photos

1. Copy every photo (for example from `C:\Users\mos\Pictures\55`) into **`src/cosplay/`**
   ```powershell
   Copy-Item "C:\Users\mos\Pictures\55\*" -Destination ".\src\cosplay\" -Include *.jpg,*.jpeg,*.png,*.webp
   ```
2. Refresh the page. Every photo appears automatically, sorted by file name. Portrait (2:3) photos look best.
3. (Optional) Add character, series and cosplayer names per file in `captions` in `src/shaders/sakura-shrine-holo-card/photos.ts`.

## Controls

- Move the mouse: tilt the card and see the holographic foil
- Click a hanging card: bring it to the centre · click the centre card: spin it
- ← → change photos · `G` or the "ギャラリー" button shows every photo
