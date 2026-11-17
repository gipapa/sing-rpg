# Testing and quality review for move cinematics

Read this once a plan renders. Tests make the cinematic safe to ship; the checklist makes it good.
Neither replaces watching it: if no real browser check was possible, say so in your report.

Contents: 1 Automated tests · 2 Smoke run · 3 Visual review · 4 Quality checklist ·
5 Common failures and fixes

## 1. Automated tests (Node, no browser)

Keep plan modules DOM-free so they import in Node. In sing-rpg run `node --test test/*.mjs`;
`test/spell-cinematic.test.mjs` is the worked example.

**Strict mock 2D context.** Use a `Proxy` that accepts any method and throws where a real canvas
would throw or misbehave:

- gradients: finite arguments, non-negative radial radii, `addColorStop` offsets in [0, 1];
- `arc`/`ellipse`: finite arguments, non-negative radii;
- setter for `globalAlpha`: value within [0, 1] (real canvases ignore anything else and keep the
  previous alpha).

If older moves fail the strict alpha check, enable it for the move you are working on and report
the others rather than rewriting them out of scope.

**Every-frame render.** For each plan, for `reduced` in [false, true], step `t` from 0 to the
duration every 10–20 ms: compute `w` with the plan's warp, check that `cameraAt` returns finite
values and a shot caption, call `back` and `front` on fresh mock contexts, and check that
`shake(t)` and every pose value are finite.

**Plan structure.** First shot at 0, strictly increasing starts, all before the duration, unique
captions, from ≠ to camera in every shot, the impact equals a shot start, the attack window
contains the impact, a subtitle exists, and reduced motion yields the same camera at any two times.

**Storyboard invariants.** Test what the storyboard promises, not the wording:

- the beat shots exist in order;
- framing: the hoist shot starts as a close-up (zoom ≥ 4) and cranes up; the charge pushes in;
- action: the weapon is cocked back before the strike and travels a large arc by the freeze;
- freeze: the pose barely changes across it, shake is exactly 0 throughout it, and the impact's
  shake exceeds every other moment;
- time: `w` never decreases, never advances faster than `t`, and nearly stops in the freeze;
- reaction: the foe cowers before impact and is pushed back well after it;
- bars cover the charge and the freeze-through-impact.

**Gameplay invariants** (in game-logic tests): the move's damage is unchanged and dealt once,
unowned/unequipped states fall back correctly, and only moves with a plan report having a
cinematic.

## 2. Smoke run through the real scene

Stub the DOM minimally (dialog with `showModal`/`close`, canvas with a mock context,
`requestAnimationFrame`, `performance.now`, `matchMedia`, `document.hidden`) and drive the real
player with the real scene renderer, with and without a foe, in full and reduced motion. Assert it
resolves `true` at the expected duration and passes through every caption.

## 3. Visual review

When a browser is available, play the move at full speed and scrub key frames: each shot's first
and last frame, the freeze, the impact and its first 300 ms, and the title. Check framing against
the storyboard table. If screenshots or a browser are not available, report the visual check as
not done.

## 4. Quality checklist

Story and design
- [ ] One-sentence concept; one motif repeated across weapon, world, apparition, slash and afterglow.
- [ ] Escalation: each beat is bigger than the last; the impact is the peak in flash, shake and scale.
- [ ] Scale contrast: at least one extreme close-up and one wide where something dwarfs the hero.
- [ ] A real low angle: subject in the lower third, roll, the tall element leaves the frame top.
- [ ] Freeze before contact: stillness, darkness, the blade lit, zero shake.
- [ ] Actors act: hero anticipation, overshoot and follow-through; foe threat, dread, knockback, recovery.
- [ ] Screen direction is consistent; the strike moves the same way the camera tracks.
- [ ] Original: no copied characters, designs, assets, lines or frame-by-frame compositions.

Camera and timing
- [ ] Every shot moves; cuts land on action beats; whips only into fast actions.
- [ ] Visible-rectangle check done for each shot's start and end.
- [ ] Impact ≈ 75–80% of the duration; title after the impact settles.
- [ ] Bars on close-ups and the freeze-impact stretch.

Safety and behaviour
- [ ] Damage, energy and progress are unchanged and settled once, outside the plan.
- [ ] Skip, Esc, compact mode, reduced motion, hidden-tab pause and preview behave as before.
- [ ] Alpha clamped; no negative radii; save/restore balanced; composite and alpha reset per layer.
- [ ] Deterministic particles; densities reduced under reduced motion.

## 5. Common failures and fixes

| Symptom | Cause | Fix |
|---|---|---|
| Effects look like stickers on a static scene | Actors don't move | Add pose curves for the hero and foe, aligned to beats |
| Impact feels weak | Shake/flash already maxed earlier; no silence before | Lower earlier peaks; add a zero-shake freeze; make the impact the global max |
| Impact effects start "late" or are invisible at contact | Comparing warped `w` with an absolute impact time | Measure from `warp(IMPACT)` |
| Particles keep flying during the freeze | Effects driven by `t` | Drive motion with `w`; keep the schedule on `t` |
| Random flicker or stale transparency | `globalAlpha` set outside [0, 1] is ignored | Clamp every alpha expression |
| Crash after the hit-stop | Shrinking radius goes negative | Clamp radii with `Math.max(0, …)` or skip drawing |
| Canvas border shows during cranes/rolls | Background ends at the world edge | Stretch edge pixels and draw oversized tints |
| Low angle reads as just "zoomed in" | Subject centred, no roll, weapon inside frame | Put the subject in the lower third, add roll, let the tall element exit the top |
| Strike is hard to follow | Static camera or cut mid-swing | Track the blade with an ease-in camera; cut at the swing start |
| Swing trail draws a full circle | Arc start angle past its end | `start = Math.min(start, end)` |
| Tests pass but frames differ every run | `Math.random` in effects | Use a seeded hash `rand(i, seed)` |
| Damage applied twice or on cancel | Settlement inside the animation or on every resolve | Settle once in the caller, only when playback resolves completed |
| Node tests cannot import the plan | Plan or registry imports the DOM | Move the registry and plans into DOM-free modules |
