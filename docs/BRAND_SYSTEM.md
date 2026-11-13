# Reclaim brand system · interface v0.3

## Intended feeling
Reclaim should feel protective, modern, assured, thoughtful, and human. It should not read as clinical, playful, glittery, or an awareness-campaign landing page. Color supports meaning rather than decorating every element. The current logo is still a placeholder `R` shield; no new logo is bundled.

## Color system

### Foundational, unchanged
- **Charcoal** `#18181B` — brand navigation, primary ink, seriousness.
- **Forest** `#14532D` — search entry points, selected matching methods, controlled actions.
- **Steel** `#475569` — body text, metadata, technical explanations.
- **Ivory** `#FAF7F2` — warm overall surface that keeps the experience from feeling sterile.

### Additions
- **Smoky amethyst** `#554166` — results, review choices, survivor agency, meaningful emphasis.
- **Muted violet** `#746487` — supplementary accent; avoid for tiny text on colored backgrounds.
- **Lavender mist** `#E8E0ED` — quiet background on review badges and highlighted information.
- **Lavender pale** `#F2EDF5` — results summary and review surfaces.
- **Deep steel** `#2F4155` — local catalog, technical information, roadmap.
- **Steel mist** `#E5EBF0` — metadata chips, structural surfaces.
- **Forest mist** `#E8EEE8` — local matching selection and private processing cues.

The main navigation is charcoal, the input/search panel has a forest top border, and the results panel has an amethyst top border. Do not color every element purple or green. Avoid gradients between green and purple; use solid surfaces and negative space. Color must never be the only indicator of match status or evidence state.

## Typography

### Families
- Body text and labels: `Georgia, "Times New Roman", serif`.
- Headings and titles: `Montserrat` (semi-bold), bundled in `frontend/src/assets/fonts`.
- No Proxima Nova installation or paid license needed for this baseline.

Georgia is a common system serif with platform fallbacks. Montserrat is bundled with the app under the SIL Open Font License, so nothing is requested from external servers. The brand palette remains unchanged.

### Five semantic type roles (practical reinterpretation of the Five Point Rule)
1. **Editorial display:** Montserrat, ~36–62px depending on screen, charcoal with limited amethyst emphasis.
2. **Section title:** Montserrat, ~24px, charcoal.
3. **Body:** Georgia/fallback, ~16–17px, charcoal or steel.
4. **Interface/control:** Georgia/fallback, ~15–16px, charcoal, forest, amethyst, or inverse on dark surfaces.
5. **Metadata:** Georgia/fallback, ~13px, steel or appropriately contrasting brand ink.

These are type *roles*, not literally only five unique combinations of family, size, and color across an entire application. A complex evidence and reporting interface cannot safely sacrifice readability, focus states, or status distinctions to hit a rigid count. Keep typographic variation intentional and repeatable; test on the real screens.

**Why not 13px everywhere?** Search instructions, report notices, legal language, and evidence descriptions need readable text. The demo uses `1rem` (usually 16px) as its base and `.8125rem` (usually 13px) for metadata. Relative units allow scaling. The layout should still be checked at 200% browser zoom and on narrow screens.

### Serif and credibility
Georgia can establish a serious editorial tone in the hero and section headings, but a serif font does not *guarantee* believability. Clarity, provenance, honest limitations, accessibility, and trustworthy workflows matter much more. Georgia is intentionally used throughout this baseline. Recheck readability for dense result data and 13px labels; a future licensed sans-serif remains an option if testing favors it.

## UX principles, adapted for Reclaim
- **Two-tap aspiration:** Common actions should be easy to reach, but do not remove confirmation steps for destructive actions, sharing, reporting, or export.
- **98% principle:** Optimize the frequent and important tasks: start a permitted search, review a candidate, save a verified finding, locate reporting guidance, and return to a case.
- **Five-point audit:** Watch for unnecessary fonts, sizes, colors, and styles. Don't use it as an accessibility standard.
- **Trauma-informed controls:** No sudden sensitive previews, avoid celebratory copy, avoid coercive calls to action, provide clear back/exit paths, and describe exactly when data is transmitted.

## Accessibility and safety checks
- UI font sizes are scalable. Do not block zoom.
- Text roles on ivory/white should use charcoal, forest, amethyst, or steel with adequate contrast; decorative pale colors are surfaces, not body text.
- Keep focus rings visible on all interactive elements.
- Check keyboard navigation, mobile widths, and reduced-motion preference.
- The demo is not encrypted, not authenticated, and cannot search the public internet. Its review checkboxes are session-only; do not label them a secure evidence vault.

## Future usage
When an evidence vault is implemented, carry amethyst into its review/permissions controls and preserve the same charcoal/steel structural language. Do not imply an authorized reviewer can access records unless actual enforcement and cryptography exist. Any production privacy claims must match backend behavior and deployed hosting architecture.

## Relevant sources
- Adobe Fonts Proxima Nova: https://fonts.adobe.com/fonts/proxima-nova
- Adobe Fonts web licensing: https://helpx.adobe.com/in/fonts/web/font-licensing/webfont-licensing.html
- W3C text resize guidance: https://www.w3.org/WAI/WCAG21/Understanding/resize-text
- MDN CSS font-size: https://developer.mozilla.org/en-US/docs/Web/CSS/font-size
