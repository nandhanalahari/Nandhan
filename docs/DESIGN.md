# Design system: "Deep Field"

The portfolio of Nandhan Alahari: CS @ UT Dallas, ML systems engineer, ACL 2025 co-author, multi-time hackathon winner.
Audience: recruiters and engineers deciding in ~30 seconds whether to talk to him. Primary job: make the work
undeniable (real numbers, real artifacts) and make the site itself proof of craft.

## Concept
An observatory, not a terminal. One persistent WebGL particle field (the "cosmos") lives behind the whole site.
Its particles reassemble into a different form for each piece of work as you scroll: a galaxy (who he is), a GPU
data hall (DC Router), a globe with flight arcs (NavRisk), a face-mesh point cloud (Kolana), a neural graph (research).
Everything in the foreground is calm, editorial, and confident, so the cosmos is the one orchestrated moment.

**Retired on purpose** (they read as generated): fake terminal windows, `//` comment labels, `~/path` crumbs,
mono uppercase eyebrows, `01 / 02` numbering, middle-dot meta strings, `→`/`›` arrows on every link, identical
rounded cards with one soft shadow, fade-up on every block.

## Color (all defined in `src/styles/tokens.css`, never raw hex in components)
| Token | Hex | Role |
|---|---|---|
| `--void` | `#060A14` | page background (deep blue ink, not neutral black) |
| `--hull` | `#0C1322` | raised surfaces |
| `--hull-2` | `#121B2E` | hover / nested surfaces |
| `--line` | `rgba(150,172,224,.14)` | hairlines, borders |
| `--star` | `#ECF0FA` | primary text |
| `--dust` | `#8D98B4` | secondary text (4.9:1 on void) |
| `--ion` | `#7CB8FF` | interactive accent: links, focus, "safe/optimized" |
| `--flare` | `#FFB067` | wins, awards, highlights. Used sparingly |
| `--heat` | `#FF5E5E` | danger / overheat only (DC Router viz) |

Ion = cool = good/interactive. Flare = warm = achievement. Heat = failure. Never use color alone to convey state.

## Type
- **Bricolage Grotesque** (Google, variable, opsz 12–96, wght 300–800): display and body. Headlines are big,
  tight (`letter-spacing:-0.03em`, `line-height:.95`), `text-wrap:balance`. Body 17px/1.6, `text-wrap:pretty`, max 68ch.
- **JetBrains Mono** (400/500): **only** for real data: numbers in charts, timestamps, cost counters. Never for
  labels or decoration. Use `font-variant-numeric: tabular-nums` on any changing number.
- Scale (fluid, in tokens): `--t-xs .8125rem`, `--t-sm .9375rem`, `--t-md 1.0625rem`, `--t-lg 1.375rem`,
  `--t-xl clamp(1.75rem,3vw,2.5rem)`, `--t-2xl clamp(2.5rem,6vw,4.75rem)`, `--t-3xl clamp(3.25rem,11vw,9.5rem)`.
- Sentence case everywhere. Labels are small, regular-case `--dust` text, not caps.

## Layout
- Container `min(1200px, 100% - 2*var(--gutter))`, gutter `clamp(16px,4vw,40px)`. No horizontal scroll at 360px.
- Generous vertical rhythm: sections `padding-block: clamp(96px, 14vh, 180px)`.
- Breakpoints to check: 375, 768, 1024, 1440.
- Radius: `--r-sm 6px`, `--r-md 14px`, `--r-lg 24px`. Surfaces are glassy hull (`--hull` at ~70% + `backdrop-filter: blur(14px)`),
  1px `--line` border, no drop shadows except the focus glow.

## Motion
- The cosmos morph is the signature. Foreground motion is restrained: content may fade in **once** per page via
  the `[data-reveal]` attribute (handled globally), and interactive elements respond to input.
- Easing `--ease-out: cubic-bezier(.16,1,.3,1)`; durations 160ms (hover), 320ms (state), 700ms (reveal).
- Only animate `transform`/`opacity`. Never `transition: all`. Honor `prefers-reduced-motion` (tokens collapse durations;
  the cosmos renders a static frame).

## Quality floor (non-negotiable)
- Semantic HTML first; `<button>` for actions, `<a>`/`<Link>` for navigation. Headings hierarchical; one `h1` per page.
- Visible `:focus-visible` ring (`--focus` token). Skip link. Hit targets ≥ 44px on touch.
- Contrast ≥ 4.5:1 for text. Decorative SVG/canvas `aria-hidden`. Data viz has a text/table equivalent.
- Copy: active voice, specific, no filler. Use `…` not `...`, curly quotes, `&nbsp;` between number and unit.
- React 18: no components defined inside components, derive instead of effect-sync, refs for per-frame values,
  passive listeners, clean up every listener/RAF/observer.
