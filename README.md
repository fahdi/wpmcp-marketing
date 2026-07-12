# Dukandar marketing site

A self-contained static site for Dukandar: an AI assistant for WordPress and WooCommerce stores, built on the open-source `wpmcp` plugin, with a save-before-every-change engine and one-click restore baked into the core. No build step, no external CDNs, no network calls; everything needed to render the site ships in this folder.

Note on naming: "Dukandar" (meaning shopkeeper) is the marketing brand shown to shop owners on the landing page. The plugin itself still ships under the `wpmcp` slug and GitHub repo, that lower-level identity is used in the docs section and in install commands, since that is what developers and agencies actually clone and run.

## Preview locally

The landing page (`index.html`) opens fine directly from disk. The docs page (`docs.html`) fetches Markdown files from `docs/` at runtime, and browsers block `fetch()` against `file://` URLs, so serve the folder over HTTP for the full experience:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed URL (for example `http://localhost:8080`). If you open `docs.html` directly via `file://`, it detects that and shows an instruction panel instead of a blank page.

## Structure

```
index.html          landing page (shop-owner facing)
docs.html           documentation shell (renders docs/*.md client-side, developer facing)
assets/css/         fonts.css, brand.css, base.css, site.css, landing.css, docs.css, logo.css
assets/js/          brand.js, main.js, markdown.js, docs-app.js
docs/               Markdown content, owned by a separate process; do not edit here
```

`fonts.css` self-hosts Fraunces (display serif) and Hanken Grotesk (UI sans) as base64-inlined woff2, subsetted to the glyphs this site actually uses, so there is still zero external network activity. `logo.css` animates the rollback mark (the brand tile in the header, footer, and hero): the ring draws on with `stroke-dashoffset` on load, the arrowhead pops in after, and hovering or focusing any mark triggers a quick counter-rotation. Fully inert under `prefers-reduced-motion: reduce`.

## Brand config, and how to swap it

Everything brand-specific lives in two files:

- `assets/js/brand.js`, the `window.DUKANDAR_BRAND` object: product name, tagline, domain, GitHub URL, license, the underlying plugin slug, and the color hexes. Any element with `data-brand-name`, `data-brand-domain`, `data-brand-github`, or `data-brand-plugin-slug` in the HTML is populated from this object on load, so page copy does not need to be hand-edited when the name changes. A `window.WPMCP_BRAND` alias points at the same object for back-compat.
- `assets/css/brand.css`, the `:root` custom properties: `--brand-primary`, `--brand-accent`, and the rest of the palette/type tokens. Every other stylesheet reads these variables instead of hardcoding colors or fonts.

To rebrand again:

1. Edit `name`, `tagline`, `domain`, `github`, and `pluginSlug` in `assets/js/brand.js`.
2. Adjust `--brand-primary` / `--brand-accent` in `assets/css/brand.css` if the palette changes too.
3. Replace the inline `<svg>` logo mark in `index.html` (header, hero, and footer, three copies) and `docs.html` (header and footer, two copies), or swap it for an `<img>` pointing at a new asset in `assets/img/`. Each mark carries `.logo-mark`/`.logo-ring`/`.logo-arrow` classes that `assets/css/logo.css` animates; keep those classes (or update the selectors) if the glyph shape changes.
4. The literal string "wpmcp" still appears in a few places outside the brand slots (GitHub URLs, install commands, the docs page's mention of the underlying plugin). Those are intentional: they describe the real, current plugin identity and its GitHub repo path, not the marketing brand shown to shop owners; update them by hand if the repo itself is renamed.

## Docs rendering

`docs.html` fetches every `.md` file from the sibling `docs/` folder, parses YAML-ish frontmatter (`title:` and `order:`), renders the Markdown body with a small dependency-free renderer (`assets/js/markdown.js`), and builds the sidebar navigation ordered by `order`. Routing is hash-based (`docs.html#safety-model`), so links are shareable and the back button works.

If `docs/manifest.json` exists (a plain JSON array of filenames), it is used as the file list; otherwise a hardcoded fallback list in `assets/js/docs-app.js` is used and any missing file is silently skipped. This file does not author or edit anything inside `docs/`.
