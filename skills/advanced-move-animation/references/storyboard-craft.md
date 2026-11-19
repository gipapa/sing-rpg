# Storyboard craft for epic moves

Read this before writing any code for a new or reworked move. It covers the narrative arc, the
shot vocabulary, timing and rhythm, the storyboard table, and an abstract template.

Contents: 1 Concept · 2 Narrative arc · 3 Shot vocabulary · 4 Rhythm and timing ·
5 Storyboard table · 6 Abstract template · 7 Adapting to weapon types · 8 Short form

## 1. Concept in one sentence

Write: *who* does *what* with *which weapon*, *what world-scale thing* answers, and *how it ends*.
Example shape: "The hero plants the weapon, the land answers with a giant spirit, the spirit
becomes the weapon, and one strike ends it." Every shot must serve that sentence. Pick one visual
motif tied to the weapon's identity (antlers, tides, embers, frost, wind, sand, thunder, eclipse…)
and repeat it through the sequence: on the weapon, in the world change, in the apparition, in the
slash and in the afterglow.

## 2. Narrative arc (beats)

Combine beats that tell one continuous action. For a conjured weapon, show what feeds its
growth, how the hero takes its weight and what that weight does at contact. Give any lasting
change a shot long enough to read before the title appears.

| Beat | Purpose | Typical framing |
|---|---|---|
| Signature | Show the weapon as an object worth respecting | Extreme close-up, glint travels along it |
| Ignition | The action that starts the spell (plant, draw, strike, sing) | Low angle, flash, first shake |
| Transformation | The world changes scale | Pull out / crane up, the world grows past the frame |
| Threat | The foe senses danger | Foe close-up, trembling, backing off |
| Gathering | The hero focuses | Face/eye close-up, orbit or spin lines |
| Apparition | A giant presence appears | Crane up from hero to the giant; scale contrast |
| Ascension | Power becomes the final weapon | Very wide, looking up |
| Hoist | The final weapon is raised | Extreme low angle at the feet, crane up, weapon leaves the top |
| Charge | Wind/energy pressure builds | Tight Dutch-angle push-in, rising shake, horizontal wind lines |
| Dread | The foe looks up at what is coming | Foe close-up, lit from above, cowering |
| Strike | The swing/thrust/release | Tracking shot following the weapon, speed lines, whip-in |
| Freeze | A beat of stillness a hair before contact | Darkened frame, only the weapon lit, zero shake |
| Impact | The heaviest moment | Clear contact or blast origin, enemy reaction and physical consequence |
| Afterglow | Consequence | Pull out: the world split, embers/motes drifting, ground scar |
| Title | Name the move | Title card + subtitle, hero's closing pose |

## 3. Shot vocabulary for a 2D code-driven camera

A 2D camera has position (x, y), zoom and roll. Combine them to fake film grammar:

- **Close-up / extreme close-up**: zoom 4–7.5× on a hand, face, blade or eye. Use letterbox bars.
- **Low angle (仰拍)**: put the camera centre *above* the subject so the subject sits in the
  lower third, add roll (±0.08–0.17 rad), and let the tall element (weapon, tree, giant) leave the
  top edge. Starting at the feet with high zoom and craning up while zooming out sells height.
- **Push-in / pull-out**: change zoom within a shot. Push in while power builds; pull out to reveal
  consequence or scale.
- **Crane (升鏡)**: move camera y a long way (100–260 world px) during a shot, often with a zoom
  change. Use for "the giant rises" or "the weapon towers".
- **Orbit / spin**: small roll change plus spin speed lines around the subject.
- **Tracking**: camera start/end follow the moving element (blade tip path, projectile), using
  an ease that matches its acceleration (`in` for a swing that accelerates).
- **Whip-in**: a short blend (90–200 ms) from the previous shot's end camera, with horizontal motion
  streaks. Use when cutting into a fast action.
- **Dutch angle**: roll for unease (threat, dread) or power (charge). Flip roll sign between the
  hero's and foe's shots.
- **Scale contrast**: alternate a 5× close-up with a 0.7–1.0× wide in which something is 5–10× the
  hero's height.

Screen direction: keep the hero on one side and the foe on the other for the whole move, and keep
the strike moving the same way across the screen. Breaking it reads as a mistake.

## 4. Rhythm and timing

- Total length: 10–17 s for an ultimate/legendary move; 5–8 s for a normal move (see §8).
  Shot lengths 0.4–2 s; the fastest shots are the strike and the freeze.
- As a starting point for a long move, put impact about three-quarters of the way through.
  Leave time for the reaction, the changed scene and the title.
- **Cut on the action.** Shot boundaries land on beats: the plant, the step, the eye ignition, the
  start of the swing, contact. Put the action's key pose 100–300 ms after the cut, not before it.
- **Anticipation → action → follow-through** for every big motion: a small counter-motion, an
  overshooting main motion (back-ease), then a settle.
- **Build toward impact.** Use a brief drop in motion or shake before contact when it gives the
  blow weight. A 0.3–0.5 s hold is a starting point for a long move. Judge it at playback speed.
- Hit-stop: slow time to ~10% for ~250 ms after contact so the blow registers.
- Bars (letterbox) widen for close-ups and from the freeze through the impact; narrow for wides.
- Title card appears after the impact has settled (≈1.5–2.5 s after), and fades out at the end.

## 5. Storyboard table (fill before coding)

| Field | Meaning |
|---|---|
| Start (ms) | Shot start; constants for key beats (IMPACT, FREEZE, …) rather than magic numbers |
| Caption | Unique short shot name shown on screen (e.g. "Beat · Image") |
| Framing | Who/what fills the frame, where it sits (lower third, centre) |
| Camera from → to | [x, y, zoom, roll] at start and end; ease; optional whip ms |
| Hero action | Pose and timing (angle, offset, overshoot) |
| Foe action | Reaction (tremble, back off, look up, knockback, recover) |
| Effects (back) | Things behind the actors: sky, world change, giant apparition |
| Effects (front) | Things over the actors: weapon light, particles, slash, darkness |
| Overlay | Speed-line type (vertical / horizontal / zoom / spin), flash colour and strength |
| Shake | Curve contribution in this shot |
| Bars | Letterboxed or not |
| Reduced motion | What stays (story, impact) and what is cut (camera moves, lines, flashes) |

## 6. Abstract template (adapt; do not reuse literally)

Replace the placeholders with the move's own motif. Times are proportions of a ~16 s move; shift
them to fit. Keep beat constants named so later edits move whole sections safely.

| t | Caption | Framing / camera | Hero | Foe | Effects |
|---|---|---|---|---|---|
| 0.00 | {Weapon} · signature | ECU on weapon, slow slide hilt→tip, zoom ~7 | Holds still | — | Glint travels, motif sparkles |
| 0.09 | Ignition | Low angle, roll .08, whip 160 ms | Plants/draws/strikes, overshoot | — | Flash, shockwave rings, ground cracks, first shake |
| 0.15 | World transformation | Wide, crane up, zoom ~0.8 | Holds the pose | Flinches | {Motif world} grows past the frame, light shafts |
| 0.26 | Threat | Foe close-up ~4, Dutch | — | Trembles, backs off | {Motif} creeps toward foe, shadow |
| 0.33 | Gathering | Face ECU ~7.5 → pull to ~3 | Kneels/focuses, eye glint | — | Spiral sparks, spin lines |
| 0.42 | Apparition | Crane from hero up to the giant | Looks up | — | Giant {spirit} steps in, footstep shakes, eyes ignite |
| 0.53 | Ascension | Very wide, looking up | Raises weapon | — | {Spirit part} streams into a giant weapon |
| 0.59 | Hoist | Feet ECU ~4.6, roll −.16 → crane up to ~1.0 | Hoists over shoulder, wavers | — | Giant weapon leaves the top of frame, spirit ghost behind |
| 0.64 | Charge | Dutch push-in 3.4 → 4.8 | Plants feet, weapon trembles | — | Wind streaks converge, rings climb blade, debris lifts, arcs |
| 0.70 | Dread | Foe close-up, lit from above | — | Looks up, cowers | Blade light spills on foe |
| 0.73 | Strike | Tracking from raised weapon to foe, ease in, whip 90 | Accelerating swing | — | Arc trail, speed arcs, zoom lines |
| 0.75 | Freeze | Close on contact point, slow push | Held 90% through the arc | Frozen | Frame darkens, only blade lit, hairline glint, zero shake |
| 0.77 | Impact | Foe close-up, tracking the knockback | Follow-through | Thrown back, tilts, lifts | Frame-wide slash, afterimage lines, radial burst, rings, max shake |
| 0.82 | Afterglow | Pull out | Holds | Recovers slightly | World split along the cut, rising motes, ground scar |
| 0.90 | Title | Medium, slow push | Closing pose | — | Spirit faintly returns, title + subtitle |

## 7. Adapting to weapon types

These are prompts for your own design, not fixed answers.

| Weapon | Hoist/charge equivalent | Strike | Freeze image | Impact signature |
|---|---|---|---|---|
| Sword / blade | Raise overhead, blade grows | Overhead or diagonal slash | Edge a hair above target | Frame-wide slash line, world split |
| Spear / lance | Draw back low, body coils | Long thrust with tracking dolly | Tip one length short | Piercing beam, ring shockwave through target |
| Hammer / club | Sink under the weight, pull the grip across the body | Arc into the ground or foe | Striking face just clear of contact | Debris from the contact point, crater or shifted ground |
| Bow | Draw to full, string light | Release; follow the arrow | Arrow tip before target | Star-burst pierce, trail persisting |
| Instrument / drum | Rhythm builds beat by beat | Final strike on the beat | Beat held silent | Shock rings timed to beats |
| Scythe / reaping | Wide back-swing, eclipse/shadow forms | Horizontal sweep | Blade curve framing target | Crescent cut, darkness lifting |
| Magic focus | Sigils stack, sky changes | Beam/rain descends | Beam frozen at contact | Column of light, bloom, motes |

## 8. Short form (normal moves, 5–8 s)

Signature/ignition (1 shot) → threat or gathering (1) → strike with tracking (1) → impact with
hit-stop (1) → afterglow + title (1–2). Keep the same rules: cut on action, escalate to the impact,
one memorable motif.
