"""Fill the demo catalog with the bundled, harmless sample images.

Lives inside the `app` package so the server can run it at startup whichever way
it was launched (`backend.app.main:app` from the project folder, or
`app.main:app` from inside `backend/`).
"""
from __future__ import annotations

import os
from pathlib import Path

from .embeddings import configured, embed_image
from .features import InvalidImage, decode_and_extract
from .store import initialize, put_reference, references

SAMPLES = Path(__file__).resolve().parents[1] / 'demo_reference_images'
KIND = {
    'original': 'Original',
    'resized': 'Resized',
    'compressed': 'Compressed',
    'cropped': 'Cropped',
}


def seed_demo_catalog(log=None) -> int:
    """Index every sample image. Safe to run again: existing rows are replaced."""
    initialize()
    count = 0
    if not SAMPLES.is_dir():
        return count
    for path in sorted(SAMPLES.iterdir()):
        if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        stem = path.stem
        try:
            result = decode_and_extract(path.read_bytes())
        except (InvalidImage, OSError):
            continue
        try:
            embedding = embed_image(result.image) if configured() else None
        except (RuntimeError, OSError):
            embedding = None  # optional OpenCLIP is misconfigured; hashes still work
        put_reference(
            id=stem, label=stem.replace('-', ' ').title(),
            demo_url=f'/samples/{path.name}',
            kind=next((name for key, name in KIND.items() if key in stem), 'Demo'),
            sha256=result.sha256, phash=result.phash,
            embedding=embedding,
        )
        count += 1
        if log:
            log(f'Indexed {path.name}')
    return count


def auto_seed_enabled() -> bool:
    return os.getenv('RECLAIM_AUTO_SEED', '1').strip().lower() not in ('0', 'false', 'no', 'off')


def seed_if_empty() -> int:
    """At startup: if the catalog has no rows yet, load the samples automatically.

    Without this, a server started before `seed_demo` was run has nothing to
    search and the page shows every button disabled.
    """
    if not auto_seed_enabled():
        return 0
    try:
        if references():
            return 0
        return seed_demo_catalog()
    except Exception:  # never block startup because of the demo samples
        return 0
