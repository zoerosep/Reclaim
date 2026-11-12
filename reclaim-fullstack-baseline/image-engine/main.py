
from engines.image_loader import load_image
from engines.metadata import get_metadata
from engines.image_processing import analyse_image
from engines.hashing import get_image_hash, compare_with_url
from services.unsplash_service import search_photos


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



def test_unsplash_similarity(image_path, query):

    results = search_photos(query, per_page=10)

    if results["status"] != "completed":
        print("Unsplash error:", results["error"])
        return

    photos = results["results"]

    if not photos:
        print("No Unsplash images found")
        return

    comparison_results = []

    print(f"\nComparing {len(photos)} Unsplash images...")

    for photo in photos:

        result = compare_with_url(
            image_path,
            photo["image_url"]
        )

        if result.get("status") == "completed":

            comparison_results.append({
                "description": photo["description"],
                "photographer": photo["photographer"],
                "image_url": photo["image_url"],
                "photo_page": photo["photo_page"],
                "photographer_page": photo["photographer_page"],
                "hash_distance": int(result["hash_distance"]),
                "similarity": float(
                    result["similarity_percentage"]
                )
            })

    if not comparison_results:
        print("No images could be compared.")
        return

    comparison_results.sort(
        key=lambda item: item["similarity"],
        reverse=True
    )

    print("\n" + "=" * 60)
    print("          RECLAIM IMAGE SIMILARITY REPORT")
    print("=" * 60)

    for rank, item in enumerate(comparison_results, start=1):

        print(f"\nRANK: #{rank}")
        print("-" * 60)

        print("Description:", item["description"])
        print("Photographer:", item["photographer"])
        print("Similarity:", f'{item["similarity"]:.2f}%')
        print("Hash distance:", item["hash_distance"])
        print("Image URL:", item["image_url"])
        print("Photo page:", item["photo_page"])
        print("Photographer profile:", item["photographer_page"])

    best_match = comparison_results[0]

    print("\n" + "=" * 60)
    print("                 TOP RESULT")
    print("=" * 60)

    print("Image:", best_match["description"])
    print("Photographer:", best_match["photographer"])
    print("Similarity:", f'{best_match["similarity"]:.2f}%')
    print("Image URL:", best_match["image_url"])
    print("Original page:", best_match["photo_page"])

    print("\n" + "=" * 60)


if __name__ == "__main__":

    image_path = "test_images/trait.jpg"

    category = input(
        "Enter image category (portrait, nature, landscape, etc.): "
    ).strip().lower()

    print("\nIMAGE PROCESSING")

    image_result = process_image(image_path)
    print(image_result)

    if image_result["status"] == "completed":

        print("\nUNSPLASH SIMILARITY")

        test_unsplash_similarity(
            image_path,
            category
        )
