"""Unsplash test-collection search.

Adapted from Suhani Arya's `image-engine/services/unsplash_service.py` and
`image-engine/engines/hashing.py::compare_with_url`.

How it works: ask Unsplash for the top photos in ONE allowed category, download
each candidate, fingerprint it, and compare fingerprints with the uploaded image.
The uploaded image is never sent to Unsplash; only the category word is.

This is NOT a reverse-image search of the internet. A match is only possible when
the uploaded picture is itself one of the photos Unsplash returns for that category.

Unsplash demo keys allow 50 API requests per hour. Search results are remembered
per category for an hour and candidate fingerprints are remembered per photo, so
repeating a search costs no extra requests.
"""
from __future__ import annotations

import io
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image

try:  # optional: the local sample search works without these packages
    import requests
except ImportError:  # pragma: no cover - only on machines that have not installed requirements
    requests = None
try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

from ..features import InvalidImage, decode_and_extract, hamming

PROJECT = Path(__file__).resolve().parents[3]
# The key lives in a git-ignored .env file. The last location is where the
# command-line image engine already looks, so an existing file keeps working.
ENV_FILES = (
    PROJECT / '.env',
    PROJECT / 'backend' / '.env',
    PROJECT / 'reclaim-fullstack-baseline' / 'image-engine' / '.env',
)
if load_dotenv is not None:
    for env_file in ENV_FILES:
        if env_file.is_file():
            load_dotenv(env_file)

BASE_URL = 'https://api.unsplash.com'
ALLOWED_CATEGORIES = (
    'nature', 'landscape', 'architecture', 'flowers',
    'food', 'technology', 'portrait', 'animals',
)
# Candidate images are only ever downloaded from Unsplash's own image hosts.
ALLOWED_IMAGE_HOSTS = ('images.unsplash.com', 'plus.unsplash.com')
PER_PAGE = 10
CACHE_SECONDS = 60 * 60
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024
PHOTO_ID = re.compile(r'^[A-Za-z0-9_-]{1,64}$')
MIME_BY_FORMAT = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'WEBP': 'image/webp'}


class UnsplashError(Exception):
    """A problem the API should report to the page in plain words."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


_lock = threading.Lock()
_search_cache: dict[str, tuple[float, list[dict]]] = {}
_hash_cache: dict[str, str | None] = {}
_photos: dict[str, dict] = {}
_rate: dict[str, int | None] = {'remaining': None}


def reset_cache() -> None:
    with _lock:
        _search_cache.clear()
        _hash_cache.clear()
        _photos.clear()
        _rate['remaining'] = None


def access_key() -> str:
    return os.getenv('UNSPLASH_ACCESS_KEY', '').strip()


def status() -> dict:
    """Whether the Unsplash source can be used right now, and why not if it cannot."""
    if requests is None:
        return {'available': False,
                'reason': 'A Python package is missing. Run: python -m pip install -r backend/requirements.txt'}
    if not access_key():
        return {'available': False,
                'reason': 'No Unsplash key found. Add UNSPLASH_ACCESS_KEY=... to a file named .env in the project folder, then restart the backend.'}
    return {'available': True, 'reason': ''}


def search_photos(category: str) -> tuple[list[dict], bool]:
    """Top photos for one allowed category. Returns (photos, came_from_cache)."""
    category = category.lower().strip()
    if category not in ALLOWED_CATEGORIES:
        raise UnsplashError('Unsupported test-image category.', 400)
    availability = status()
    if not availability['available']:
        raise UnsplashError(availability['reason'], 503)

    with _lock:
        cached = _search_cache.get(category)
        if cached and time.monotonic() - cached[0] < CACHE_SECONDS:
            return cached[1], True

    try:
        response = requests.get(
            f'{BASE_URL}/search/photos',
            headers={'Authorization': f'Client-ID {access_key()}', 'Accept-Version': 'v1'},
            params={'query': category, 'page': 1, 'per_page': PER_PAGE, 'content_filter': 'high'},
            timeout=20,
        )
        remaining = response.headers.get('X-Ratelimit-Remaining')
        if remaining is not None and str(remaining).isdigit():
            _rate['remaining'] = int(remaining)
        if response.status_code == 401:
            raise UnsplashError('Unsplash rejected the access key. Check UNSPLASH_ACCESS_KEY in your .env file.', 503)
        if response.status_code in (403, 429):
            raise UnsplashError("Unsplash's hourly request limit was reached. Wait a while, then try again.", 503)
        response.raise_for_status()
        data = response.json()
    except UnsplashError:
        raise
    except requests.exceptions.Timeout as error:
        raise UnsplashError('Unsplash took too long to answer. Try again.', 504) from error
    except (requests.exceptions.RequestException, ValueError) as error:
        raise UnsplashError('Unsplash could not be reached. Check your internet connection.', 502) from error

    photos = []
    for photo in data.get('results', []):
        try:
            photos.append({
                'id': str(photo['id']),
                'description': (photo.get('alt_description') or photo.get('description')
                                or 'Unsplash photograph'),
                'image_url': photo['urls']['regular'],
                'thumbnail_url': photo['urls']['small'],
                'photo_page': photo['links']['html'],
                'photographer': photo['user']['name'],
                'photographer_page': photo['user']['links']['html'],
            })
        except (KeyError, TypeError):
            continue  # skip an entry that is missing the fields we need
    photos = [photo for photo in photos if PHOTO_ID.match(photo['id'])]

    with _lock:
        _search_cache[category] = (time.monotonic(), photos)
        for photo in photos:
            _photos[photo['id']] = photo
    return photos, False


def _allowed_image_url(url: str) -> bool:
    parts = urlsplit(url or '')
    return parts.scheme == 'https' and parts.hostname in ALLOWED_IMAGE_HOSTS


def _download(url: str) -> bytes:
    if not _allowed_image_url(url):
        raise UnsplashError('Refused to download an image from an unexpected address.', 502)
    response = None
    try:
        response = requests.get(url, timeout=15, stream=True)
        response.raise_for_status()
        content = bytearray()
        for chunk in response.iter_content(chunk_size=8192):
            content.extend(chunk)
            if len(content) > MAX_DOWNLOAD_BYTES:
                raise UnsplashError('An Unsplash image was larger than the 10 MB limit.', 502)
        return bytes(content)
    except requests.exceptions.RequestException as error:
        raise UnsplashError('An Unsplash image could not be downloaded.', 502) from error
    finally:
        if response is not None:
            response.close()


def _candidate_hash(photo: dict) -> str | None:
    """pHash of one Unsplash candidate, or None if it could not be fetched or decoded."""
    with _lock:
        if photo['id'] in _hash_cache:
            return _hash_cache[photo['id']]
    try:
        value = decode_and_extract(_download(photo['image_url'])).phash
    except (UnsplashError, InvalidImage):
        return None  # not remembered, so a later search can try this photo again
    with _lock:
        _hash_cache[photo['id']] = value
    return value


def compare_with_category(query_phash: str, category: str) -> dict:
    """Compare the upload's fingerprint with every candidate in a category."""
    photos, from_cache = search_photos(category)
    with ThreadPoolExecutor(max_workers=5) as pool:
        hashes = list(pool.map(_candidate_hash, photos))
    candidates = [
        {**photo, 'phash_distance': hamming(query_phash, value)}
        for photo, value in zip(photos, hashes) if value is not None
    ]
    candidates.sort(key=lambda item: item['phash_distance'])
    return {
        'candidates': candidates,
        'found': len(photos),
        'compared': len(candidates),
        'from_cache': from_cache,
        'requests_remaining': _rate['remaining'],
    }


def fetch_thumbnail(photo_id: str) -> tuple[bytes, str]:
    """Small preview of a photo from a recent search, for saving to the local vault.

    Only photo IDs returned by a recent search are accepted, so this cannot be used
    to make the server fetch an arbitrary address.
    """
    if not PHOTO_ID.match(photo_id or ''):
        raise UnsplashError('Unknown photo.', 404)
    with _lock:
        photo = _photos.get(photo_id)
    if photo is None:
        raise UnsplashError('That photo is not in a recent search. Run the search again, then save it.', 404)
    raw = _download(photo['thumbnail_url'])
    try:
        with Image.open(io.BytesIO(raw)) as image:
            mime = MIME_BY_FORMAT.get(image.format or '')
    except (OSError, Image.DecompressionBombError):
        mime = None
    if mime is None:
        raise UnsplashError('The Unsplash preview was not a PNG, JPEG or WebP image.', 502)
    return raw, mime
