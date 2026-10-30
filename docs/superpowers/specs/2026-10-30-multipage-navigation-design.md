# Trusted Garden independent content pages

The user approved the current HD farm and confirmed that the requested split concerns the top explanatory navigation, while retaining the 3D farm and its controls on the home page. This is a bounded restructuring of existing content and navigation, not a new visual direction.

Keep `index.html` as the complete 3D farm. Extract Project story, Design basis and Computational architecture into `story.html`, `design.html`, `architecture.html`; add `notes.html` for the existing simulated field observations and evidence examples. Each is an actual HTML entry and loads without Three.js, models, materials or the scene loading screen. Preserve original explanatory text and its concept/simulation caveats. No new research claims or measurements.

Use real links for page navigation and buttons for scene actions. Common navigation exposes the active page and a visible return-to-farm link. Retain the ivory/forest palette, serif headings and restrained editorial layout. Documents have readable body type, keyboard focus, skip link and responsive navigation. Extract existing scene CSS out of the home HTML while preserving its appearance.

The live data drawer, weather, layer/scenario controls, viewpoint changes, tour, walk and snapshot remain in the 3D page. Rename the drawer trigger Live controls to distinguish it from the independent Field notes page. Notes show authored simulated data with view/scenario selectors; links between the live drawer, notes and the farm carry validated view/scenario query parameters. Browser Back uses normal navigation. The farm accepts these deep links after entry; no additional geometry or material changes.

Approaches: actual Vite HTML entries are selected because they satisfy the user's request and GitHub Pages direct refresh; an SPA with hidden sections would preserve the single-page problem, and a new server framework would introduce unnecessary hosting changes. Route names, shared navigation implementation and responsive spacing are implementer choices. Build/test both custom-domain roots and `/trusted-garden/`; keep current Actions deployment and progressive HD loading.
