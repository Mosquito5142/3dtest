import { cosplayPhotos, type CosplayPhoto } from "../shaders/sakura-shrine-holo-card/photos";
import { ZONES } from "./zones";

/** Photos grouped by zone folder (src/cosplay/<folder>/), in ZONES order. Unknown folders go to the first zone. */
export function photosByZone(photos: CosplayPhoto[] = cosplayPhotos): CosplayPhoto[][] {
  const groups: CosplayPhoto[][] = ZONES.map(() => []);
  for (const p of photos) {
    const k = ZONES.findIndex((z) => z.folder === (p.zone ?? "shrine"));
    groups[k < 0 ? 0 : k].push(p);
  }
  return groups;
}
