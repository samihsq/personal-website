import { projects } from "../data/projects";
import { experiences } from "../data/experience";
import { blockLines } from "./blockText";

/**
 * A tiny fake shell for the CRT terminal.
 * Commands return plain text lines; the terminal component handles
 * wrapping, the typewriter effect and writing to xterm.
 */

export const LINKS: Record<string, string> = {
  github: "https://github.com/samihsq",
  linkedin: "https://linkedin.com/in/samihsq",
};

// ---------------------------------------------------------------------------
// A tiny read-only filesystem, for people who reach for cd / ls / cat.
//   ~/projects/projects.txt     cat -> same as `projects`
//   ~/projects/cardipool.sh     ./ or sh -> that project's dialog; cat -> its source
// ---------------------------------------------------------------------------

type FsFile = { kind: "text"; cmd: string } | { kind: "script"; open: string };

const ORG_STOPWORDS = new Set(["of", "the", "department", "school", "university", "lab", "and"]);
function orgSlug(org: string) {
  const words = org
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => !ORG_STOPWORDS.has(w));
  return words.slice(0, 2).join("-") || "role";
}

function buildFs(): Record<string, Record<string, FsFile>> {
  const projectsDir: Record<string, FsFile> = { "projects.txt": { kind: "text", cmd: "projects" } };
  for (const p of projects.filter((x) => !x.comingSoon)) {
    projectsDir[`${p.slug}.sh`] = { kind: "script", open: `project ${p.slug}` };
  }
  const experienceDir: Record<string, FsFile> = { "experience.txt": { kind: "text", cmd: "experience" } };
  experiences.forEach((e, i) => {
    experienceDir[`${i + 1}-${orgSlug(e.org)}.sh`] = { kind: "script", open: `exp ${i + 1}` };
  });
  return {
    about: { "about.txt": { kind: "text", cmd: "about" } },
    projects: projectsDir,
    experience: experienceDir,
    contact: { "contact.txt": { kind: "text", cmd: "contact" } },
  };
}

const FS = buildFs();
const DIRECTORIES = Object.keys(FS).sort(); // ls order: about, contact, experience, projects

/** A path resolved against the current directory ("" is home). */
type FsPath = { dir: string; file?: string };

function resolvePath(path: string, cwd: string): FsPath | null {
  const fromHome = path.startsWith("~") || path.startsWith("/");
  const segments = [...(fromHome || !cwd ? [] : [cwd]), ...path.replace(/^~/, "").split("/")];
  const stack: string[] = [];
  for (const seg of segments) {
    if (!seg || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  if (stack.length === 0) return { dir: "" };
  const dir = FS[stack[0]];
  if (!dir) return null;
  if (stack.length === 1) return { dir: stack[0] };
  if (stack.length === 2 && dir[stack[1]]) return { dir: stack[0], file: stack[1] };
  return null;
}

/** The entries of a directory as `ls` prints them. */
function entries(dir: string): string[] {
  return dir ? Object.keys(FS[dir]) : DIRECTORIES.map((d) => `${d}/`);
}

/** Names in columns, filled top to bottom like `ls`. */
export function columns(names: string[], cols: number): string[] {
  const width = Math.max(...names.map((n) => n.length)) + 2;
  const perRow = Math.max(1, Math.floor((cols + 2) / width));
  const rows = Math.ceil(names.length / perRow);
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < perRow; c++) {
      const name = names[c * rows + r];
      if (name) line += name.padEnd(width);
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Every file/dir name that could finish `partial` (a path) from `cwd`. */
export function pathCompletions(partial: string, cwd: string, scriptsOnly = false): string[] {
  const slash = partial.lastIndexOf("/");
  const base = slash >= 0 ? partial.slice(0, slash + 1) : "";
  const where = base ? resolvePath(base, cwd) : { dir: cwd };
  if (!where || where.file) return [];
  return entries(where.dir)
    .filter((name) => !scriptsOnly || name.endsWith("/") || name.endsWith(".sh"))
    .map((name) => base + name);
}

/** File or directory by bare name (names are unique across the tree). */
function entryByName(name: string): { dir: string; file?: string; entry?: FsFile } | null {
  const bare = name.replace(/\/$/, "");
  if (FS[bare]) return { dir: bare };
  for (const [dir, files] of Object.entries(FS)) if (files[name]) return { dir, file: name, entry: files[name] };
  return null;
}

export const PROMPT = "guest@samih.dev:~$ ";

/** The prompt for a directory, shortened on narrow screens. */
export function promptFor(cwd: string, termCols: number) {
  const where = cwd ? `~/${cwd}` : "~";
  const full = `guest@samih.dev:${where}$ `;
  if (termCols >= full.length + 24) return full;
  if (cwd && termCols >= where.length + 26) return `${where}$ `;
  return "$ ";
}

export type ShellAction =
  | { type: "clear" }
  | { type: "open"; url: string }
  | { type: "classic" }
  | { type: "theme"; color: string }
  | { type: "shutdown" }
  | { type: "dialog"; cmd: string }
  /** bare `cat`: echo typed lines until ^D or ^C */
  | { type: "stdin" }
  /** nano / vim: content null = new file (or a directory, when isDir). */
  | { type: "editor"; editor: "nano" | "vim"; name: string; content: string | null; isDir: boolean };

export interface ShellResult {
  lines: string[];
  actions?: ShellAction[];
  /** New working directory, after `cd`. */
  cwd?: string;
}

export const THEMES: Record<string, string> = {
  green: "#0ccc68",
  amber: "#ffb000",
  white: "#e8f0ff",
  blue: "#6ec8ff",
};

const visibleProjects = projects.filter((p) => !p.comingSoon);

/** Wrap one paragraph to `width`, prefixing continuation lines with `indent`. */
export function wrap(text: string, width: number, indent = "", firstIndent = indent): string[] {
  width = Math.max(width, 8);
  // On very narrow screens, drop indents rather than looping forever.
  if (indent.length > width / 2) indent = "";
  if (firstIndent.length > width / 2) firstIndent = "";
  const out: string[] = [];
  let line = firstIndent;
  let hasWord = false;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (hasWord && line.length + 1 + word.length > width) {
      out.push(line);
      line = indent + word;
    } else {
      line = hasWord ? `${line} ${word}` : line + word;
    }
    hasWord = true;
    // hard-break words (e.g. long URLs) that don't fit on a line
    while (line.length > width) {
      out.push(line.slice(0, width));
      line = indent + line.slice(width);
    }
  }
  out.push(line);
  return out;
}

export function banner(cols: number): string[] {
  // big pixel-tile lettering (see blockText.ts), or plain text if it won't fit
  const head = blockLines("SAMIH", cols) ?? ["== SAMIH =="];
  return [
    ...head,
    "",
    ...wrap("Hi, I'm Samih. I'm a senior at Stanford, studying Computer Science.", cols),
    "",
    ...wrap(
      touchMode
        ? "Tap 'help' or the buttons below. Names on screen are tappable too."
        : "Type 'help', click any name or command on screen, or use bash commands.",
      cols,
    ),
    "",
    ...wrap("Try 'experience', 'projects' or 'contact'.", cols),
    "",
  ];
}

export const COMMANDS: { name: string; usage: string; desc: string }[] = [
  { name: "about", usage: "about", desc: "who I am" },
  { name: "experience", usage: "experience", desc: "list where I've worked" },
  { name: "exp", usage: "exp <number>", desc: "details on one role" },
  { name: "projects", usage: "projects", desc: "list my recent work" },
  { name: "project", usage: "project <name>", desc: "details on one project" },
  { name: "contact", usage: "contact", desc: "where to find me" },
  { name: "open", usage: "open <name>", desc: "open a project, github or linkedin" },
  { name: "theme", usage: "theme <color>", desc: "green, amber, white or blue" },
  { name: "classic", usage: "classic", desc: "switch to the plain website" },
  { name: "clear", usage: "clear", desc: "clear the screen" },
  { name: "credits", usage: "credits", desc: "what powers this screen" },
  { name: "help", usage: "help", desc: "show this list" },
];

/**
 * Easter eggs: not listed in `help` and not offered by TAB on an empty line,
 * but they still complete once you've typed the start of one.
 */
export const HIDDEN_COMMANDS: Record<string, string> = {
  claude: "ok bro.",
  codex: "really?",
  opencode: "nice bro.",
  yes: "this is hosted on github, pal.",
};

/** Hidden commands that do something; they complete the same way. */
export const SHUTDOWN_COMMANDS = ["shutdown", "poweroff", "halt"];

/** Hidden editors (read-only files: you can look, not save). */
export const EDITOR_COMMANDS = ["nano", "vim", "vi", "nvim"];
export const SHUTDOWN_SECONDS = 5;

export const COMPLETIONS = [
  ...COMMANDS.map((c) => c.name),
  "whoami",
  "ls",
  "cd",
  "pwd",
  "cat",
  "head",
  "tail",
  "history",
  "banner",
  "echo",
  "date",
];

/** Every command the shell answers to, hidden ones included (double TAB lists them). */
export const ALL_COMMANDS = [
  ...new Set([
    ...COMPLETIONS,
    ...Object.keys(HIDDEN_COMMANDS),
    ...SHUTDOWN_COMMANDS,
    ...EDITOR_COMMANDS,
    ...["whoami", "links", "work", "gui", "exit", "cls", "sh", "bash", "source", ".", "sudo", "rm", "rmdir"],
  ]),
].sort((a, b) => a.localeCompare(b));

/** Arguments that tab-complete after a given command. */
export function argCompletions(cmd: string, cwd = "", partial = ""): string[] {
  switch (cmd) {
    case "cat":
      // files first; at home `cat <project>` still works as a shortcut
      return [...pathCompletions(partial, cwd), ...(cwd || partial.includes("/") ? [] : visibleProjects.map((p) => p.slug))];
    case "ls":
    case "rm":
    case "head":
    case "tail":
    case "nano":
    case "vi":
    case "vim":
    case "nvim":
      return pathCompletions(partial, cwd);
    case "cd":
    case "rmdir":
      return pathCompletions(partial, cwd).filter((p) => p.endsWith("/"));
    case "sh":
    case "bash":
    case "source":
      return pathCompletions(partial, cwd, true);
    case "project":
      return visibleProjects.map((p) => p.slug);
    case "open":
      return [...visibleProjects.map((p) => p.slug), ...Object.keys(LINKS)];
    case "theme":
      return Object.keys(THEMES);
    case "exp":
      return experiences.map((_, i) => String(i + 1));
    default:
      return [];
  }
}

function findProject(query: string) {
  const q = query.toLowerCase();
  // by its number in the `projects` list
  if (/^\d+$/.test(q)) return visibleProjects[parseInt(q, 10) - 1];
  return (
    visibleProjects.find((p) => p.slug === q) ??
    visibleProjects.find((p) => p.title.toLowerCase() === q) ??
    visibleProjects.find((p) => p.slug.startsWith(q))
  );
}

/** "label value" on one line if it fits, otherwise label above the value. */
function field(label: string, value: string, cols: number): string[] {
  if (label.length + value.length <= cols) return [label + value];
  return [label.trim(), ...wrap(value, cols)];
}

function hr(cols: number) {
  return "-".repeat(Math.min(cols, 60));
}

// ---------------------------------------------------------------------------
// Click / tap targets: work out what a click on a given character should do,
// from the text on that line (and the lines just above it).
// ---------------------------------------------------------------------------

/** The list a bare number picks from: whichever of `projects` / `experience` ran last. */
let lastList: "projects" | "experience" | null = null;

/** On phones/tablets the shell is tap-only, so wording changes slightly. */
let touchMode = false;
export function setTouchMode(on: boolean) {
  touchMode = on;
}

export interface ClickTarget {
  start: number; // first column to highlight
  end: number; // column after the last one to highlight
  cmd?: string; // command to run
  url?: string; // link to open
  /** Text to put on the prompt for the visitor to finish, e.g. "project ". */
  fill?: string;
  /** Whole list items (projects / experience) span several rows and get a box. */
  block?: { top: number; bottom: number };
}

/**
 * Commands that need an argument. On desktop, clicking one starts it on the
 * prompt for you to finish; on phones (no typing) it shows the list to tap.
 */
const LIST_FOR: Record<string, string> = {
  project: "projects",
  cat: "projects",
  exp: "experience",
  open: "contact",
};

const COMMAND_NAMES = new Set(COMMANDS.map((c) => c.name));

function trimmedEnd(line: string) {
  return line.replace(/\s+$/, "").length;
}

/**
 * What clicking column `col` of buffer row `row` should do, or null.
 * `getLine(r)` returns the text of buffer row r (or undefined past the ends).
 */
export function clickTarget(
  getLine: (row: number) => string | undefined,
  row: number,
  col: number,
  /** Wrap width output was printed at; hard-wrapped lines fill it exactly. */
  width = Infinity,
): ClickTarget | null {
  const line = getLine(row);
  if (!line || col >= trimmedEnd(line)) return null;

  // 'quoted commands' anywhere, e.g. Type 'help'. The quotes must sit at word
  // boundaries so apostrophes (I'm, Stanford's) don't pair up with them.
  for (const m of line.matchAll(/(^|[\s(])'([^'\s][^']*)'(?=$|[\s.,;:!?)])/g)) {
    const start = (m.index ?? 0) + m[1].length;
    const end = start + m[2].length + 2;
    if (col < start || col >= end) continue;
    const inner = m[2].trim();
    const base = inner.split(/\s+/)[0].toLowerCase();
    if (inner.includes("<")) {
      // usage hints like 'project <name>': start the command on the prompt;
      // not clickable on phones, where the items themselves are tappable
      if (touchMode) continue;
      return { start, end, fill: `${base} ` };
    }
    if (COMMAND_NAMES.has(base) || COMPLETIONS.includes(base)) return { start, end, cmd: inner };
  }

  // plain URLs (long ones may have been hard-wrapped onto the next lines)
  const urlTail = (r: number) => {
    let tail = "";
    for (let next = getLine(r + 1); next && /^[\w\-./~%?#=&:+]+$/.test(next.trimEnd()); next = getLine(++r + 1)) {
      tail += next.trimEnd();
      if (trimmedEnd(next) < width) break; // this piece didn't fill the line: it's the last
    }
    return tail;
  };
  for (const m of line.matchAll(/https?:\/\/\S+/g)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (col < start || col >= end) continue;
    const reachesEnd = end >= trimmedEnd(line) && trimmedEnd(line) >= width;
    return { start, end, url: m[0] + (reachesEnd ? urlTail(row) : "") };
  }
  // ...or this line is the wrapped remainder of a URL that started above
  if (/^[\w\-./~%?#=&:+]+$/.test(line.trimEnd())) {
    for (let r = row - 1; r >= row - 4; r--) {
      const above = getLine(r);
      if (!above) break;
      const m = above.trimEnd().match(/https?:\/\/\S+$/);
      if (m && trimmedEnd(above) < width) break;
      if (m) return { start: 0, end: trimmedEnd(line), url: m[0] + urlTail(r) };
      if (!/^[\w\-./~%?#=&:+]+$/.test(above.trimEnd()) || trimmedEnd(above) < width) break;
    }
  }

  // `ls -l` rows: "-rwxr-xr-x 1 samih samih 812 Nov 23 14:02 cardipool.sh"
  const longRow = line.match(/^[d-][rwx-]{9}\s+\d+\s+\S+\s+\S+\s+\S+\s+\w{3}\s+\d+\s+[\d:]+\s+(\S+?)[/*]?\s*$/);
  if (longRow) {
    const name = longRow[1].split("/").pop() ?? "";
    const start = line.lastIndexOf(longRow[1]);
    const end = start + longRow[1].length;
    if (col < start || col >= end) return null;
    if (FS[name]) return { start, end, cmd: `cd ~/${name}` };
    const found = entryByName(name);
    if (!found?.entry) return null;
    return { start, end, cmd: found.entry.kind === "script" ? found.entry.open : found.entry.cmd };
  }

  // `ls` output: "about/  projects/ ..." or "projects.txt  cardipool.sh ..."
  if (/^([\w.-]+[/*]?)(\s+[\w.-]+[/*]?)*\s*$/.test(line)) {
    for (const m of line.matchAll(/[\w.-]+[/*]?/g)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (col < start || col >= end) continue;
      const found = entryByName(m[0].replace(/\*$/, ""));
      if (!found || (!found.entry && !m[0].endsWith("/"))) break;
      if (!found.entry) return { start, end, cmd: `cd ~/${found.dir}` };
      const cmd = found.entry.kind === "script" ? found.entry.open : found.entry.cmd;
      return { start, end, cmd };
    }
  }

  // contact lines: "github    https://..."
  const contact = line.match(/^(\w+)\s+https?:\/\//);
  if (contact && LINKS[contact[1]]) {
    return { start: 0, end: trimmedEnd(line), url: LINKS[contact[1]] };
  }

  /** Command for a list item or help row, e.g. "* cardipool  [Web]", " 3. Role @ Org", "  about". */
  const itemAt = (text: string): string | null => {
    // numbered list items: " 1. cardipool  [Web]" (projects) or " 1. Role @ Org" (experience)
    const numbered = text.match(/^\s*(\d+)\.\s+(\S+)/);
    if (numbered) {
      const n = parseInt(numbered[1], 10);
      if (visibleProjects[n - 1]?.slug === numbered[2]) return `project ${numbered[2]}`;
      return n >= 1 && n <= experiences.length ? `exp ${n}` : null;
    }
    // help rows are "  <usage>" then 2+ spaces or end of line, so wrapped
    // prose that merely starts with a command word isn't mistaken for one
    const help = COMMANDS.find((c) => {
      const prefix = `  ${c.usage}`;
      if (!text.startsWith(prefix)) return false;
      const rest = text.slice(prefix.length);
      return rest.trim() === "" || rest.startsWith("  ");
    });
    if (help) {
      if (LIST_FOR[help.name] && !touchMode) return `fill:${help.name} `;
      return LIST_FOR[help.name] ?? help.name;
    }
    return null;
  };

  const indentOf = (text: string) => text.length - text.trimStart().length;
  const indent = indentOf(line);

  /**
   * Target for the item starting at row `top`. Projects and experience entries
   * cover the item line plus its indented continuation lines, so they can be
   * boxed as one block; help rows highlight just the hovered line.
   */
  const itemTarget = (top: number, cmd: string): ClickTarget => {
    if (cmd.startsWith("fill:")) {
      return { start: indent, end: trimmedEnd(line), fill: cmd.slice(5) };
    }
    if (!/^(project|exp) /.test(cmd)) {
      return { start: indent, end: trimmedEnd(line), cmd };
    }
    const first = getLine(top) ?? "";
    let bottom = top;
    let end = trimmedEnd(first);
    for (let r = top + 1; r <= top + 8; r++) {
      const next = getLine(r);
      if (!next || next.trim() === "" || indentOf(next) < 4 || itemAt(next)) break;
      bottom = r;
      end = Math.max(end, trimmedEnd(next));
    }
    return { start: indentOf(first), end, cmd, block: { top, bottom } };
  };

  const item = itemAt(line);
  if (item) return itemTarget(row, item);

  // indented continuation lines (summaries, periods, wrapped help text)
  // belong to the nearest item above them
  if (indent >= 4) {
    for (let r = row - 1; r >= row - 8; r--) {
      const above = getLine(r);
      if (above === undefined || above.trim() === "") break;
      const parent = itemAt(above);
      if (parent) return itemTarget(r, parent);
      if (indentOf(above) < 4) break;
    }
  }

  // a project name mentioned anywhere
  let s = col;
  let e = col;
  while (s > 0 && /[\w-]/.test(line[s - 1])) s--;
  while (e < line.length && /[\w-]/.test(line[e])) e++;
  const word = line.slice(s, e).toLowerCase();
  if (word && visibleProjects.some((p) => p.slug === word)) {
    return { start: s, end: e, cmd: `project ${word}` };
  }

  return null;
}

// ---------------------------------------------------------------------------
// ls, with the usual flags: -l long, -a all, -h human sizes, -F type marks,
// -r reverse, -1 one per line (-A accepted; there are no dotfiles).
// ---------------------------------------------------------------------------

interface LsEntry {
  name: string;
  dir: boolean;
  exec: boolean;
  size: number;
  links: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Every file was "modified" when the page loaded. */
const MTIME = (() => {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${two(d.getHours())}:${two(d.getMinutes())}`;
})();

/** Size of a file's (pretend) contents. */
function fileSize(f: FsFile): number {
  return fileText(f, 80).length;
}

/**
 * What a file "contains" (what nano / vim show). Text files hold their
 * command's output; scripts are the whiptail call that shows the dialog.
 */
function fileText(f: FsFile, width: number): string {
  if (f.kind === "text") return run(f.cmd, Math.min(width, 80), []).lines.join("\n") + "\n";
  const [kind, id] = f.open.split(" ");
  const p = kind === "project" ? projects.find((x) => x.slug === id) : undefined;
  const e = kind === "exp" ? experiences[parseInt(id, 10) - 1] : undefined;
  const title = (p?.title ?? e?.role ?? "").replace(/"/g, '\\"');
  const subtitle = p ? p.summary : e ? `${e.org}, ${e.period}` : "";
  const body = p ? [p.description || p.summary] : (e?.bullets ?? []).map((b) => `- ${b}`);
  const w = Math.max(Math.min(width, 64), 20);
  return [
    "#!/bin/sh",
    `# ${subtitle}`,
    "",
    `exec whiptail --title "${title}" --msgbox "\\`,
    ...body.flatMap((para) => wrap(para.replace(/"/g, '\\"'), w)),
    '" 20 72',
    "",
  ].join("\n");
}

function dirEntry(name: string, links: number): LsEntry {
  return { name, dir: true, exec: true, size: 4096, links };
}

function lsEntries(dir: string, all: boolean): LsEntry[] {
  const list: LsEntry[] = dir
    ? Object.entries(FS[dir]).map(([name, f]) => ({
        name,
        dir: false,
        exec: f.kind === "script",
        size: fileSize(f),
        links: 1,
      }))
    : DIRECTORIES.map((d) => dirEntry(d, 2));
  list.sort((a, b) => a.name.localeCompare(b.name));
  const homeLinks = 2 + DIRECTORIES.length;
  if (all) list.unshift(dirEntry(".", dir ? 2 : homeLinks), dirEntry("..", dir ? homeLinks : 3));
  return list;
}

function human(size: number) {
  if (size < 1024) return String(size);
  const k = size / 1024;
  return k < 10 ? `${k.toFixed(1)}K` : `${Math.round(k)}K`;
}

function ls(args: string[], cwd: string, cols: number): string[] {
  const flags = new Set<string>();
  const paths: string[] = [];
  for (const a of args) {
    if (a === "--all") flags.add("a");
    else if (a === "--help") return ["usage: ls [-laAhF1r] [path ...]"];
    else if (a.startsWith("--")) return [`ls: unrecognized option '${a}'`, "Try 'ls --help' for more information."];
    else if (a.startsWith("-") && a.length > 1) {
      for (const ch of a.slice(1)) {
        if (!"laAhF1r".includes(ch)) return [`ls: invalid option -- '${ch}'`, "Try 'ls --help' for more information."];
        flags.add(ch);
      }
    } else paths.push(a);
  }
  const long = flags.has("l");
  const mark = (e: LsEntry) =>
    e.dir ? (long && !flags.has("F") ? "" : "/") : flags.has("F") && e.exec ? "*" : "";

  const longRows = (list: LsEntry[]) => {
    const size = (e: LsEntry) => (flags.has("h") ? human(e.size) : String(e.size));
    const linkW = Math.max(...list.map((e) => String(e.links).length));
    const sizeW = Math.max(...list.map((e) => size(e).length));
    return list.map((e) => {
      const mode = e.dir ? "drwxr-xr-x" : e.exec ? "-rwxr-xr-x" : "-rw-r--r--";
      return `${mode} ${String(e.links).padStart(linkW)} samih samih ${size(e).padStart(sizeW)} ${MTIME} ${e.name}${mark(e)}`;
    });
  };

  const listDir = (dir: string) => {
    const list = lsEntries(dir, flags.has("a"));
    if (flags.has("r")) list.reverse();
    if (!long) {
      const names = list.map((e) => e.name + mark(e));
      return flags.has("1") ? names : columns(names, cols);
    }
    const blocks = list.reduce((n, e) => n + Math.ceil(e.size / 4096) * 4, 0);
    return [`total ${flags.has("h") ? `${blocks}K` : blocks}`, ...longRows(list)];
  };

  if (!paths.length) return listDir(cwd);
  const lines: string[] = [];
  paths.forEach((p, i) => {
    const where = resolvePath(p, cwd);
    if (!where) {
      lines.push(`ls: cannot access '${p}': No such file or directory`);
    } else if (where.file) {
      const entry = lsEntries(where.dir, false).find((e) => e.name === where.file)!;
      lines.push(long ? longRows([entry])[0].replace(/ \S+$/, ` ${p}${mark(entry)}`) : p);
    } else {
      if (paths.length > 1) lines.push(...(i ? [""] : []), `${p}:`);
      lines.push(...listDir(where.dir));
    }
  });
  return lines;
}

/**
 * head / tail: first or last lines of files (10 by default).
 *   -n N, -N        number of lines        head -n -N   all but the last N
 *   tail -n +N      from line N on         -q / -v      never / always print headers
 */
function headTail(name: "head" | "tail", args: string[], cwd: string, cols: number): string[] {
  let count = 10;
  let fromStart = false; // tail -n +N, or head -n -N (counts from the other end)
  let headers: boolean | null = null;
  const files: string[] = [];
  const parseCount = (value: string | undefined): string | null => {
    const m = value?.match(/^([+-]?)(\d+)$/);
    if (!m) return `${name}: invalid number of lines: '${value ?? ""}'`;
    count = parseInt(m[2], 10);
    fromStart = name === "tail" ? m[1] === "+" : m[1] === "-";
    return null;
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    let error: string | null = null;
    if (a === "-n" || a === "--lines") error = parseCount(args[++i]);
    else if (/^-n[+-]?\d+$/.test(a)) error = parseCount(a.slice(2));
    else if (/^--lines=/.test(a)) error = parseCount(a.slice(8));
    else if (/^-\d+$/.test(a)) error = parseCount(a.slice(1));
    else if (name === "tail" && /^\+\d+$/.test(a)) error = parseCount(a);
    else if (a === "-q" || a === "--quiet" || a === "--silent") headers = false;
    else if (a === "-v" || a === "--verbose") headers = true;
    else if (a === "-f" || a === "-F" || a === "--follow") continue; // nothing here ever changes
    else if (a === "--help") return [`usage: ${name} [-n lines] [-qv] file ...`];
    else if (a.startsWith("-") && a.length > 1) {
      return [`${name}: invalid option -- '${a.replace(/^-+/, "")[0]}'`, `Try '${name} --help' for more information.`];
    } else files.push(a);
    if (error) return [error];
  }
  if (!files.length) return [`usage: ${name} [-n lines] file ...`];

  const lines: string[] = [];
  const showHeaders = headers ?? files.length > 1;
  files.forEach((path, i) => {
    const where = resolvePath(path, cwd);
    if (!where) {
      lines.push(`${name}: cannot open '${path}' for reading: No such file or directory`);
      return;
    }
    if (!where.file) {
      lines.push(`${name}: error reading '${path}': Is a directory`);
      return;
    }
    const all = fileText(FS[where.dir][where.file], cols).replace(/\n$/, "").split("\n");
    let picked: string[];
    if (name === "head") picked = fromStart ? all.slice(0, Math.max(all.length - count, 0)) : all.slice(0, count);
    else picked = fromStart ? all.slice(Math.max(count - 1, 0)) : count ? all.slice(-count) : [];
    if (showHeaders) lines.push(...(i ? [""] : []), `==> ${path} <==`);
    lines.push(...picked);
  });
  return lines;
}

/**
 * rmdir: errors like the real one until it's given an actual folder, which
 * it then refuses to remove, because no one can take your learning away.
 */
const RMDIR_EGG = "The beautiful thing about learning is that no one can take it away from you.";

function rmdir(args: string[], cwd: string, cols: number): string[] {
  const dirs: string[] = [];
  for (const a of args) {
    if (a === "--help") return ["usage: rmdir [-pv] [--ignore-fail-on-non-empty] directory ..."];
    if (/^-[pv]+$/.test(a) || a === "--parents" || a === "--verbose" || a === "--ignore-fail-on-non-empty") continue;
    if (a.startsWith("-") && a.length > 1) {
      return [`rmdir: invalid option -- '${a.replace(/^-+/, "")[0]}'`, "Try 'rmdir --help' for more information."];
    }
    dirs.push(a);
  }
  if (!dirs.length) return ["rmdir: missing operand", "Try 'rmdir --help' for more information."];

  const lines: string[] = [];
  let found = false;
  for (const d of dirs) {
    const where = resolvePath(d, cwd);
    const last = d.replace(/\/+$/, "").split("/").pop() ?? "";
    if (!where) lines.push(`rmdir: failed to remove '${d}': No such file or directory`);
    else if (where.file) lines.push(`rmdir: failed to remove '${d}': Not a directory`);
    else if (last === "." || last === "..") lines.push(`rmdir: failed to remove '${d}': Invalid argument`);
    else if (!where.dir) lines.push(`rmdir: failed to remove '${d}': Permission denied`);
    else found = true;
  }
  if (found) lines.push(...(lines.length ? [""] : []), ...wrap(RMDIR_EGG, cols));
  return lines;
}

/** `cat` prints a file; `./x.sh` / `sh x.sh` run a script, which opens its dialog. */
function openFile(path: string, cwd: string, how: "cat" | "exec", cols: number): ShellResult | null {
  const where = resolvePath(path, cwd);
  if (!where) return null;
  const name = how === "cat" ? "cat" : "sh";
  if (!where.file) return { lines: [`${name}: ${path}: Is a directory`] };
  const file = FS[where.dir][where.file];
  // cat prints what's in the file (a script's source); running a script opens its dialog
  if (how === "cat") return { lines: fileText(file, cols).replace(/\n$/, "").split("\n") };
  if (file.kind === "script") return { lines: [], actions: [{ type: "dialog", cmd: file.open }] };
  return { lines: [`sh: ${path}: Permission denied`] };
}

export function run(input: string, cols: number, history: string[], cwd = ""): ShellResult {
  const [rawCmd = "", ...args] = input.trim().split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  const arg = args.join(" ");

  // a bare number picks from the list shown last (`projects` or `experience`)
  if (/^\d+$/.test(cmd) && !args.length) {
    if (lastList === "experience") return run(`exp ${cmd}`, cols, history, cwd);
    if (lastList === "projects") return run(`project ${cmd}`, cols, history, cwd);
    return { lines: wrap(`${cmd}: command not found. Run 'experience' or 'projects' first, then type a number.`, cols) };
  }

  if (Object.prototype.hasOwnProperty.call(HIDDEN_COMMANDS, cmd)) {
    return { lines: wrap(HIDDEN_COMMANDS[cmd], cols) };
  }

  // running a script by path: ./cardipool.sh, projects/cardipool.sh, ~/...
  if (rawCmd.includes("/")) {
    return openFile(rawCmd, cwd, "exec", cols) ?? { lines: [`sh: ${rawCmd}: No such file or directory`] };
  }
  if (rawCmd.endsWith(".sh")) {
    // like a real shell, the current directory isn't on the PATH
    return { lines: wrap(`${rawCmd}: command not found. Did you mean './${rawCmd}'?`, cols) };
  }

  switch (cmd) {
    case "":
      return { lines: [] };

    case "help":
    case "?": {
      const pad = Math.max(...COMMANDS.map((c) => c.usage.length)) + 2;
      const lines = ["Available commands:", ""];
      for (const c of COMMANDS) {
        if (cols >= 2 * (pad + 2) + 2) {
          lines.push(...wrap(c.desc, cols, " ".repeat(pad + 2), `  ${c.usage.padEnd(pad)}`));
        } else {
          lines.push(`  ${c.usage}`, ...wrap(c.desc, cols, "    "));
        }
      }
      lines.push(
        "",
        ...wrap(
          touchMode
            ? "Tip: tap a command or name to run it."
            : "Tip: click a command or name to run it. TAB completes, UP/DOWN walks history, any key skips typing.",
          cols,
        ),
      );
      return { lines };
    }

    case "about":
    case "whoami":
      return {
        lines: [
          ...wrap("Hi, I'm Samih.", cols),
          ...wrap("I'm a senior at Stanford, studying Computer Science.", cols),
          "",
          ...wrap("Try 'experience', 'projects' or 'contact'.", cols),
        ],
      };

    case "banner":
      return { lines: banner(cols) };

    case "ls":
      return { lines: ls(args, cwd, cols) };

    case "cd": {
      const where = arg ? resolvePath(arg, cwd) : { dir: "" };
      if (!where) return { lines: wrap(`cd: no such file or directory: ${arg}`, cols) };
      if (where.file) return { lines: wrap(`cd: not a directory: ${arg}`, cols) };
      return { lines: [], cwd: where.dir };
    }

    case "head":
    case "tail":
      return { lines: headTail(cmd, args, cwd, cols) };

    case "rmdir":
      return { lines: rmdir(args, cwd, cols) };

    case "pwd":
      return { lines: [`/home/guest${cwd ? `/${cwd}` : ""}`] };

    case "sh":
    case "bash":
    case "source":
    case ".": {
      if (!arg) return { lines: [`usage: ${cmd} <script>`] };
      return openFile(args[0], cwd, "exec", cols) ?? { lines: [`${cmd}: ${args[0]}: No such file or directory`] };
    }

    case "projects": {
      lastList = "projects";
      const lines = ["Recent work:", ""];
      visibleProjects.forEach((p, i) => {
        // on narrow screens drop the leading space so long names still fit on one line
        const n = `${String(i + 1).padStart(cols >= 40 ? 2 : 1)}. `;
        if (i) lines.push(""); // a blank line between projects
        lines.push(...wrap(`${p.slug}  [${p.category}]`, cols, "    ", n));
        lines.push(...wrap(p.summary, cols, "    ", "    "));
      });
      const soon = projects.filter((p) => p.comingSoon);
      if (soon.length) {
        lines.push("", ...wrap(`Coming soon: ${soon.map((p) => p.title).join(", ")}`, cols));
      }
      lines.push(
        "",
        ...wrap(
          touchMode
            ? "Tap a project for details."
            : "Hover and click a project, or type its number. 'open <name>' visits it.",
          cols,
        ),
      );
      return { lines };
    }

    case "cat":
      // no file: like the real cat, read what's typed and echo it back (until ^D / ^C)
      if (!arg || arg === "-") return { lines: [], actions: [{ type: "stdin" }] };
      {
        const file = openFile(args[0], cwd, "cat", cols);
        if (file) return file;
        if (!findProject(arg)) return { lines: wrap(`cat: ${arg}: No such file or directory`, cols) };
      }
    // falls through: `cat <project>` is a shortcut for `project <project>`
    case "project": {
      if (!arg) return { lines: ["usage: project <name>   (see 'projects')"] };
      const p = findProject(arg);
      if (!p) return { lines: wrap(`project: '${arg}' not found. Try 'projects'.`, cols) };
      const lines = [p.title.toUpperCase(), hr(cols), `category: ${p.category}`];
      if (p.tech.length) lines.push(...wrap(`stack: ${p.tech.join(", ")}`, cols, "       "));
      lines.push("", ...wrap(p.description || p.summary, cols), "");
      if (p.demo) lines.push(...field("demo:   ", p.demo, cols));
      if (p.link) lines.push(...field("source: ", p.link, cols));
      if (p.demo || p.link) lines.push("", `Type 'open ${p.slug}' to visit.`);
      return { lines };
    }

    case "experience":
    case "work": {
      lastList = "experience";
      const lines = ["Experience:", ""];
      // Dates sit in one column: on the role's line when there's room
      // (" 1. Role ......  June 2026 - September 2026", org underneath),
      // otherwise on their own indented line under the org.
      const roleW = Math.max(...experiences.map((e) => e.role.length));
      const dateW = Math.max(...experiences.map((e) => e.period.length));
      const sideBySide = 4 + roleW + 3 + dateW <= cols;
      experiences.forEach((e, i) => {
        if (i) lines.push("");
        const n = `${String(i + 1).padStart(2)}. `;
        if (sideBySide) {
          lines.push(`${n}${e.role.padEnd(roleW)}   ${e.period}`);
          lines.push(...wrap(e.org, cols, "    ", "    "));
        } else {
          lines.push(...wrap(e.role, cols, "    ", n));
          lines.push(...wrap(e.org, cols, "    ", "    "));
          lines.push(...wrap(e.period, cols, "    ", "    "));
        }
      });
      lines.push(
        "",
        ...wrap(touchMode ? "Tap a role for details." : "Hover over a role and click it, or type its number, for details.", cols),
      );
      return { lines };
    }

    case "exp": {
      const i = parseInt(arg, 10) - 1;
      const e = experiences[i];
      if (!e) return { lines: [`usage: exp <1-${experiences.length}>   (see 'experience')`] };
      const lines = [
        ...wrap(e.role.toUpperCase(), cols),
        ...wrap(`${e.org}, ${e.location}`, cols),
        e.period,
        hr(cols),
      ];
      for (const b of e.bullets) lines.push(...wrap(b, cols, "  ", "- "));
      if (e.link) lines.push("", ...field("link: ", e.link, cols));
      return { lines };
    }

    case "contact":
    case "links":
      return {
        lines: [
          ...Object.entries(LINKS).flatMap(([k, v]) => field(k.padEnd(10), v, cols)),
          "",
          ...wrap("Type 'open github' or 'open linkedin'.", cols),
        ],
      };

    case "open": {
      if (!arg) return { lines: ["usage: open <project|github|linkedin>"] };
      const key = arg.toLowerCase();
      if (LINKS[key]) {
        return { lines: [`opening ${LINKS[key]} ...`], actions: [{ type: "open", url: LINKS[key] }] };
      }
      const p = findProject(key);
      const url = p?.demo ?? p?.link;
      if (p && url) {
        return { lines: [`opening ${url} ...`], actions: [{ type: "open", url }] };
      }
      if (p) return { lines: wrap(`${p.title} has no public link yet.`, cols) };
      return { lines: wrap(`open: '${arg}' not found.`, cols) };
    }

    case "theme": {
      const color = THEMES[arg.toLowerCase()];
      if (!color) {
        return {
          lines: [
            "Pick a phosphor colour:",
            ...wrap(Object.keys(THEMES).map((t) => `'theme ${t}'`).join("  "), cols),
          ],
        };
      }
      return { lines: [`phosphor set to ${arg.toLowerCase()}.`], actions: [{ type: "theme", color }] };
    }

    case "classic":
    case "gui":
    case "exit":
      return { lines: ["switching to the classic site ..."], actions: [{ type: "classic" }] };

    case "clear":
    case "cls":
      return { lines: [], actions: [{ type: "clear" }] };

    case "history":
      return { lines: history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`) };

    case "echo":
      return { lines: [arg] };

    case "date":
      return { lines: [new Date().toString()] };

    case "credits":
      return {
        lines: [
          ...wrap("CRT renderer: cool-retro-term-webgl by Remo H. Jansen (GPL-3.0), a port of cool-retro-term by Filippo Scognamiglio.", cols),
          ...wrap("https://github.com/remojansen/cool-retro-term-webgl", cols),
          "",
          ...wrap("Font: Terminus by Dimitar Zhekov (SIL OFL).", cols),
          "",
          ...wrap("This site's source (GPL-3.0):", cols),
          ...wrap("https://github.com/samihsq/personal-website", cols),
        ],
      };

    case "shutdown":
    case "poweroff":
    case "halt":
      return {
        lines: [
          "",
          "Broadcast message from samih@samih.dev:",
          ...wrap(`The system is going down for poweroff in ${SHUTDOWN_SECONDS} seconds!`, cols),
          ...wrap(touchMode ? "Tap the screen to cancel." : "Press any key to cancel.", cols),
          "",
        ],
        actions: [{ type: "shutdown" }],
      };

    case "nano":
    case "vi":
    case "vim":
    case "nvim": {
      const editor = cmd === "nano" ? "nano" : "vim";
      const path = args[0] ?? "";
      const where = path ? resolvePath(path, cwd) : null;
      const file = where?.file ? FS[where.dir][where.file] : null;
      return {
        lines: [],
        actions: [
          {
            type: "editor",
            editor,
            name: path,
            content: file ? fileText(file, cols) : null,
            isDir: !!where && !where.file,
          },
        ],
      };
    }

    case "sudo":
      return { lines: wrap("nice try. this incident will be reported.", cols) };

    case "rm":
      return { lines: wrap("please don't.", cols) };

    default:
      return { lines: wrap(`${cmd}: command not found. Type 'help'.`, cols) };
  }
}
