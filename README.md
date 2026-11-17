# Nandhan Alahari, personal site

An observatory instead of a résumé. A single WebGL particle field (the "cosmos") lives behind every page and
re-forms for each piece of work as you scroll: a spiral galaxy, a GPU data hall, a globe of flight arcs, a face
mesh, and a neural graph. The DC Router case study embeds an interactive replay of the real seeded week from the
HackUTD 2026 backend: ASAP vs optimized, with hour-by-hour zone temperatures.

## Stack

- React 18, TypeScript, Vite, react-router
- Three.js with custom GLSL shaders for the cosmos (lazy-loaded as its own chunk)
- Canvas 2D for the DC Router week replay
- Hand-rolled design system in plain CSS: see [docs/DESIGN.md](docs/DESIGN.md)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview
```

Debug any particle formation with `?cosmos=galaxy|hall|globe|face|neural|drift`.

## Editing content

- All copy lives in `src/data.ts`: projects, experience, news, skills, links.
- DC Router replay data lives in `src/content/dcrouter.json` (exported from the project's backend fallback snapshot).
- Pages pick a particle formation with `useCosmosScene(ref, scene, align, intensity)` from `src/cosmos/store.ts`.
