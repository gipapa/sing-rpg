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
- framing: key subjects stay readable through any tracking or crane the move relies on;
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

Structural tests cannot tell whether the move looks good. Always render and critique a contact
sheet: see [visual-review.md](visual-review.md). Use an available supported browser tool or CLI;
an approximate renderer cannot establish actual colour, compositing or title quality. When a browser is available, also
play the move at full speed once to judge motion and rhythm, which still frames cannot show. Report
which method you used; if neither was possible, say the visual check was not done.

## 4. Quality checklist

Readability (checked on rendered frames)
- [ ] Every large mass contrasts in value with its background at the heights the camera shows.
- [ ] Material cues suit the project; unwanted regular bars or stripes don't read as UI or a chart.
- [ ] Each apparition has an identifiable reveal, and transitions don't leave an unexplained slab.
- [ ] Giant weapons keep a recognizable silhouette and sufficient separation between planes.
- [ ] For a held weapon, at least part of the swing shows the grip, weapon head and target or
  impact area together. Adjacent frames show the wind-up, contact and reaction in order.
- [ ] Check both camera modes for the weapon reveal, contact, and any lasting scene change.
  Inspect adjacent frames around a deliberate flash.

Story and design
- [ ] One-sentence concept; one motif repeated across weapon, world, apparition, slash and afterglow.
- [ ] The move builds to a distinct impact and gives its consequence time to read.
- [ ] Scale contrast: at least one extreme close-up and one wide where something dwarfs the hero.
- [ ] A real low angle: subject in the lower third, roll, the tall element leaves the frame top.
- [ ] Freeze before contact: stillness, darkness, the blade lit, zero shake.
- [ ] Actors act: hero anticipation, overshoot and follow-through; foe threat, dread, knockback, recovery.
- [ ] Screen direction is consistent; the strike moves the same way the camera tracks.
- [ ] Original: no copied characters, designs, assets, lines or frame-by-frame compositions.

Camera and timing
- [ ] Every shot moves; cuts land on action beats; whips only into fast actions.
- [ ] Visible-rectangle check done for each shot's start and end.
- [ ] The reaction and aftermath have time to register before the title.
- [ ] Bars on close-ups and the freeze-impact stretch.
- [ ] If the move has existing docs, check the final plan's `shots`, `impact` and `duration`
  against the documented shot names, count and times. Confirm the described actions in playback.

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
| All tests pass but the move "looks bad" | Shapes don't read: low value contrast, outline-only masses | Render a contact sheet and apply [visual-review.md](visual-review.md) §3 |
| Impact is a white frame | Long full-strength flash plus stacked additive layers enlarged by the close-up zoom | Short partial flash, thin cores, wider impact camera, physical debris |
| Giant apparition reads as a box or ceiling | The camera frames only its base; it fades in place | Faster rise, `out` crane, transform it into the weapon |
