
from PIL import Image
import imagehash
import requests
from io import BytesIO


def get_image_hash(image_path):
    try:
        with Image.open(image_path) as image:
            image.load()
            return {
                "phash": str(imagehash.phash(image)),
                "dhash": str(imagehash.dhash(image)),
                "ahash": str(imagehash.average_hash(image))
            }

    except (OSError, ValueError) as error:
        return {"error": str(error)}


def compare_images(first_path, second_path):
    try:
        with Image.open(first_path) as first:
            first.load()
            first_hash = imagehash.phash(first)

        with Image.open(second_path) as second:
            second.load()
            second_hash = imagehash.phash(second)

        distance = first_hash - second_hash
        total_bits = first_hash.hash.size

        similarity = 100 * (1 - distance / total_bits)

        return {
            "hash_distance": distance,
            "similarity_percentage": round(similarity, 2)
        }

    except (OSError, ValueError) as error:
        return {"error": str(error)}


def compare_with_url(local_image_path, image_url):
    try:
        if not image_url.startswith(("https://", "http://")):
            return {"error": "Invalid image URL"}

        response = requests.get(
            image_url,
            timeout=15,
            stream=True
        )
        response.raise_for_status()

        content = bytearray()

        for chunk in response.iter_content(chunk_size=8192):
            content.extend(chunk)

            if len(content) > 10 * 1024 * 1024:
                return {"error": "Image exceeds 10 MB limit"}

        with Image.open(BytesIO(content)) as remote_image:
            remote_image.load()
            remote_hash = imagehash.phash(remote_image)

        with Image.open(local_image_path) as local_image:
            local_image.load()
            local_hash = imagehash.phash(local_image)

        distance = local_hash - remote_hash
        total_bits = local_hash.hash.size

        similarity = 100 * (1 - distance / total_bits)

        return {
            "status": "completed",
            "hash_distance": distance,
            "similarity_percentage": round(similarity, 2)
        }

    except requests.exceptions.RequestException as error:
        return {"error": f"Image download failed: {error}"}

    except (OSError, ValueError) as error:
        return {"error": f"Image processing failed: {error}"}

    finally:
        if "response" in locals():
            response.close()
