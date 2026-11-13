"""Image metadata (EXIF and similar). Adapted from image-engine/engines/metadata.py.

ExifTool is used when it is installed. The image is piped to it through standard
input, so the upload is still never written to disk. Without ExifTool, Pillow reads
the basic EXIF fields instead so the feature keeps working on every machine.

Metadata can include a camera model, timestamps and GPS location. It is returned
only to the person who uploaded the image and is not stored by the API.
"""
from __future__ import annotations

import io
import json
import shutil
import subprocess

from PIL import ExifTags, Image, UnidentifiedImageError

# These describe the temporary pipe ExifTool read from, not the image itself.
HIDDEN_KEYS = ('SourceFile',)
HIDDEN_GROUPS = ('System:',)
MAX_TAGS = 250
MAX_VALUE_CHARS = 300


def exiftool_path() -> str | None:
    return shutil.which('exiftool')


def reader_name() -> str:
    return 'exiftool' if exiftool_path() else 'pillow'


def get_metadata(raw: bytes) -> dict:
    tool = exiftool_path()
    if tool:
        result = _read_with_exiftool(tool, raw)
        if 'error' not in result:
            return result
        fallback = _read_with_pillow(raw)
        fallback['note'] = f"ExifTool could not read this image ({result['error']}), so basic metadata is shown."
        return fallback
    fallback = _read_with_pillow(raw)
    fallback['note'] = 'ExifTool is not installed on this computer, so only basic metadata is shown.'
    return fallback


def _tidy(value):
    """Make a metadata value safe and short enough to send as JSON."""
    if isinstance(value, bytes):
        return f'(binary data, {len(value)} bytes)'
    if isinstance(value, (bool, int)):
        return value
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, (tuple, list)):
        return [_tidy(item) for item in list(value)[:16]]
    if isinstance(value, dict):
        return {str(key): _tidy(item) for key, item in list(value.items())[:16]}
    try:  # Pillow rationals such as exposure time
        return round(float(value), 6)
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    text = str(value).replace('\x00', '').strip()
    return text if len(text) <= MAX_VALUE_CHARS else text[:MAX_VALUE_CHARS] + '…'


def _read_with_exiftool(tool: str, raw: bytes) -> dict:
    try:
        result = subprocess.run(
            [tool, '-json', '-G1', '-'],  # "-" = read the image from standard input
            input=raw, capture_output=True, timeout=20, check=True,
        )
        rows = json.loads(result.stdout.decode('utf-8', errors='replace'))
    except FileNotFoundError:
        return {'error': 'ExifTool was not found'}
    except subprocess.TimeoutExpired:
        return {'error': 'Metadata extraction timed out'}
    except (subprocess.CalledProcessError, json.JSONDecodeError, OSError) as error:
        return {'error': str(error)}
    if not rows or not isinstance(rows[0], dict):
        return {'metadata_available': False, 'reader': 'exiftool', 'metadata': {}}
    cleaned = {
        key: _tidy(value) for key, value in list(rows[0].items())[:MAX_TAGS]
        if key not in HIDDEN_KEYS and not key.startswith(HIDDEN_GROUPS)
    }
    return {'metadata_available': bool(cleaned), 'reader': 'exiftool', 'metadata': cleaned}


def _read_with_pillow(raw: bytes) -> dict:
    data: dict = {}
    try:
        with Image.open(io.BytesIO(raw)) as image:
            data['File:FileType'] = image.format
            data['File:ImageWidth'] = image.width
            data['File:ImageHeight'] = image.height
            exif = image.getexif()
            for tag_id, value in exif.items():
                name = ExifTags.TAGS.get(tag_id, f'Tag{tag_id}')
                if name in ('ExifOffset', 'GPSInfo'):  # pointers to the sections read below
                    continue
                data[f'IFD0:{name}'] = _tidy(value)
            for tag_id, value in exif.get_ifd(ExifTags.IFD.Exif).items():
                data[f"ExifIFD:{ExifTags.TAGS.get(tag_id, f'Tag{tag_id}')}"] = _tidy(value)
            for tag_id, value in exif.get_ifd(ExifTags.IFD.GPSInfo).items():
                data[f"GPS:{ExifTags.GPSTAGS.get(tag_id, f'Tag{tag_id}')}"] = _tidy(value)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        return {'metadata_available': False, 'reader': 'pillow', 'metadata': {}, 'error': str(error)}
    limited = dict(list(data.items())[:MAX_TAGS])
    return {'metadata_available': len(limited) > 3, 'reader': 'pillow', 'metadata': limited}
