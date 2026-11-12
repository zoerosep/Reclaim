# Reclaim v0.7 — muted gradient + two informational pages

Built on the existing v0.5 fullstack code **with the v0.6 dark UI files applied first**. The backend, approved sample collection, and `EvidenceWorkspace.jsx` remain as in v0.5/v0.6.

## What changed
- Restrained low-saturation charcoal / dusty-plum / muted-teal page background, based on the last approved mockup. The existing cards, samples, demo copy, and evidence/reporting flow remain unchanged.
- The app page hero title, intro, and three process labels are centered.
- Header links: **App**, **Why it matters**, **Get help**. The botanical logo links home. Each is a distinct client-side page path (`/`, `/why-it-matters`, `/get-help`) with browser back/forward support.
- Why it matters: five *sourced* stat cards with clear measurement labels, a sixth card linking to the demo, an About/mission block, and source links. The statistics do not all measure the same population.
- Get help: a four-category index plus vetted external resources for emotional support, evidence/victim services, content removal and legal aid. Resources open in a new tab.

## Install from full project ZIP
1. Make a backup / Git commit of your own existing project. Merge rather than overwriting team changes.
2. Unzip `Reclaim_v0_7_Fullstack.zip`. Open `reclaim-fullstack-baseline` in VS Code.
3. Start the Python backend as documented in the original `README.md`; seed the sample catalog if needed.
4. `cd frontend && npm install && npm run dev`.
5. Visit the Vite address and click App, Why it matters, Get help. Check browser back/forward and mobile layout.

## Or apply the frontend-only patch
`Reclaim_v0_7_Frontend_Patch.zip` contains just these paths:
- `frontend/src/App.jsx` (page routing/nav, centered hero)
- `frontend/src/InfoPages.jsx` (two new informational pages)
- `frontend/src/styles.css` (muted gradient and info-page styles)
- `frontend/public/_redirects` (SPA fallback for hosts such as Netlify)

The patch presumes you already have the v0.6 frontend including `EvidenceWorkspace.jsx` and the botanical logo. Do **not** replace your Python backend for these visual/content changes.

## Important demo and safety limitations
The app **only matches against the approved sample catalog**; it does not search the internet. Do not upload intimate or sensitive materials. The existing browser evidence vault is **not encrypted at rest** even if encrypted export is available. The reporting example remains fictional and does not send reports. The pages contain educational information and external resources, not individualized legal, medical, or forensic advice. Review links and copy with your team before release.

## Sources used for public content (checked November 11, 2026)
- https://cybercivilrights.org/
- https://www.pewresearch.org/internet/2021/01/13/the-state-of-online-harassment/
- https://www.pewresearch.org/internet/2021/01/13/characterizing-peoples-most-recent-online-harassment-experience/
- https://rainn.org/help-and-healing
- https://rainn.org/mental-health-therapy-support-after-sexual-violence/how-to-find-a-trauma-informed-therapist/
- https://www.findtreatment.gov/
- https://rainn.org/where-to-find-medical-care-after-sexual-assault/
- https://cybercivilrights.org/ccri-safety-center/
- https://cybercivilrights.org/ccri-crisis-helpline/
- https://ovc.ojp.gov/directory-crime-victim-services/search
- https://ncvli.org/victim-resources-database/
- https://stopncii.org/
- https://takeitdown.ncmec.org/
- https://www.takeitdown.ftc.gov/
- https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help

## Verification note
The JSX was syntax-checked using TypeScript JSX transpilation. `npm install` was unavailable in the isolated build environment, so a full Vite production build and live browser smoke test could not be completed here. Please run `npm install && npm run build` on your project machine.
