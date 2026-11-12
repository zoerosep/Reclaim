from PIL import Image
import imagehash


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
        similarity = max(
            0,
            100 * (1 - distance / len(first_hash.hash) ** 2)
        )

        return {
            "hash_distance": distance,
            "similarity_percentage": round(similarity, 2)
        }

    except (OSError, ValueError) as error:
        return {"error": str(error)}
