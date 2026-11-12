"""Run once locally to populate the demo catalog with safe sample images."""
from pathlib import Path
from backend.app.features import decode_and_extract
from backend.app.store import initialize, put_reference
from backend.app.embeddings import embed_image, configured

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / 'demo_reference_images'
KIND = {
    'original': 'Original',
    'resized': 'Resized',
    'compressed': 'Compressed',
    'cropped': 'Cropped',
}


def main() -> None:
    initialize()
    for path in sorted(SAMPLES.iterdir()):
        if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        stem = path.stem
        result = decode_and_extract(path.read_bytes())
        embedding = embed_image(result.image) if configured() else None
        put_reference(
            id=stem, label=stem.replace('-', ' ').title(),
            demo_url=f'/samples/{path.name}',
            kind=next((name for key, name in KIND.items() if key in stem), 'Demo'),
            sha256=result.sha256, phash=result.phash,
            embedding=embedding,
        )
        print(f'Indexed {path.name}')
    print('Ready. This database contains only hashes/features of harmless sample images.')


if __name__ == '__main__':
    main()
