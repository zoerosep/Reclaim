# Reclaim roadmap (not a feature-completion claim)

## Working v0.2 baseline

1. React/Vite interface.
2. Python/FastAPI service bound to loopback during development.
3. Pillow preprocessing, SHA-256, pHash comparison.
4. SQLite catalog of preapproved, harmless reference hashes; search uploads not added.
5. Standardized results containing match methods, distances, and demo reference IDs.
6. Optional OpenCLIP local model adapter; only if a checkpoint is explicitly installed and the reference catalog is reindexed with that same model.
7. Developer tests + GitHub Actions baseline checks.

## Next development step

- Add a privacy-reviewed evidence schema, including source URL, date actually observed, reported posting date (as claim), record source, review status, and explicit provenance of captures.
- Add authorized manual imports for OSINT findings *without auto fetching third-party media*.
- Establish threat model, private access controls, audit policy, and fully reviewed local encryption and password-protected export.
- Offer safe viewing controls with hidden thumbnails by default.
- Make source adapters that require specific consent and disclosures.
- Build a platform-specific takedown **draft generator**; require user review before sending.

## Reach goals, contingent on authorization/security review

- Local OpenCLIP or other CV embeddings for hard-to-match modified images.
- Secure delegation to lawyers/advocates, opt-in encrypted evidence exports, key management and backups.
- Browser extension for explicit, authorized webpage captures and provenance metadata.
- Integration with approved APIs for platform-specific reports; status tracking and follow-up.
- Integrations with forensic tools and specialized advocates, avoiding automatic bulk acquisition.

## Hard limits

- No reverse image search of the live internet in this code.
- No encrypted evidence vault, access verification, or secure deletion guarantees.
- No account authentication or trusted-person sharing yet.
- No child sexual abuse imagery, non-consensual intimate content, or real survivor case data allowed in the demonstration.
- A local Python API is not a browser-only image processor. Remote API deployment would transmit images to that server.
- Scores are similarity heuristics, not forensic identification or evidence of who distributed an image.
