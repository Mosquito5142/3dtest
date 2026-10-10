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

## Adding your cosplay photos

1. Copy every photo (for example from `C:\Users\mos\Pictures\55`) into **`src/cosplay/`**
   ```powershell
   Copy-Item "C:\Users\mos\Pictures\55\*" -Destination ".\src\cosplay\" -Include *.jpg,*.jpeg,*.png,*.webp
   ```
2. Refresh the page. Every photo appears automatically, sorted by file name. Portrait (2:3) photos look best.
3. (Optional) Add character, series and cosplayer names per file in `captions` in `src/shaders/sakura-shrine-holo-card/photos.ts`.

## Walk mode controls

| Computer | Mobile | |
|---|---|---|
| `W` `A` `S` `D` / arrow keys | drag on the left half of the screen (joystick) | walk |
| mouse (click once to start) | drag on the right half of the screen | look around |
| `Shift` | push the joystick all the way | run |
| `E` / click a photo | tap | view the photo up close |
| `←` `→` (while viewing) | buttons ‹ › | previous / next photo |
| `1`–`9` | | jump straight to photo N |
| `Esc` | | take a break / leave the close-up view |

Top right shows how many photos you have viewed; bottom right is a minimap of the path (photos you have seen turn pink).

## Card page controls (`?view=card`)

- Move the mouse: tilt the card and see the holographic foil
- Click a hanging card: bring it to the centre · click the centre card: spin it
- ← → change photos · `G` or the "ギャラリー" button shows every photo
