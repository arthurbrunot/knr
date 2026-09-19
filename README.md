# KNR - Maison Célestine

Shopify **Online Store 2.0** theme built for the KNR technical test: a product page integrated from a Figma
mockup (desktop + mobile).

- **Shop:** `knr-abrunot`
- **No build step:** Liquid, vanilla CSS, native Web Components. What is in the repo is what Shopify serves.
- **Node:** `^22.20.0` (dev tooling only: Prettier)
- **Deploy:** Shopify GitHub integration, the connected branch is the theme (no CLI push).

## Stack

| Layer         | Tool                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| Templating    | Liquid, JSON templates, section groups                                                   |
| Styles        | Vanilla CSS: one global `theme.css` (reset, root type, utilities) + one file per section |
| Interactivity | Native Web Components (`customElements.define`), one file per component, loaded `defer`  |
| Fonts         | Inter variable, self-hosted from Google Fonts, metric-matched fallback (no layout shift) |

## Setup

```bash
npm install
npm run dev
```

## NPM scripts

| Command                | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | `shopify theme dev` on `knr-abrunot` (hot reload, editor sync) |
| `npm run check`        | Theme Check                                                    |
| `npm run format`       | Prettier (Liquid plugin)                                       |
| `npm run format-check` | Prettier, check only                                           |

## Project structure

```
assets/      theme.css (tokens + base), component JS, Inter woff2
config/      settings_schema (palette, color schemes), settings_data
layout/      theme.liquid, password.liquid
locales/     fr.json (shop primary locale), en.default.json
sections/    knr-* page sections, main-* template shells, header/footer groups, design-system
snippets/    head (meta, fonts, css variables, JSON-LD), shared partials
templates/   JSON templates, product.json is the product page
```

## Design tokens

Extracted from the Figma mockup (desktop 1440, mobile 390). Living reference: `/?view=design-system`.

| Layer         | Where                               | What                                                                                                                  |
| ------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Brand palette | `settings.colors` (`color_palette`) | `--palette-*`: text, background, surface, media, accent, accent_light, rating…                                        |
| Color schemes | `settings.color_schemes`            | `.color-<id>` → `--color-background / foreground / foreground-muted / border / button`                                |
| Static tokens | `assets/theme.css` `:root`          | type scale (`--text-*`), tracking, `--space-N` (N × 4px), radii, borders, layout                                      |
| Primitives    | `assets/theme.css`                  | `.layout*`, `.col-span-var`, `.title-h1…3`, `.text-*`, `.label*`, `.btn*`, `.link`, `.badge*`, `.field-input`, `.rte` |

Color settings are turned into custom properties inside a `{% style %}` tag in the layout
(`snippets/css-variables.liquid`) so the theme editor previews them live. Everything else is in `rem`:
the root font size follows the mockup width, so layouts keep Figma proportions between
breakpoints (md 768, lg 1024).

## Product page

Default product template `templates/product.json` (no template suffix needed).

| Section                | Content source                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `knr-announcement-bar` | Section blocks (header group)                                                                      |
| `knr-header`           | Menu `main-menu`, cart count (live), headroom behaviour, mobile menu drawer                        |
| `knr-main-product`     | `product` object + `custom.*` metafields, `reviews.*`, complementary products (Search & Discovery) |
| `knr-image-banner`     | `custom.story_*` metafields                                                                        |
| `knr-how-to-use`       | Metaobjects `usage_step` via `custom.usage_steps`                                                  |
| `knr-before-after`     | `custom.before_image` / `after_image`, metaobjects `testimonial` via `custom.testimonials`         |
| `knr-faq`              | Metaobjects `faq_item` via `custom.faq` (+ FAQPage JSON-LD)                                        |
| `knr-latest-news`      | Blog `news` articles                                                                               |
| `knr-newsletter`       | Section settings + native customer form                                                            |
| `knr-reassurance`      | Section blocks (footer group)                                                                      |
| `knr-footer`           | Menus `footer-*`, section settings, localization form                                              |
| `knr-cart-drawer`      | Cart, re-rendered through the Section Rendering API                                                |

Metafield-backed settings are connected as **dynamic sources** in the template JSON, so the editor shows
where every value comes from. Art direction: `custom.hero_image_mobile` (portrait crop of the first image,
served below 1024px through `<picture>`) and `custom.packshot` (sticky bar, mini-cart).

## Conventions

- **Prefix**: every section used by the product page is prefixed `knr-`.
- **Scoped CSS**: each section keeps its CSS in its own `{% stylesheet %}` tag, every selector starting with
  the section root class (`.knr-x`, `.knr-x__element`). Shopify only serves the stylesheet content of files
  rendered on the page (stylesheet subsetting). `theme.css` holds tokens and shared primitives only.
- **Non-blocking JS**: components are plain `<script src="…" defer>` tags rendered by the section that
  needs them. Markup is usable before JS runs (progressive enhancement).
- **No hardcoded content**: product data comes from Liquid objects, editorial content from metafields,
  metaobjects, menus, blogs and section settings/blocks.
