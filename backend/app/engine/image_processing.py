"""Brightness and contrast. Adapted from image-engine/engines/image_processing.py.

The command-line version uses OpenCV, which needs a file on disk and is a large
install for two numbers. This computes the same grayscale mean and standard
deviation from Pillow's pixel histogram, so it works on in-memory pixels and adds
no dependency.
"""
from __future__ import annotations

import math

from PIL import Image


def analyse_image(pixels: Image.Image) -> dict:
    histogram = pixels.convert('L').histogram()  # 256 counts, one per gray level
    total = sum(histogram)
    if not total:
        return {'error': 'Unable to read image'}
    mean = sum(level * count for level, count in enumerate(histogram)) / total
    variance = sum(count * (level - mean) ** 2 for level, count in enumerate(histogram)) / total
    return {
        'width': pixels.width,
        'height': pixels.height,
        'channels': len(pixels.getbands()),
        'average_brightness': round(mean, 2),
        'average_contrast': round(math.sqrt(variance), 2),
        'file_readable': True,
    }
