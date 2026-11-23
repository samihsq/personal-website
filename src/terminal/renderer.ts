/**
 * Patches and helpers around cool-retro-term-renderer.
 *
 * The renderer draws terminal text onto a 2D canvas, then runs CRT shaders on
 * it. Several things here reach into its (unexported) internals; each one is
 * guarded so a future version of the library degrades gracefully instead of
 * crashing.
 */
import type { CRTTerminal } from "cool-retro-term-renderer";
import { HalfFloatType, LinearFilter, RGBAFormat, WebGLRenderTarget } from "three";
import { PICTURE } from "./crtSettings";

/** Internals of the renderer's TerminalText that we rely on. */
interface TextInternals {
  render: () => void;
  getCursorPosition: () => { col: number; row: number };
  pixelToGrid: (x: number, y: number) => { col: number; row: number };
  updateSize: (w: number, h: number) => void;
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  texture: { needsUpdate: boolean };
  screenScaling: number;
  charWidth: number;
  charHeight: number;
  totalMargin: number;
  cols: number;
  rows: number;
  cursorVisible: boolean;
  burnInRenderTargets?: WebGLRenderTarget[];
  burnInMaterial?: { uniforms?: { burnInTime?: { value: number } } };
}

const internals = (crt: CRTTerminal) => crt.getTerminalText() as unknown as TextInternals;

// ---------------------------------------------------------------------------
// Burn-in
// ---------------------------------------------------------------------------

/**
 * The renderer accumulates burn-in in 8-bit textures and fades it by a small
 * multiplier each frame. Once a ghost is dim, that change rounds to zero and
 * the ghost never disappears, so swap in half-float buffers. It also derives
 * fade speed from the burn-in amount (slow); set it directly instead.
 */
export function setupBurnIn(crt: CRTTerminal, fadeMs: number) {
  const text = internals(crt);
  const fadeUniform = text.burnInMaterial?.uniforms?.burnInTime;
  if (fadeUniform) fadeUniform.value = 1 / fadeMs;

  const targets = text.burnInRenderTargets;
  if (!crt.getRenderer().capabilities.isWebGL2 || !Array.isArray(targets) || targets.length !== 2) {
    return;
  }
  text.burnInRenderTargets = targets.map((old) => {
    const next = new WebGLRenderTarget(old.width, old.height, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: HalfFloatType,
    });
    old.dispose();
    return next;
  });
}

// ---------------------------------------------------------------------------
// Resizing
// ---------------------------------------------------------------------------

/**
 * three.js (WebGL2) allocates the text texture's GPU storage once, at the
 * canvas's original size, then only ever writes into that area. When the
 * renderer resizes its text canvas on a window resize, a larger canvas no
 * longer fits and a smaller one only fills part of it, so the picture comes out
 * squished or partly stale. Dispose the texture after every resize so it is
 * reallocated at the new size on the next frame.
 */
export function fixTextureResize(crt: CRTTerminal): () => void {
  const text = internals(crt) as TextInternals & {
    texture: { needsUpdate: boolean; dispose?: () => void };
  };
  if (typeof text.updateSize !== "function" || typeof text.texture?.dispose !== "function") {
    return () => {};
  }
  const originalUpdateSize = text.updateSize.bind(text);
  text.updateSize = (w: number, h: number) => {
    originalUpdateSize(w, h);
    text.texture.dispose?.();
    text.texture.needsUpdate = true;
  };
  return () => {
    text.updateSize = originalUpdateSize;
  };
}

// ---------------------------------------------------------------------------
// Painter: overlays on top of the terminal, or a full replacement screen
// ---------------------------------------------------------------------------

/** One character cell of a full-screen UI (e.g. the dialog). */
export interface Cell {
  ch: string;
  fg: string;
  bg: string;
  /** Paint over frame lines (e.g. a title sitting on a border). */
  cover?: boolean;
}

/** A full-screen UI drawn instead of the terminal text. */
export interface Screen {
  bg: string;
  cells: (Cell | null)[][]; // [row][col]
  /** Rectangles outlined along cell centres, e.g. dialog borders. */
  frames: { col: number; row: number; w: number; h: number; color: string }[];
}

export interface Metrics {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  margin: number;
  scale: number;
}

export type Overlay = (ctx: CanvasRenderingContext2D, m: Metrics) => void;

export interface Painter {
  metrics: () => Metrics;
  setOverlay: (key: string, draw: Overlay | null) => void;
  /** Final colouring step for the terminal (not full-screen UIs). */
  setTint: (draw: Overlay | null) => void;
  setScreen: (screen: Screen | null) => void;
  /** Drawn last, over everything and untinted (e.g. the power-off effect). */
  setFinal: (draw: Overlay | null) => void;
  hasScreen: () => boolean;
  refresh: () => void;
  dispose: () => void;
}

export const FONT = '12px "Terminus", monospace';

/** Draw one character at a grid cell, the same way the renderer does. */
export function drawChar(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  ch: string,
  col: number,
  row: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(m.margin + col * m.cellW, m.margin + row * m.cellH);
  ctx.scale(m.scale, m.scale);
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

export function createPainter(crt: CRTTerminal): Painter {
  const text = internals(crt);
  const noop: Painter = {
    metrics: () => ({ cols: 80, rows: 24, cellW: 13.5, cellH: 29, margin: 36, scale: 2.25 }),
    setOverlay: () => {},
    setTint: () => {},
    setScreen: () => {},
    setFinal: () => {},
    hasScreen: () => false,
    refresh: () => {},
    dispose: () => {},
  };
  if (typeof text.render !== "function" || !text.ctx || !text.texture) return noop;

  const originalRender = text.render.bind(text);
  const overlays = new Map<string, Overlay>();
  let tint: Overlay | null = null;
  let screen: Screen | null = null;
  let final: Overlay | null = null;

  const metrics = (): Metrics => ({
    cols: text.cols,
    rows: text.rows,
    cellW: text.charWidth * text.screenScaling,
    cellH: text.charHeight * text.screenScaling,
    margin: text.totalMargin,
    scale: text.screenScaling,
  });

  const paintScreen = (s: Screen) => {
    const { ctx, canvas } = text;
    const m = metrics();
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = FONT;
    ctx.textBaseline = "top";
    ctx.imageSmoothingEnabled = false;
    const eachCell = (fn: (cell: Cell, x: number, y: number) => void) =>
      s.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell) fn(cell, m.margin + c * m.cellW, m.margin + r * m.cellH);
        }),
      );
    const fillBg = (cell: Cell, x: number, y: number) => {
      ctx.fillStyle = cell.bg;
      // +0.5 avoids hairline gaps between neighbouring cells
      ctx.fillRect(x, y, m.cellW + 0.5, m.cellH + 0.5);
    };

    // 1. backgrounds, 2. frame lines, 3. cells that sit on top of frames, 4. text
    eachCell((cell, x, y) => {
      if (cell.bg !== s.bg) fillBg(cell, x, y);
    });
    ctx.lineWidth = Math.max(1, m.scale);
    for (const f of s.frames) {
      ctx.strokeStyle = f.color;
      ctx.strokeRect(
        m.margin + (f.col + 0.5) * m.cellW,
        m.margin + (f.row + 0.5) * m.cellH,
        (f.w - 1) * m.cellW,
        (f.h - 1) * m.cellH,
      );
    }
    eachCell((cell, x, y) => {
      if (cell.cover) fillBg(cell, x, y);
    });
    eachCell((cell, x, y) => {
      if (!cell.ch || cell.ch === " ") return;
      ctx.fillStyle = cell.fg;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(m.scale, m.scale);
      ctx.fillText(cell.ch, 0, 0);
      ctx.restore();
    });
  };

  text.render = () => {
    if (screen) paintScreen(screen);
    else originalRender();
    // overlays and tint decorate the terminal text, not full-screen UIs
    if (!screen && (overlays.size || tint)) {
      const m = metrics();
      const run = (draw: Overlay) => {
        text.ctx.save();
        draw(text.ctx, m);
        text.ctx.restore();
      };
      overlays.forEach(run);
      if (tint) run(tint);
    }
    if (final) {
      text.ctx.save();
      final(text.ctx, metrics());
      text.ctx.restore();
    }
    text.texture.needsUpdate = true;
  };

  return {
    metrics,
    setOverlay: (key, draw) => {
      if (draw) overlays.set(key, draw);
      else overlays.delete(key);
      text.render();
    },
    setTint: (draw) => {
      tint = draw;
      text.render();
    },
    setScreen: (s) => {
      screen = s;
      text.render();
    },
    setFinal: (draw) => {
      final = draw;
      text.render();
    },
    hasScreen: () => screen !== null,
    refresh: () => text.render(),
    dispose: () => {
      text.render = originalRender;
    },
  };
}

// ---------------------------------------------------------------------------
// Cursor trail
// ---------------------------------------------------------------------------

/**
 * Output moves the cursor several characters between screen redraws, so the
 * burn-in only catches it every few cells. Each frame, draw the cells the
 * cursor skipped over for that one frame so the ghost trail is continuous.
 */
export function smoothCursorTrail(crt: CRTTerminal, painter: Painter): () => void {
  const text = internals(crt);
  if (typeof text.getCursorPosition !== "function") return () => {};

  let trail: { col: number; row: number }[] = [];
  const draw: Overlay = (ctx, m) => {
    ctx.fillStyle = "#ffffff";
    for (const cell of trail) {
      ctx.fillRect(m.margin + cell.col * m.cellW, m.margin + cell.row * m.cellH, m.cellW, m.cellH);
    }
  };

  let prev = text.getCursorPosition();
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const cur = text.getCursorPosition();
    const cells: { col: number; row: number }[] = [];
    if (text.cursorVisible && !painter.hasScreen()) {
      if (cur.row === prev.row && cur.col > prev.col + 1) {
        for (let c = prev.col + 1; c < cur.col; c++) cells.push({ col: c, row: cur.row });
      } else if (cur.row === prev.row + 1 && cur.col > 0) {
        for (let c = 0; c < cur.col; c++) cells.push({ col: c, row: cur.row });
      }
    }
    const hadTrail = trail.length > 0;
    trail = cells;
    if (cells.length) painter.setOverlay("trail", draw);
    else if (hadTrail) painter.setOverlay("trail", null);
    prev = cur;
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    painter.setOverlay("trail", null);
  };
}

// ---------------------------------------------------------------------------
// Text size
// ---------------------------------------------------------------------------

/** The renderer's default text scale (12px Terminus x 2.25). */
const DEFAULT_TEXT_SCALE = 2.25;
/** On narrow screens, shrink text so at least this many columns fit. */
export const MIN_COLUMNS = 40;

/**
 * The renderer uses one fixed text size, which leaves phones with ~22 columns.
 * Shrink it on narrow screens (never grow past the default). Call on startup
 * and on every resize, after the renderer has handled the resize itself.
 */
export function fitTextScale(crt: CRTTerminal, container: HTMLElement) {
  const text = internals(crt);
  if (typeof text.screenScaling !== "number") return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;
  const charWidth = text.charWidth || 6; // Terminus "M" at 12px
  const margin = text.totalMargin ?? 36;
  const fit = (width - 2 * margin) / (MIN_COLUMNS * charWidth);
  const scale = Math.min(DEFAULT_TEXT_SCALE, Math.max(1, fit));
  if (Math.abs(scale - text.screenScaling) < 0.01) return;
  text.screenScaling = scale;
  text.updateSize(width, height); // recomputes the grid and resizes xterm
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

/**
 * Screen pixel -> visible grid cell, undoing the shader's barrel curvature
 * (same formula as the renderer's static pass, applyStaticCurvature).
 */
export function screenToCell(
  crt: CRTTerminal,
  container: HTMLElement,
  clientX: number,
  clientY: number,
): { col: number; row: number } | null {
  const rect = container.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const [tx, ty] = uncurve((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height, rect.width / rect.height);
  if (tx < 0 || tx > 1 || ty < 0 || ty > 1) return null;
  return rawPixelToGrid(crt)(tx * rect.width, ty * rect.height);
}

/** Where on the (flat) text canvas a point on the curved screen shows; 0–1 coordinates. */
function uncurve(px: number, py: number, aspect: number): [number, number] {
  const ccx = 0.5 - px;
  const ccy = 0.5 - py;
  const cx = aspect > 1 ? ccx / aspect : ccx;
  const cy = aspect > 1 ? ccy : ccy * aspect;
  const d = (cx * cx + cy * cy) * PICTURE.screenCurvature;
  return [px - ccx * (1 + d) * d, py - ccy * (1 + d) * d];
}

const originalPixelToGrid = new WeakMap<object, TextInternals["pixelToGrid"]>();
const rawPixelToGrid = (crt: CRTTerminal) => {
  const text = internals(crt);
  return originalPixelToGrid.get(text) ?? text.pixelToGrid.bind(text);
};

/**
 * The renderer's own mouse handling (drag to select text) maps the mouse to a
 * cell as if the screen were flat, so near the curved edges the selection
 * lands a row or a few columns away from the pointer. Route it through the
 * same curvature correction the hover / click code uses.
 */
export function curveRendererMouse(crt: CRTTerminal, container: HTMLElement): () => void {
  const text = internals(crt);
  if (typeof text.pixelToGrid !== "function" || originalPixelToGrid.has(text)) return () => {};
  const raw = text.pixelToGrid.bind(text);
  originalPixelToGrid.set(text, raw);
  text.pixelToGrid = (x: number, y: number) => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return raw(x, y);
    const [tx, ty] = uncurve(x / w, y / h, w / h);
    const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
    return raw(clamp(tx) * w, clamp(ty) * h);
  };
  return () => {
    text.pixelToGrid = raw;
    originalPixelToGrid.delete(text);
  };
}

/**
 * The renderer is monochrome by default (it maps brightness to the phosphor
 * colour). Run it in full colour instead, with a white "phosphor", so the
 * page can colour things itself: terminal text gets tinted with the phosphor
 * colour, the banner gets a gradient, and the dialog keeps its blue and grey.
 */
export function useFullColour(crt: CRTTerminal) {
  const text = crt.getTerminalText();
  text.setChromaColor(1);
  text.setFontColor("#ffffff");
}

const toRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) =>
  "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

/** Colour multiply, like the canvas "multiply" blend. */
export function multiplyColours(a: string, b: string) {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex(x.map((v, i) => (v * y[i]) / 255));
}

/** Colour at position t (0–1) along a multi-stop gradient. */
export function gradientAt(stops: string[], t: number) {
  if (!stops.length) return "#ffffff";
  if (stops.length === 1) return stops[0];
  const pos = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const a = toRgb(stops[i]);
  const b = toRgb(stops[i + 1]);
  const f = pos - i;
  return toHex(a.map((v, k) => v + (b[k] - v) * f));
}

/** A very dark version of `hex`, for the glass behind the text. */
export function glassColour(hex: string, amount = 0.07) {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (shift: number) =>
    Math.round(((n >> shift) & 255) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
