# Chew — Landing Page

One-page landing page for **Chew**, the world's first chouxkie: a choux puff + cookie hybrid. Malaysian-born. Made with obsession.

---

## Stack

Pure static HTML/CSS/JS — no build system, no npm.

| Library | Version | Purpose |
|---|---|---|
| GSAP + ScrollTrigger | 3.12.5 | All animations, scroll-driven effects |
| Lenis | 1.1.20 | Smooth scroll (`lerp: 0.12`) |

Both loaded via CDN. No install required.

---

## Running locally

A local HTTP server is required — opening `index.html` directly as a `file://` URL breaks video scrubbing.

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

---

## Project structure

```
site/
├── index.html       # All markup and section structure
├── styles.css       # All visual styles and design tokens
├── script.js        # All scroll logic, GSAP timelines, video scrub
├── assets/          # Video, images, logo files
├── vercel.json      # Static asset cache headers
└── AGENTS.md        # Full technical documentation
```

---

## Scroll-scrubbed video

The core interaction is a transparent alpha `.webm` video (`assets/chew-2.webm`) scrubbed by scroll progress. Three video instances handle different layout layers: hero float, handoff overlay, and sticky scrub position.

Key constants in `script.js`:

| Constant | Value | Meaning |
|---|---|---|
| `IDLE_PREVIEW_END` | `0.9s` | End of idle float loop at load |
| `SPIN_END` | `4s` | End of hero scroll phase |
| `BREAK_END` | `9.35s` | End of inside section scrub |

---

## Page sections

| # | Section | Purpose |
|---|---|---|
| 01 | Hero | Introduce Chew as a new pastry category |
| 02 | What's Inside | Scroll-scrubbed product reveal with four chapters |
| 03 | Obsession Proof | Craft credibility — 200 doughs, 4 years, one shell |
| 04 | Meet Jessie | Founder story — Jessie Chong, Kuala Lumpur |
| 05 | Product Ritual | How a Chouxkie is made, four-step process |
| 06 | First Bite Club | Main conversion — WhatsApp signup, capped at 100 |
| 07 | Social Proof | Quote strip |
| 08 | Footer | Brand statement, nav, social links |

---

## Brand colours

| Token | Hex | Usage |
|---|---|---|
| Cream | `#FFF1E6` | Main background (50–60%) |
| Chew Pink | `#FF689D` | Badges, CTAs, accents (20–25%) |
| Espresso | `#2B1E16` | Body text, dark sections |
| Caramel | `#8B5E34` | Secondary warmth |
| Marshmallow | `#FFC1D6` | Soft panels |
| Tradition Gold | `#F3C875` | Tradition & Creation section only |

---

## Deployment

Deployed via Vercel. Static site — no build step. Assets are served with 1-year immutable cache headers (`vercel.json`).

---

## Full documentation

See [`AGENTS.md`](AGENTS.md) for detailed technical documentation on the scroll system, video architecture, and animation phases.
