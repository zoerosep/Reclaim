
import os
import requests
from dotenv import load_dotenv

load_dotenv()

ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")

BASE_URL = "https://api.unsplash.com"


def search_photos(query, page=1, per_page=10):

    if not ACCESS_KEY:
        return {
            "status": "failed",
            "error": "Unsplash API key is missing"
        }

    allowed_queries = {
        "nature",
        "landscape",
        "architecture",
        "flowers",
        "food",
        "technology",
        "portrait",
        "animals"
    }

    query = query.lower().strip()

    if query not in allowed_queries:
        return {
            "status": "failed",
            "error": "Unsupported test-image category"
        }

    try:
        response = requests.get(
            f"{BASE_URL}/search/photos",
            headers={
                "Authorization": f"Client-ID {ACCESS_KEY}",
                "Accept-Version": "v1"
            },
            params={
                "query": query,
                "page": page,
                "per_page": min(per_page, 30),
                "content_filter": "high"
            },
            timeout=20
        )

        response.raise_for_status()
        data = response.json()

        photos = []

        for photo in data.get("results", []):
            photos.append({
                "id": photo["id"],
                "description": (
                    photo.get("alt_description")
                    or photo.get("description")
                    or "Unsplash photograph"
                ),
                "width": photo["width"],
                "height": photo["height"],
                "image_url": photo["urls"]["regular"],
                "thumbnail_url": photo["urls"]["small"],
                "photo_page": photo["links"]["html"],
                "photographer": photo["user"]["name"],
                "photographer_page": photo["user"]["links"]["html"]
            })

        return {
            "status": "completed",
            "total_results": data.get("total", 0),
            "results": photos
        }

    except requests.exceptions.Timeout:
        return {
            "status": "failed",
            "error": "Unsplash request timed out"
        }

    except requests.exceptions.HTTPError as error:
        return {
            "status": "failed",
            "error": f"Unsplash API error: {error}"
        }

    except requests.exceptions.RequestException as error:
        return {
            "status": "failed",
            "error": str(error)
        }
