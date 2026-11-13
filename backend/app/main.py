"""Local-only demo API. Never upload real intimate or identifying images."""
from __future__ import annotations



import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .embeddings import configured, embed_image
from .features import InvalidImage, cosine_similarity, decode_and_extract, hamming
from .store import initialize, references   

MAX_BYTES = 8 * 1024 * 1024
PHASH_THRESHOLD = 12   # illustrative only, not a confidence score
CLIP_THRESHOLD = 0.88 # illustrative only, NOT identity confirmation


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    yield



app = FastAPI(
    title='Reclaim Discovery API (local demonstration only)',
    description='Non-production Python image-matching demo. No real intimate images.',
    lifespan=lifespan,
)


from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
)

@app.middleware('http')
async def no_store(request: Request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


@app.get('/api/status')
def status():
    return {'message': 'Reclaim backend is running'}   

@app.get('/api/health')
def health():
    return {
        'status': 'demo',
        'reference_count': len(references()),
        'embedding_available': configured(),
        'methods': ['sha256', 'phash'] + (['openclip'] if configured() else []),
        'storage': 'SQLite stores only indexed demo fingerprints; query images are not saved',
    }


@app.get('/api/catalog')
def catalog():
    return [{key: value for key, value in ref.items() if key in ('id', 'label', 'demo_url', 'kind')}
            for ref in references()]


@app.post('/api/search')
async def search(request: Request, methods: str = 'sha256,phash'):
    # Receive a RAW request body, not multipart/form-data. This avoids FastAPI's
    # temporary UploadFile spool for large uploads; the image is held in memory.
    if request.headers.get('content-type', '').split(';')[0].strip() not in (
        'image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'
    ):
        raise HTTPException(415, 'Image body required (PNG, JPEG or WebP).')
    enabled = {method.strip() for method in methods.split(',') if method.strip()}
    if not enabled or not enabled.issubset({'sha256', 'phash', 'openclip'}):
        raise HTTPException(400, 'Choose sha256, phash, and/or openclip.')
    if 'openclip' in enabled and not configured():
        raise HTTPException(400, 'OpenCLIP requires a local checkpoint and optional dependencies.')

    chunks = bytearray()
    async for part in request.stream():
        chunks.extend(part)
        if len(chunks) > MAX_BYTES:
            raise HTTPException(413, 'The demo accepts files up to 8 MB.')
    try:
        query = decode_and_extract(bytes(chunks))
    except InvalidImage as exc:
        raise HTTPException(422, str(exc)) from exc
    finally:
        # Does not guarantee low-level memory erasure; prevents retention in app state.
        chunks.clear()

    try:
        query_embedding = embed_image(query.image) if 'openclip' in enabled else None
    except (RuntimeError, OSError) as exc:
        raise HTTPException(503, 'Embedding model unavailable; try SHA-256 and pHash.') from exc

    output = []
    for reference in references():
        exact = query.sha256 == reference['sha256'] if 'sha256' in enabled else False
        distance = hamming(query.phash, reference['phash']) if 'phash' in enabled else None
        # Embedding similarity compares vectors only if the catalog was indexed
        # using the very same local checkpoint.
        similarity = None
        if query_embedding is not None and reference['embedding_json']:
            similarity = cosine_similarity(query_embedding, json.loads(reference['embedding_json']))
        hits = []
        if exact: hits.append('sha256')
        if distance is not None and distance <= PHASH_THRESHOLD: hits.append('phash')
        if similarity is not None and similarity >= CLIP_THRESHOLD: hits.append('openclip')
        if not hits: continue
        output.append({
            'id': reference['id'], 'label': reference['label'], 'kind': reference['kind'],
            'demo_url': reference['demo_url'], 'matching_methods': hits,
            'exact': exact, 'phash_distance': distance,
            'openclip_cosine': round(similarity, 4) if similarity is not None else None,
            'review_status': 'possible_match_unverified',
        })
    output.sort(key=lambda row: (
        0 if row['exact'] else 1,
        row['phash_distance'] if row['phash_distance'] is not None else 65,
        -(row['openclip_cosine'] or 0),
    ))
    # Do not return: query bytes, query hash, EXIF contents, file names, or GPS.
    return {
        'results': output,
        'checked_references': len(references()),
        'methods_used': sorted(enabled),
        'query_summary': {'width': query.width, 'height': query.height},
        'disclaimer': 'Only approved local demo references were searched. Similarity is not proof of identity or distribution.',
    }
