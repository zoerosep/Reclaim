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
        assert data['results'][0]['file_name'] == 'garden-original.png'
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


def test_phash_exploratory_finds_cropped_demo(monkeypatch, tmp_path):
    """The original <=12 filter hid the cropped Garden sample at distance 18."""
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    original = SAMPLE.read_bytes()
    cropped = (SAMPLE.parent / 'garden-cropped.jpg').read_bytes()
    feats = decode_and_extract(original)
    with TestClient(app) as client:
        put_reference(id='garden-test', label='Garden Test', demo_url='/samples/garden-original.png',
                      kind='Test', sha256=feats.sha256, phash=feats.phash, embedding=None)
        close = client.post('/api/search?methods=phash&phash_scope=close',
                            content=cropped, headers={'Content-Type': 'image/jpeg'})
        assert close.status_code == 200
        assert close.json()['results'] == []
        broad = client.post('/api/search?methods=phash&phash_scope=exploratory',
                            content=cropped, headers={'Content-Type': 'image/jpeg'})
        assert broad.status_code == 200
        assert len(broad.json()['results']) == 1
        match = broad.json()['results'][0]
        assert match['phash_distance'] == 18
        assert match['phash_tier'] == 'exploratory'
        assert match['matching_methods'] == ['phash']
        assert match['exact'] is False


def test_phash_alone_detects_compressed_demo(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    compressed = (SAMPLE.parent / 'garden-compressed.jpg').read_bytes()
    f = decode_and_extract(SAMPLE.read_bytes())
    with TestClient(app) as client:
        put_reference(id='garden-test', label='Garden Test', demo_url='/samples/garden-original.png',
                      kind='Test', sha256=f.sha256, phash=f.phash, embedding=None)
        r = client.post('/api/search?methods=phash&phash_scope=close',
                        content=compressed, headers={'Content-Type': 'image/jpeg'})
        assert r.status_code == 200
        matches = r.json()['results']
        assert len(matches) == 1
        assert matches[0]['matching_methods'] == ['phash']
        assert matches[0]['phash_distance'] == 2
        assert matches[0]['phash_tier'] == 'close'
        assert matches[0]['exact'] is False


def test_invalid_phash_scope_is_rejected(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    with TestClient(app) as client:
        r = client.post('/api/search?methods=phash&phash_scope=unsafe',
                        content=SAMPLE.read_bytes(), headers={'Content-Type': 'image/png'})
        assert r.status_code == 400
