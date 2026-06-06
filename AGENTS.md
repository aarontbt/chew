# AGENTS.md

## Running the site

No build system. Pure static HTML/CSS/JS — serve with any local HTTP server (required for video loading):

```bash
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080`. Do not open `index.html` directly as a `file://` URL — video scrubbing will fail.

## Architecture

Three files only: `index.html`, `styles.css`, `script.js`. Assets in `assets/`.

External libraries loaded via CDN (no npm, no bundler):
- **GSAP 3.12.5** + **ScrollTrigger** — all animations and scroll-driven effects
- **Lenis 1.1.20** — smooth scroll (`lerp: 0.12`), feeds into `ScrollTrigger.update`

### Scroll-scrubbed video system

The core interaction is a transparent alpha product video scrubbed by scroll progress. The default source is `assets/chew-2-500-alpha.webm` for browsers that support VP9 alpha. Apple touch browsers (iPhone/iPad and touch iPadOS desktop mode) use `assets/chew-2-500-alpha.mov`, an Apple-native HEVC with Alpha fallback. Video tags intentionally use `data-src` and `data-ios-src`, not eager `src`, so iOS does not start loading the WebM before `script.js` chooses the correct source.

Three video instances exist at different layout layers:

| Element | Class | Role |
|---|---|---|
| `.hero-video` | Hidden by default | Shown only in `no-scroll-smooth` fallback |
| `.handoff-video` | Fixed overlay, `z-index: 18` | Animates from hero position into scrub position as user scrolls through hero and `#inside` sections |
| `.scrub-video` | Inside `.inside-sticky` | Rendered in place within the sticky section |

Do not replace the handoff video with a blob URL on Apple touch browsers. The blob preload rewrite is guarded with `!isAppleTouchBrowser()` because it can delay or break the iOS HEVC alpha path.

**Video time constants** in `script.js`:
- `IDLE_PREVIEW_END = 0.9` — end of idle float loop at page load
- `SPIN_END = 4` — end of hero scroll phase (video rotates)
- `BREAK_END = 9.35` — end of inside section scrub phase

**`syncVideoToProgress(video, progress, startTime, endTime, options)`** — the central function. It writes a target frame into `bufferedVideoTargets` (a `Map`). A `gsap.ticker` loop reads that map each frame and drives `video.currentTime` smoothly via playback rate control rather than direct seeks. Higher `priority` values win over lower ones when multiple triggers write to the same video.

### Scroll trigger phases

1. **Hero phase** — `ScrollTrigger` on `.hero` (top→bottom), scrub `1.1`. Animates `.handoff-video` from offset position to centre while hero copy fades out. Video scrubs `0 → SPIN_END`.
2. **Inside section enter** — `ScrollTrigger` on `.inside-section`. On enter, jumps video to `SPIN_END` and begins playing forward toward `BREAK_END`.
3. **Inside section progress** — second `ScrollTrigger` on `.inside-section` drives `SPIN_END → BREAK_END` and calls `updateChapterCards(progress)`.
4. **Chapter cards** — `updateChapterCards()` calculates which of the four `[data-chapter]` cards is active based on scroll progress and fades it in/out via `gsap.set`.

### Fallback (`no-scroll-smooth` class)

When GSAP/ScrollTrigger are unavailable or `prefers-reduced-motion` is active, the body gets `.no-scroll-smooth`. This hides `.handoff-product`, shows `.hero-video` at full opacity, and collapses the sticky scroll section. Chapter cards are shown statically. Proof numbers render their final values immediately.

### Product video encoding

The source master is `assets/chew-2.webm` (1080x1080 VP9 with alpha). The deployed scrub assets should be 500x500 and all-keyframe (`-g 1`) so scroll scrubbing can seek cleanly.

Create the desktop/non-iOS VP9 alpha WebM:

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

For iOS, do not rely on FFmpeg `hevc_videotoolbox` alone. It may accept `-alpha_quality` but still output plain HEVC, which renders black backgrounds on iOS Chrome/Safari. Use Apple `avconvert` with `PresetHEVCHighestQualityWithAlpha` from a ProRes 4444 alpha intermediate:

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

Verify the iOS fallback with macOS metadata. It must say `HEVC with Alpha`:

```bash
mdls -name kMDItemCodecs -name kMDItemPixelWidth -name kMDItemPixelHeight assets/chew-2-500-alpha.mov
```

Expected:

```text
kMDItemCodecs = (
    "HEVC with Alpha"
)
```

## Brand tokens

Defined as CSS custom properties in `:root`:

| Variable | Value | Use |
|---|---|---|
| `--chew-pink` | `#ff689d` | CTAs, accents, badges, emphasis |
| `--espresso` | `#2b1e16` | Body text, dark sections |
| `--cream` | `#fff1e6` | Main background (dominant) |
| `--marshmallow` | `#ffc1d6` | Soft panels, glow |
| `--caramel` | `#8b5e34` | Secondary warmth, focus rings |
| `--shadow` | `8px 8px 0 rgba(43,30,22,0.12)` | Card shadow |
| `--soft-radius` | `24px` | Cards |
| `--pill-radius` | `999px` | Buttons, pills |

Typography: **Poppins** (headings, 700–900), **Inter** (body, 400–600), **Fraunces Italic** (accent, use sparingly).

## Section structure

Sections in order with their IDs/anchors:
1. `.hero` `#top` — hero with two CTAs
2. `.inside-section` `#inside` — 500vh sticky scroll-scrub with 4 chapter cards
3. `.obsession` `#invention` — espresso background, counting proof numbers (`[data-count]`)
4. `.maker` `#maker` — two-column founder section
5. `.tradition` — yellow background, editorial typography
6. `.ritual` — 4 process cards, horizontal on desktop
7. `.club` `#club` — pink background, WhatsApp CTA (`https://wa.me/60133388617`)
8. `.social-proof` — quote card
9. `.photo-strip` — full-width product image
10. `footer.site-footer` — espresso, three-column

## Mobile

Breakpoints: `@media (max-width: 900px)` (tablet/mobile) and `@media (max-width: 560px)` (small mobile).

At 900px: desktop nav hidden, hamburger menu shown, hero goes single-column, inside section reduces to `380vh`, benefits grid goes 2-col, ritual cards stack vertically.

## Copy and voice rules

Short sentences. 3–7 words. Periods as percussion. No exclamation marks. Avoid: yummy, artisanal, premium, delicious, gourmet, crafted to perfection. Use: warm, obsession, secret, shell, chamber, centre, collision, first bite.

The member count (`25 of 100`) in `.member-pill` is hardcoded in `index.html` — update it there when the count changes.
