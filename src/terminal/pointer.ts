/**
 * Mouse / touch input for the CRT. Turns pointer events into grid-cell events
 * and leaves the decisions (what to highlight, what a click does) to handlers,
 * so the shell and the dialog can each handle input their own way.
 */

export type GridCell = { col: number; row: number };

export interface PointerHandlers {
  /** Pointer moved over a cell (null = off-screen). Return true if clickable. */
  hover: (cell: GridCell | null) => boolean;
  /** Clicked or tapped a cell (null = outside the text area). */
  click: (cell: GridCell | null, touch: boolean) => void;
  /**
   * Wheel or swipe scrolled by whole lines. Return true if handled; for the
   * wheel, false lets the renderer scroll the terminal itself.
   */
  scroll: (lines: number, source: "wheel" | "touch") => boolean;
  /** Whether the renderer's own mouse handling (text selection) is allowed. */
  allowSelection: () => boolean;
}

interface PointerOptions {
  screen: HTMLElement; // wrapper element (React-owned)
  container: HTMLElement; // element holding the CRT canvas
  toCell: (clientX: number, clientY: number) => GridCell | null;
  lineHeight: () => number;
  touchOnly: boolean;
  handlers: PointerHandlers;
}

export function setupPointer({ screen, container, toCell, lineHeight, touchOnly, handlers }: PointerOptions) {
  let down: { x: number; y: number } | null = null;
  let lastKey = "";

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || down) return;
    const cell = toCell(e.clientX, e.clientY);
    const key = cell ? `${cell.col}:${cell.row}` : "";
    if (key === lastKey) return;
    lastKey = key;
    container.style.cursor = handlers.hover(cell) ? "pointer" : "";
  };

  const onPointerLeave = () => {
    lastKey = "";
    handlers.hover(null);
    container.style.cursor = "";
  };

  const onPointerDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };

  const onClick = (e: MouseEvent) => {
    const start = down;
    down = null;
    lastKey = "";
    // a drag selects text (copied to clipboard) instead of clicking
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    handlers.click(toCell(e.clientX, e.clientY), touchOnly);
  };

  // Mouse wheel: let a handler (e.g. the dialog) take it before the renderer
  // scrolls the terminal underneath.
  let wheelRemainder = 0;
  const onWheel = (e: WheelEvent) => {
    lastKey = "";
    wheelRemainder += e.deltaMode === 1 ? e.deltaY : e.deltaY / Math.max(lineHeight(), 1);
    const lines = Math.trunc(wheelRemainder);
    if (!lines) {
      if (!handlers.allowSelection()) e.stopPropagation();
      return;
    }
    wheelRemainder -= lines;
    if (handlers.scroll(lines, "wheel")) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // The renderer's own mouse handlers start text selection and focus xterm
  // (which opens the keyboard on phones); stop them when they'd get in the way.
  const maybeBlockMouse = (e: MouseEvent) => {
    if (touchOnly || !handlers.allowSelection()) e.stopPropagation();
  };

  // Touch: swipe to scroll.
  let touchY: number | null = null;
  let touchRemainder = 0;
  const onTouchStart = (e: TouchEvent) => {
    touchY = e.touches[0]?.clientY ?? null;
    touchRemainder = 0;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (touchY === null || !e.touches[0]) return;
    const y = e.touches[0].clientY;
    touchRemainder += (touchY - y) / Math.max(lineHeight(), 1);
    touchY = y;
    const lines = Math.trunc(touchRemainder);
    if (lines) {
      handlers.scroll(lines, "touch");
      touchRemainder -= lines;
      down = { x: -9999, y: -9999 }; // a swipe is not a tap
    }
    e.preventDefault();
  };

  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerleave", onPointerLeave);
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("click", onClick);
  screen.addEventListener("wheel", onWheel, { capture: true, passive: false });
  screen.addEventListener("mousedown", maybeBlockMouse, true);
  screen.addEventListener("mouseup", maybeBlockMouse, true);
  screen.addEventListener("mousemove", maybeBlockMouse, true);
  if (touchOnly) {
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
  }

  return () => {
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerleave", onPointerLeave);
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("click", onClick);
    screen.removeEventListener("wheel", onWheel, true);
    screen.removeEventListener("mousedown", maybeBlockMouse, true);
    screen.removeEventListener("mouseup", maybeBlockMouse, true);
    screen.removeEventListener("mousemove", maybeBlockMouse, true);
    container.removeEventListener("touchstart", onTouchStart);
    container.removeEventListener("touchmove", onTouchMove);
  };
}
