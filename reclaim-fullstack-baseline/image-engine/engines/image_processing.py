import cv2
import numpy as np


def analyse_image(image_path):
    image = cv2.imread(str(image_path))

    if image is None:
        return {"error": "Unable to read image"}

    height, width, channels = image.shape

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    return {
        "width": width,
        "height": height,
        "channels": channels,
        "average_brightness": round(float(np.mean(gray)), 2),
        "average_contrast": round(float(np.std(gray)), 2),
        "file_readable": True
    }
