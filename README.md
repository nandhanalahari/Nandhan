# Nandhan Alahari — Personal Website

A minimal, engineered personal site: light/dark themes, a live GitHub stats section, and a tumbling 3D cube rendered entirely in ASCII — a text-mode nod to the Rubik's cube that got me into CS.

## Stack

- React 18 + TypeScript
- Vite
- No UI libraries — hand-rolled design system (Geist / Geist Mono, CSS custom properties)
- ASCII cube: software 3D renderer (rotation + perspective projection + z-buffer) writing into a `<pre>`

## Run it

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Editing content

All copy lives in `src/data.ts` — announcements, skills, projects, experience, and social links.
