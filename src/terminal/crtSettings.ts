/**
 * CRT picture settings. Tweak these to change how the screen looks.
 * Ranges are 0–1 unless noted.
 */
export const PICTURE = {
  brightness: 0.6,
  bloom: 0.15, // glow around text; above ~0.3 gets blurry
  rasterizationMode: 1, // 0 none, 1 scanlines, 2 pixel grid, 3 RGB subpixels
  rasterizationIntensity: 0.8, // how dark the scanlines are
  screenCurvature: 0.3,
  rgbShift: 0, // colour fringing, 0–0.01
  burnIn: 0.3, // how bright old text's ghost is
  flickering: 0.08,
  horizontalSync: 0.06,
  jitter: 0.04,
  staticNoise: 0.06,
  glowingLine: 0.2, // bright band rolling down the screen
};

/**
 * Optional gradient for the big name banner (oh-my-logo style), left to right.
 * Empty = same phosphor colour as the rest of the text.
 * e.g. ["#00f5a0", "#00d9f5", "#7f5af0"] or sunset ["#ff9966", "#ff5e62", "#ffa34e"].
 */
export const BANNER_GRADIENT: string[] = [];

/**
 * How fast burn-in ghosts fade. Lower = faster. Around 100 clears a ghost in
 * about a second; the renderer's own default at burnIn 0.3 is ~590 (slow).
 * Below ~50 the renderer caps the speed, so going lower changes nothing.
 */
export const BURN_IN_FADE_MS = 100;

export function storageGet(store: () => Storage, key: string) {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(store: () => Storage, key: string, value: string) {
  try {
    store().setItem(key, value);
  } catch {
    /* private mode, blocked storage etc. */
  }
}

export const local = () => window.localStorage;
export const session = () => window.sessionStorage;
