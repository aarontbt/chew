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

The core interaction is a transparent alpha product video scrubbed by scroll progress. The site uses:

| Browser path | Asset |
|---|---|
| Desktop/non-iOS | `assets/chew-2-500-alpha.webm` |
| iPhone/iPad/WebKit touch browsers | `assets/chew-2-500-alpha.mov` |

Video tags use `data-src` and `data-ios-src`; `script.js` chooses the correct source before loading so mobile Safari/Chrome does not accidentally fetch the WebM alpha file.

Key constants in `script.js`:

| Constant | Value | Meaning |
|---|---|---|
| `IDLE_PREVIEW_END` | `0.9s` | End of idle float loop at load |
| `SPIN_END` | `4s` | End of hero scroll phase |
| `BREAK_END` | `9.35s` | End of inside section scrub |

---

## Product video encoding

The source master is `assets/chew-2.webm` (1080x1080 VP9 with alpha). Rebuild the 500x500 all-keyframe WebM with:

```bash
ffmpeg -y \
  -c:v libvpx-vp9 -i assets/chew-2.webm \
  -an \
  -vf "scale=500:500:flags=lanczos" \
  -c:v libvpx-vp9 \
  -pix_fmt yuva420p \
  -b:v 0 \
  -crf 34 \
  -g 1 \
  -row-mt 1 \
  -auto-alt-ref 0 \
  assets/chew-2-500-alpha.webm
```

For iOS, use Apple `avconvert` from a ProRes 4444 alpha intermediate. FFmpeg `hevc_videotoolbox` may output plain HEVC even when alpha flags are accepted.

```bash
find /tmp -maxdepth 1 -name 'chew-frames-500-*.png' -delete

ffmpeg -y \
  -c:v libvpx-vp9 -i assets/chew-2.webm \
  -an \
  -vf "scale=500:500:flags=lanczos" \
  -frames:v 240 \
  /tmp/chew-frames-500-%04d.png

ffmpeg -y \
  -framerate 24 \
  -i /tmp/chew-frames-500-%04d.png \
  -c:v prores_ks \
  -profile:v 4444 \
  -pix_fmt yuva444p10le \
  -vendor apl0 \
  /tmp/chew-2-500-prores4444.mov

avconvert \
  --source /tmp/chew-2-500-prores4444.mov \
  --preset PresetHEVCHighestQualityWithAlpha \
  --output assets/chew-2-500-alpha.mov \
  --replace \
  --progress
```

Verify the iOS file reports `HEVC with Alpha`:

```bash
mdls -name kMDItemCodecs -name kMDItemPixelWidth -name kMDItemPixelHeight assets/chew-2-500-alpha.mov
```

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
