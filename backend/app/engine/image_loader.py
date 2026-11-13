"""Basic facts about an uploaded image. Adapted from image-engine/engines/image_loader.py."""
from __future__ import annotations

import io

from PIL import Image, UnidentifiedImageError


def load_image(raw: bytes) -> dict:
    """Return format, size and colour mode. No filename: the API never receives one."""
    try:
        with Image.open(io.BytesIO(raw)) as image:
            return {
                'format': image.format,
                'width': image.width,
                'height': image.height,
                'mode': image.mode,
                'size': len(raw),
            }
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        return {'error': str(error)}
