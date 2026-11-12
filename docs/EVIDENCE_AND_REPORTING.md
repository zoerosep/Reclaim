# Reclaim v0.5 — evidence vault and Reddit reporting demonstration

**Safety and scope:** This is a hackathon proof of concept for **harmless, bundled sample images only**. It does not search Reddit, discover real NCII, verify consent, submit complaints, authenticate users, or provide a production-grade forensic vault. Do not put personal or intimate material into this prototype.

## End-to-end demonstration

1. Run the Python API and React as described in the repository README.
2. Click the **Garden** sample. Confirm that the local matching engine returns one or more candidates.
3. Click **Save to vault** beside a candidate.
4. In **Local evidence vault**, choose either:
   - **Real local demo reference**: the candidate came from the bundled reference catalog, not the internet.
   - **Fictional Reddit finding**: a clearly simulated source context used to exercise the reporting UI. This is **not a real Reddit post** or match.
5. Optionally write a harmless demonstration note. Click **Save image + details locally**.
6. The vault displays the stored reference filename, label, acquisition timestamp, local/fictional source, SHA-256 integrity hash for the saved *reference file*, matching methods, and pHash distance. Previews are **hidden by default**.
7. Set a passphrase of 12+ characters, confirm it, and click **Download encrypted .reclaim file**. An encrypted backup containing the saved demonstration image(s) and records downloads to your computer.
8. To verify portability, use **Restore an exported demo package**, select the `.reclaim` file, enter its passphrase, and confirm replacement of the existing demo vault. Imported data is restored to IndexedDB.
9. For a saved **fictional Reddit** record, click **Reporting guide**. Open Reddit's *actual* official U.S. NCII legal removal form or its rules-reporting guide. Optionally copy the fake summary for internal demonstration only. **Do not submit it to Reddit.**
10. Update reporting status manually to demonstrate follow-up tracking. The app does **not** claim a submission occurred based on the status selection.

## Files changed

| File | Purpose |
|---|---|
| `frontend/src/App.jsx` | Adds a Save to vault action per matching result and mounts the new workspace |
| `frontend/src/EvidenceWorkspace.jsx` | Candidate review, vault display, encrypted export/import UI, Reddit reporting workflow |
| `frontend/src/lib/evidenceVault.js` | Native IndexedDB persistence for selected harmless reference image blobs and structured metadata |
| `frontend/src/lib/secureExport.js` | Web Crypto AES-256-GCM demo exports using PBKDF2/SHA-256 with random salt and IV |
| `frontend/src/styles.css` | UI treatments using existing Reclaim Georgia/green/purple/steel palette |
| `backend/app/main.py` | Returns the reference filename so it can be preserved alongside match data |
| `backend/tests/test_api.py` | Checks filename in the matching response |

## What is saved (and what is not)

**Saved only when explicitly selected:**
- The *matched safe demo reference image* (Blob), reference filename and label
- SHA-256 calculated for that saved matched reference file, as an integrity check
- Matching method(s), exact-file flag, pHash distance and tier, optional embedding score
- Source classification (local demo reference or fictional Reddit demonstration)
- Optional note, timestamp when added, review status (unverified) and manually chosen reporting status

**Not saved:**
- The original uploaded query image
- A query-file preview or query-file SHA-256 returned by the Python backend
- Real Reddit content, third-party images, passwords, or credentials
- External screenshots or internet discovery results

**Local means browser-specific.** IndexedDB normally persists between page refreshes in the same origin/browser/profile, but it can be cleared by the user, browser policies, private mode, or storage eviction. It is **not encrypted at rest** by this prototype. Back up the demo records before clearing browser data. Running on a different port/origin may create a separate storage location.

**Exports are password-encrypted**, but this is not a security-audited archival product. The `.reclaim` package is not a standard ZIP: it is a JSON envelope of base64 ciphertext using AES-GCM with a passphrase-derived key (310,000 PBKDF2 iterations). It can be decrypted *through Reclaim's Restore UI*, not by double-clicking it or unzipping it. Losing the passphrase makes it unrecoverable. The decrypted package contains harmless demo image data and records; treat exported copies with care.

**Image source preservation:** saving the matched reference preview does not constitute original web-page preservation. A production evidence pipeline should record capture context, original page URL, platform timestamps, download method, original bytes, appropriate metadata, and audit logs, and have evidence-collection procedures reviewed by counsel and qualified forensic practitioners. A file hash only indicates integrity after collection, not authenticity of the original website claim.

## Reddit reporting procedure (verified November 2026)

**U.S. legal removal form:** https://support.reddithelp.com/hc/en-us/requests/new?ticket_form_id=19623931614484

**Take It Down Act details:** https://support.reddithelp.com/hc/en-us/articles/49223517214996-U-S-Take-It-Down-Act-Information-for-people-in-the-U-S

**Reddit Rules/NCII reporting instructions:** https://support.reddithelp.com/hc/en-us/articles/360043513951-What-should-I-do-if-someone-has-shared-or-threatened-to-share-intimate-images-of-me-or-somebody-I-know

Reddit describes separate routes: in-app/site reporting of posts or comments for **Non-Consensual Intimate Media**, or a U.S. legal notice under the TAKE IT DOWN Act. For the legal notice Reddit requires the **real direct link, contact email and full legal signature**. Choose the eligible route based on actual circumstances. Do not submit fake demonstration data to the real form.

## Engineering boundaries / future work

- Independent review of enrollment, authorized access, prevention of misuse, and logging
- Encryption **at rest** and independently reviewed key management, not merely export encryption
- Consent-driven review modes and granular delegation to a legal team/trusted person
- Authorized integrations for real search sources and case-specific verification
- Case-specific reporting routes, notices, acknowledgements, reminders, and source-site API integrations
- Procedures for material created when a person was under 18: do not capture, reproduce, or distribute those images through a generic vault; route to specialized reporting organizations

## GitHub reminder

Only commit the example code and intentionally included sample photos. Do **not** commit `.reclaim` exports, real evidence, secrets, or local databases. `.gitignore` now includes `*.reclaim`.
