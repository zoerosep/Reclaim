"""Inspect harmless demo pHash distances and the local reference catalog.

Run from project root: python -m backend.scripts.check_phash
This does not contact external services or accept sensitive images.
"""
from pathlib import Path
from backend.app.features import decode_and_extract, hamming
from backend.app.store import initialize, references

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / 'demo_reference_images'
NAMES = ('garden-original.png', 'garden-resized.jpg', 'garden-compressed.jpg', 'garden-cropped.jpg')


def main() -> None:
    found = {name: decode_and_extract((SAMPLES / name).read_bytes()) for name in NAMES}
    base = found[NAMES[0]]
    print('Demo pHash distances (64-bit Hamming; lower = more similar):')
    for name in NAMES:
        distance = hamming(base.phash, found[name].phash)
        print(f'  {name:26s}: {distance:2d} / 64')
    initialize()
    indexed = {ref['id']: ref for ref in references()}
    print(f'\nSQLite catalog has {len(indexed)} reference rows.')
    stale = []
    missing = []
    for name in NAMES:
        stem = Path(name).stem
        if stem not in indexed:
            missing.append(name)
        elif indexed[stem]['phash'] != found[name].phash:
            stale.append(name)
    if missing or stale:
        print('Missing:', missing or 'none')
        print('Stale hashes:', stale or 'none')
        print('Rebuild catalog: python -m backend.scripts.seed_demo')
    else:
        print('Garden pHash references match the local sample files.')
    print('Close: <=12. Exploratory: <=20 (may include false positives).')


if __name__ == '__main__':
    main()
