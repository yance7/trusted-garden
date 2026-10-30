# Independent page verification

2026-10-30. Base: `d169ac8`; work branch: `codex/multipage-navigation`.

## Result

The farm remains `index.html`. Project story, Design basis, Computational architecture and Field notes are separate HTML entries. A build-time shared header renders real links with an active-page indicator. Guided tour and Live controls remain scene buttons. Original modal copy is moved into readable documents; scene CSS is extracted without changing models, material delivery or physics.

Documents request no GLB, KTX2, WebP material/preview, WASM or scene manifests. Story/design/architecture have static authored body content, and notes has a readable default example before script enhancement. Mobile navigation falls back to visible links when JavaScript is unavailable. The live notes page continues to label values and evidence as simulated.

## Verified locally

- 17 asset, delivery, state, URL-validation and page-entry tests pass; typecheck and production build pass.
- Build creates all five HTML files. Home HTML is about 9.2 KB; explanatory documents are about 3.4–5.3 KB, plus their lightweight shared CSS/scripts. These are file sizes, not complete network-transfer measurements.
- Real browser checks at root and `/trusted-garden/` cover direct opening, active links, no scene requests, desktop 1440px and mobile 390px layouts, menu/Escape, no-JavaScript document navigation and keyboard skip-to-content.
- Navigation to documents is usable while the farm model is deliberately blocked. Browser Back restores the scene viewpoint and scenario through the URL. A contextual notes link can return to the pond/oxygen example in the actual 3D farm.
- Original scene regression passes: eight views, seven weather modes, quality modes and actual Photo HD resolution, layers/scenarios, tour, growth/time, photo, actual PNG download, walk/first person, manifest failure/retry. No page errors. The full native material pipeline reached 19/19.
- Eight prior browser regression groups pass. Blocking all native HD maps still allows farm entry and view changes; the local check took about 3.2 seconds on this machine, not an online timing guarantee.
- Screenshots inspected for the new documents and farm on desktop/mobile; files remain in ignored `evidence/pages-*`.

## Implementation decisions

- Real root-level `.html` entries fit GitHub Pages and need no rewrite service. Relative routes also work under a project prefix.
- Keep live scenario/layer controls in the farm; the Field notes document is a separate authored simulation explorer.
- View/scenario query values are allowlisted. Changes replace the current page's query without adding a history entry for each button press; navigation between pages uses ordinary anchors and normal browser history.
- Cross-page URLs preserve viewpoint/scenario, rather than serializing every camera, walking, weather and layer setting. No new storage or account state is introduced.
- Build-time header helper uses TypeScript for type checking. No new dependency or server is required.

Final publication must be checked against its own Actions run and actual routes; a preceding deployment is not release evidence.

Independent review identified one Important issue: at 320/360px the expanded scene toolbar obstructed the crop-season slider. The browser reproduction first failed because hit testing the slider returned `dataBtn`. The crop strip and walk panel now reserve the measured toolbar height rather than a fixed offset; checks include 320/360/390/1440px. No other material navigation or content issue was reported.

Screenshot inspection also caught the existing left view selector covering weather readouts below 380px. A separate rectangle-overlap check first failed, then the narrow layout reduced the left selector and resized the weather panel; the smallest width uses two readout columns. These rules are limited to narrow phones.
