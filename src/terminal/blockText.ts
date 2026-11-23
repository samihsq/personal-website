/**
 * oh-my-logo style lettering: the "block" font (full blocks with box-drawing
 * shadows, a.k.a. ANSI Shadow). The gradient colouring is applied when the
 * screen is painted (see CrtTerminal's tint step).
 */

const GLYPHS: Record<string, string[]> = {
  S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  M: ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  H: ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
};

/** Characters that only appear in block lettering. */
const BLOCK_CHARS = /[█╗╔╝╚║═]/;

/** True for a line of block lettering. */
export function isBlockLine(line: string): boolean {
  return BLOCK_CHARS.test(line);
}

/**
 * `word` in the block font, as rows of text, using the widest letter spacing
 * that fits in `cols`; null if it doesn't fit at all.
 */
export function blockLines(word: string, cols: number): string[] | null {
  const letters = word.toUpperCase().split("").map((ch) => GLYPHS[ch]);
  if (!letters.length || letters.some((g) => !g)) return null;
  for (const spacing of [1, 0]) {
    const rows = letters[0].map((_, r) =>
      letters
        .map((g) => g[r])
        .join(" ".repeat(spacing))
        .replace(/\s+$/, ""),
    );
    if (Math.max(...rows.map((row) => row.length)) <= cols) return rows;
  }
  return null;
}
