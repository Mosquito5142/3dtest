import type { ZoneTheme } from "./types";
import { shrine } from "./shrine";
import { medieval } from "./medieval";
import { maldives } from "./maldives";
import { bangkok } from "./bangkok";
import { dune } from "./dune";
import { naruto } from "./naruto";

/** Order around the plaza, clockwise from the spawn direction. */
export const ZONES: ZoneTheme[] = [shrine, medieval, maldives, bangkok, dune, naruto];
export type { ZoneTheme };
