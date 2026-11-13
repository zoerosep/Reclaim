"""Perceptual fingerprints. Adapted from image-engine/engines/hashing.py.

pHash comes from `backend/app/features.py`, the same fingerprint the search uses.
(It was checked against the ImageHash library on every bundled test image and is
identical bit for bit.) dHash and aHash come from ImageHash when it is installed.
"""
from __future__ import annotations

from PIL import Image

try:  # optional: the search itself only needs pHash
    import imagehash
except ImportError:  # pragma: no cover - exercised only on machines without ImageHash
    imagehash = None


def get_image_hash(pixels: Image.Image, phash: str) -> dict:
    hashes = {'phash': phash, 'dhash': None, 'ahash': None}
    if imagehash is not None:
        hashes['dhash'] = str(imagehash.dhash(pixels))
        hashes['ahash'] = str(imagehash.average_hash(pixels))
    return hashes
