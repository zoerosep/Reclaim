
import subprocess
import json


def get_metadata(image_path):
    try:
        result = subprocess.run(
            [
                "exiftool",
                "-json",
                "-G1",
                image_path
            ],
            capture_output=True,
            text=True,
            timeout=20,
            check=True
        )

        metadata = json.loads(result.stdout)

        if not metadata:
            return {"metadata_available": False, "metadata": {}}

        data = metadata[0]

        return {
            "metadata_available": len(data) > 1,
            "metadata": data
        }

    except FileNotFoundError:
        return {"error": "ExifTool was not found"}

    except subprocess.TimeoutExpired:
        return {"error": "Metadata extraction timed out"}

    except (subprocess.CalledProcessError, json.JSONDecodeError) as error:
        return {"error": str(error)}
