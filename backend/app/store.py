"""SQLite stores ONLY indexed fingerprints for preapproved demo references."""
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
DEFAULT_DB = PROJECT / 'backend' / 'data' / 'reference_catalog.sqlite3'


def db_path() -> Path:
    return Path(os.environ.get('RECLAIM_DB_PATH', str(DEFAULT_DB))).resolve()


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    return con


def initialize() -> None:
    with connect() as con:
        con.execute('''CREATE TABLE IF NOT EXISTS reference_images (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            demo_url TEXT NOT NULL,
            kind TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            phash TEXT NOT NULL,
            embedding_json TEXT
        )''')


def put_reference(*, id: str, label: str, demo_url: str, kind: str,
                  sha256: str, phash: str, embedding: list[float] | None) -> None:
    with connect() as con:
        con.execute('''INSERT OR REPLACE INTO reference_images
            (id,label,demo_url,kind,sha256,phash,embedding_json)
            VALUES (?,?,?,?,?,?,?)''',
            (id, label, demo_url, kind, sha256, phash,
             json.dumps(embedding) if embedding is not None else None))


def references() -> list[dict]:
    with connect() as con:
        rows = con.execute('SELECT * FROM reference_images ORDER BY id').fetchall()
        return [dict(row) for row in rows]
