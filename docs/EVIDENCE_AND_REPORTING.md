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

## More platforms (X, Snapchat, OnlyFans)

The fictional-finding flow now covers four platforms: Reddit, X, Snapchat and OnlyFans. Pick one under **Where was this found? (demo)** when saving a match, then open that record's **Reporting guide**. Each guide is the same kind of thing as the Reddit one: plain-language steps plus links to the platform's own reporting pages, opened in a new tab. Reclaim does not submit anything for the person.

The guides and links live in one file, `frontend/src/lib/reportingPlatforms.js`. To add or correct a platform, edit that file. Links were copied from each platform's official help pages on November 12, 2026; platforms change these pages, so re-check them before any real-world release.

- **X:** Take It Down Act report form, how X handles those reports, and X's policy page.
- **Snapchat:** the web form for intimate imagery shared without consent, and Snapchat's reporting help article. Snapchat also recommends reporting inside the app.
- **OnlyFans: link not verified.** OnlyFans' own help pages could not be read while building this, so the guide does not link to a report form. It points to Australia's eSafety Commissioner guide, which lists OnlyFans' "Report a user or post" option. A teammate should find OnlyFans' official removal or report page, confirm it, and add it to `reportingPlatforms.js` (the file has a commented example).

## Engineering boundaries / future work

- Independent review of enrollment, authorized access, prevention of misuse, and logging
- Encryption **at rest** and independently reviewed key management, not merely export encryption
- Consent-driven review modes and granular delegation to a legal team/trusted person
- Authorized integrations for real search sources and case-specific verification
- Case-specific reporting routes, notices, acknowledgements, reminders, and source-site API integrations
- Procedures for material created when a person was under 18: do not capture, reproduce, or distribute those images through a generic vault; route to specialized reporting organizations

## Searching wider, hand-added records and prevention services (v0.9)

Three additions that make Reclaim useful even when its own search did not find anything. None of them makes a network request: Reclaim only opens other sites in a new tab.

### Search the wider internet yourself

`frontend/src/SelfSearch.jsx` shows buttons for Google Lens, Yandex Images, TinEye and PimEyes (listed in `frontend/src/lib/supportTools.js`). Each button is an ordinary link that opens the search engine's home page with `rel="noopener noreferrer"`. **Reclaim sends no image, web address or other data to these sites.** If a person uploads an image there, it goes to that company under that company's terms. The panel says so, and suggests an ordinary face photo or a cropped image is often enough.

### Records added by hand

**Add a record by hand** (in the vault, and from the search panel) saves a text-only record:

- where it was found (Reddit, X, Snapchat, OnlyFans, or another website or app)
- the web address, checked to be an ordinary `http`/`https` address
- the date the person saw it (optional)
- the person's own notes

At least a web address or a note is required. **No image is ever stored for these records.** The saved address is shown as text with a Copy button, not as a clickable link, so nobody is sent back to the content by accident. Logic lives in `frontend/src/lib/manualRecords.js`.

Where it is kept: in this browser's IndexedDB on this device, like the rest of the vault. **It is not encrypted there**, so anyone who can open the browser profile could read it. The downloaded `.reclaim` backup *is* encrypted with the passphrase, and hand-added records are included in it. On restore, each hand-added record is rebuilt from the known fields only.

A hand-added record opens the real reporting guide for its platform, without the "fictional" warnings, and offers **Copy my record summary**. For "another website or app" the guide points to Google's page on removing explicit personal images from Search results (that removes a result from Google Search, not from the website).

### StopNCII.org and Take It Down

Every reporting guide, and the empty reporting panel, now ends with **Stop copies spreading**:

| Service | Who it is for | Link |
|---|---|---|
| StopNCII.org | The person was 18 or older in the image | https://stopncii.org/ |
| Take It Down (NCMEC) | The person was under 18 in the image (adults can use it for images from when they were under 18) | https://takeitdown.ncmec.org/ |

Both create a fingerprint (hash) on the person's own device; the image is not uploaded, and only participating platforms act on it. Take It Down, the NCMEC service, is not the same thing as the U.S. Take It Down Act. Details were checked against each organisation's own pages on November 12, 2026.

### To check before any real-world release

- Open each search engine and service link once on a real computer.
- Decide whether hand-added records need encryption at rest before real use.

## GitHub reminder

Only commit the example code and intentionally included sample photos. Do **not** commit `.reclaim` exports, real evidence, secrets, or local databases. `.gitignore` now includes `*.reclaim`.
