/**
 * Tiny nano and vim look-alikes for the shell easter egg. Every file on this
 * site is read-only for the guest user, so you can open and edit the buffer
 * as much as you like, but saving fails the way the real editors fail:
 *   nano: [ Error writing projects.txt: Permission denied ]
 *   vim:  E45: 'readonly' option is set (add ! to override)
 * Drawn as a full-screen grid of cells, like the dialog.
 */
import type { Cell, Screen } from "./renderer";

export type EditorKind = "nano" | "vim";

export interface EditorColors {
  bg: string;
  fg: string;
  dim: string;
}

export interface EditorState {
  kind: EditorKind;
  name: string; // as typed; "" = unnamed buffer
  exists: boolean; // an existing (read-only) file
  lines: string[];
  row: number;
  col: number;
  top: number; // first visible line
  modified: boolean;
  message: string;
  // nano
  prompt: null | { kind: "write" | "save-on-exit"; input: string };
  cut: string[];
  lastWasCut: boolean;
  // vim
  mode: "normal" | "insert" | "command";
  command: string;
  pending: string; // first key of a two-key command (dd, gg, ZZ)
  warned: boolean; // "Changing a readonly file" shown
}

export function openEditor(
  kind: EditorKind,
  name: string,
  content: string | null,
  isDir: boolean,
): EditorState {
  const lines = content === null ? [""] : content.replace(/\n$/, "").split("\n");
  const bytes = content?.length ?? 0;
  let message = "";
  if (kind === "nano") {
    if (isDir) message = `"${name}" is a directory`;
    else if (content !== null) message = `File '${name}' is unwritable`;
    else if (name) message = "New File";
  } else {
    if (isDir) message = `"${name}" is a directory`;
    else if (content !== null) message = `"${name}" [readonly] ${lines.length}L, ${bytes}B`;
    else if (name) message = `"${name}" [New]`;
  }
  return {
    kind,
    name: isDir ? "" : name,
    exists: content !== null,
    lines,
    row: 0,
    col: 0,
    top: 0,
    modified: false,
    message,
    prompt: null,
    cut: [],
    lastWasCut: false,
    mode: "normal",
    command: "",
    pending: "",
    warned: false,
  };
}

/** Visible text rows for a screen height. */
function textRows(s: EditorState, rows: number) {
  return Math.max(s.kind === "nano" ? rows - 4 : rows - 1, 1);
}

// ---------------------------------------------------------------------------
// editing helpers
// ---------------------------------------------------------------------------

const line = (s: EditorState) => s.lines[s.row];
const maxCol = (s: EditorState) =>
  s.kind === "vim" && s.mode === "normal" ? Math.max(line(s).length - 1, 0) : line(s).length;
const clampCol = (s: EditorState) => {
  s.col = Math.min(Math.max(s.col, 0), maxCol(s));
};

function changed(s: EditorState) {
  s.modified = true;
  if (s.kind === "vim" && s.exists && !s.warned) {
    s.warned = true;
    s.message = "W10: Warning: Changing a readonly file";
  }
}

function insert(s: EditorState, text: string) {
  for (const ch of text) {
    if (ch === "\r" || ch === "\n") newline(s);
    else if (ch >= " ") {
      const l = line(s);
      s.lines[s.row] = l.slice(0, s.col) + ch + l.slice(s.col);
      s.col++;
      changed(s);
    }
  }
}

function newline(s: EditorState) {
  const l = line(s);
  s.lines.splice(s.row, 1, l.slice(0, s.col), l.slice(s.col));
  s.row++;
  s.col = 0;
  changed(s);
}

function backspace(s: EditorState) {
  if (s.col > 0) {
    const l = line(s);
    s.lines[s.row] = l.slice(0, s.col - 1) + l.slice(s.col);
    s.col--;
    changed(s);
  } else if (s.row > 0) {
    const prev = s.lines[s.row - 1];
    s.lines.splice(s.row - 1, 2, prev + line(s));
    s.row--;
    s.col = prev.length;
    changed(s);
  }
}

function deleteChar(s: EditorState) {
  const l = line(s);
  if (s.col < l.length) {
    s.lines[s.row] = l.slice(0, s.col) + l.slice(s.col + 1);
    changed(s);
  } else if (s.kind === "nano" && s.row < s.lines.length - 1) {
    s.lines.splice(s.row, 2, l + s.lines[s.row + 1]);
    changed(s);
  }
}

/** Arrows, Home/End, PgUp/PgDn. Returns true if `data` was a movement key. */
function move(s: EditorState, data: string, page: number): boolean {
  switch (data) {
    case "\x1b[A":
      s.row = Math.max(s.row - 1, 0);
      break;
    case "\x1b[B":
      s.row = Math.min(s.row + 1, s.lines.length - 1);
      break;
    case "\x1b[C":
      if (s.col < maxCol(s)) s.col++;
      else if (s.kind === "nano" && s.row < s.lines.length - 1) {
        s.row++;
        s.col = 0;
      }
      return true;
    case "\x1b[D":
      if (s.col > 0) s.col--;
      else if (s.kind === "nano" && s.row > 0) {
        s.row--;
        s.col = line(s).length;
      }
      return true;
    case "\x1b[H":
    case "\x1b[1~":
    case "\x1bOH":
      s.col = 0;
      return true;
    case "\x1b[F":
    case "\x1b[4~":
    case "\x1bOF":
      s.col = maxCol(s);
      return true;
    case "\x1b[5~":
      s.row = Math.max(s.row - page, 0);
      break;
    case "\x1b[6~":
      s.row = Math.min(s.row + page, s.lines.length - 1);
      break;
    default:
      return false;
  }
  clampCol(s);
  return true;
}

function scrollIntoView(s: EditorState, rows: number) {
  const h = textRows(s, rows);
  if (s.row < s.top) s.top = s.row;
  if (s.row >= s.top + h) s.top = s.row - h + 1;
  s.top = Math.max(0, Math.min(s.top, Math.max(s.lines.length - 1, 0)));
}

/** Scroll the view (mouse wheel / swipe), keeping the cursor on screen. */
export function editorScroll(s: EditorState, lines: number, rows: number) {
  const h = textRows(s, rows);
  s.top = Math.max(0, Math.min(s.top + lines, Math.max(s.lines.length - h, 0)));
  s.row = Math.min(Math.max(s.row, s.top), s.top + h - 1, s.lines.length - 1);
  clampCol(s);
}

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------

/** Handle input; returns "close" when the editor exits. */
export function editorKey(s: EditorState, data: string, rows: number): "close" | void {
  const result = s.kind === "nano" ? nanoKey(s, data, rows) : vimKey(s, data, rows);
  scrollIntoView(s, rows);
  return result;
}

function nanoWrite(s: EditorState, name: string) {
  // the home directory and every file in it belong to samih, not guest
  s.message = name ? `Error writing ${name}: Permission denied` : "Cancelled";
}

function nanoKey(s: EditorState, data: string, rows: number): "close" | void {
  const page = textRows(s, rows) - 2;

  if (s.prompt) {
    const p = s.prompt;
    if (data === "\x03" || data === "\x1b") {
      s.prompt = null;
      s.message = "Cancelled";
    } else if (p.kind === "save-on-exit") {
      if (/^[yY]$/.test(data)) s.prompt = { kind: "write", input: s.name };
      else if (/^[nN]$/.test(data)) return "close";
    } else if (data === "\r") {
      s.prompt = null;
      nanoWrite(s, p.input.trim());
    } else if (data === "\x7f" || data === "\b") {
      p.input = p.input.slice(0, -1);
    } else if (!data.startsWith("\x1b")) {
      p.input += [...data].filter((ch) => ch >= " ").join("");
    }
    return;
  }

  const wasCut = s.lastWasCut;
  s.lastWasCut = false;
  if (data !== "\x0b") s.message = "";

  switch (data) {
    case "\x18": // ^X
    case "\x1bOQ": // F2
      if (!s.modified) return "close";
      s.prompt = { kind: "save-on-exit", input: "" };
      return;
    case "\x0f": // ^O
    case "\x1bOR": // F3
      s.prompt = { kind: "write", input: s.name };
      return;
    case "\x0b": {
      // ^K: cut the line (consecutive cuts collect)
      const cutLine = s.lines.length > 1 ? s.lines.splice(s.row, 1)[0] : s.lines.splice(0, 1, "")[0];
      s.cut = wasCut ? [...s.cut, cutLine] : [cutLine];
      s.row = Math.min(s.row, s.lines.length - 1);
      s.col = 0;
      s.lastWasCut = true;
      s.message = "";
      changed(s);
      return;
    }
    case "\x15": // ^U: paste
      if (!s.cut.length) {
        s.message = "Cutbuffer is empty";
        return;
      }
      s.lines.splice(s.row, 0, ...s.cut);
      s.row += s.cut.length;
      s.col = 0;
      changed(s);
      return;
    case "\x03": {
      // ^C: cursor position
      const total = s.lines.join("\n").length + 1;
      const char = s.lines.slice(0, s.row).reduce((n, l) => n + l.length + 1, 0) + s.col + 1;
      const pct = (a: number, b: number) => Math.round((a / Math.max(b, 1)) * 100);
      s.message =
        `line ${s.row + 1}/${s.lines.length} (${pct(s.row + 1, s.lines.length)}%), ` +
        `col ${s.col + 1}/${line(s).length + 1} (${pct(s.col + 1, line(s).length + 1)}%), ` +
        `char ${char}/${total} (${pct(char, total)}%)`;
      return;
    }
    case "\x07": // ^G
      s.message = "Help is not available on this system";
      return;
    case "\r":
      newline(s);
      return;
    case "\x7f":
    case "\b":
      backspace(s);
      return;
    case "\x1b[3~":
      deleteChar(s);
      return;
    case "\t":
      insert(s, "    ");
      return;
  }
  if (move(s, data, page)) return;
  if (data.startsWith("\x1b") || (data.length === 1 && data < " ")) return; // other keys
  insert(s, data);
}

function vimKey(s: EditorState, data: string, rows: number): "close" | void {
  const page = textRows(s, rows) - 2;

  if (s.mode === "command") {
    if (data === "\x1b" || data === "\x03") {
      s.mode = "normal";
      s.command = "";
    } else if (data === "\r") {
      const cmd = s.command;
      s.mode = "normal";
      s.command = "";
      return vimCommand(s, cmd.trim());
    } else if (data === "\x7f" || data === "\b") {
      if (!s.command) s.mode = "normal";
      s.command = s.command.slice(0, -1);
    } else if (!data.startsWith("\x1b")) {
      s.command += [...data].filter((ch) => ch >= " ").join("");
    }
    return;
  }

  if (s.mode === "insert") {
    if (data === "\x1b" || data === "\x03") {
      s.mode = "normal";
      if (s.message === "-- INSERT --") s.message = "";
      s.col = Math.max(s.col - 1, 0);
      clampCol(s);
    } else if (data === "\r") newline(s);
    else if (data === "\x7f" || data === "\b") backspace(s);
    else if (data === "\x1b[3~") deleteChar(s);
    else if (data === "\t") insert(s, "    ");
    else if (!move(s, data, page) && !data.startsWith("\x1b")) insert(s, data);
    return;
  }

  // normal mode
  const pending = s.pending;
  s.pending = "";
  if (move(s, data, page)) return;
  const enterInsert = () => {
    s.mode = "insert";
    if (!s.message.startsWith("W10")) s.message = "";
  };
  switch (pending + data) {
    case "h":
      s.col = Math.max(s.col - 1, 0);
      return;
    case "l":
    case " ":
      s.col = Math.min(s.col + 1, maxCol(s));
      return;
    case "j":
      s.row = Math.min(s.row + 1, s.lines.length - 1);
      clampCol(s);
      return;
    case "k":
      s.row = Math.max(s.row - 1, 0);
      clampCol(s);
      return;
    case "0":
    case "^":
      s.col = data === "^" ? line(s).search(/\S|$/) : 0;
      clampCol(s);
      return;
    case "$":
      s.col = maxCol(s);
      return;
    case "w":
    case "b": {
      const l = line(s);
      if (data === "w") {
        const m = l.slice(s.col).match(/^\S*\s+/);
        s.col = m ? s.col + m[0].length : l.length;
      } else {
        const before = l.slice(0, s.col).replace(/\s+$/, "");
        s.col = before.search(/\S+$/) >= 0 ? before.search(/\S+$/) : 0;
      }
      clampCol(s);
      return;
    }
    case "G":
      s.row = s.lines.length - 1;
      clampCol(s);
      return;
    case "gg":
      s.row = 0;
      clampCol(s);
      return;
    case "x":
      if (line(s).length) {
        deleteChar(s);
        clampCol(s);
      }
      return;
    case "dd":
      if (s.lines.length > 1) s.lines.splice(s.row, 1);
      else s.lines[0] = "";
      s.row = Math.min(s.row, s.lines.length - 1);
      clampCol(s);
      changed(s);
      return;
    case "i":
      enterInsert();
      return;
    case "a":
      enterInsert();
      s.col = Math.min(s.col + 1, line(s).length);
      return;
    case "I":
      enterInsert();
      s.col = line(s).search(/\S|$/);
      return;
    case "A":
      enterInsert();
      s.col = line(s).length;
      return;
    case "o":
    case "O":
      enterInsert();
      if (data === "o") s.row++;
      s.lines.splice(s.row, 0, "");
      s.col = 0;
      changed(s);
      return;
    case "u":
      s.message = s.modified ? "Undo is not supported here" : "Already at oldest change";
      return;
    case ":":
      s.mode = "command";
      s.command = "";
      s.message = "";
      return;
    case "ZZ":
      return vimCommand(s, "x");
    case "ZQ":
      return vimCommand(s, "q!");
    case "\x03":
      s.message = "Type  :qa!  and press <Enter> to abandon all changes and exit Vim";
      return;
    case "d":
    case "g":
    case "Z":
      s.pending = data;
      return;
  }
}

function vimCommand(s: EditorState, cmd: string): "close" | void {
  if (!cmd) return;
  if (/^\d+$/.test(cmd)) {
    s.row = Math.min(Math.max(parseInt(cmd, 10) - 1, 0), s.lines.length - 1);
    clampCol(s);
    return;
  }
  const noName = "E32: No file name";
  const readonly = "E45: 'readonly' option is set (add ! to override)";
  const cantWrite = `"${s.name}" E212: Can't open file for writing`;
  const write = (force: boolean) => {
    if (!s.name) s.message = noName;
    else if (s.exists && !force) s.message = readonly;
    else s.message = cantWrite;
  };
  switch (cmd) {
    case "q":
    case "quit":
    case "qa":
    case "qall":
      if (s.modified) {
        s.message = "E37: No write since last change (add ! to override)";
        return;
      }
      return "close";
    case "q!":
    case "quit!":
    case "qa!":
    case "qall!":
    case "cq":
      return "close";
    case "x":
    case "xit":
    case "exit":
      if (!s.modified) return "close";
      return write(false);
    case "w":
    case "write":
    case "wq":
    case "wa":
    case "wqa":
      return write(false);
    case "w!":
    case "write!":
    case "wq!":
    case "x!":
      return write(true);
    case "help":
    case "h":
      s.message = "E149: Sorry, no help here. Try :q";
      return;
    default:
      s.message = `E492: Not an editor command: ${cmd}`;
  }
}

// ---------------------------------------------------------------------------
// drawing
// ---------------------------------------------------------------------------

export function layoutEditor(s: EditorState, cols: number, rows: number, c: EditorColors): Screen {
  const cells: (Cell | null)[][] = Array.from({ length: rows }, () => Array<Cell | null>(cols).fill(null));
  const put = (row: number, col: number, text: string, fg = c.fg, bg = c.bg) => {
    if (row < 0 || row >= rows) return;
    for (let i = 0; i < text.length; i++) {
      const x = col + i;
      if (x >= 0 && x < cols) cells[row][x] = { ch: text[i], fg, bg };
    }
  };
  const bar = (row: number) => put(row, 0, " ".repeat(cols), c.bg, c.fg);
  const inverse = (row: number, col: number, text: string) => put(row, col, text, c.bg, c.fg);
  let cursor: { row: number; col: number } | null = null;

  const h = textRows(s, rows);
  const y0 = s.kind === "nano" ? 1 : 0;
  // long lines: the cursor's line scrolls sideways; others are cut with a marker
  for (let i = 0; i < h; i++) {
    const n = s.top + i;
    const y = y0 + i;
    if (n >= s.lines.length) {
      if (s.kind === "vim") put(y, 0, "~", c.dim);
      continue;
    }
    const text = s.lines[n];
    let offset = 0;
    if (n === s.row && s.col >= cols - 1) offset = s.col - (cols - 2);
    let shown = text.slice(offset, offset + cols);
    if (text.length - offset > cols) shown = shown.slice(0, cols - 1) + (s.kind === "nano" ? ">" : "@");
    if (offset > 0 && s.kind === "nano") shown = "<" + shown.slice(1);
    put(y, 0, shown);
    if (n === s.row) cursor = { row: y, col: s.col - offset };
  }

  if (s.kind === "nano") {
    // title bar
    bar(0);
    const title = s.name || "New Buffer";
    inverse(0, 2, "GNU nano 7.2".slice(0, Math.max(cols - 4, 0)));
    inverse(0, Math.max(Math.floor((cols - title.length) / 2), 15), title.slice(0, cols - 16));
    if (s.modified && cols > 40) inverse(0, cols - 10, "Modified");

    const statusRow = rows - 3;
    const helpA = [
      ["^G", "Help"],
      ["^O", "Write Out"],
      ["^W", "Where Is"],
      ["^K", "Cut"],
      ["^C", "Location"],
    ];
    const helpB = [
      ["^X", "Exit"],
      ["^R", "Read File"],
      ["^\\", "Replace"],
      ["^U", "Paste"],
      ["M-U", "Undo"],
    ];
    let help = [helpA, helpB];
    if (s.prompt?.kind === "save-on-exit") {
      help = [[[" Y", "Yes"]], [[" N", "No"], ["^C", "Cancel"]]];
      bar(statusRow);
      inverse(statusRow, 0, "Save modified buffer? ");
      cursor = { row: statusRow, col: 22 };
    } else if (s.prompt) {
      help = [[["^G", "Help"], ["M-D", "DOS Format"]], [["^C", "Cancel"], ["M-M", "Mac Format"]]];
      bar(statusRow);
      const label = `File Name to Write: ${s.prompt.input}`;
      inverse(statusRow, 0, label.slice(-cols));
      cursor = { row: statusRow, col: Math.min(label.length, cols - 1) };
    } else if (s.message) {
      const msg = `[ ${s.message} ]`.slice(0, cols);
      inverse(statusRow, Math.max(Math.floor((cols - msg.length) / 2), 0), msg);
    }
    const slot = Math.max(Math.floor(cols / Math.max(helpA.length, 1)), 8);
    help.forEach((items, r) =>
      items.forEach(([key, label], i) => {
        const x = i * slot;
        if (x + key.length >= cols) return;
        inverse(rows - 2 + r, x, key);
        put(rows - 2 + r, x + key.length + 1, label.slice(0, slot - key.length - 1));
      }),
    );
  } else {
    const last = rows - 1;
    if (s.mode === "command") {
      put(last, 0, `:${s.command}`.slice(-cols));
      cursor = { row: last, col: Math.min(s.command.length + 1, cols - 1) };
    } else {
      const msg = s.message || (s.mode === "insert" ? "-- INSERT --" : "");
      put(last, 0, msg.slice(0, cols));
      if (cols >= 40 && msg.length < cols - 20) {
        const h2 = textRows(s, rows);
        const where =
          s.lines.length <= h2
            ? "All"
            : s.top === 0
              ? "Top"
              : s.top + h2 >= s.lines.length
                ? "Bot"
                : `${Math.round((s.top / (s.lines.length - h2)) * 100)}%`;
        const pos = `${s.row + 1},${s.lines[s.row].length ? s.col + 1 : "0-1"}`;
        put(last, cols - 18, pos.padEnd(14) + where);
      }
    }
  }

  // block cursor (inverted cell)
  if (cursor && cursor.row >= 0 && cursor.row < rows && cursor.col >= 0 && cursor.col < cols) {
    const under = cells[cursor.row][cursor.col];
    const onBar = under && under.bg === c.fg;
    cells[cursor.row][cursor.col] = {
      ch: under?.ch ?? " ",
      fg: onBar ? c.fg : c.bg,
      bg: onBar ? c.bg : c.fg,
    };
  }

  return { bg: c.bg, cells, frames: [] };
}
