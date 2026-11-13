"""Rebuild the demo catalog from the safe sample images.

The server now does this automatically the first time it starts with an empty
catalog. Run this by hand only to refresh the catalog, for example after changing
the sample images or configuring OpenCLIP:

    python -m backend.scripts.seed_demo        (from the project folder)
"""
from backend.app.seed import seed_demo_catalog


def main() -> None:
    seed_demo_catalog(log=print)
    print('Ready. This database contains only hashes/features of harmless sample images.')


if __name__ == '__main__':
    main()
