# Visual review and readability

Read this before calling any move finished, and immediately when someone says a move "doesn't
look good". A cinematic can pass every structural test (finite values, framing math, shake curve,
time warp) and still look bad. Use frames and playback to distinguish material, framing, motion
and rhythm problems; change the parts the evidence points to. In the worked example below,
readability needed revision while the existing timeline could be kept.

Contents: 1 Render a contact sheet · 2 Critique before changing code · 3 Readability rules ·
4 Iterate · 5 Worked lesson

## 1. Render a contact sheet

Render real frames through the real scene renderer, the plan's layers and the overlay, then look at
them as one image.

- **Browser available:** use the environment's supported browser tool or CLI, including an
  installed headless browser workflow. Load the game or a temporary capture page, drive the
  player's clock to each sample time, and screenshot a grid of frames.
- **Browser technically unavailable:** an already available compatible renderer can help with
  diagnosis; clearly label approximations. If frames or playback cannot be inspected, report
  that gap. Do not build a second Canvas implementation just for this review, or use an
  alternate capture path to bypass a denied action.

For sing-rpg, a temporary browser harness can call `spellCinematic(dialog).play(...)` with the
real scene and control `requestAnimationFrame` plus `performance.now`. Start both clocks at the
same zero and advance in 10–20 ms increments before copying the canvas at each sample. This
preserves the real player's overlay, title, attack/hit state and easing of letterbox bars.
Sampling isolated layers can miss their combined glare; jumping directly to a timestamp can
miss stateful transitions. Keep capture hooks outside production code and restore browser APIs
afterward. Also play once on the native clock, since controlled frames cannot establish pacing.

Which frames to render (about 16–24 per sheet):

- the first, middle and last frame of each shot, plus the midpoint of every crane or big zoom;
- the freeze, then the impact at +50, +150, +300 and +600 ms;
- the afterglow and the title card;
- a second, smaller sheet in reduced motion;
- one sheet of a move the team already likes, rendered the same way, as a reference for
  brightness, scale and density.

## 2. Critique before changing code

Write the problems down per frame first: what you see, why it fails, and which drawing function
causes it. This keeps fixes targeted. Ask for each frame:

- Can you tell what the big shape is within half a second without the caption?
- Is the subject of the shot (weapon, apparition, foe) whole and dominant, or just a slab or edge?
- Are the large masses clearly lighter or darker than what is behind them?
- Does anything look like UI or a chart (evenly spaced bars, stripes, perforations, outlines only)?
- At the impact: can you still see the foe's silhouette and the weapon's shape?
- Does the reduced-motion version still show the key images?

## 3. Readability rules

**Value contrast.** Important parts of large masses (walls of water, trees, giants, crowns) need
enough value contrast to separate from the background. Gradients that are only bright near the top
vanish when the frame shows the lower part. Dark-on-dark fills disappear; a mass drawn as an outline
or a crest line alone can read as a diagram. Deliberate silhouettes and lost edges remain useful
when the intended subject is identifiable.

**Mass, edge, texture.** Choose material cues that suit the project's style: value planes or a
gradient, a contrasting edge (foam crest, rim light), or interior texture moving in a meaningful
direction (light bands climbing up a wave, shimmer rising in a crystal, embers in a forge).
These are options, not a requirement to give every effect the same treatment.
Evenly repeated vertical stripes can resemble a bar chart; evenly spaced identical squares can resemble film
perforations or a progress bar. Vary size and spacing, and add a highlight pixel to beads.

**Hollow and depth.** Against a dark scene, a translucent apparition may need a bright rim and
mid-value interior to retain its volume. Judge the actual composite: a dark centre can disappear
into its background.

**Weapons at giant scale.** A dark outline, body and bright core can separate the weapon's planes; use silhouette
details that survive scaling (barbs, crossbars, guards, notches), and a soft gradient halo. A flat
translucent rectangle around a thin line reads as a slab and a stick.

**Frame the apparition at its hero moment.** Give a giant shape a recognizable reveal before
cropping it for scale; cranes should not spend most of their time inside its bottom edge. Make shapes rise
fast enough to stay ahead of the crane, use an `out` ease when the camera must arrive early, and let
transitions transform the shape (shrink the crown onto the weapon, fold the spirit into the blade)
instead of leaving a half-framed slab on screen.

**Read the material at the closest zoom.** Compare the prop in the reference shot and in
the revised shot at actual display size. A forged head can show a broad dark iron face, a
chipped cold edge, then a narrow warm reflection facing the furnace. Light leather and
bronze differently from the metal they touch. Repeated bright borders around every piece
can make a heavy object look like a row of buttons. When Forest Judgment is the reference,
build the large prop at the actors' pixel scale. Let its silhouette change with the cast:
iron can collect around the grip, acquire a striking face, then carry an ember down into
the ground. Sample the wide shot after contact and check that the changed ground is still legible.

**Watch the transfer of weight.** Play a few frames on either side of a release or cut.
For a wielded giant weapon, watch the hand, weapon head and target together through at
least part of the swing. In a close shot the hand can leave frame once that motion reads.
Trace the bowstring from notch to arrow, the folded wing from shoulder to tip, or the
chain from its attachment to the falling load. On a continuous pullback, begin from the
preceding camera position. Check that the focal object, its shadow and the hit reaction
move in the same direction and that the eye can follow the action into the wider shot.

**Impact: power and readable contact.** Sustained white can erase the hit. A brief white impact
frame may be intentional; show contact and the foe's reaction around it. For this trident, a
partial 260 ms / 0.55-alpha flash preserved the action. Treat those values as a local fix, not
universal limits. Draw beams and slashes as thin bright
cores inside narrow coloured halos, and budget overlapping additive (`lighter`) layers: they sum to
white. Remember the close-up zoom multiplies every width: a 12 px beam at 4.5× fills the frame.
Show a physical consequence (spray cone with gravity, debris, a tunnel through the wall, a split
forest) instead of only more light. The foe's silhouette must stay visible.

**Anchor effects to what the camera sees.** Effects that start "somewhere behind the target"
(a tunnel, a cut line) can fill a close-up unexpectedly. Start them at the meaningful boundary (the
wall face, the edge of the forest).

## 4. Iterate

Render → critique → fix the biggest observed problem → render the same frames again and replay
the changed beat. Keep the timeline unless the critique shows a rhythm problem. Stop when every listed problem is resolved in
the frames themselves, then rerun the automated tests. Add a regression test only for invariants
that matter (for example, the impact flash stays short and partial), not for colour values.

## 5. Worked lesson

A sea-themed trident move passed 64 tests, including framing checks, but its contact sheet showed:

| Problem in frames | Cause | Fix |
|---|---|---|
| Water walls looked like a funnel graph | Dark body same value as the sky, thin crest, vertical stripes | Lighter value gradient at every height, 3 px foam crest with ragged drips, rising light bands, inward spray |
| Giant crown read as a ceiling, then as a box | Dark fill and thin outline; crane passed through its base; it faded in place | Luminous gradient body, mid-value hollow, beaded pearl band, faster rise with an `out` crane, shrinks onto the trident head |
| Trident was a stick in a slab | One-value shaft, flat translucent rectangle | Outline/body/core, barbed prongs, upturned crossbar, gradient halo, water helix while charging |
| Impact was three white frames | Strong long flash, wide additive beams at 4.5× zoom, tunnel starting behind the foe | Short partial flash, thin cores in narrow halos, wider impact camera, tunnel from the wall face, spray cone and rain |
