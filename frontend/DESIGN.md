# Design: "Mascot Kitchen"

The shipped visual identity, arrived at after comparing several directions (chunky playful, modern minimal, editorial) — this one won out.

## Identity
A soft, illustrated, card-dashboard feel (not childish, not stark-modern): a friendly cooking-scene illustration up top, borderless rounded cards with soft diffused shadows, and a background scattered with randomly-placed, gently-floating vegetable illustrations.

## Palette (`app/globals.css`, all in `:root` — no variant switching anymore)
- `--page-bg` — soft powder-blue gradient, page background
- `--color-tomato` / `--color-tomato-dark` — coral, user bubbles + primary buttons
- `--color-leaf` — muted blue, chef bubbles/borders/avatar
- `--color-leaf-bg` — very light blue, chef bubble fill
- `--color-cream` — near-white, input panel
- `--color-ink` — warm charcoal, all text

## Type
Single family: Nunito (`--font-nunito`), used for both body text and display/headings (via `--font-display` alias). No other font is loaded.

## The hero
`CookingSceneIcon` — a hand-authored SVG (pot, animated rising steam, wooden spoon, tomato, herb sprig) sits centered above a small "PERSONAL CHEF" badge and the headline "What can we make today?".

## Background ingredients
A `fixed inset-0 -z-10` layer, sibling to `<main>` (not inside it, so it spans the full viewport regardless of chat width). Populated client-side only, after mount (`useEffect`, not `useMemo` — avoids a server/client hydration mismatch from `Math.random()`), with 16 icons randomly sized/positioned/timed from `VEGGIE_ICONS` (garlic, chili, carrot, tomato, lemon, herb). Each has the `.float-icon` class for a gentle bob animation.

## Depth system
Every card/bubble/button uses soft diffused shadows (`softShadow` / `softShadowSm` constants in `page.tsx`) and no borders — fully rounded corners throughout. This is the only shape language now; the earlier chunky-border/hard-shadow exploration was removed.

## Extending this system
Reuse the existing CSS variables and the `softShadow`/`softShadowSm` shadow constants for any new UI — don't reintroduce borders or a different shadow style. Add new ingredient icons to `VEGGIE_ICONS` if more variety is wanted; the scatter logic picks them up automatically.
