"""Image-processing engine for the Reclaim API.

Adapted from Suhani Arya's standalone command-line tool in
`reclaim-fullstack-baseline/image-engine/` so the FastAPI server can call it.

What changed compared with the command-line version:
- every function receives the uploaded image as in-memory bytes (nothing is written
  to disk, matching the rest of this API);
- functions return data instead of printing a report or asking for typed input;
- matches are described by pHash distance and a close/exploratory tier, not a
  percentage (two unrelated photos score about "50% similar" as a percentage).

The original folder is left untouched and still runs on its own.
"""
from .processor import process_image

__all__ = ['process_image']
