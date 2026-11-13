# Reclaim research tool map

This is a **design map**, not a list of services the application secretly invokes.

## What each tool actually contributes

| Tool | Category | How it could fit | In this baseline? |
| --- | --- | --- | --- |
| Pillow (Python Imaging Library fork) | Open-source Python imaging | Decode, normalize orientation, resize, produce pixel input for feature extraction | **Yes, active** |
| SHA-256 (`hashlib`) | Python standard library | Identify exact byte-for-byte duplicate files | **Yes, active** |
| pHash (NumPy + SciPy DCT) | Open-source algorithm/components | Identify near-duplicate visual content | **Yes, active** |
| OpenCLIP (`open_clip_torch`) | Open-source image encoder; weights have separate licensing | Generate local image embeddings from compatible pretrained weights | **Optional adapter**, off unless installed and locally configured |
| SQLite (`sqlite3`) | Local database | Save authorized comparison *fingerprints* and make a local reference index | **Yes, active** |
| ExifTool | Metadata inspector | Examine EXIF/XMP/IPTC of authorized files; GPS and device metadata are highly sensitive | **Optional, `/api/analyze` only**: used when installed, image piped in memory; Pillow reads basic EXIF otherwise |
| ImageMagick | Image-processing CLI | Batch resize/conversion/normalization, generate safe test variants | **Development only**; not executed on uploads |
| Maltego | Proprietary licensed OSINT/graph platform with free tier | Analyze relationships between authorized URLs, accounts, domains, and manually collected leads | **Future, manual/approved workflows only** |
| Autopsy | Open-source forensic examination tool | Examine forensic copies of disks/devices in qualified, authorized investigations | **Separate forensic workflow** |

**None of the listed forensic or metadata tools is an internet-wide reverse-image index.**

## How they connect to the diagram

```
                           image input (RAW request)
                                     |
                           Pillow preprocessing
                                     |
                              feature extraction
                          /            |             \
                  SHA-256 hash      pHash       OpenCLIP vector
                                                   (optional)
                          \            |             /
                   authorized local comparison
                          SQLite indexed demo references
                                     |
                         normalized candidate results
                                     |
                      React UI: view / mark for review

    Later, separate approved sources:
      OSINT finding import -> standardized result object -> review UI
      ExifTool/Autopsy -> separately authorized forensic evidence workflow
```

**SQL is the index**, not a fourth search engine. **OSINT tools are a separate acquisition/investigation lane**, not a replacement for pHash or embedding comparison.

## Metadata safety and image lifecycle

- `ImageOps.exif_transpose()` normalizes orientation and Pillow converts to RGB in memory. It does not preserve GPS fields in the search response.
- This API accepts raw image request bytes via `Request.stream()` to avoid multipart upload temporary spooling in this application. It does *not* guarantee erasure of memory, operating system buffers, browser caches, or networks.
- ExifTool is **not** run during a search. `POST /api/analyze` runs it only when it is installed, and pipes the image to it through standard input, so the upload is still never written to a temporary file. That endpoint returns the metadata to the person who uploaded the image; `/api/search` still returns none.
- ImageMagick is **not** run automatically on query images for the same reason.
- Different devices, file copies, and platforms may strip or modify metadata. EXIF is not proof of who uploaded an image.
- Avoid external services and real case material in this prototype. Do not store sensitive metadata, source images, hashes, or real reference vectors in GitHub.

## Safe developer commands (on harmless demo samples ONLY)

```bash
# If installed, ExifTool examines local reference metadata (could include private fields).
exiftool -json backend/demo_reference_images/garden-original.png

# If installed, ImageMagick creates a transformed demo copy.
# Command varies across versions; ImageMagick 7 commonly uses `magick`.
magick backend/demo_reference_images/garden-original.png -resize 60% /tmp/garden-small.png
```

Do not use ImageMagick on actual evidence without preserving a separate pristine original and documenting all transformations. Likewise, Autopsy and Maltego require authorization and careful investigative procedures.

## Helpful references

- Pillow: https://pillow.readthedocs.io/en/stable/
- ExifTool: https://exiftool.org/
- ImageMagick: https://imagemagick.org/
- Autopsy: https://www.autopsy.com/
- Maltego: https://docs.maltego.com/
- OpenCLIP: https://github.com/mlfoundations/open_clip
- FastAPI: https://fastapi.tiangolo.com/
