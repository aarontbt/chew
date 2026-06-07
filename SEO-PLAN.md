# SEO Plan — Chew (chouxkie.com)

## Context

Chew's landing page (`index.html`, `styles.css`, `script.js` — pure static HTML/CSS/JS, no build system, deployed to Vercel) is a pre-launch teaser for the brand's debut product. It's being indexed **now** (ahead of the official launch) to start building search visibility and brand-name rankings.

- **Production domain:** `https://chouxkie.com`
- **Instagram for structured data / social links:** `instagram.com/mypopelini` (the founder's established following)

The page already does several SEO fundamentals well — single `<h1>`, clean heading hierarchy, semantic HTML (`header`/`nav`/`main`/`section`/`article`/`footer`), font preconnect + `display=swap`, mostly-complete alt text, and no accidental `noindex`. The items below are what's stopping it from ranking and sharing well. **Performance (Core Web Vitals/LCP) is the highest-impact gap** — several below-the-fold images are multi-megabyte PNGs served at full native resolution with no lazy-loading, which will drag down LCP and rankings regardless of how clean the markup is.

## Checklist

### 1. (HIGH) Image performance — Core Web Vitals / LCP
File: `index.html` (img tags at lines 39, 56, 158, 186, 380), `assets/`

Several source PNGs remain in `assets/` for archival/editing use, but the rendered page now uses optimized WebP assets with explicit dimensions for the main below-the-fold imagery.

- [x] Convert these PNGs to WebP (or compressed JPEG where transparency isn't needed) and re-export at sizes closer to their rendered dimensions. Keep `.png` only where transparency is required and WebP isn't acceptable.
- [x] Add `loading="lazy"` + explicit `width`/`height` to below-the-fold `<img>` tags (everything except the header logo/badge at lines 46/56, which should stay eager / use `fetchpriority="high"`).
- [x] Confirm `script.js`'s `data-src`/`data-ios-src` wiring (`IntersectionObserver` around `script.js:213`) only ever loads the optimized `chew-500-alpha.*` files in production, never the 19MB `chew-full.webm` master.

### 2. (HIGH) Meta tags — canonical, absolute OG image, Twitter Cards
File: `index.html` `<head>` (lines 1–23)

- [x] Add `<link rel="canonical" href="https://chouxkie.com/" />`.
- [x] Fix `og:image` to an **absolute** URL using a dedicated 1200×630 landscape share image.
- [x] Add `og:url`, `og:type` (`website`), `og:locale` (`en_MY`).
- [x] Add Twitter Card tags: `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.

### 3. (HIGH) robots.txt + sitemap.xml
New files at site root

- [x] `robots.txt` — `Allow: /` plus `Sitemap: https://chouxkie.com/sitemap.xml`.
- [x] `sitemap.xml` — minimal static XML sitemap with the single homepage URL, `lastmod`, `changefreq`/`priority`.

### 4. (MEDIUM) Structured data (JSON-LD)
File: `index.html`, `<script type="application/ld+json">` block before `</body>`

- [x] **Organization** — name "Chew Bakehouse", `url`, `logo` (raster export of `chew-logo.svg`), `sameAs: [instagram.com/mypopelini, tiktok.com/@chew.bakehouse]`.
- [x] **LocalBusiness/Bakery** — `addressLocality: "Kuala Lumpur"`, `addressCountry: "MY"`. (Full street address would unlock richer local-search results once public.)
- [x] **Product** — "Chouxkie": name, description, brand reference back to the Organization.
- Skip `BreadcrumbList`/`Article` — neither fits a single-page brand site.

### 5. (MEDIUM) Favicon, app icons, web manifest
New files at site root, `<link>` tags in `index.html` `<head>`

- [x] Generate favicon set from `assets/badge.png`: `assets/favicon.ico`, `assets/favicon.png`, `assets/apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png`, `site.webmanifest`.
- [x] Wire up `<link rel="icon">`, `<link rel="apple-touch-icon">`, `<link rel="manifest">`.

### 6. (MEDIUM) Analytics & Search Console — needs account access
File: `index.html` `<head>`/`<body>`

- [ ] Add Google Search Console verification meta tag — **requires registering the property in Search Console and the verification string**.
- [ ] Add GA4 `gtag.js` snippet — **requires the GA4 Measurement ID**.
- [ ] Once verified, submit `sitemap.xml` in Search Console.

### 7. (LOW) Minor accessibility/consistency cleanup
File: `index.html:158`

- [x] Add `aria-hidden="true"` to the decorative choux image, matching the hero decorative-image pattern.

## Verification

1. **Lighthouse / PageSpeed Insights** — before/after the image-optimization pass; confirm LCP, CLS, and overall performance score improve.
2. **Open Graph / Twitter Card preview** — check with a link-preview debugger (e.g. opengraph.xyz, Facebook Sharing Debugger); confirm the image renders uncropped at the right aspect ratio.
3. **Structured data** — validate with Google's Rich Results Test / Schema Markup Validator.
4. **robots.txt & sitemap.xml** — load both directly once deployed; confirm the sitemap reference resolves.
5. **Favicon/manifest** — confirm tab icon, bookmark icon, and "Add to Home Screen" icon render correctly.
6. **Search Console** — confirm verification succeeds and the sitemap shows "Success" with the homepage discovered.
