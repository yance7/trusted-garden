# Independent Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Split explanatory navigation into real lightweight pages and keep the HD farm on home.
**Architecture:** Five Vite HTML entries, shared static navigation and document styling, no new runtime dependencies. Live scene controls stay in the existing UI; validated URL state connects notes to viewpoints.
**Tech Stack:** Existing TypeScript / Vite / Three.js, native HTML anchors and selects.
**Spec:** `docs/superpowers/specs/2026-10-30-multipage-navigation-design.md`.

## Global Constraints

- Preserve the accepted farm, complete geometry, 4K delivery, simulation caveats and Actions deployment.
- Only home loads 3D assets; every document has its own URL and works on direct refresh.
- Use relative root-level `.html` routes, compatible with custom-domain and project-subpath hosting.
- Preserve authored explanatory content; do not add research claims.

## Review Focus

- Deep-link values are validated and returning to the farm targets a real viewpoint.
- Documents remain usable without WebGL or scene assets and retain readable content without JavaScript.
- Navigation is keyboard accessible and remains visible on narrow screens.
- Live drawer actions remain separate from page links and retain existing scenario/layer behavior.
- Root and project-subpath direct refresh never depend on SPA fallback.

### Task 1: Real document entries and shared navigation

Files: `index.html`, `story.html`, `design.html`, `architecture.html`, `notes.html`, `src/styles/scene.css`, `src/pages/*`, `tools/site/navigation.ts`, `vite.config.ts`, `tests/pages.test.mjs`.

- [x] Write and observe failing entry/content/scene-isolation contracts.
- [x] Extract scene inline CSS and explanatory modal markup; implement static document entries, common header and responsive editorial style.
- [x] Configure five actual build inputs; verify direct routes and no scene bundle on documents.

### Task 2: Scene actions, notes and validated return links

Files: `src/ui.ts`, `src/main.ts`, `src/navigation.ts`, `src/pages/notes.ts`, `tests/navigation.test.mjs`.

- [x] Write failing checks for invalid and valid view/scenario mappings and encoded URLs.
- [x] Keep data/tour buttons as scene actions, link top navigation to documents, give the live drawer a contextual notes link.
- [x] Implement static notes examples with authored scenario data and query-state controls, and return to the correct 3D viewpoint.
- [x] Update browser regressions from removed dialogs to real navigation with normal Back behavior.

### Task 3: Acceptance and publication

Files: `tools/verify-pages.mjs`, existing regression tools, README / deployment notes.

- [x] Inspect screenshots on desktop/mobile and verify keyboard, all document routes, no 3D requests on docs, Back navigation, and contextual notes-to-farm links.
- [x] Run asset/state/navigation tests, typecheck, production build, scene interaction and loading checks appropriate to the change.
- [x] Obtain one independent whole-change review, resolve material findings and record decisions.
- [ ] Verify merged main, publish through the already authorized Actions workflow and check the exact deployed commit and real document routes.
