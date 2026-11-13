"""In-memory feature extraction from image bytes. Does not write source uploads to disk."""
from __future__ import annotations

import hashlib
import io
import warnings
from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from scipy.fft import dctn

# Limit decompression bombs; uploaded-image size is separately limited in the API.
# 50 megapixels covers full-size camera and stock photos (many are 24-45 MP).
Image.MAX_IMAGE_PIXELS = 50_000_000
SUPPORTED_FORMATS = {'PNG', 'JPEG', 'WEBP'}


class InvalidImage(ValueError):
    pass


@dataclass
class ImageFeatures:
    sha256: str
    phash: str
    width: int
    height: int
    had_exif: bool
    image: Image.Image  # PIL RGB pixels only; NOT persisted in SQLite


def decode_and_extract(raw: bytes) -> ImageFeatures:
    if not raw:
        raise InvalidImage('No image was supplied.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as source:
                if source.format not in SUPPORTED_FORMATS:
                    raise InvalidImage('Use PNG, JPEG, or WebP images for this demo.')
                if source.width * source.height > Image.MAX_IMAGE_PIXELS:
                    raise InvalidImage('This image has too many pixels for the demo.')
                had_exif = bool(source.getexif())
                upright = ImageOps.exif_transpose(source)
                pixels = upright.convert('RGB')
                pixels.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImage('The image could not be safely decoded.') from exc
    return ImageFeatures(
        sha256=hashlib.sha256(raw).hexdigest(),
        phash=perceptual_hash(pixels),
        width=pixels.width,
        height=pixels.height,
        had_exif=had_exif,
        image=pixels,
    )


def perceptual_hash(image: Image.Image, hash_size: int = 8, highfreq_factor: int = 4) -> str:
    """64-bit DCT pHash, a small self-contained equivalent of ImageHash's approach.

    Pixel normalizing via Pillow means resizing/compression often remains similar.
    Crops and overlays can still fail. DO NOT interpret distance as probability.
    """
    side = hash_size * highfreq_factor
    resized = image.convert('L').resize((side, side), Image.Resampling.LANCZOS)
    matrix = np.asarray(resized, dtype=np.float64)
    dct = dctn(matrix, type=2, norm='ortho')
    low = dct[:hash_size, :hash_size]
    threshold = np.median(low.flatten()[1:])
    bits = (low > threshold).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return f'{value:016x}'


def hamming(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()


def cosine_similarity(first: list[float], second: list[float]) -> float:
    a, b = np.asarray(first, dtype=np.float64), np.asarray(second, dtype=np.float64)
    if a.size != b.size or not a.size:
        raise ValueError('Embedding vectors must have equal, nonzero dimensions.')
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0
