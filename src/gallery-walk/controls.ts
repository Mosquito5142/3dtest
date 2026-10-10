// First-person input: WASD / arrows + mouse look (pointer lock, with drag-to-look fallback),
// and a virtual joystick + drag-to-look for touch screens.

export type ControlHandlers = {
  /** short click/tap without dragging */
  onTap(): void;
  onKey(key: string): void;
  onLockChange(locked: boolean): void;
};

export type Controls = {
  /** -1..1 strafe (x) and forward (y) input from keys or joystick */
  move: { x: number; y: number };
  running: boolean;
  /** accumulated look delta in radians since last consume */
  consumeLook(): { yaw: number; pitch: number };
  readonly locked: boolean;
  readonly isTouch: boolean;
  /** reads keys + joystick into `move` / `running`; call once per frame */
  update(): void;
  requestLock(): void;
  releaseLock(): void;
  dispose(): void;
};

const LOOK_SPEED = 0.0022;
const DRAG_LOOK_SPEED = 0.0045;

export function createControls(dom: HTMLCanvasElement, container: HTMLElement, h: ControlHandlers): Controls {
  const keys = new Set<string>();
  const look = { yaw: 0, pitch: 0 };
  const joy = { x: 0, y: 0 };
  const isTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  let locked = false;

  // joystick visuals
  const base = document.createElement("div");
  base.className = "walk-joystick";
  const knob = document.createElement("div");
  knob.className = "walk-joystick__knob";
  base.appendChild(knob);
  container.appendChild(base);

  type Drag = { id: number; kind: "joy" | "look"; x0: number; y0: number; lx: number; ly: number; moved: number };
  const drags = new Map<number, Drag>();

  const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.tagName === "INPUT";
  const onKeyDown = (e: KeyboardEvent) => {
    if (typing(e)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!keys.has(k)) h.onKey(k);
    keys.add(k);
    if (k.startsWith("Arrow") || k === " ") e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  const onBlur = () => keys.clear();

  const onMouseMove = (e: MouseEvent) => {
    if (!locked) return;
    look.yaw -= e.movementX * LOOK_SPEED;
    look.pitch -= e.movementY * LOOK_SPEED;
  };

  const onDown = (e: PointerEvent) => {
    if (locked) {
      if (e.button === 0) h.onTap();
      return;
    }
    const r = dom.getBoundingClientRect();
    const touchJoy = e.pointerType === "touch" && e.clientX - r.left < r.width * 0.45;
    const kind = touchJoy ? "joy" : "look";
    if (touchJoy && [...drags.values()].some((d) => d.kind === "joy")) return;
    drags.set(e.pointerId, { id: e.pointerId, kind, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 });
    dom.setPointerCapture(e.pointerId);
    if (kind === "joy") {
      base.style.left = `${e.clientX - r.left}px`;
      base.style.top = `${e.clientY - r.top}px`;
      base.classList.add("is-active");
    }
  };
  const onMove = (e: PointerEvent) => {
    const d = drags.get(e.pointerId);
    if (!d) return;
    const dx = e.clientX - d.lx;
    const dy = e.clientY - d.ly;
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.kind === "look") {
      look.yaw += dx * DRAG_LOOK_SPEED;
      look.pitch += dy * DRAG_LOOK_SPEED;
    } else {
      const R = 48;
      let jx = e.clientX - d.x0;
      let jy = e.clientY - d.y0;
      const len = Math.hypot(jx, jy);
      if (len > R) { jx = (jx / len) * R; jy = (jy / len) * R; }
      joy.x = jx / R;
      joy.y = -jy / R;
      knob.style.transform = `translate(${jx}px, ${jy}px)`;
    }
  };
  const onUp = (e: PointerEvent) => {
    const d = drags.get(e.pointerId);
    if (!d) return;
    drags.delete(e.pointerId);
    if (d.kind === "joy") {
      joy.x = joy.y = 0;
      knob.style.transform = "";
      base.classList.remove("is-active");
    } else if (d.moved < 10) h.onTap();
  };

  const onLock = () => {
    locked = document.pointerLockElement === dom;
    h.onLockChange(locked);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLock);
  dom.addEventListener("pointerdown", onDown);
  dom.addEventListener("pointermove", onMove);
  dom.addEventListener("pointerup", onUp);
  dom.addEventListener("pointercancel", onUp);

  const move = { x: 0, y: 0 };
  const controls: Controls = {
    move,
    running: false,
    update() {
      const kx = (keys.has("d") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("a") || keys.has("ArrowLeft") ? 1 : 0);
      const ky = (keys.has("w") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("s") || keys.has("ArrowDown") ? 1 : 0);
      move.x = Math.max(-1, Math.min(1, kx + joy.x));
      move.y = Math.max(-1, Math.min(1, ky + joy.y));
      controls.running = keys.has("Shift") || Math.hypot(joy.x, joy.y) > 0.92;
    },
    consumeLook() {
      const out = { ...look };
      look.yaw = look.pitch = 0;
      return out;
    },
    get locked() { return locked; },
    isTouch,
    requestLock() {
      if (isTouch) return;
      try {
        const p = dom.requestPointerLock() as unknown as Promise<void> | undefined;
        p?.catch?.(() => {});
      } catch { /* pointer lock unavailable: drag-to-look still works */ }
    },
    releaseLock() {
      if (document.pointerLockElement === dom) document.exitPointerLock();
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLock);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onUp);
      controls.releaseLock();
      base.remove();
    },
  };

  return controls;
}

