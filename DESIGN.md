# Trace — Design DNA
> Extracted from Stitch project: **Monochrome Astral Reflection** (updated 2026-06-02)
> Design system name: **Trace Cosmic Noir**

---

## Brand & Style

The design system is engineered for **Trace**, a high-end developer tool that treats code as an immersive, cinematic experience. The brand personality is **"Cosmic Noir"** — nocturnal, sophisticated, and hyper-focused. It targets elite developers who view their workspace as a digital sanctuary.

The style is a synthesis of **Minimalism** and **Glassmorphism**, set against a backdrop of infinite depth. By utilizing deep blacks and sharp white accents, the UI evokes a sense of vastness and precision. Visual motifs include mirrored surfaces, subtle light leaks, and a pervasive "star-scattered" atmosphere that makes the screen feel like a viewport into space.

---

## 🎨 Colors

The palette is strictly **achromatic** — relies on luminance and transparency rather than hue.

| Token | Hex | Usage |
|---|---|---|
| `background` | `#131313` | Page background |
| `surface` | `#131313` | Base layer |
| `surface-dim` | `#131313` | Dimmed surface |
| `surface-bright` | `#393939` | Bright surface |
| `surface-container-lowest` | `#0e0e0e` | Deepest container |
| `surface-container-low` | `#1b1b1b` | Low container |
| `surface-container` | `#1f1f1f` | Default container |
| `surface-container-high` | `#2a2a2a` | Elevated container |
| `surface-container-highest` | `#353535` | Highest container |
| `surface-variant` | `#353535` | Variant surface |
| `primary` | `#ffffff` | Primary / pure white |
| `on-primary` | `#2f3131` | Text on primary |
| `primary-container` | `#e2e2e2` | Primary container |
| `on-primary-container` | `#636565` | Text on primary container |
| `secondary` | `#c8c6c5` | Secondary / atmospheric gray |
| `on-secondary` | `#313030` | Text on secondary |
| `secondary-container` | `#474746` | Secondary container |
| `on-secondary-container` | `#b7b5b4` | Text on secondary container |
| `tertiary` | `#ffffff` | Tertiary / pure white |
| `on-tertiary` | `#2f3131` | Text on tertiary |
| `on-surface` | `#e2e2e2` | Text on surface |
| `on-surface-variant` | `#c4c7c8` | Muted text |
| `on-background` | `#e2e2e2` | Text on background |
| `outline` | `#8e9192` | Borders / separators |
| `outline-variant` | `#444748` | Subtle borders |
| `error` | `#ffb4ab` | Error state |
| `inverse-surface` | `#e2e2e2` | Inverse (light) surface |
| `inverse-on-surface` | `#303030` | Text on inverse surface |

### Special / Semantic Colors
- **Void Black**: `#050505` — foundation of UI, ink base
- **Pure White**: `#FFFFFF` — primary actions, critical text, highlights
- **Atmospheric Grays**: `#0A0A0A` → `#4A4A4A` — borders, subtle depth
- **Star Elements**: 1–2px circles in `#FFFFFF` at 10–60% opacity, some with 2px Gaussian blur

---

## 🔤 Typography

### Font Families
| Role | Font | Notes |
|---|---|---|
| Headlines / Display | **Sora** | Futuristic, wide-set, tight letter-spacing on large sizes |
| Body / Labels | **Geist** | Neutral, highly legible |
| Code / Metadata | **JetBrains Mono** | Developer tool DNA, monospaced |

### Type Scale
| Token | Family | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `display-lg` | Sora | 48px | 700 | 1.1 | -0.04em |
| `display-lg-mobile` | Sora | 32px | 700 | 1.2 | -0.02em |
| `headline-md` | Sora | 24px | 600 | 1.3 | — |
| `body-regular` | Geist | 16px | 400 | 1.6 | — |
| `code-sm` | JetBrains Mono | 14px | 400 | 1.5 | — |
| `label-caps` | Geist | 12px | 600 | 1 | 0.1em |

> **Hierarchy principle**: Use high-contrast sizing. Labels are small and tracked out (all-caps) to act as architectural markers.

---

## 📐 Spacing & Layout

### Spacing Scale (4px base unit)
| Token | Value |
|---|---|
| `unit` | 4px |
| `gutter` | 24px |
| `margin-mobile` | 16px |
| `margin-desktop` | 48px |
| `max-width` | 1440px |

### Grid System
- **Desktop**: 12-column grid, max-width 1440px
- **Mobile**: 4-column grid, 16px side margins
- **Rhythm**: All spacing must be a **multiple of 4px**
- **Major section gaps**: 48px+ to emphasize the "void"

---

## 🔘 Border Radius (Shape Language: "Soft-Industrial")
| Token | Value | Usage |
|---|---|---|
| `sm` / `DEFAULT` | 0.125rem (2px) | Default; most elements |
| `lg` | 0.25rem (4px) | Buttons, inputs, code blocks |
| `xl` | 0.5rem (8px) | Larger sections |
| `full` | 0.75rem (12px) | Cards, containers; large radius |
| `circular` | 9999px | Status indicators, avatars, stars |

---

## ✨ Elevation & Depth (Glassmorphism System)

### Layer Stack
1. **Base Layer** — Starfield background, fixed in viewport
2. **Surface Layer** — Semi-transparent containers (`rgba(255,255,255,0.02)`) + `backdrop-filter: blur(20px)`
3. **Interactive Layer** — Hovered elements gain "Inner Glow": `1px white border at 40% opacity` + `box-shadow: 0 0 15px #FFFFFF1A`

### Glass Panel Specification
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}
/* Specular highlight in top-left corner */
.glass-panel::before {
  content: "";
  position: absolute;
  top: 0; left: 0;
  width: 40px; height: 1px;
  background: rgba(255, 255, 255, 0.6);
}
```

### Mirror Reflection Effect
```css
.mirror-effect {
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}
```

### Light Leak Effect
```css
.light-leak {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%);
}
```

---

## 🔲 Components

### Navigation
- Fixed top, `backdrop-filter: blur(20px)`, `background: rgba(255,255,255,0.05)`
- Border-bottom: `1px solid rgba(255,255,255,0.1)`
- Box-shadow: `0 0 15px rgba(255,255,255,0.1)`
- Logo: Sora bold, all-caps, pure white
- Nav links: body-regular, muted (60% white) → full white on hover
- CTA Button: Pure white bg + black text, `label-caps` font

### Buttons
- **Primary**: White bg + `#2f3131` text + hover `box-shadow: 0 0 20px rgba(255,255,255,0.4)` + `active:scale-95`
- **Secondary**: Transparent + `border: 1px solid rgba(255,255,255,0.2)` + hover `bg: rgba(255,255,255,0.1)`
- Font: `label-caps` (Geist, 12px, 600, tracking 0.1em, uppercase)

### Glass Cards (Bento Grid)
- `backdrop-filter: blur(20px)`, `background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.1)`
- Top-left specular highlight (40px × 1px, 60% white)
- `mirror-effect` mask on feature cards
- Inner glow on hover: `box-shadow: 0 0 15px rgba(255,255,255,0.1)`, border upgrades to 40% white

### Input Fields
- Bottom border only: `1px solid rgba(255,255,255,0.3)` by default
- Focus: border becomes 100% white + subtle light beam behind text
- No border-radius, background transparent

### Chips / Tags
- Monospaced (JetBrains Mono), 10px–12px, all-caps
- Pill shape, `background: rgba(255,255,255,0.05)`
- `border: 1px solid rgba(255,255,255,0.15)`

### Status Indicators (Pulse)
- 8×8px white circle, `border-radius: 50%`
- Pulse animation: `box-shadow: 0 0 0 0 rgba(255,255,255,0.7)` → `0 0 0 10px rgba(255,255,255,0)` (1.5s loop)

### Starfield Background
- Generated via JS: 150+ dots at random positions
- Sizes: 0.5–2px, opacity 10–60%, varying animation durations 2–5s
- `animation: twinkle` — opacity 0.3→1.0→0.3 + scale 1→1.2→1
- Some stars blurred (2px Gaussian) to simulate depth/distance

---

## 🎬 Animations

| Name | Description | Duration |
|---|---|---|
| `twinkle` | Star opacity + scale | 2–5s, infinite |
| `pulse` | Status indicator glow ring | 1.5s, infinite |
| `inner-glow` | Hover border + shadow | CSS transition 300ms |
| `mirror-effect` | Mask gradient on cards | static |
| `scroll-fade` | Hero text fade-in | CSS animation on mount |

---

## 📱 Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| Mobile (< md) | Single column, 16px margins, display text scales down aggressively |
| Desktop (≥ md) | 12-column grid, 48px margins, full size typography |

---

## 🗂️ Screen Inventory (from Stitch)

| Screen | Dimensions | Title |
|---|---|---|
| Main Landing | 2560×6552 | Trace Landing - Cosmic Vibe |
| Component Sheet | 1280×1024 | Trace Landing - Cosmic Vibe (component view) |

### Sections on Main Landing
1. **Navigation** — Fixed top bar with logo, nav links, CTA
2. **Hero** — Centered title "TRACE" + headline "Diagrams to Reality" + two CTAs + pulse status chip
3. **Bento Product Preview** — 12-col grid: 8-col main canvas card + 4-col logic inspector card
4. **Features Section** — 3-col cards: Neural Mapping, Glass Sync, Void Mode
5. **CTA Section** — Full-width centered call to action
6. **Footer** — Minimal, monospaced links
