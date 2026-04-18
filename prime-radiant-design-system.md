# Prime Radiant — Design System

**A visual doctrine derived from the *Robots & Remixes №05* album cover, adapted for web.**
**Version 1.0** · For use on GitHub Pages landing and future surfaces in the Prime Radiant / MythOS family.

---

## Philosophy

The aesthetic is **cosmic reverence** — deep space as the ground, a single hot synthesis event as the subject, quiet instrument-panel typography as the voice. Nothing shouts. Everything signals.

Three design principles, in priority order:

1. **The dark does the work.** Near-black backgrounds aren't absence of design — they're the stage that lets everything else become light. No drop shadows on a dark stage. Just glow, and the dark around it.
2. **One hot event, everything orbits it.** Pages have a center of gravity — a single glowing element that the eye returns to. Everything else is supporting cast.
3. **Type is instrumentation.** Mono for metadata and system labels (like readouts on a console), serif for big statements (like handwritten captions in a scientific notebook), sans-serif heavy-weight only for titles that need to hit.

---

## Color Tokens

All values are final — no tweaking per-page.

```css
:root {
  /* Ground (deep cosmic background, gradient from center to edges) */
  --stage-center:   #1f1a2a;  /* near-center warmth */
  --stage-mid:      #14121c;  /* midfield */
  --stage-deep:     #08070d;  /* 45% out */
  --stage-void:     #020204;  /* corners, nearly black */

  /* Signal colors (the three semantic voices) */
  --signal-machine: #4ec9d4;  /* CYAN — robots, machines, AI, code */
  --signal-human:   #f0ebdb;  /* BONE — raw human signal, text body */
  --signal-synth:   #e8b858;  /* AMBER — output, work, synthesis, brand */

  /* Hot core (reserved for the single event per surface) */
  --core-white:     #ffffff;  /* singularity */
  --core-halo:      #fff2c8;  /* immediate warm halo around the core */
  --core-spike:     #ffe6b0;  /* diffraction spikes / subtle glow trails */

  /* Support */
  --ink-bright:     #e8e3d4;  /* primary text on dark */
  --ink-soft:       #b5b0a3;  /* body text */
  --ink-dim:        #8a8574;  /* metadata, captions */
  --ink-faint:      #4a4740;  /* tertiary, hairlines */
  --rule:           #242a33;  /* dividers */
  --rule-soft:      #1b2028;  /* subtle dividers */

  /* Dark matter filaments (background texture — very faint) */
  --filament-cool:  #6a5a7a;  /* violet-gray cosmic web */
  --filament-cooler:#5c5068;  /* deeper violet-gray */
  --filament-warm:  #8b6a3a;  /* ochre cosmic web (rarer) */
}
```

**Usage rules:**

- **Cyan + Amber are the semantic pair.** Anything representing machines, automation, code, AI = cyan. Anything representing human output, brand, the work produced = amber. Don't mix — a button isn't "cyan and amber," it's one or the other based on what it represents.
- **Bone white is for text, not for signal.** Body text, headlines. Use sparingly for signal lines (the way the raw human waveform is a third, quieter voice in the cover).
- **Hot white is reserved.** Only the central event/singularity on a surface uses hot white. Don't use `#ffffff` for text. If you need bright text, use `--ink-bright` (#e8e3d4).

---

## Typography

Three fonts, three roles. No exceptions.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Archivo — Display / Titles

- **Use for:** Page titles, hero headlines, section headers that need to hit hard.
- **Weights:** 800 (ExtraBold) for hero, 700 (Bold) for section headers.
- **Character:** Modern grotesque, confident, high x-height. Reads as "contemporary record label / tech company." Tight letter-spacing (-0.02em for large sizes).
- **Sizing:** Hero 72–96pt. Section headers 36–48pt.

```css
.hero-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.0;
}
```

### Fraunces — Ornamental / Italic / The Ampersand

- **Use for:** The `&` operator whenever it appears next to Archivo titles. Pull quotes. Tagline italics. "About the artist" style bio text. Anywhere a thought-provoking moment of beauty belongs.
- **Weights:** 300 light italic (the signature move), 400 regular italic.
- **Character:** Contemporary serif with real personality — its italic has a classical calligraphic quality. Use optical size axis (`font-variation-settings: "opsz" 144`) for display sizes, `"opsz" 36` for body.
- **Don't overuse.** Fraunces is a spice, not a staple.

```css
.amp {
  font-family: 'Fraunces', serif;
  font-variation-settings: "opsz" 144;
  font-weight: 300;
  font-style: italic;
  color: var(--signal-synth);  /* always amber when used as operator */
}
```

### JetBrains Mono — Metadata / System Voice

- **Use for:** Labels, eyebrows, metadata, timestamps, catalog numbers, version strings, code, anything that reads like an instrument panel readout.
- **Weights:** 400 (regular) for inline, 500 (medium) for eyebrows, 600 (semibold) for primary monospace emphasis.
- **Character:** Uppercase with wide letter-spacing (`0.15em–0.25em`) is the house pattern. Small sizes (10–12pt). Never use for body text — it's intentionally "instrument panel" feel.

```css
.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--signal-synth);  /* or var(--ink-dim) depending on role */
}
```

---

## The Prime Radiant Emblem

The geometric mark. Drop into any layout as the label brand. It is a **cuboctahedron containing a smaller cuboctahedron**, vertices connected by a lattice — the geometry of Hari Seldon's Prime Radiant from *Foundation*.

```svg
<svg viewBox="0 0 70 60" xmlns="http://www.w3.org/2000/svg" width="70" height="60">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="#e8b858">

    <!-- Outer hexagonal silhouette -->
    <polygon points="35,2 60,16 60,44 35,58 10,44 10,16"
      stroke-width="1.4" opacity="0.95"/>

    <!-- Outer cuboctahedron internal edges -->
    <line x1="35" y1="2"  x2="35" y2="22" stroke-width="0.9" opacity="0.75"/>
    <line x1="10" y1="16" x2="35" y2="22" stroke-width="0.9" opacity="0.75"/>
    <line x1="60" y1="16" x2="35" y2="22" stroke-width="0.9" opacity="0.75"/>
    <line x1="35" y1="58" x2="35" y2="38" stroke-width="0.9" opacity="0.65"/>
    <line x1="10" y1="44" x2="35" y2="38" stroke-width="0.9" opacity="0.65"/>
    <line x1="60" y1="44" x2="35" y2="38" stroke-width="0.9" opacity="0.65"/>
    <line x1="35" y1="22" x2="35" y2="38" stroke-width="0.7" opacity="0.5"/>

    <!-- Inner cuboctahedron -->
    <polygon points="35,16 47,23 47,37 35,44 23,37 23,23"
      stroke-width="0.9" opacity="0.85" fill="#e8b858" fill-opacity="0.1"/>
    <line x1="35" y1="16" x2="35" y2="44" stroke-width="0.55" opacity="0.55"/>
    <line x1="23" y1="23" x2="47" y2="37" stroke-width="0.55" opacity="0.45"/>
    <line x1="47" y1="23" x2="23" y2="37" stroke-width="0.55" opacity="0.45"/>

    <!-- Connecting lattice (the "hyper-cuboctahedron") -->
    <line x1="35" y1="2"  x2="35" y2="16" stroke-width="0.55" opacity="0.55"/>
    <line x1="60" y1="16" x2="47" y2="23" stroke-width="0.55" opacity="0.55"/>
    <line x1="60" y1="44" x2="47" y2="37" stroke-width="0.55" opacity="0.55"/>
    <line x1="35" y1="58" x2="35" y2="44" stroke-width="0.55" opacity="0.55"/>
    <line x1="10" y1="44" x2="23" y2="37" stroke-width="0.55" opacity="0.55"/>
    <line x1="10" y1="16" x2="23" y2="23" stroke-width="0.55" opacity="0.55"/>

    <!-- Equations core -->
    <circle cx="35" cy="30" r="1.8" fill="#ffe6a0" opacity="0.98"/>
    <circle cx="35" cy="30" r="4.5" fill="none" stroke="#ffe6a0" stroke-width="0.45" opacity="0.45"/>
  </g>
</svg>
```

**Placement rules:**
- Always top-left of a surface (masthead position) or standalone as a page/section identifier.
- Scales from 24px (favicon) to 200px+ (landing hero). Readable at all scales.
- Never pair with the wordmark unless explicitly needed. The mark alone is the brand.
- Never change the color. Always amber (`--signal-synth`).

---

## The Cosmic Ground

The background is not a flat color. It is a **radial gradient that warms toward center**, optionally decorated with stars and dark-matter filaments.

### Minimum (sections, cards)

```css
.surface {
  background: radial-gradient(
    ellipse at center,
    var(--stage-center) 0%,
    var(--stage-mid) 30%,
    var(--stage-deep) 70%,
    var(--stage-void) 100%
  );
}
```

### Full (hero / landing surfaces)

Use an actual star field behind content. Here's the recipe, in four tiers:

**Tier 1 — Luminous stars (with soft glow).** Rare, 5–10 per viewport. Warm bone-white.
**Tier 2 — Medium pinpoints.** 25–40 per viewport. Bone-white or slightly warmer.
**Tier 3 — Cool cyan-tinted stars.** 10–20 per viewport. Subtle, suggests machine signal at distance.
**Tier 4 — Fine dust.** 40–60 sub-pixel pinpoints. Subliminal density.

```html
<svg class="starfield" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>

  <!-- Tier 1: luminous (with glow) -->
  <g filter="url(#soft-glow)">
    <circle cx="145" cy="215" r="1.8" fill="#f5eedd" opacity="0.95"/>
    <circle cx="870" cy="165" r="1.9" fill="#f5eedd" opacity="0.95"/>
    <!-- …5–10 of these, hand-placed -->
  </g>

  <!-- Tier 2: medium -->
  <g fill="#e8dfc8" opacity="0.75">
    <circle cx="80"  cy="110" r="0.8"/>
    <circle cx="200" cy="145" r="0.9"/>
    <!-- …25–40 of these -->
  </g>

  <!-- Tier 3: cyan -->
  <g fill="#9fd8df" opacity="0.5">
    <circle cx="225" cy="215" r="0.7"/>
    <!-- …10–20 of these -->
  </g>

  <!-- Tier 4: dust -->
  <g fill="#b8b0a0" opacity="0.35">
    <circle cx="40"  cy="45"  r="0.35"/>
    <!-- …40–60 of these -->
  </g>
</svg>
```

**Placement philosophy:** Hand-place every star. Never random-generate. Balance the composition — stars should feel compositionally inevitable, not scattered. Cluster slightly toward edges, leave mid-areas quieter.

### Dark-matter filaments (optional, for full hero surfaces)

Thin wispy irregular strands crossing the dark field. These are *cosmic web* geometry, not sine waves:

```svg
<!-- Long arcing filament -->
<path d="M 30 120 C 90 145, 160 160, 230 155 C 275 152, 305 168, 335 190"
  fill="none" stroke="#6a5a7a" stroke-width="0.6" opacity="0.35" stroke-linecap="round"/>

<!-- Diagonal kinked filament -->
<path d="M 45 325 C 110 315, 165 305, 200 285 L 215 268 C 240 255, 280 245, 320 250"
  fill="none" stroke="#5c5068" stroke-width="0.5" opacity="0.3" stroke-linecap="round"/>

<!-- Broken fragment (implies occlusion by dark matter) -->
<path d="M 55 700 C 120 705, 180 700, 235 695"
  fill="none" stroke="#6a5a7a" stroke-width="0.55" opacity="0.32" stroke-linecap="round"/>
<path d="M 265 693 C 310 690, 350 685, 400 678"
  fill="none" stroke="#6a5a7a" stroke-width="0.5" opacity="0.28" stroke-linecap="round"/>
```

**Rules:**
- Opacity `0.25–0.35` — present, not assertive
- Non-parallel. Non-repeating. Non-symmetric
- Some broken into fragments (implies density occluding the line)
- Occasional amber filament (`#8b6a3a`) among the violet-grays, rare
- Never smooth sine waves. Always irregular Bezier curves

---

## The Hot Event

Every surface that wants presence (hero, major CTA, "the one thing") needs a hot event — a centered glowing point with layered bloom.

### Bloom gradients

```css
/* Reserve these as defs in an SVG or as radial-gradient() in CSS */
```

```svg
<defs>
  <!-- Core bloom -->
  <radialGradient id="event-core" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0%"   stop-color="#fff2c8" stop-opacity="0.9"/>
    <stop offset="8%"   stop-color="#ffdf8a" stop-opacity="0.55"/>
    <stop offset="22%"  stop-color="#e8b858" stop-opacity="0.25"/>
    <stop offset="50%"  stop-color="#d9a441" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#8b5a1e" stop-opacity="0"/>
  </radialGradient>

  <!-- Outer halo (for large hero events only) -->
  <radialGradient id="event-halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0%"   stop-color="#e8b858" stop-opacity="0.07"/>
    <stop offset="40%"  stop-color="#d9a441" stop-opacity="0.025"/>
    <stop offset="100%" stop-color="#d9a441" stop-opacity="0"/>
  </radialGradient>
</defs>
```

### Stacking pattern

Layer four circles from the same center, from outside-in:

```svg
<!-- 1. Outer halo (whisper of warmth, very large) -->
<circle cx="500" cy="500" r="560" fill="url(#event-halo)"/>

<!-- 2. Mid halo (the warm field) -->
<circle cx="500" cy="500" r="380" fill="url(#event-core)" opacity="0.55"/>

<!-- 3. Inner hot core (denser glow) -->
<circle cx="500" cy="500" r="180" fill="url(#event-core)" opacity="0.85"/>

<!-- 4. Singularity bloom -->
<circle cx="500" cy="500" r="65" fill="url(#event-core)" opacity="0.9"/>
```

### The point of light itself

```svg
<!-- Hot white core at the exact center -->
<circle cx="500" cy="500" r="3.5" fill="#ffffff"/>
<!-- Warm halo immediately around the core -->
<circle cx="500" cy="500" r="7" fill="#fff2c8" opacity="0.85"/>

<!-- Subtle diffraction spikes -->
<line x1="475" y1="500" x2="525" y2="500" stroke="#ffe6b0" stroke-width="0.6" opacity="0.55"/>
<line x1="500" y1="485" x2="500" y2="515" stroke="#ffe6b0" stroke-width="0.5" opacity="0.4"/>
```

**Rules:**
- One hot event per surface. Never two.
- The event is gradient only — **no visible rings, no dashed circles, no concentric geometry.** Radiation is atmosphere, not geometry. (This was a lesson learned — visible rings read as desert mirage, not starlight.)
- Scale the event to your surface: a hero might have r=380 for the mid-halo; a button hover glow might have r=60.

---

## Layout Rhythm

### Margins and spacing

- **Edge margin on hero:** 6% of viewport width. On a 1440px layout, that's ~85px.
- **Section padding:** 120–160px vertical, 6% horizontal.
- **Content max-width for reading:** 680px. Typography is the reader's hand, don't make them swing it around.
- **Content max-width for composition:** 1100–1280px. Used for wider layouts like cards, grids, and hero images.

### Hierarchy anchors

Every surface has four corners that want different things:

- **Top-left:** Brand. The Prime Radiant emblem lives here. Always.
- **Top-right:** Navigation or minimal metadata. Keep it quiet.
- **Bottom-left:** Primary content / big statement. This is where "ROBOTS & REMIXES" lives on the cover. The heaviest typographic weight on the page.
- **Bottom-right:** Credit / secondary metadata. Smaller, right-aligned, bright-to-dim hierarchy.

### The flush-left edge

Big display type hugs the left edge at `margin-left: 6vw` and stays there. The hard vertical edge is the composition's spine. Don't center big titles — let them anchor left and let the whitespace on the right breathe.

---

## Component Patterns

### Eyebrow label

```html
<div class="eyebrow">
  <span class="glyph">✦</span>
  <span class="label">SECTION LABEL</span>
</div>
```

```css
.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--signal-synth);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.eyebrow .glyph { color: var(--signal-synth); }
.eyebrow::after {
  content: "";
  width: 32px;
  height: 1px;
  background: var(--signal-synth);
  opacity: 0.5;
}
```

### Hero title with amber ampersand

```html
<h1 class="hero-title">
  <span style="color: var(--signal-machine)">ROBOTS</span>
  <span class="amp">&amp;</span>
  <span>REMIXES</span>
</h1>
```

```css
.hero-title {
  font-family: 'Archivo', sans-serif;
  font-weight: 800;
  font-size: clamp(48px, 8vw, 96px);
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: var(--signal-synth);
}
.hero-title .amp {
  font-family: 'Fraunces', serif;
  font-variation-settings: "opsz" 144;
  font-weight: 300;
  font-style: italic;
  font-size: 1.3em;
  color: var(--signal-synth);
}
```

### Artist/author credit (lifted from the cover's bottom-right)

```html
<div class="credit">
  <div class="primary">HORIZ3N</div>
  <div class="secondary">feat. GLYF · joeY · THE DAYLIGHTS</div>
  <div class="secondary">KISTONE · AKS</div>
</div>
```

```css
.credit {
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
}
.credit .primary {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--signal-synth);
}
.credit .secondary {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--ink-dim);
  opacity: 0.8;
  margin-top: 4px;
}
```

### Signal line (repo stat, metadata row)

Use cyan for machine-signal stats (commits, builds, uptime). Use amber for human-signal stats (releases, published work). Use bone for neutral.

```html
<div class="signal-row">
  <span class="dot" style="background: var(--signal-machine)"></span>
  <span class="label">BUILD</span>
  <span class="value">passing</span>
</div>
```

```css
.signal-row {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-dim);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.signal-row .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;  /* uses the inline background color for the glow */
}
.signal-row .value { color: var(--ink-bright); }
```

### Card with cosmic background

```html
<div class="cosmic-card">
  <div class="eyebrow">PROJECT</div>
  <h2>The Title</h2>
  <p>Body text…</p>
</div>
```

```css
.cosmic-card {
  background: radial-gradient(
    ellipse at 30% 20%,
    var(--stage-center) 0%,
    var(--stage-mid) 50%,
    var(--stage-deep) 100%
  );
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 36px 40px;
  position: relative;
  overflow: hidden;
}
/* Optional accent — a top amber bar like a label stripe */
.cosmic-card::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--signal-synth);
}
```

---

## Motion

Restraint. The cosmic field is static — movement would break the reverence. Allow only:

- **Page load:** A single staggered fade-up of hero elements, 0.7s ease-out, 0.15s stagger between elements.
- **Breathing dot:** Any "live" status indicator can softly pulse (opacity 0.6 → 1.0, 4s cycle, ease-in-out).
- **Hover:** Subtle color-shift on amber elements (to brighter amber `#f5c970`), no transforms, no scales. 150ms ease-out.
- **Event glow:** Never animate the hot event. It just *is*. Animation makes it feel cheap.

```css
@keyframes breath {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1.0; transform: scale(1.15); }
}
.breathing { animation: breath 4s ease-in-out infinite; }

@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero > * {
  opacity: 0;
  animation: rise 0.7s ease-out forwards;
}
.hero > *:nth-child(1) { animation-delay: 0.10s; }
.hero > *:nth-child(2) { animation-delay: 0.25s; }
.hero > *:nth-child(3) { animation-delay: 0.40s; }
.hero > *:nth-child(4) { animation-delay: 0.55s; }
```

---

## Forbidden patterns

Things that break the aesthetic, no matter how common they are elsewhere:

- **Drop shadows on a dark background.** Meaningless. Use glow filters or gradient halos instead.
- **Purple-to-pink gradients.** Reads as generic synthwave / AI slop. Our synthwave cousin is amber, and amber is already in the palette.
- **Centered big titles.** Our titles anchor left. Hard left edge is the composition's spine.
- **Emoji in headings.** The Prime Radiant star `✦` is the only glyph allowed as accent. (Single-character mono glyphs like `→` `·` `◈` `§` are fine in metadata.)
- **Visible concentric rings radiating from the event.** Reads as desert mirage. Glow is atmosphere, not geometry.
- **Generic Google icon sets.** If a mark is needed, hand-draw it in amber SVG like the Prime Radiant.
- **`font-family: Inter`.** We don't use it. Archivo does the grotesque work; Fraunces does the expressive work; JetBrains Mono does the system work. No default system-ui fallback.
- **CTA buttons with gradients.** Buttons are simple: amber fill on dark, or amber border with amber text. The page already glows; the button shouldn't try.

---

## One-page landing architecture

Recommended structure for the GitHub Pages landing, from top to bottom:

1. **Masthead** — Prime Radiant emblem top-left, nothing else in the top bar except maybe a version/status string top-right
2. **Hero** — cosmic starfield background, one hot event at center-right (or center if content is centered), huge title flush-left with amber ampersand, short italic Fraunces subtitle below, a single amber CTA, credit/byline bottom-right
3. **Divider** — single amber `✦` centered between two thin horizontal rules (`--rule-soft`)
4. **Content sections** — each with an eyebrow label + Archivo section title + body prose in `--ink-soft`. Wrap in `cosmic-card` only if the section is supposed to stand apart.
5. **Signal row** — a grid of machine/human/synth signals (build status, download count, etc.) using the signal-row pattern
6. **Coda** — dark card with a Fraunces italic tagline. Single amber top-border stripe. Like the cover's quote card.
7. **Footer** — JetBrains Mono, dim, version string + label identity. No navigation in the footer.

---

## Example palette application

If Vision is unsure how to color a given element, use this decision tree:

- **Is this the page's single hot moment?** → `--core-white` with warm `--core-halo` glow
- **Does this represent a machine, tool, or system?** → `--signal-machine` (cyan)
- **Does this represent our work, our output, our brand?** → `--signal-synth` (amber)
- **Is this human-readable content (text)?** → `--ink-bright` or `--ink-soft` (bone)
- **Is this metadata, a timestamp, or a system readout?** → `--ink-dim` (dim bone)
- **Is this a divider or hairline?** → `--rule` or `--rule-soft`

When in doubt, default to bone/dim. Color is a statement. Statements should be rare.

---

## Artifacts for Vision

The following files can be referenced or inlined:

- `robots-remixes-05.svg` — the reference album cover. Use as hero art if needed, or as inspiration for proportions / composition balance.
- `robots-remixes-05-3000.png` — the full-res cover render.
- The Prime Radiant emblem SVG (inline above) — copy/paste directly into markup.

---

*Prime Radiant v1 · Signal architecture for dark space · The session is just where the eyes are pointing.*
