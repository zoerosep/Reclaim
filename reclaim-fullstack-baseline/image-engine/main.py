from engines.image_loader import load_image
from engines.metadata import get_metadata
from engines.image_processing import analyse_image
from engines.hashing import get_image_hash


def process_image(image_path):
    image_info = load_image(image_path)

    if "error" in image_info:
        return {
            "status": "failed",
            "error": image_info["error"]
        }

    return {
        "status": "completed",
        "image_info": image_info,
        "metadata": get_metadata(image_path),
        "image_analysis": analyse_image(image_path),
        "hashes": get_image_hash(image_path)
    }
