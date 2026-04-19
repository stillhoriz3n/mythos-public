# Spectrum — Audio-Reactive Design System

> "Every colored sidebar everywhere is a VU meter."
> — the design brief that led here

Spectrum is the contract between the shell's FFT analyser and every
page, component, and visual primitive that wants to breathe with the
music. It turns audio reality into a handful of CSS custom properties
that any designer can hook into without writing JavaScript.

If you are designing a page, **you never touch the audio code**. You
drop in `_mythos-page.js`, then declare what responds to what.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ SHELL (index.html + shell.js)                       │
│ ┌─────────────────┐    ┌──────────────────────┐    │
│ │ AudioContext    │───▶│ Analyser (fftSize    │    │
│ │  + MediaElement │    │   4096, smoothing    │    │
│ └─────────────────┘    │   0.78)              │    │
│                        └──────────┬───────────┘    │
│                                   ▼                 │
│ ┌──────────────────────────────────────────────┐   │
│ │ per frame @ 60fps:                           │   │
│ │   getBeat()      → beat phases + pulses      │   │
│ │   updateBands()  → 10 log-spaced VU bands    │   │
│ │                  → 10 onset detectors        │   │
│ │                  → envelope (overall RMS)    │   │
│ │   SEAL_MS[currentM] → current M color + idx  │   │
│ └──────────────────────────────────────────────┘   │
│                    │ postMessage                    │
│                    ▼                                │
│ ┌──────────────────────────────────────────────┐   │
│ │ mythos:beat { beat, bands[], onsets[],       │   │
│ │   envelope, sealColor, sealM, matrixMode }   │   │
│ └──────────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────────┘
                    │  (one subscribed iframe at a time)
                    ▼
┌─────────────────────────────────────────────────────┐
│ PAGE IFRAME (_mythos-page.js)                       │
│   - rAF-batched CSS custom-prop writes              │
│   - Visibility API (un)subscribe                    │
│   - Declarative attribute wiring                    │
│                                                     │
│   All page CSS reads --beat-*, --band-*, --onset-*  │
└─────────────────────────────────────────────────────┘
```

Broadcasting only runs while at least one page is subscribed. Pages
unsubscribe when hidden (Page Visibility API).

---

## Variable Contract

All variables live on `:root` / `html` in the iframe document. Values
are stringified numbers (0–1 range unless noted) updated once per frame
while playing. When paused, most variables hold at 0; band energies
and onsets are forced to 0 so static designs stay quiet.

### Beat clock

| Variable | Range | Meaning |
|---|---|---|
| `--beat-phase` | 0→1 sawtooth | progress through the current beat |
| `--beat-pulse` | 0→1 | sharp attack, exp decay per beat |
| `--beat-bar-phase` | 0→1 sawtooth | progress through the current 4-beat bar |
| `--beat-bar-pulse` | 0→1 | sharp attack + decay on bar downbeats |
| `--beat-bpm` | integer | current track BPM |
| `--beat-sec` | CSS time | `60/bpm` seconds — use as `animation-duration` |
| `--beat-bar-sec` | CSS time | `240/bpm` seconds — one bar |

### Frequency bands (VU-ballistic)

Ten log-spaced bands spanning bin 2 → end of FFT (~24 kHz). Each uses
analog-VU ballistics: fast attack (needle jumps with peaks), slow
release (settles back over ~400 ms).

| Index | Alias | Approx range (Hz) |
|---:|---|---|
| 0 | `--sub-bass`   | 23–46 |
| 1 | `--bass`       | 46–93 |
| 2 | `--low-mid`    | 93–186 |
| 3 | *(unnamed)*    | 186–373 |
| 4 | `--mid`        | 373–746 |
| 5 | `--high-mid`   | 746–1,492 |
| 6 | `--presence`   | 1.5–3 kHz |
| 7 | `--treble`     | 3–6 kHz |
| 8 | `--brilliance` | 6–12 kHz |
| 9 | `--air`        | 12–24 kHz |

Use `--band-0` through `--band-9` or the named aliases — they point at
the same values.

### Onset pulses

Per-band rising-edge detectors (delta = fast follower − slow baseline).
Fires on transients only, then exp-decays over ~200 ms.

| Variable | Meaning |
|---|---|
| `--onset-0` .. `--onset-9` | per-band onset decay 0→1 |
| `--onset-bass` | max of onsets 0–2 |
| `--onset-mid` | max of onsets 3–6 |
| `--onset-high` | max of onsets 7–9 |
| `--kick` | onset of band 0 (sub-bass attack) |
| `--snare` | onset of band 4 (mid attack) |
| `--hat` | onset of band 8 (brilliance attack) |

### Derived / seal

| Variable | Meaning |
|---|---|
| `--envelope` | 0→1 overall loudness, slowly averaged |
| `--seal-color` | hex of the currently-glowing Radiant Seal M |
| `--seal-m` | integer 0–4 identifying the M |

---

## Declarative Hooks

You do not read these variables by index if you don't want to. The
helper provides attribute-based wiring so pages can declare intent.

### `data-band`

Bind an element's `--band-level` to one or more bands:

```html
<div class="m-meter" data-band="4"></div>       <!-- band 4 -->
<div class="m-meter" data-band="1-5"></div>     <!-- avg of 1..5 -->
```

### `data-band-role`

Use a semantic name instead of an index. Accepted:
`sub-bass`, `bass`, `low-mid`, `mid`, `high-mid`, `presence`, `treble`,
`brilliance`, `air`.

```html
<div class="m-meter" data-band-role="bass"></div>
```

### `data-tint`

Viewport intersection tints the shell viz toward a color:

```html
<section data-tint="#e8b85a" data-tint-machine="#8a6c30">
  <!-- when this dominates the viewport, --signal-synth lerps to gold -->
</section>
```

The shell lerps `--signal-synth` / `--signal-machine` over ~0.8 s.

### `data-reveal`

Adds `.in-view` when the element scrolls into view. Useful for the
first-paint reveal animations.

---

## Utility Classes

Loaded automatically by `_mythos-page.js` from `_mythos-meters.css`.

### `.m-meter`

Draw a reactive stripe via `::before`. Dimensions come from the host
element; the class only paints the fill.

```html
<!-- vertical, default axis -->
<div class="m-meter" data-band-role="bass"></div>

<!-- horizontal -->
<div class="m-meter" data-meter-axis="h" data-band-role="treble"></div>

<!-- with glow -->
<div class="m-meter m-meter--glow" data-band="5"></div>

<!-- floor override (min visible when silent) -->
<div class="m-meter" data-band="0" data-meter-floor="0.2"></div>
```

### `.m-strobe`

Opacity pulses on a chosen trigger. Typically used as a full-bleed
background layer.

```html
<div class="m-strobe" data-strobe="kick"
     style="position:fixed;inset:0;z-index:-1"></div>
```

Triggers: `bar`, `beat`, `kick`, `snare`, `hat`.

### `.m-spin-bar` / `.m-spin-beat`

CSS animation duration matches one bar or one beat. Use on any
element that should rotate in lockstep with the track:

```html
<svg class="m-spin-bar" viewBox="0 0 10 10">...</svg>
```

---

## Recipes

### A stripe that lives with the bass

```html
<div class="m-meter m-meter--glow" data-band-role="bass"></div>
```

### A fullscreen kick flash

```html
<div class="m-strobe" data-strobe="kick"
     style="position:fixed;inset:0;z-index:1;mix-blend-mode:screen"></div>
```

### A heading that pulses on downbeats

```css
h1 {
  letter-spacing: calc(-0.02em + var(--beat-bar-pulse, 0) * 0.04em);
  color: oklch(85% calc(0.05 + 0.2 * var(--bass, 0)) var(--seal-m, 60) * 72);
}
```

### A progress bar showing all 10 bands at once

```css
.spectrogram {
  background: linear-gradient(
    to right,
    var(--seal-color, gold) 0%,
    var(--seal-color, gold) calc(var(--band-0) * 10%),
    transparent calc(var(--band-0) * 10%),
    var(--seal-color, gold) 10%,
    /* repeat per band */
  );
}
```

### A card that pulses on the snare

```css
.card {
  transform: scale(calc(1 + var(--snare, 0) * 0.02));
  transition: transform 30ms linear;
}
```

### Typography that grows with loudness

```css
.hero h1 {
  font-variation-settings: "wght" calc(400 + var(--envelope, 0) * 400);
}
```

---

## Performance

- **Broadcast is 60fps** only while a page is subscribed.
- **rAF batching** on the consumer side means many postMessage events
  collapse into one CSS-var write per frame.
- **Visibility API** pauses broadcasting when the page is hidden.
- **Custom-prop writes** on `html` are cheap (they don't invalidate
  layout until a rule reads them), so broad-coverage wiring is fine.
- Avoid `transition: all` on elements that read Spectrum vars — name
  the properties you transition to keep paints narrow.

---

## Philosophy

The site was already animated before Spectrum existed — it had a
visualizer, a matrix rain, a Radiant Seal that cycled on the bar clock.
What was missing was **composability**. Every page needed bespoke
JavaScript to hear the music.

Spectrum collapses the gap. The FFT becomes a dozen numbers that any
designer can use in any CSS rule. A border-left, a letter-spacing,
a drop-shadow radius, a font-weight, a background-position — anything
that accepts a number can participate in the track.

The goal is that designing an audio-reactive page feels like designing
any other page, except the page knows what song is playing.

---

## See also

- `public/shell.js` — broadcast implementation
- `public/pages/_mythos-page.js` — consumer
- `public/pages/_mythos-meters.css` — utility stylesheet
