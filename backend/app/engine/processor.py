"""Run every engine step on one upload. Adapted from image-engine/main.py::process_image."""
from __future__ import annotations

from ..features import ImageFeatures
from .hashing import get_image_hash
from .image_loader import load_image
from .image_processing import analyse_image
from .metadata import get_metadata


def process_image(raw: bytes, features: ImageFeatures) -> dict:
    """`features` is the already safely-decoded image from `decode_and_extract`."""
    image_info = load_image(raw)
    if 'error' in image_info:
        return {'status': 'failed', 'error': image_info['error']}
    return {
        'status': 'completed',
        'image_info': image_info,
        'metadata': get_metadata(raw),
        'image_analysis': analyse_image(features.image),
        'hashes': get_image_hash(features.image, features.phash),
    }
