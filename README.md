# Reclaim — Discovery Engine v0.2 (React + Python)

> A **safe demonstration** of multimethod image matching against preapproved local reference images. This is not internet-wide reverse-image search, a production NCII detection service, a forensic evidence vault, or a secure investigation system. **Use harmless sample pictures only.**

This edition restructures the earlier **React-only** Discovery Lab starter into a **GitHub-ready VS Code monorepo** with a Python backend. It follows the team's whiteboard architecture: input → preprocessing → feature extraction → SHA-256 / pHash / optional computer-vision embeddings → authorized SQLite reference comparison → unified results.

## Folder layout

```text
reclaim-fullstack-baseline/
├── frontend/
│   ├── src/App.jsx           # React UI, methods, results
│   ├── src/styles.css        # Existing prototype visual style
│   ├── public/samples/       # 8 harmless sample illustrations
│   └── vite.config.js        # Local /api proxy to FastAPI
├── backend/
│   ├── app/main.py           # GET health/catalog + POST search API
│   ├── app/features.py       # Pillow + SHA-256 + DCT pHash
│   ├── app/embeddings.py     # Optional locally configured OpenCLIP
│   ├── app/store.py          # SQLite reference catalog
│   ├── demo_reference_images/# ONLY harmless test images
│   ├── scripts/seed_demo.py  # Index approved reference features
│   ├── tests/               # Python unit + API tests
│   └── requirements.txt
├── docs/TOOL_MAP.md          # ExifTool, ImageMagick, Autopsy, Maltego roles
├── docs/ROADMAP.md           # MVP versus reach goals
└── .github/workflows/check.yml
```

## Run locally in VS Code

Install **Python 3.11–3.13**, **Node.js 20+**, and **VS Code**. Open the **whole repository root folder** in VS Code, not only `frontend`.

### Terminal A: Python backend

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m backend.scripts.seed_demo
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload --no-access-log
```

**Windows PowerShell:**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m backend.scripts.seed_demo
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload --no-access-log
```

Check http://127.0.0.1:8000/api/health . If you see `reference_count: 8`, the local catalog is ready.

### Terminal B: React frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 . Try Garden, Coast, or Shapes. It will POST raw image bytes to **127.0.0.1:8000 through Vite's local proxy**. The Python server returns only candidate match records. Search images are processed in memory and **are not written into the app's database**.

### Test backend

From the repository root with the virtual environment active:

```bash
python -m pytest backend/tests -q
```

### Optional OpenCLIP embeddings (NOT required for the baseline)

1. Install compatible PyTorch and torchvision for your OS/CPU or GPU, and the optional dependencies in `backend/requirements-embeddings.txt`.
2. Obtain a compatible pretrained **ViT-B-32** model checkpoint on your own system. Check license and provenance. No images should be sent to a model provider.
3. Set `RECLAIM_OPENCLIP_CHECKPOINT=/absolute/path/to/checkpoint.bin` in your backend terminal **before** seeding, then rerun the seed script and restart the server. On Windows PowerShell: `$env:RECLAIM_OPENCLIP_CHECKPOINT='C:\path\to\checkpoint.bin'`.
4. The server enables `openclip` in `/api/health` when a local checkpoint is configured. The first model initialization may be slow.

The checkpoint is never bundled in GitHub. The model weights must be compatible with the architecture, and the same model must be used for query and reference features. Visual similarity does **not** establish that an image depicts the same person or comes from the same source. Demo thresholds are placeholders only.

## Push to GitHub as a team

From the repository root:

```bash
git init
git add .
git commit -m "Build Reclaim React and Python matching baseline"
git branch -M main
# Create an EMPTY private repository on GitHub first, then set your actual URL:
git remote add origin https://github.com/YOUR-TEAM/reclaim.git
git push -u origin main
```

For team collaboration, create feature branches such as `frontend/ui`, `backend/phash`, and `docs/research`, then open pull requests. Do not commit secrets, case evidence, local databases, EXIF dumps, or original intimate images. `.gitignore` excludes runtime data but cannot protect files manually copied into publicly tracked folders. Review every `git status` and staged diff.

GitHub Actions checks the Python tests and React build on pushes and pull requests.

## Where Netlify fits

**GitHub stores the repository. Netlify can build and host the Vite frontend** (`base directory: frontend`, build command `npm run build`, publish `dist`). It **does not host this long-running Python/FastAPI process**. The Vite `/api` proxy is a local-development feature, not a Netlify backend. A deployed frontend will not have a working search until you deliberately configure a separate secure Python host and its API URL; do NOT expose this baseline API publicly or use real survivor data.

For the hackathon, demo **both locally from VS Code** instead. A future external backend would receive the uploaded image and must not be marketed as device-only or private-by-default without review.

## Privacy limits you should state in your pitch

- **Upload lifecycle:** The React app sends selected image bytes to a local Python process. The API computes features in memory and does not persist the search file, preview, or query hash. `POST /api/search` uses a raw body instead of FastAPI `UploadFile` to avoid app-level upload spooling to temporary files.
- **Not secure erasure:** Data may remain in process/OS/browser buffers. Developers should avoid verbose request logging and any third-party observability in later environments.
- **Reference catalog:** SQLite stores fingerprints of **approved test images**, not copies of the query. The eight safe demo pictures themselves are intentionally bundled in the repo.
- **No internet search:** All algorithms need images in their reference corpus. SQL is a catalog, not a global web index. Maltego/Autopsy/ExifTool/ImageMagick are *not* substitute image reverse-search engines.
- **Safety:** No verification, authentication, encrypted vault, role-based access, or automatic takedown submission exists in v0.2. Do not put real sensitive information into GitHub or the demo.

## API summary

```text
GET  /api/health
GET  /api/catalog
POST /api/search?methods=sha256,phash
Content-Type: image/png | image/jpeg | image/webp
Body: raw image bytes (no multipart, no filename)
```

`POST /api/search` returns candidate IDs, matching method names, pHash Hamming distances (0 to 64), optional OpenCLIP cosine values, and a clear unverified status. No reverse-image provider, website scraper, or OSINT action is called.

**Python implementation choices:** Pillow + NumPy/SciPy (open-source components), built-in `hashlib` and SQLite, FastAPI. See `docs/TOOL_MAP.md` for ExifTool, ImageMagick, Maltego, and Autopsy. Official references: https://fastapi.tiangolo.com/ , https://pillow.readthedocs.io/ , https://github.com/mlfoundations/open_clip .
