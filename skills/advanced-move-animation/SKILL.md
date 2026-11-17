---
name: advanced-move-animation
description: Design and implement epic, multi-shot cinematic animations for game skills, special moves and finishing attacks, especially in code-driven 2D canvas or pixel-art games — storyboarding (weapon close-ups, low angles, push-ins, cranes, tracking swings, charge, pre-hit freeze, impact, afterglow, title card) plus the camera, pose, layer and hit-stop code and tests behind it. Not for UI transitions, video editing, sprite-sheet painting or game-balance work.
---

# Advanced Move Animation

Turn an ordinary skill ("deal 10 damage") into a short, authored cinematic with a story, a camera
plan and a heavy finishing blow — and ship it without breaking the game around it.

## When this applies

Use it when asked to create, redo or polish a skill / spell / special-move / ultimate cinematic,
make an attack "more epic", fix a move that "doesn't look good", add camera work to a move, or add
a finale such as a giant-scale overhead slash. It assumes the animation is drawn by code (Canvas 2D, WebGL, a game engine's
draw calls) so that camera, actors and effects are functions of time.

Do not use it for menu/UI transitions, editing recorded video, drawing sprite sheets by hand,
tuning damage numbers, or audio work.

## Non-negotiable boundaries

- **Originality.** Borrow only high-level film language and rhythm from other works (low-angle
  hero shots, a freeze before the hit, a slash that splits the frame). Never copy characters,
  designs, assets, music, dialogue, named attacks or frame-by-frame compositions from existing
  games, anime or films. Keep the project's own art style, characters and lore.
- **Gameplay stays authoritative.** The cinematic is presentation only. It must not change damage,
  hit counts, status effects, energy or progress. Settle the outcome once, outside the animation,
  after it completes or is skipped — never twice, never from a dismissed/cancelled playback.
- **Every exit still works.** Skip button, Esc/cancel, a compact/"simple animation" setting,
  `prefers-reduced-motion`, previews/demo playback and pausing when the tab is hidden must keep
  behaving exactly as before. Reduced motion means a steady camera and fewer particles, not a
  broken or missing result.
- **Scope.** Change the move(s) you were asked about. If you notice the same defect in other moves,
  report it instead of silently rewriting them.

## Workflow

1. **Read the existing system first.** Find the cinematic player, the shared FX helpers, the
   registry of per-move plans, the scene/actor renderer and the tests. Note the fixed world
   coordinates (hero, hand, foe anchors, ground line), the frame size, how the camera transform is
   built, and how damage is settled after playback. In the `sing-rpg` project these are
   `spell-cinematic.js`, `spell-fx.js`, `spell-plans.js`, `scene.js` (`spellScene`), one
   `spell-*.js` per move (`spell-forest.js` is the most complete example) and
   `test/spell-cinematic.test.mjs`.
2. **Write the story in one sentence**, then break it into beats with
   [references/storyboard-craft.md](references/storyboard-craft.md): narrative arc, shot vocabulary,
   rhythm and the storyboard table. Fill the table (time, caption, framing, camera move, actor action,
   effects, sound/shake/flash) before writing code.
3. **Implement the plan** with
   [references/canvas-implementation.md](references/canvas-implementation.md): the plan object, shot
   tuples and `cameraAt`, actor poses, back/front layers, impact/warp/hit-stop and freeze, reduced
   motion, letterbox bars and title card. Reuse the project's helpers instead of inventing a second
   system.
4. **Look at real frames** with [references/visual-review.md](references/visual-review.md):
   render a contact sheet of key frames through the actual player when available,
   write down what fails to read, fix it and render again. Do this every time.
   Passing tests says nothing about whether the move looks good.
   When a move is reported as "not good-looking", start here, before changing the storyboard.
5. **Verify** with [references/testing-and-qa.md](references/testing-and-qa.md): every-frame render
   tests against a strict mock context, storyboard invariants, a smoke run through the real scene,
   and the quality checklist.
6. **Report** the shot list with timings, what changed per file, what the frame review found and
   fixed, test results, how frames were viewed, any unverified visual behaviour, and any
   pre-existing issues you left alone.

## What "epic" means here

A move reads as epic when it has **escalation and contrast**, not just more particles:

- a clear arc — signature → ignition → transformation → threat → gathering → apparition →
  hoist/charge → dread → strike → freeze → impact → afterglow → title;
- **scale contrast** — tight close-ups (zoom 4–7×) against towering wides where the weapon or
  apparition leaves the frame;
- **low angles** — subject in the lower third, sky above, slight Dutch roll, weapon exiting the top;
- **camera that obeys the action** — cut on the action beat, track the blade, push in while power
  builds, pull out to show consequence;
- **silence before the blow** — shake and motion drop to zero in a short freeze, then the impact
  gets the biggest flash, shake, slash and enemy reaction of the whole sequence;
- **readable actors** — the hero and foe visibly anticipate, act, react and recover, so the
  effects are driven by bodies rather than floating on top;
- **readable shapes** — masses separate from the background, giants have an identifiable reveal,
  weapons keep their silhouette at the chosen scale, and flashes leave the contact and reaction readable.
