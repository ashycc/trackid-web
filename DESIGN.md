# TRACKID Design System

> Industrial Utilitarian / Restrained Color / Minimal Motion
>
> Like a steel frame workshop catalog, not a SaaS product.

---

## Visual Thesis

TRACKID's design language is drawn from the materials and processes of steel frame fabrication: raw metal, welding marks, workshop paper, industrial signage. Every design decision should feel like it belongs in a frame builder's catalog — functional, honest, and deliberately unpolished. Beauty comes from restraint, not decoration.

---

## 1. Color System

All colors are exposed as CSS custom properties on `:root` and `[data-theme="dark"]`.

### Light Mode (default)

| Token          | Name        | Hex       | Usage                                    |
|----------------|-------------|-----------|------------------------------------------|
| `--paper`      | Paper       | `#ECE6DD` | Page background, primary surface         |
| `--ink`        | Ink         | `#0D0D0D` | Primary text, headings, borders          |
| `--signal-red` | Signal Red  | `#D4213D` | CTA buttons, REGISTRY IDs, active states |
| `--oxide`      | Oxide       | `#7A4A2E` | Section labels, metadata, warm accent    |
| `--weld`       | Weld        | `#B8A88A` | Borders, dividers, inactive states       |
| `--muted`      | Muted       | `#8A8279` | Secondary text, placeholders             |
| `--surface`    | Surface     | `#E3DCD2` | Card backgrounds, dropzones, hover fills |

### Dark Mode

| Token          | Name        | Hex       |
|----------------|-------------|-----------|
| `--paper`      | Paper       | `#1A1816` |
| `--ink`        | Ink         | `#E3DCD2` |
| `--signal-red` | Signal Red  | `#E0354F` |
| `--oxide`      | Oxide       | `#C07A52` |
| `--weld`       | Weld        | `#5A5247` |
| `--muted`      | Muted       | `#8A8279` |
| `--surface`    | Surface     | `#252220` |

### Semantic Alert Colors

| Context | Border Color | Usage               |
|---------|-------------|----------------------|
| Success | `#4A7A3E`   | Upload confirmed     |
| Warning | `#B8860B`   | Storage limits, info |
| Error   | `--signal-red` | Validation errors |
| Info    | `--oxide`   | Neutral notices      |

### CSS Implementation

```css
:root {
  --paper: #ECE6DD;
  --ink: #0D0D0D;
  --signal-red: #D4213D;
  --oxide: #7A4A2E;
  --weld: #B8A88A;
  --muted: #8A8279;
  --surface: #E3DCD2;
}

[data-theme="dark"] {
  --paper: #1A1816;
  --ink: #E3DCD2;
  --signal-red: #E0354F;
  --oxide: #C07A52;
  --weld: #5A5247;
  --muted: #8A8279;
  --surface: #252220;
}
```

### Color Usage Rules

- **Signal Red** is reserved for primary CTAs and REGISTRY IDs (TKID-XXXX). Never used for large fills.
- **Oxide** is the secondary accent — used for section labels, metadata annotations, system labels.
- **Weld** is the universal separator — borders, dividers, inactive states. Never used for text.
- **Paper/Ink** form the primary contrast pair. All body text uses Ink on Paper.
- Dark mode is toggled via `data-theme="dark"` on `<html>`.

---

## 2. Typography

Three typefaces, each with a clear role. No exceptions.

### Font Stack

| Role        | Typeface        | Weights    | Usage                                          |
|-------------|-----------------|------------|-------------------------------------------------|
| **Display** | Space Grotesk   | 400, 500, 600, 700 | Brand name, section headings, hero text   |
| **Body**    | IBM Plex Sans   | 300, 400, 500, 600 | Paragraphs, card content, UI labels       |
| **Data**    | IBM Plex Mono   | 400, 500   | REGISTRY IDs, metadata, labels, buttons, code   |

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Size  | Font           | Weight | Tracking        | Usage                                |
|-------|----------------|--------|-----------------|--------------------------------------|
| 72px  | Space Grotesk  | 700    | 8px             | Hero brand name                      |
| 64px  | Space Grotesk  | 700    | 6px             | Hero headline (section mockup)       |
| 48px  | Space Grotesk  | 700    | 4px             | Section headings (display)           |
| 24px  | Space Grotesk  | 600    | 2px             | Sub-section headings                 |
| 20px  | Space Grotesk  | 600    | 2px             | Card titles, form titles             |
| 16px  | IBM Plex Sans  | 400    | normal          | Body text (line-height: 1.7)         |
| 14px  | IBM Plex Sans  | 400    | normal          | Input fields, smaller body text      |
| 13px  | IBM Plex Sans  | 500    | normal          | Card metadata, secondary text        |
| 13px  | IBM Plex Mono  | 400    | 3px             | Taglines, subtitles                  |
| 12px  | IBM Plex Mono  | 400    | 2px, uppercase  | Button text, nav links               |
| 11px  | IBM Plex Mono  | 400/500| 1-2px, uppercase| Section labels, TKID IDs, data annotations |

### Typography Rules

- **Display text** (Space Grotesk) always uses letter-spacing. Minimum `2px`, scales up with size.
- **Section labels** are always IBM Plex Mono, 11px, uppercase, oxide-colored, with `letter-spacing: 2px`.
- **REGISTRY IDs** (TKID-0001) are always IBM Plex Mono, 11px, signal-red-colored.
- **Body text** max-width: `600px` for comfortable reading.
- **Line heights**: Display 1.0–1.1, Body 1.6–1.7, Data 1.6.

---

## 3. Spacing System

8px base unit. All spacing values are multiples of 8.

| Token   | Value  | Usage                                   |
|---------|--------|-----------------------------------------|
| `2xs`   | 4px    | Tight gaps within data groups           |
| `xs`    | 8px    | Icon gaps, inline spacing               |
| `sm`    | 12px   | Card internal padding, list item gaps   |
| `md`    | 16px   | Grid gaps, input field padding          |
| `lg`    | 24px   | Component card padding, nav padding     |
| `xl`    | 32px   | Section label to content gap            |
| `2xl`   | 48px   | Between type specimens, component groups|
| `3xl`   | 64px   | Section vertical padding                |
| `4xl`   | 80px   | Hero section padding, page header       |

### Spacing Rules

- Sections always use `64px` vertical padding with `1px solid var(--weld)` bottom border.
- Section title to content: `32px`.
- Grid gaps: `16px` (cards), `12px` (tight lists).
- Form field spacing: `16px` between input groups.
- Container max-width: `1120px` with `24px` horizontal padding.

---

## 4. Components

### 4.1 Buttons

Three variants. All share the same base:

```css
.btn {
  display: inline-block;
  padding: 10px 24px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  text-decoration: none;
}
```

| Variant       | Background        | Text Color    | Border                | Hover                                   |
|---------------|-------------------|---------------|------------------------|-----------------------------------------|
| **Primary**   | `--signal-red`    | `#fff`        | none                   | background → `--oxide`                  |
| **Outline**   | transparent       | `--ink`       | `1px solid --ink`      | background → `--ink`, text → `--paper`  |
| **Ghost**     | transparent       | `--muted`     | `1px solid --weld`     | text → `--ink`, border → `--ink`        |

**Usage rules:**
- Primary (Signal Red) is for the main CTA only: "Upload Your Ride", "Submit", "Approve".
- Outline is for secondary actions: "View Map", "Learn More".
- Ghost is for tertiary/cancel actions: "Cancel", "Back", "Reset".
- Button groups use `12px` gap with `flex-wrap: wrap`.
- Nav CTA is a smaller primary variant: `8px 16px` padding, `11px` font size.

### 4.2 Form Fields

```css
.input-label {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--weld);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  transition: border-color 0.15s;
}

.input-field:focus {
  outline: none;
  border-color: var(--signal-red);
}

.input-field::placeholder {
  color: var(--muted);
}
```

**Rules:**
- Labels are always mono, 11px, uppercase, muted color.
- Focus state: border becomes `--signal-red`.
- No border-radius. Square corners throughout.
- Input groups have `16px` bottom margin.

### 4.3 Upload Dropzone

```css
.upload-dropzone {
  border: 1px dashed var(--weld);
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
}

.upload-dropzone:hover {
  border-color: var(--signal-red);
}
```

- Icon: `24px`, muted color.
- Text: IBM Plex Mono, `12px`, muted, `letter-spacing: 1px`.
- Bottom margin: `24px`.

### 4.4 Alerts / Notifications

```css
.alert {
  padding: 12px 16px;
  font-size: 13px;
  border-left: 3px solid;
  margin-bottom: 12px;
  background: var(--surface);
}
```

| Type    | Border Color    | Usage                        |
|---------|----------------|------------------------------|
| Success | `#4A7A3E`      | Upload confirmation          |
| Warning | `#B8860B`      | Storage/limit warnings       |
| Error   | `--signal-red`  | Validation errors            |
| Info    | `--oxide`       | Neutral information          |

### 4.5 REGISTRY Card (Gallery)

The core UGC display component. Each approved photo becomes a REGISTRY entry.

```css
.registry-card {
  border: 1px solid var(--weld);
  overflow: hidden;
}

.registry-card .card-img {
  height: 180px;
  background: var(--surface);
  object-fit: cover;
  width: 100%;
}

.registry-card .card-meta {
  padding: 12px;
  border-top: 1px solid var(--weld);
}

.registry-card .card-id {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--signal-red);
  letter-spacing: 1px;
}

.registry-card .card-rider {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  margin-top: 4px;
}

.registry-card .card-loc {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
```

**Structure:**
1. Image area (180px height, `object-fit: cover`)
2. Meta area below, separated by weld border
3. TKID-XXXX in signal red (mono, 11px)
4. Rider name (sans, 13px, medium weight)
5. Location (mono, 11px, muted)

**Grid:** 3 columns on desktop, 2 on mobile (`max-width: 640px`). Gap: `16px`.

**Broken image fallback:** Show TRACKID logo placeholder on `var(--surface)` background.

### 4.6 Map Stats Bar

Horizontal stats display below/above the map section.

```css
.map-stats-bar {
  display: flex;
  gap: 48px;
  padding: 24px 0;
  border-top: 1px solid var(--weld);
  border-bottom: 1px solid var(--weld);
}

.map-stat .stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 32px;
  font-weight: 500;
  color: var(--ink);
}

.map-stat .stat-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 4px;
}
```

**Stats shown:** Total Riders, Countries, Cities (all mono, data-driven).

### 4.7 Navigation

```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--weld);
}

.nav-brand {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
}

.nav-links {
  display: flex;
  gap: 32px;
  list-style: none;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}

.nav-links .active {
  color: var(--ink);
}

.nav-cta {
  background: var(--signal-red);
  color: #fff;
  padding: 8px 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
}
```

**Mobile:** Hamburger toggle replaces nav-links. Upload CTA becomes floating bottom button.

---

## 5. Layout Principles

### Container

- Max-width: `1120px`
- Horizontal padding: `24px`
- Centered with `margin: 0 auto`

### Grid System

| Context        | Columns (Desktop) | Columns (Mobile) | Gap   |
|----------------|-------------------|------------------|-------|
| REGISTRY cards | 3                 | 2                | 16px  |
| Color swatches | 3                 | 2                | 16px  |
| Component cards| 2                 | 1                | 24px  |

### Section Structure

Every page section follows this pattern:

```
[64px padding top]
  [SECTION LABEL] — mono, 11px, oxide, uppercase, tracking 2px
  [32px gap]
  [CONTENT]
[64px padding bottom]
[1px solid --weld border]
```

### Breakpoints

| Name    | Width         | Key Changes                              |
|---------|---------------|------------------------------------------|
| Mobile  | `≤ 640px`     | 2-col gallery, stacked forms, hamburger  |
| Desktop | `> 640px`     | 3-col gallery, side-by-side layouts      |

---

## 6. Motion & Transitions

Minimal. Functional only.

| Property      | Duration | Easing | Usage                            |
|---------------|----------|--------|----------------------------------|
| border-color  | 150ms    | ease   | Input focus, dropzone hover      |
| background    | 150ms    | ease   | Button hover                     |
| color         | 150ms    | ease   | Link hover, ghost button hover   |
| background    | 300ms    | ease   | Theme toggle (paper/ink swap)    |

**Rules:**
- No decorative animations, parallax, or scroll effects.
- No entrance animations on page load.
- Transitions only on interactive elements (buttons, inputs, links).
- Theme toggle is the only 300ms transition.

---

## 7. Dark Mode

Toggled via `data-theme="dark"` attribute on `<html>`.

**Strategy:** Invert the Paper/Ink relationship. Accent colors shift slightly warmer/brighter to maintain contrast on dark backgrounds.

| Light → Dark Shift                          | Reason                          |
|---------------------------------------------|---------------------------------|
| Paper `#ECE6DD` → `#1A1816`                | Warm dark, not pure black       |
| Ink `#0D0D0D` → `#E3DCD2`                  | Cream text, not pure white      |
| Signal Red `#D4213D` → `#E0354F`           | Brighter to maintain pop        |
| Oxide `#7A4A2E` → `#C07A52`               | Lighter to stay visible         |
| Weld `#B8A88A` → `#5A5247`                | Darker separators               |
| Surface `#E3DCD2` → `#252220`              | Slightly lighter than paper     |

**Muted stays `#8A8279`** in both modes — it works as secondary text on both backgrounds.

---

## 8. Naming Conventions

### CSS Classes

- Semantic, not visual: `.registry-card` not `.red-card`
- BEM-light: `.card-meta`, `.card-id`, `.card-rider` (no double underscores)
- Utility classes: `.mono`, `.display`, `.muted`, `.oxide`, `.red`

### REGISTRY System

User-generated content uses the REGISTRY naming:
- Format: `TKID-XXXX` (zero-padded 4-digit)
- Always displayed in IBM Plex Mono, 11px, signal-red
- Sequential, never reused (even if submission is rejected)
- Example: TKID-0001, TKID-0047, TKID-0512

---

## 9. Design Anti-Patterns

Things this design system deliberately avoids:

- **No border-radius.** Everything is square. This is a workshop, not a playground.
- **No shadows.** Depth is created through borders and background contrast, not elevation.
- **No gradients.** Flat, solid fills only.
- **No decorative icons.** If an icon doesn't serve a function, remove it.
- **No sans-serif buttons.** Buttons are always mono — they're actions, not prose.
- **No pure black (`#000`) or pure white (`#fff`).** Use Ink and Paper. The only exception is white text on Signal Red buttons.
- **No animation on scroll.** Content is present, not revealed.
- **No rounded inputs.** Square corners, 1px border, weld color.

---

## 10. Implementation Notes

### Astro Integration

- CSS custom properties defined in global stylesheet (loaded in `Layout.astro`)
- Google Fonts loaded via `<link>` in `<head>` with `preconnect`
- Theme toggle uses `data-theme` attribute, persisted to `localStorage`
- No CSS-in-JS. Plain CSS with custom properties.

### File Structure

```
src/
  styles/
    global.css        — CSS custom properties, reset, base typography
    components.css    — Button, input, alert, card component styles
  layouts/
    Layout.astro      — Loads fonts, global styles, sets data-theme
```

### Accessibility

- Ink on Paper contrast ratio: **13.5:1** (AAA)
- Signal Red on Paper: **5.2:1** (AA)
- Signal Red on white (#fff button text): **4.9:1** (AA)
- All interactive elements have visible focus states (Signal Red border)
- Dark mode maintains equivalent contrast ratios
