/**
 * A whiptail / raspi-config style dialog, in shades of the phosphor colour:
 * dim backdrop, bright box with a dark drop shadow, centred title, scrollable body and <Button>s. Built as a grid
 * of character cells so it goes through the same CRT pipeline as the shell.
 */
import { projects } from "../data/projects";
import { experiences } from "../data/experience";
import type { Cell, Screen } from "./renderer";
import { wrap } from "./shell";

/** Dialog colours, all shades of one phosphor colour. */
interface Palette {
  backdrop: string; // screen behind the box
  backdropText: string; // backtitle and key hints
  box: string; // dialog face
  ink: string; // text on the box, border lines
  shadow: string; // drop shadow
  dim: string; // scroll markers
  hover: string; // button under the mouse
  activeBg: string; // focused button (inverted)
  activeFg: string;
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (shift: number) =>
    Math.round(Math.min(255, ((n >> shift) & 255) * f))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

export function dialogPalette(phosphor: string): Palette {
  return {
    backdrop: shade(phosphor, 0.28),
    backdropText: shade(phosphor, 1),
    box: shade(phosphor, 0.75),
    ink: shade(phosphor, 0.1),
    shadow: shade(phosphor, 0.06),
    dim: shade(phosphor, 0.4),
    hover: shade(phosphor, 0.55),
    activeBg: shade(phosphor, 0.12),
    activeFg: shade(phosphor, 1),
  };
}

export interface DialogButton {
  label: string;
  url?: string; // open this link; otherwise the button closes the dialog
}

export interface DialogContent {
  backtitle: string;
  title: string;
  /** Paragraphs; "" is a blank line. A leading "- " gets a hanging indent. */
  body: string[];
  buttons: DialogButton[];
}

export interface DialogState {
  selected: number; // focused button
  scroll: number; // first visible body line
  hover: number | null; // button under the mouse
}

export interface DialogLayout {
  screen: Screen;
  /** Clickable button areas in grid cells. */
  buttons: { index: number; row: number; col: number; len: number }[];
  maxScroll: number;
  bodyRows: number;
}

export function projectDialog(slug: string): DialogContent | null {
  const p = projects.find((x) => x.slug === slug);
  if (!p) return null;
  const body = [p.summary, ""];
  if (p.description && p.description !== p.summary) body.push(p.description, "");
  body.push(`Category: ${p.category}`);
  if (p.tech.length) body.push(`Stack: ${p.tech.join(", ")}`);
  if (p.demo || p.link) body.push("");
  if (p.demo) body.push(`Demo: ${p.demo}`);
  if (p.link) body.push(`Source: ${p.link}`);
  const buttons: DialogButton[] = [];
  if (p.demo) buttons.push({ label: "Visit", url: p.demo });
  if (p.link) buttons.push({ label: "Source", url: p.link });
  buttons.push({ label: "Back" });
  return { backtitle: "samih.dev · Projects", title: p.title, body, buttons };
}

export function experienceDialog(index: number): DialogContent | null {
  const e = experiences[index];
  if (!e) return null;
  const body = [e.org, `${e.location} · ${e.period}`, "", ...e.bullets.map((b) => `- ${b}`)];
  if (e.link) body.push("", `Link: ${e.link}`);
  const buttons: DialogButton[] = [];
  if (e.link) buttons.push({ label: "Visit", url: e.link });
  buttons.push({ label: "Back" });
  return { backtitle: "samih.dev · Experience", title: e.role, body, buttons };
}

export function layoutDialog(
  content: DialogContent,
  cols: number,
  rows: number,
  state: DialogState,
  touch: boolean,
  palette: Palette,
): DialogLayout {
  const P = palette;
  const cells: (Cell | null)[][] = Array.from({ length: rows }, () => Array<Cell | null>(cols).fill(null));
  const frames: Screen["frames"] = [];

  const put = (row: number, col: number, textValue: string, fg: string, bg: string, cover = false) => {
    if (row < 0 || row >= rows) return;
    for (let i = 0; i < textValue.length; i++) {
      const c = col + i;
      if (c >= 0 && c < cols) cells[row][c] = { ch: textValue[i], fg, bg, cover };
    }
  };
  const fill = (row: number, col: number, w: number, h: number, bg: string) => {
    for (let r = row; r < row + h; r++) put(r, col, " ".repeat(Math.max(w, 0)), P.ink, bg);
  };

  // backtitle and key hints on the blue backdrop
  put(0, 1, content.backtitle.slice(0, cols - 2), P.backdropText, P.backdrop);
  const hint = touch ? "Tap a button" : "Tab/arrows: move   Enter: select   Esc: back";
  if (rows > 6) put(rows - 1, 1, hint.slice(0, cols - 2), P.backdropText, P.backdrop);

  // box geometry
  const W = Math.max(Math.min(cols - 4, 72), 20);
  const innerW = W - 4;
  const lines: string[] = [];
  for (const para of content.body) {
    if (para === "") lines.push("");
    else if (para.startsWith("- ")) lines.push(...wrap(para.slice(2), innerW, "  ", "- "));
    else lines.push(...wrap(para, innerW));
  }
  const chrome = 6; // border, blank, ...body..., blank, buttons, border
  const maxH = Math.max(rows - 4, chrome + 1);
  const bodyRows = Math.max(Math.min(lines.length, maxH - chrome), 1);
  const H = bodyRows + chrome;
  const x0 = Math.floor((cols - W) / 2);
  const y0 = Math.max(1, Math.floor((rows - H) / 2));
  const maxScroll = Math.max(lines.length - bodyRows, 0);
  const scroll = Math.min(Math.max(state.scroll, 0), maxScroll);

  // shadow, box, border
  fill(y0 + 1, x0 + W, 2, H, P.shadow);
  fill(y0 + H, x0 + 2, W, 1, P.shadow);
  fill(y0, x0, W, H, P.box);
  frames.push({ col: x0, row: y0, w: W, h: H, color: P.ink });

  // title, centred in the top border
  const title = ` ${content.title} `.slice(0, W - 4);
  put(y0, x0 + Math.floor((W - title.length) / 2), title, P.ink, P.box, true);

  // body
  for (let i = 0; i < bodyRows; i++) {
    const line = lines[scroll + i];
    if (line) put(y0 + 2 + i, x0 + 2, line, P.ink, P.box);
  }
  if (maxScroll > 0) {
    const pct = Math.round((scroll / maxScroll) * 100);
    const marker = ` ${pct}% `;
    put(y0 + H - 1, x0 + W - marker.length - 2, marker, P.ink, P.box, true);
    if (scroll > 0) put(y0 + 2, x0 + W - 2, "^", P.dim, P.box);
    if (scroll < maxScroll) put(y0 + 1 + bodyRows, x0 + W - 2, "v", P.dim, P.box);
  }

  // buttons, spread evenly along the bottom
  const labels = content.buttons.map((b) => `<${b.label}>`);
  const total = labels.reduce((n, l) => n + l.length, 0);
  const gap = Math.max(Math.floor((W - 2 - total) / (labels.length + 1)), 1);
  const buttonRow = y0 + H - 2;
  const buttons: DialogLayout["buttons"] = [];
  let col = x0 + 1 + gap;
  labels.forEach((label, index) => {
    const active = index === state.selected;
    const hovered = index === state.hover;
    const fg = active ? P.activeFg : P.ink;
    const bg = active ? P.activeBg : hovered ? P.hover : P.box;
    put(buttonRow, col, label, fg, bg);
    buttons.push({ index, row: buttonRow, col, len: label.length });
    col += label.length + gap;
  });

  return { screen: { bg: P.backdrop, cells, frames }, buttons, maxScroll, bodyRows };
}
