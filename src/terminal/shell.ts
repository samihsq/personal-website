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

export const PROMPT = "guest@samih.dev:~$ ";

export type ShellAction =
  | { type: "clear" }
  | { type: "open"; url: string }
  | { type: "classic" }
  | { type: "theme"; color: string };

export interface ShellResult {
  lines: string[];
  actions?: ShellAction[];
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
        : "Type 'help', or click any name or command on screen.",
      cols,
    ),
    "",
  ];
}

export const COMMANDS: { name: string; usage: string; desc: string }[] = [
  { name: "about", usage: "about", desc: "who I am" },
  { name: "projects", usage: "projects", desc: "list my recent work" },
  { name: "project", usage: "project <name>", desc: "details on one project" },
  { name: "experience", usage: "experience", desc: "list where I've worked" },
  { name: "exp", usage: "exp <number>", desc: "details on one role" },
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
  claude: "ok bro",
  codex: "really?",
  opencode: "nice bro",
};

export const COMPLETIONS = [
  ...COMMANDS.map((c) => c.name),
  "whoami",
  "ls",
  "history",
  "banner",
  "echo",
  "date",
];

/** Arguments that tab-complete after a given command. */
export function argCompletions(cmd: string): string[] {
  switch (cmd) {
    case "project":
    case "cat":
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

  // `ls` output: "about/  projects/  experience/  contact/"
  if (/^(\w+\/\s*)+$/.test(line)) {
    for (const m of line.matchAll(/(\w+)\//g)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (col >= start && col < end && COMMAND_NAMES.has(m[1])) return { start, end, cmd: m[1] };
    }
    return null;
  }

  // contact lines: "github    https://..."
  const contact = line.match(/^(\w+)\s+https?:\/\//);
  if (contact && LINKS[contact[1]]) {
    return { start: 0, end: trimmedEnd(line), url: LINKS[contact[1]] };
  }

  /** Command for a list item or help row, e.g. "* cardipool  [Web]", " 3. Role @ Org", "  about". */
  const itemAt = (text: string): string | null => {
    const exp = text.match(/^\s*(\d+)\.\s/);
    if (exp) {
      const n = parseInt(exp[1], 10);
      return n >= 1 && n <= experiences.length ? `exp ${n}` : null;
    }
    const proj = text.match(/^\* (\S+)/);
    if (proj && visibleProjects.some((p) => p.slug === proj[1])) return `project ${proj[1]}`;
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

export function run(input: string, cols: number, history: string[]): ShellResult {
  const [rawCmd, ...args] = input.trim().split(/\s+/);
  const cmd = (rawCmd ?? "").toLowerCase();
  const arg = args.join(" ");

  if (Object.prototype.hasOwnProperty.call(HIDDEN_COMMANDS, cmd)) {
    return { lines: [HIDDEN_COMMANDS[cmd]] };
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
          ...wrap("Try 'projects', 'experience' or 'contact'.", cols),
        ],
      };

    case "banner":
      return { lines: banner(cols) };

    case "ls":
      return { lines: ["about/  projects/  experience/  contact/"] };

    case "cd":
      return {
        lines: wrap(
          arg ? `cd: no need, just type '${arg.replace(/\/$/, "")}'` : "you're already home.",
          cols,
        ),
      };

    case "projects": {
      const lines = ["Recent work:", ""];
      for (const p of visibleProjects) {
        lines.push(...wrap(`${p.slug}  [${p.category}]`, cols, "    ", "* "));
        lines.push(...wrap(p.summary, cols, "    "));
      }
      const soon = projects.filter((p) => p.comingSoon);
      if (soon.length) {
        lines.push("", ...wrap(`Coming soon: ${soon.map((p) => p.title).join(", ")}`, cols));
      }
      lines.push("", ...wrap("Type 'project <name>' for details, or 'open <name>'.", cols));
      return { lines };
    }

    case "project":
    case "cat": {
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
      const lines = ["Experience:", ""];
      experiences.forEach((e, i) => {
        const n = `${String(i + 1).padStart(2)}. `;
        lines.push(...wrap(`${e.role} @ ${e.org}`, cols, "    ", n));
        lines.push(...wrap(e.period, cols, "    "));
      });
      lines.push("", ...wrap("Type 'exp <number>' for details.", cols));
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

    case "sudo":
      return { lines: wrap("nice try. this incident will be reported.", cols) };

    case "rm":
      return { lines: wrap("please don't.", cols) };

    default:
      return { lines: wrap(`${cmd}: command not found. Type 'help'.`, cols) };
  }
}
