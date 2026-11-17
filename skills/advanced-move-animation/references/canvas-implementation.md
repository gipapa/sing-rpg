# Implementing a move cinematic in a code-driven 2D canvas

Read this when turning a storyboard into code. It describes an architecture that works well for
Canvas 2D / pixel-art games (it is how `sing-rpg` does it) and the pitfalls learned there. If the
target project already has a cinematic system, map these ideas onto it instead of adding a second
one.

Contents: 1 Architecture · 2 Plan object · 3 Camera · 4 Actors and poses · 5 Layers ·
6 Time: impact, warp, hit-stop, freeze · 7 Reduced motion, compact mode, skip, preview ·
8 Overlay, bars, title · 9 Canvas safety and alpha · 10 Skeleton

## 1. Architecture

- **Player** (`spell-cinematic.js` in sing-rpg): owns the dialog/canvas, the clock, skip/cancel,
  hidden-tab pausing, letterbox bars, overlay and title card. Each frame it computes `t` (real
  elapsed ms, clamped to the duration) and `w` (warped time), asks the plan for camera, pose and
  layers, and calls the scene renderer. It resolves a promise `completed: true|false`; the caller
  settles damage only on `true`.
- **Shared FX** (`spell-fx.js`): anchors (`HAND`, `HERO`, `FOE`), `span`, `mix`, `clamp`, eases,
  deterministic `rand(i, seed)`, `spark`, `glow`, `sigil`, `warp` (hit-stop) and `cameraAt`.
- **Registry** (`spell-plans.js`): `{ [spellId]: plan }` plus `hasCinematic(spell)`. Keep it free of
  DOM imports so Node tests can import it. Moves without a plan fall back to a simple cut-in instead
  of borrowing another move's cinematic.
- **One module per move** (`spell-forest.js`, `spell-stars.js`, …) exporting a plan object.
  Plans import only the shared FX module, never the DOM or game state.
- **Scene renderer** (`scene.js` `spellScene`): draws the background, then `back(ctx)`, the hero and
  foe (with pose offsets), then `front(ctx)`, all in world coordinates under the camera transform.

## 2. Plan object contract

```js
export const movePlan = {
  impact: IMPACT,               // ms; must equal some shot's start
  duration: DURATION,           // ms; optional, player default otherwise
  titleAt: IMPACT + 2200,       // ms when the title card fades in
  attack: [startMs, endMs],     // window where the hero sprite uses its attack pose; contains impact
  warp: (t) => w,               // optional custom time warp (freeze + hit-stop)
  shots: [[start, caption, fromCam, toCam, ease, whipMs?], ...], // cam = [x, y, zoom, roll]
  close: [[a, b], ...],         // letterbox intervals
  lines: [[kind, a, b], ...],   // overlay speed lines: 'v' | 'h' | 'zoom' | 'spin'
  flashes: [[at, lengthMs, alpha, 'color' | '#hex'], ...],
  shake(t) { return amplitude; },
  pose: (t, w, reduced) => ({ hero: { dx, dy, angle }, foe: { dx, dy, tilt } }),
  subtitle: '...',
  back(c, t, w, ctx) {},        // ctx: { color, reduced, spell, foeY, pose }
  front(c, t, w, ctx) {}
};
```

Name key beats as constants (`RAISE`, `CHARGE`, `DREAD`, `STRIKE`, `FREEZE`, `IMPACT`) and write
later times as `IMPACT + n`. Moving one beat then shifts everything that depends on it.

## 3. Camera

Transform order: `translate(viewW / 2, anchorY) → rotate(roll) → scale(zoom) → translate(-x, -y)`.
In sing-rpg the world is 480×240 (ground at y≈184), `anchorY` is 126 and the 960×480 canvas is a 2×
scale of it.

- Visible world rectangle: x ∈ [x − (viewW/2)/zoom, x + (viewW/2)/zoom],
  y ∈ [y − anchorY/zoom, y + (viewH − anchorY)/zoom]. **Compute this for every shot's start and end**
  to confirm the subject is in frame and placed where the storyboard says (e.g. hero in the lower
  third for a low angle).
- `cameraAt(plan, t, reduced)`: find the current shot, interpolate from→to with the shot's ease
  over its length (to the next shot's start or the duration). For a whip, blend from the previous
  shot's *end* camera over `whipMs` and report a `whip` strength for motion streaks.
- Shake is added as a small offset divided by zoom (`shake / zoom`), so the on-screen jitter stays
  comparable between close-ups and wides. Use deterministic sines of `t`, not `Math.random`.
- Reduced motion returns one fixed camera for the whole move.
- Give the background room: stretch its edge pixels far outside the world (cranes and rolls must
  never show the canvas border) and draw full-frame tints/darkness as very large rects
  (e.g. `fillRect(-1200, -2000, 3000, 2600)`).
- Each shot's from and to cameras must differ; a static shot reads as a frozen frame.

## 4. Actors and poses

- The renderer accepts `heroPose {dx, dy, angle}` (angle = weapon angle; 0 points up, positive
  turns toward the foe) and `foePose {dx, dy, tilt}`. Effects that attach to the weapon compute the
  hand from the pose (`hand = [HAND_X + dx, HAND_Y + dy]`) and the blade direction from the
  angle (`dir = [sin a, −cos a]`).
- Write poses as piecewise functions of `t` with **continuity at every boundary**: the value at the
  end of one segment equals the start of the next, except for a deliberate snap on contact.
- Use an overshoot ("back") ease for heavy motions (hoisting, planting) and add a small strain
  wobble that decays before the next beat.
- Use a progress function for the strike (`swingAt(t)`): accelerate (`ease in`) to ~90%, hold
  nearly still through the freeze, then jump to 100% at the impact, followed by a settled
  follow-through.
- The foe reacts on cue: tremble amplitude grows with threat, it backs off and tilts to look up
  under dread, and on impact it is thrown back, lifted and tilted, then partially recovers.
  Drive knockback with **warped** time relative to the warped impact, so it respects the hit-stop.
- When a giant weapon grows from the hand, compute its length as a function of time (forming,
  then swelling during charge) and reuse that function for every effect along the blade.

## 5. Layers

- `back` runs before the actors: sky/veil, the world transformation (trees, tides, sigils), giant
  apparitions, light shafts, ground cracks and scars.
- `front` runs after the actors: weapon light, giant weapon, trails, particles, darkness overlays,
  the slash, bursts and leaves/embers.
- To **spotlight** during a freeze: in `front`, draw a large dark rect (alpha ~0.6) first, then draw
  the weapon and glints after it, so the actors read as silhouettes and only the blade glows.
- To **split the world** along a cut, clip with a half-plane path and draw the same layer twice,
  offsetting one half.
- Use `globalCompositeOperation = 'lighter'` for light and switch back to `'source-over'` for
  solid matter (dirt, leaves, darkness). Reset `globalAlpha` to 1 at the end of each layer.
- Use deterministic particles: `life = ((w - start) / period + rand(i, seed)) % 1`, position from
  `rand`. This keeps frames reproducible for tests and lets time warping freeze them.
- Scale particle counts with a density factor (`reduced ? .35 : 1`).

## 6. Time: impact, warp, hit-stop and freeze

- Use `t` (real time) for the schedule: shots, camera, beat windows, fades, poses.
- Use `w` (warped time) for anything that should stop when time stops: particle motion, idle
  animation, weather, knockback and the impact's expanding effects.
- Default hit-stop: `w = t` before impact, ~12% speed for ~260 ms after, then `t − offset`.
- Pre-hit freeze: `w` crawls at ~5% between `FREEZE` and `IMPACT`, then the hit-stop applies,
  minus the freeze's accumulated offset. **`w` must be continuous, never decreasing, and never
  faster than real time.**
- Once `w` carries an offset, never compare `w` with absolute beat times. Measure impact effects
  from `W_IMPACT = warp(IMPACT)` instead (`k = (w − W_IMPACT) / 1000`). Comparing with `IMPACT`
  produces negative progress at the moment of contact.
- Shake: zero across the freeze, maximum at impact (decaying exponentially over ~400 ms).
- Flashes: a short white flash at the freeze start, the strongest flash at the impact.

## 7. Reduced motion, compact mode, skip and preview

- **Reduced motion** (`prefers-reduced-motion`): a fixed camera, fewer particles, and no speed
  lines or flashes. The story still plays to the end and the result still settles.
- **Compact mode** (a user setting): skip the cinematic entirely and show only the cut-in and
  damage. Plans never check this; the caller decides before playing.
- **Skip / Esc**: ends playback as completed; the caller settles once. A playback closed by
  another path resolves `false` and settles nothing.
- **Hidden tab**: the clock does not advance while hidden.
- **Preview / demo**: the same player with a demo scene (demo foe, demo name). It settles nothing,
  doesn't touch energy or progress, and can respect "not yet owned" rules (e.g. keep the hero's
  current weapon so a locked weapon's design stays hidden).
- Plans must not import or mutate game state.

## 8. Overlay, bars and title

- Overlay runs in screen space after the scene: whip streaks, speed lines by kind, flashes,
  vignette, then the title card (`titleAt`, scale-in, fade out over the last 400 ms) with subtitle.
- Letterbox bars ease toward a target height (wide while inside a `close` interval, narrow
  otherwise) rather than jumping.
- Show the current shot caption in the UI label. Captions must be unique within a move.

## 9. Canvas safety and alpha

Real canvases either throw or silently misbehave on bad inputs, and a mock context will not show
it unless the mock checks for it:

- `createRadialGradient` throws on negative radii; any gradient throws on non-finite arguments;
  `addColorStop` throws outside [0, 1].
- `arc`/`ellipse` throw on negative radii. An `arc` whose start angle is past its end sweeps almost
  the full circle; clamp the start with `Math.min`.
- **`globalAlpha` outside [0, 1] is ignored**, so the *previous* alpha leaks into the next draw.
  Clamp sine twinkles with `Math.max(0, …)` and sums of fades with `Math.min(1, …)`.
- `NaN` coordinates draw nothing and hide bugs; assert finiteness in tests.
- Balance every `save()` with `restore()`, especially around clips and rotations.
- Quantise pixel-art geometry (`Math.round`) and keep `imageSmoothingEnabled = false` for sprites.

## 10. Skeleton

```js
import { FOE, span, eases, rand, spark, glow, warp } from './fx.js';

const STRIKE = 9000, FREEZE = 9400, IMPACT = 9750, DURATION = IMPACT + 3500;
const moveWarp = (t) => t < FREEZE ? t
  : t < IMPACT ? FREEZE + (t - FREEZE) * .05
  : warp(t, IMPACT) - (IMPACT - FREEZE) * .95;
const W_IMPACT = moveWarp(IMPACT);

function swingAt(t) {
  if (t < STRIKE) return 0;
  if (t < FREEZE) return .9 * eases.in(span(t, STRIKE, FREEZE));
  return t < IMPACT ? .9 + .015 * span(t, FREEZE, IMPACT) : 1;
}
function heroPose(t) { /* piecewise, continuous; use swingAt for the strike */ }
function foePose(t, w) { /* dread before impact; knockback from span(w, W_IMPACT, W_IMPACT + 800) */ }

function drawBack(c, t, w, ctx) { /* veil, world change, apparition; reset alpha/composite */ }
function drawFront(c, t, w, ctx) {
  const dense = ctx.reduced ? .35 : 1;
  /* charge effects → freeze darkness → giant weapon + trail → freeze glint → impact (k from W_IMPACT) */
}

export const movePlan = {
  impact: IMPACT, duration: DURATION, titleAt: IMPACT + 2000, attack: [1200, IMPACT + 600],
  warp: moveWarp,
  shots: [
    [0, 'Signature', [160, 160, 7, -.05], [160, 140, 6.4, .03], 'inOut'],
    // ...
    [STRIKE, 'Strike', [130, 40, 1, -.12], [300, 134, 2.1, .08], 'in', 90],
    [FREEZE, 'Freeze', [312, 138, 2.5, .07], [318, 140, 2.9, .04], 'out'],
    [IMPACT, 'Impact', [338, 150, 4.6, -.06], [358, 150, 3.3, .02], 'out'],
    [IMPACT + 2000, 'Title', [215, 122, 1.5, 0], [215, 128, 1.7, 0], 'smooth']
  ],
  close: [[FREEZE, IMPACT + 800]],
  lines: [['zoom', STRIKE, FREEZE]],
  flashes: [[FREEZE, 110, .85, '#ffffff'], [IMPACT, 750, 1, '#ffffff']],
  shake: (t) => (t >= FREEZE && t < IMPACT ? 0 : t >= IMPACT ? 15 * Math.exp(-(t - IMPACT) / 420) : 0),
  pose: (t, w) => ({ hero: heroPose(t), foe: foePose(t, w) }),
  subtitle: '— … —', back: drawBack, front: drawFront
};
```

Register the plan in the registry and make the player use `plan.warp` when present.
