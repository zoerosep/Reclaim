
from PIL import Image, UnidentifiedImageError
from pathlib import Path


def load_image(image_path):
    try:
        with Image.open(image_path) as image:
            image.load()

            return {
                "filename": Path(image_path).name,
                "format": image.format,
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "size": Path(image_path).stat().st_size
            }

    except (UnidentifiedImageError, OSError) as error:
        return {
            "error": str(error)
        }
