from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.features import decode_and_extract
from backend.app.main import app
from backend.app.store import put_reference

SAMPLE = Path(__file__).resolve().parents[1] / 'demo_reference_images' / 'garden-original.png'


def test_local_search_does_not_persist_query(monkeypatch, tmp_path):
    db = tmp_path / 'refs.sqlite3'
    monkeypatch.setenv('RECLAIM_DB_PATH', str(db))
    raw = SAMPLE.read_bytes()
    features = decode_and_extract(raw)
    with TestClient(app) as client:
        put_reference(id='garden-test', label='Garden Test', demo_url='/samples/garden-original.png',
                      kind='Test', sha256=features.sha256, phash=features.phash, embedding=None)
        response = client.post('/api/search?methods=sha256,phash',
                               content=raw, headers={'Content-Type': 'image/png'})
        assert response.status_code == 200
        data = response.json()
        assert data['results'][0]['id'] == 'garden-test'
        assert data['results'][0]['exact'] is True
        assert data['results'][0]['phash_distance'] == 0
        assert features.sha256 not in str(data['results'])  # never reveal fingerprint values
        assert 'query_image' not in str(data)
        assert response.headers['Cache-Control'] == 'no-store'
    assert sorted(p.name for p in tmp_path.iterdir()) == [db.name]


def test_invalid_file_rejected(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    with TestClient(app) as client:
        r = client.post('/api/search', content=b'not an image', headers={'Content-Type': 'image/png'})
        assert r.status_code == 422
        r2 = client.post('/api/search', content=b'a' * (8*1024*1024 + 1),
                         headers={'Content-Type': 'image/png'})
        assert r2.status_code == 413
