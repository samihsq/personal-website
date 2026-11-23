import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CRTTerminal } from "cool-retro-term-renderer";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { projects } from "../data/projects";
import { experiences } from "../data/experience";
import {
  COMPLETIONS,
  HIDDEN_COMMANDS,
  LINKS,
  PROMPT,
  THEMES,
  argCompletions,
  banner,
  clickTarget,
  run,
  setTouchMode,
  type ClickTarget,
  wrap,
} from "./shell";
import { BANNER_GRADIENT, BURN_IN_FADE_MS, PICTURE, local, session, storageGet, storageSet } from "./crtSettings";
import {
  FONT,
  createPainter,
  drawChar,
  fitTextScale,
  fixTextureResize,
  screenToCell,
  glassColour,
  gradientAt,
  multiplyColours,
  useFullColour,
  setupBurnIn,
  smoothCursorTrail,
  type Overlay,
} from "./renderer";
import {
  dialogPalette,
  experienceDialog,
  layoutDialog,
  projectDialog,
  type DialogContent,
  type DialogLayout,
  type DialogState,
} from "./dialog";
import { setupPointer, type GridCell } from "./pointer";
import { isBlockLine } from "./blockText";
import "./CrtTerminal.css";

type QueueItem = string | { delay: number } | (() => void);

/** Everything printed since the last clear, so output can be re-flowed on resize. */
type TranscriptEntry = { type: "banner" } | { type: "cmd"; input: string };

const QUICK_COMMANDS = ["help", "about", "projects", "experience", "contact"];

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function loadTheme() {
  const saved = storageGet(local, "crt-theme");
  return saved && Object.values(THEMES).includes(saved) ? saved : THEMES.green;
}

const openLink = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

const CrtTerminalPage = () => {
  const screenRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<(cmd: string) => void>(() => {});
  const [unsupported] = useState(() => !hasWebGL());
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (unsupported || !screenRef.current) return;
    const screen = screenRef.current;
    // The renderer attaches mouse listeners to its container and never removes
    // them, so give each mount a fresh element that is thrown away on cleanup.
    const container = document.createElement("div");
    container.className = "crt-surface";
    screen.appendChild(container);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Phones/tablets: tap-only, never pop up the on-screen keyboard.
    const touchOnly = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    setTouchMode(touchOnly);
    let theme = loadTheme();

    const page = container.closest<HTMLElement>(".crt-page");
    const tintPage = (color: string) => page?.style.setProperty("--crt-color", color);
    tintPage(theme);

    let crt: CRTTerminal;
    try {
      crt = new CRTTerminal({
        container,
        // full colour: the phosphor tint is applied when painting (see tint below)
        fontColor: "#ffffff",
        chromaColor: 1,
        backgroundColor: glassColour(theme),
        ...PICTURE,
        // motion effects are turned off for visitors who prefer reduced motion
        ...(reduceMotion
          ? { flickering: 0, horizontalSync: 0, jitter: 0, glowingLine: 0, staticNoise: 0.03 }
          : {}),
      });
    } catch (err) {
      console.error("CRT renderer failed, falling back to classic site", err);
      container.remove();
      setFailed(true);
      return;
    }
    const text = crt.getTerminalText();
    let disposed = false;

    // xterm handles input + the text buffer; the CRT renderer draws it.
    const hidden = document.createElement("div");
    hidden.className = "crt-xterm-host";
    document.body.appendChild(hidden);
    const xterm = new Terminal({ cols: 80, rows: 24, scrollback: 2000 });
    xterm.open(hidden);
    crt.attachXTerm(xterm);

    setupBurnIn(crt, BURN_IN_FADE_MS);
    const stopTextureFix = fixTextureResize(crt);
    useFullColour(crt);
    const painter = createPainter(crt);

    /**
     * Colour the terminal: the text is drawn white, so multiply it by the
     * phosphor colour everywhere except the name banner, which gets the
     * oh-my-logo style gradient instead.
     */
    const tint: Overlay = (ctx, m) => {
      const buf = xterm.buffer.active;
      const banner: { row: number; line: string }[] = [];
      let bannerWidth = 1;
      for (let r = 0; r < m.rows; r++) {
        const line = buf.getLine(buf.viewportY + r)?.translateToString(true) ?? "";
        if (isBlockLine(line)) {
          banner.push({ row: r, line });
          bannerWidth = Math.max(bannerWidth, line.replace(/\s+$/, "").length);
        }
      }

      // 1. everything (including the glass behind the banner) in the phosphor colour
      const FAR = 1e5;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = theme;
      ctx.fillRect(-FAR, -FAR, 2 * FAR, 2 * FAR);
      ctx.globalCompositeOperation = "source-over";

      // 2. redraw just the banner's letters in the gradient, one colour per column
      if (banner.length && BANNER_GRADIENT.length) {
        const glass = multiplyColours(glassColour(theme), theme);
        ctx.font = FONT;
        ctx.textBaseline = "top";
        for (const { row, line } of banner) {
          for (let c = 0; c < line.length; c++) {
            if (line[c] === " ") continue;
            ctx.fillStyle = glass;
            ctx.fillRect(m.margin + c * m.cellW, m.margin + row * m.cellH, m.cellW + 0.5, m.cellH + 0.5);
            drawChar(ctx, m, line[c], c, row, gradientAt(BANNER_GRADIENT, c / Math.max(bannerWidth - 1, 1)));
          }
        }
      }
    };
    painter.setTint(tint);

    const stopTrail = smoothCursorTrail(crt, painter);
    fitTextScale(crt, container);

    const applyTheme = (color: string) => {
      theme = color;
      text.setBackgroundColor(glassColour(color));
      tintPage(color);
      storageSet(local, "crt-theme", color);
      painter.refresh();
    };

    const focus = () => {
      if (!touchOnly) crt.focus();
    };

    // ---- output queue with typewriter effect ----
    const queue: QueueItem[] = [];
    let timer: number | null = null;
    let waitUntil = 0;
    let busy = false;
    const CHARS_PER_TICK = 5;

    const pump = () => {
      if (performance.now() < waitUntil) return;
      let budget = CHARS_PER_TICK;
      while (queue.length && budget > 0) {
        const item = queue[0];
        if (typeof item === "function") {
          queue.shift();
          item();
        } else if (typeof item === "object") {
          queue.shift();
          waitUntil = performance.now() + item.delay;
          return;
        } else {
          const chunk = item.slice(0, budget);
          xterm.write(chunk);
          budget -= chunk.length;
          if (chunk.length === item.length) queue.shift();
          else queue[0] = item.slice(chunk.length);
        }
      }
      if (!queue.length) stopPump();
    };

    const startPump = () => {
      busy = true;
      if (reduceMotion) return flush();
      if (timer === null) timer = window.setInterval(pump, 12);
    };

    const stopPump = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };

    /** Write everything that's still queued immediately. */
    const flush = () => {
      stopPump();
      waitUntil = 0;
      while (queue.length) {
        const item = queue.shift()!;
        if (typeof item === "function") item();
        else if (typeof item === "string") xterm.write(item);
      }
    };

    const cols = () => Math.max(xterm.cols - 1, 8);
    const prompt = () => (xterm.cols >= 44 ? PROMPT : "$ ");

    let buffer = "";
    const history: string[] = [];
    let histIndex = 0;
    let transcript: TranscriptEntry[] = [];

    const print = (lines: string[]) => {
      if (lines.length) queue.push(lines.join("\r\n") + "\r\n");
    };

    const showPrompt = () => {
      queue.push(() => {
        xterm.write("\r\n" + prompt());
        busy = false;
      });
      startPump();
    };

    const setLine = (value: string) => {
      buffer = value.slice(0, Math.max(cols() - prompt().length, 4));
      xterm.write("\r\x1b[K" + prompt() + buffer);
    };

    // ---- hover highlight (single line) and hover box (whole item) ----
    let hoverBox: { block: { top: number; bottom: number }; start: number; end: number } | null = null;
    /** Whole-item highlight: a filled block with the item's text drawn inverted. */
    const drawHoverBox: Overlay = (ctx, m) => {
      if (!hoverBox) return;
      const buf = xterm.buffer.active;
      const vy = buf.viewportY;
      const { start, end, block } = hoverBox;
      const top = block.top - vy;
      const bottom = block.bottom - vy;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        m.margin + (start - 0.5) * m.cellW,
        m.margin + top * m.cellH,
        (end - start + 1) * m.cellW,
        (bottom - top + 1) * m.cellH,
      );
      ctx.font = FONT;
      ctx.textBaseline = "top";
      for (let r = block.top; r <= block.bottom; r++) {
        const line = buf.getLine(r)?.translateToString(true) ?? "";
        for (let c = start; c < Math.min(end, line.length); c++) {
          if (line[c] !== " ") drawChar(ctx, m, line[c], c, r - vy, "#000000");
        }
      }
    };

    const clearHover = () => {
      if (hoverBox) {
        hoverBox = null;
        painter.setOverlay("hover", null);
      }
      text.clearSelection();
    };

    const showHover = (target: ClickTarget, row: number) => {
      if (target.block) {
        text.clearSelection();
        hoverBox = { block: target.block, start: target.start, end: target.end };
        painter.setOverlay("hover", drawHoverBox);
      } else {
        if (hoverBox) {
          hoverBox = null;
          painter.setOverlay("hover", null);
        }
        const vy = xterm.buffer.active.viewportY;
        text.setSelection({ col: target.start, row }, { col: target.end - 1, row }, vy);
      }
    };

    // ---- dialog (blue raspi-config style screen) ----
    let dialog: { content: DialogContent; state: DialogState; layout: DialogLayout | null } | null = null;

    const renderDialog = () => {
      if (!dialog) return;
      const { cols: c, rows: r } = text.getGridSize();
      dialog.layout = layoutDialog(dialog.content, c, r, dialog.state, touchOnly, dialogPalette(theme));
      dialog.state.scroll = Math.min(Math.max(dialog.state.scroll, 0), dialog.layout.maxScroll);
      painter.setScreen(dialog.layout.screen);
    };

    const openDialog = (content: DialogContent | null) => {
      if (!content) return;
      flush();
      clearHover();
      dialog = { content, state: { selected: 0, scroll: 0, hover: null }, layout: null };
      renderDialog();
      focus();
    };

    const closeDialog = () => {
      if (!dialog) return;
      dialog = null;
      painter.setScreen(null);
      focus();
    };

    const activateButton = (index: number) => {
      const button = dialog?.content.buttons[index];
      if (!button) return;
      if (button.url) openLink(button.url);
      else closeDialog();
    };

    const dialogKey = (data: string) => {
      if (!dialog?.layout) return;
      const s = dialog.state;
      const n = dialog.content.buttons.length;
      const page = Math.max(dialog.layout.bodyRows - 1, 1);
      if (data === "\t" || data === "\x1b[C") s.selected = (s.selected + 1) % n;
      else if (data === "\x1b[Z" || data === "\x1b[D") s.selected = (s.selected - 1 + n) % n;
      else if (data === "\x1b[A") s.scroll -= 1;
      else if (data === "\x1b[B") s.scroll += 1;
      else if (data === "\x1b[5~") s.scroll -= page;
      else if (data === "\x1b[6~" || data === " ") s.scroll += page;
      else if (data === "\r") return activateButton(s.selected);
      else if (data === "\x1b" || data === "q" || data === "\x7f") return closeDialog();
      else return;
      renderDialog();
    };

    const buttonAt = (cell: GridCell | null) =>
      cell && dialog?.layout
        ? dialog.layout.buttons.find(
            (b) => b.row === cell.row && cell.col >= b.col && cell.col < b.col + b.len,
          ) ?? null
        : null;

    /** Clicking a project / experience item opens its dialog instead of printing. */
    const dialogFor = (cmd: string): DialogContent | null => {
      const project = cmd.match(/^project (\S+)$/);
      if (project) return projectDialog(project[1]);
      const exp = cmd.match(/^exp (\d+)$/);
      if (exp) return experienceDialog(parseInt(exp[1], 10) - 1);
      return null;
    };

    // ---- running commands ----
    const execute = (line: string) => {
      xterm.write("\r\n");
      const trimmed = line.trim();
      if (trimmed && history[history.length - 1] !== trimmed) history.push(trimmed);
      histIndex = history.length;
      buffer = "";

      const result = run(trimmed, cols(), history);
      for (const action of result.actions ?? []) {
        if (action.type === "clear") {
          transcript = [];
          xterm.write("\x1bc"); // full reset, queued after pending writes
          xterm.write(prompt());
          return;
        }
        if (action.type === "open") openLink(action.url);
        if (action.type === "theme") applyTheme(action.color);
        if (action.type === "classic") queue.push(() => navigate("/classic"));
      }
      transcript.push({ type: "cmd", input: trimmed });
      print(result.lines);
      showPrompt();
    };

    /**
     * Re-print the whole session at the current width (instantly). Output is
     * hard-wrapped when printed, so after a resize it would otherwise stay
     * wrapped at the old width.
     */
    const reflow = () => {
      flush();
      clearHover();
      const replayed: string[] = [];
      let out = "";
      for (const entry of transcript) {
        if (entry.type === "banner") {
          out += banner(cols()).join("\r\n") + "\r\n";
        } else {
          replayed.push(entry.input);
          const lines = run(entry.input, cols(), replayed).lines;
          out += prompt() + entry.input + "\r\n";
          if (lines.length) out += lines.join("\r\n") + "\r\n";
          out += "\r\n";
        }
      }
      xterm.write("\x1bc" + out + prompt() + buffer);
    };

    const complete = () => {
      const parts = buffer.split(" ");
      if (parts.length === 1) {
        const typed = parts[0].toLowerCase();
        // hidden commands only complete once you've started typing one
        const pool = typed ? [...COMPLETIONS, ...Object.keys(HIDDEN_COMMANDS)] : COMPLETIONS;
        const matches = pool.filter((c) => c.startsWith(typed));
        if (matches.length === 1) setLine(matches[0] + " ");
        else if (matches.length > 1) listMatches(matches);
      } else {
        const cmd = parts[0].toLowerCase();
        const partial = parts.slice(1).join(" ").toLowerCase();
        const matches = argCompletions(cmd).filter((c) => c.startsWith(partial));
        if (matches.length === 1) setLine(`${parts[0]} ${matches[0]}`);
        else if (matches.length > 1) listMatches(matches);
      }
    };

    const listMatches = (matches: string[]) => {
      // fill in the shared prefix first, like bash
      let common = matches[0];
      for (const m of matches) while (!m.startsWith(common)) common = common.slice(0, -1);
      const parts = buffer.split(" ");
      const current = parts.length === 1 ? parts[0] : parts.slice(1).join(" ");
      if (common.length > current.length) {
        setLine(parts.length === 1 ? common : `${parts[0]} ${common}`);
        return;
      }
      // word-wrapped, so names don't break across lines
      const list = wrap(matches.join("  "), cols()).join("\r\n");
      xterm.write("\r\n" + list + "\r\n" + prompt() + buffer);
    };

    const onData = (data: string) => {
      if (dialog) return dialogKey(data);
      if (busy) {
        // any key skips the typing animation
        flush();
        return;
      }
      if (data === "\r") return execute(buffer);
      if (data === "\x7f" || data === "\b") {
        if (buffer) {
          buffer = buffer.slice(0, -1);
          xterm.write("\b \b");
        }
        return;
      }
      if (data === "\t") return complete();
      if (data === "\x1b[A") {
        if (histIndex > 0) setLine(history[--histIndex]);
        return;
      }
      if (data === "\x1b[B") {
        if (histIndex < history.length - 1) setLine(history[++histIndex]);
        else {
          histIndex = history.length;
          setLine("");
        }
        return;
      }
      if (data === "\x03") {
        xterm.write("^C\r\n" + prompt());
        buffer = "";
        return;
      }
      if (data === "\x0c") {
        transcript = [];
        xterm.write("\x1bc"); // full reset, queued after pending writes
        xterm.write(prompt() + buffer);
        return;
      }
      if (data.startsWith("\x1b")) return; // ignore other escape sequences
      // typed or pasted text: keep printable characters, run on newline
      for (const ch of data) {
        if (ch === "\r" || ch === "\n") return execute(buffer);
        if (ch < " ") continue;
        if (prompt().length + buffer.length >= cols()) continue;
        buffer += ch;
        xterm.write(ch);
      }
    };

    const dataSub = xterm.onData(onData);

    runRef.current = (cmd: string) => {
      closeDialog();
      if (busy) flush();
      setLine(cmd);
      execute(cmd);
      focus();
    };

    // ---- mouse / touch ----
    const targetAt = (cell: GridCell | null) => {
      if (!cell) return null;
      const buf = xterm.buffer.active;
      const row = buf.viewportY + cell.row;
      const target = clickTarget((r) => buf.getLine(r)?.translateToString(true), row, cell.col, cols());
      return target ? { target, row } : null;
    };

    const stopPointer = setupPointer({
      screen,
      container,
      toCell: (x, y) => screenToCell(crt, container, x, y),
      lineHeight: () => painter.metrics().cellH,
      touchOnly,
      handlers: {
        hover: (cell) => {
          if (dialog) {
            const button = buttonAt(cell);
            const index = button ? button.index : null;
            if (index !== dialog.state.hover) {
              dialog.state.hover = index;
              renderDialog();
            }
            return button !== null;
          }
          const hit = targetAt(cell);
          if (hit) showHover(hit.target, hit.row);
          else clearHover();
          return hit !== null;
        },

        click: (cell, touch) => {
          if (dialog) {
            const button = buttonAt(cell);
            if (button) {
              dialog.state.selected = button.index;
              renderDialog();
              activateButton(button.index);
            }
            return;
          }
          const hit = targetAt(cell);
          if (!hit) return focus();
          const { target, row } = hit;
          const content = target.cmd ? dialogFor(target.cmd) : null;
          if (touch) {
            // brief flash so the tap feels acknowledged
            showHover(target, row);
            window.setTimeout(() => {
              clearHover();
              if (content) openDialog(content);
            }, content ? 140 : 180);
          } else {
            clearHover();
            if (content) openDialog(content);
          }
          if (content) return;
          if (target.url) openLink(target.url);
          else if (target.cmd) runRef.current(target.cmd);
          else if (target.fill) {
            // start the command on the prompt; the visitor types / TABs the rest
            if (busy) flush();
            setLine(target.fill);
            focus();
          }
        },

        scroll: (lines, source) => {
          if (dialog) {
            dialog.state.scroll += lines;
            renderDialog();
            return true;
          }
          clearHover();
          if (source === "touch") {
            xterm.scrollLines(lines);
            return true;
          }
          return false; // the renderer scrolls the terminal on wheel
        },

        allowSelection: () => !dialog,
      },
    });

    // ---- resizing ----
    let lastCols = xterm.cols;
    let reflowTimer: number | null = null;
    const resizeSub = xterm.onResize(({ cols: newCols }) => {
      if (dialog) renderDialog();
      if (newCols === lastCols) return;
      lastCols = newCols;
      if (reflowTimer !== null) window.clearTimeout(reflowTimer);
      // wait for the typing animation to finish rather than cutting it short
      const tryReflow = () => {
        if (busy) {
          reflowTimer = window.setTimeout(tryReflow, 200);
          return;
        }
        reflowTimer = null;
        reflow();
      };
      reflowTimer = window.setTimeout(tryReflow, 120);
    });
    // The renderer loads its font asynchronously; re-fit once it's measurable.
    document.fonts?.ready.then(() => {
      if (!disposed) fitTextScale(crt, container);
    });
    // Runs after the renderer's own resize handler (registered first).
    const onWindowResize = () => {
      fitTextScale(crt, container);
      if (dialog) renderDialog();
    };
    window.addEventListener("resize", onWindowResize);

    // ---- boot sequence (first visit per session) ----
    const booted = storageGet(session, "crt-booted");
    if (!booted && !reduceMotion) {
      queue.push(
        () => storageSet(session, "crt-booted", "1"),
        "SAMIH-BIOS v26.11  (c) 2026\r\n",
        { delay: 250 },
        "memory check ......... 640K OK\r\n",
        { delay: 200 },
        `mounting /projects ... ${projects.length} found\r\n`,
        { delay: 150 },
        `mounting /experience . ${experiences.length} found\r\n`,
        { delay: 300 },
        "starting shell ...\r\n\r\n",
        { delay: 400 },
      );
    }
    transcript.push({ type: "banner" });
    print(banner(cols()));
    queue.push(() => {
      xterm.write(prompt());
      busy = false;
    });
    startPump();
    focus();

    return () => {
      disposed = true;
      stopPump();
      if (reflowTimer !== null) window.clearTimeout(reflowTimer);
      window.removeEventListener("resize", onWindowResize);
      resizeSub.dispose();
      stopTrail();
      stopPointer();
      painter.dispose();
      stopTextureFix();
      dataSub.dispose();
      crt.dispose();
      xterm.dispose();
      hidden.remove();
      container.remove();
      runRef.current = () => {};
    };
  }, [unsupported, navigate]);

  if (unsupported || failed) return <Navigate to="/classic" replace />;

  return (
    <div className="crt-page">
      <div className="crt-center">
        <div ref={screenRef} className="crt-screen" aria-hidden="true" />
      </div>

      <nav className="crt-quickbar" aria-label="Terminal shortcuts">
        {QUICK_COMMANDS.map((cmd) => (
          <button key={cmd} type="button" onClick={() => runRef.current(cmd)}>
            {cmd}
          </button>
        ))}
        <a href="#/classic">plain site</a>
      </nav>

      {/* Same content as plain HTML for screen readers and search engines. */}
      <main className="visually-hidden">
        <h1>Hi, I'm Samih.</h1>
        <p>I'm a senior at Stanford, studying Computer Science.</p>
        <p>
          <a href="#/classic">View the plain version of this site</a>
        </p>
        <h2>Recent work</h2>
        <ul>
          {projects
            .filter((p) => !p.comingSoon)
            .map((p) => (
              <li key={p.slug}>
                <a href={p.demo ?? p.link ?? `#/project/${p.slug}`}>{p.title}</a>: {p.summary}
              </li>
            ))}
        </ul>
        <h2>Experience</h2>
        <ul>
          {experiences.map((e) => (
            <li key={`${e.org}-${e.period}`}>
              {e.role}, {e.org} ({e.period})
            </li>
          ))}
        </ul>
        <h2>Contact</h2>
        <ul>
          {Object.entries(LINKS).map(([name, url]) => (
            <li key={name}>
              <a href={url}>{name}</a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default CrtTerminalPage;
