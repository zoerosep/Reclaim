"""Unsplash test-collection search, exercised with a simulated Unsplash (no network)."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.engine import unsplash_service
from backend.app.features import decode_and_extract
from backend.app.main import app

SAMPLES = Path(__file__).resolve().parents[1] / 'demo_reference_images'
IMAGE_FILES = {'gardenAAA': 'garden-original.png', 'coastBBB': 'coast-original.png', 'shapesCCC': 'shapes-original.png'}


class FakeResponse:
    def __init__(self, status=200, payload=None, body=b'', headers=None):
        self.status_code, self._payload, self._body = status, payload, body
        self.headers = headers or {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise unsplash_service.requests.exceptions.HTTPError(f'HTTP {self.status_code}')

    def iter_content(self, chunk_size=8192):
        yield self._body

    def close(self):
        pass


class FakeUnsplash:
    """Stands in for requests.get: one search API plus an image host."""

    def __init__(self, extra_photos=(), api_status=200):
        self.calls, self.extra_photos, self.api_status = [], list(extra_photos), api_status

    def photo(self, photo_id, regular=None):
        return {
            'id': photo_id, 'alt_description': f'{photo_id} test photo', 'width': 760, 'height': 520,
            'urls': {'regular': regular or f'https://images.unsplash.com/{photo_id}?w=1080',
                     'small': f'https://images.unsplash.com/{photo_id}?w=400'},
            'links': {'html': f'https://unsplash.com/photos/{photo_id}'},
            'user': {'name': 'Test Photographer', 'links': {'html': 'https://unsplash.com/@test'}},
        }

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        assert 'data' not in kwargs and 'files' not in kwargs and 'json' not in kwargs  # upload never leaves
        if url.startswith('https://api.unsplash.com/search/photos'):
            if self.api_status != 200:
                return FakeResponse(self.api_status, payload={'errors': ['Rate Limit Exceeded']})
            photos = [self.photo(photo_id) for photo_id in IMAGE_FILES] + self.extra_photos
            return FakeResponse(payload={'total': len(photos), 'results': photos},
                                headers={'X-Ratelimit-Remaining': '49'})
        assert url.startswith('https://images.unsplash.com/'), f'unexpected download: {url}'
        photo_id = url.split('/')[-1].split('?')[0]
        return FakeResponse(body=(SAMPLES / IMAGE_FILES[photo_id]).read_bytes())

    @property
    def api_calls(self):
        return [call for call in self.calls if call[0].startswith('https://api.unsplash.com')]


@pytest.fixture
def unsplash(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    monkeypatch.setenv('UNSPLASH_ACCESS_KEY', 'test-key-not-real')
    fake = FakeUnsplash()
    monkeypatch.setattr(unsplash_service.requests, 'get', fake.get)
    return fake


def post(client, name, query, content_type='image/jpeg'):
    return client.post(f'/api/search/unsplash?{query}', content=(SAMPLES / name).read_bytes(),
                       headers={'Content-Type': content_type})


def test_health_reports_unsplash_unavailable_without_key(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    with TestClient(app) as client:
        health = client.get('/api/health').json()
        assert health['sources'] == ['local_catalog']
        assert health['unsplash']['available'] is False and '.env' in health['unsplash']['reason']
        assert 'portrait' in health['unsplash']['categories']
        response = post(client, 'garden-compressed.jpg', 'category=flowers')
        assert response.status_code == 503 and '.env' in response.json()['detail']


def test_health_reports_unsplash_available_with_key(unsplash):
    with TestClient(app) as client:
        health = client.get('/api/health').json()
        assert health['sources'] == ['local_catalog', 'unsplash']
        assert 'test-key-not-real' not in str(health)  # the key is never echoed


def test_compressed_copy_is_found_as_close_match(unsplash):
    raw = (SAMPLES / 'garden-compressed.jpg').read_bytes()
    with TestClient(app) as client:
        response = post(client, 'garden-compressed.jpg', 'category=flowers&phash_scope=close')
    assert response.status_code == 200
    data = response.json()
    assert data['source'] == 'unsplash' and data['category'] == 'flowers'
    assert data['checked_references'] == 3 and data['requests_remaining'] == 49
    assert [row['id'] for row in data['results']] == ['unsplash-gardenAAA']
    match = data['results'][0]
    assert match['phash_distance'] == 2 and match['phash_tier'] == 'close'
    assert match['matching_methods'] == ['phash'] and match['exact'] is False
    assert match['source_url'] == 'https://unsplash.com/photos/gardenAAA'
    assert match['thumbnail_url'].startswith('https://images.unsplash.com/')
    assert match['file_name'] == 'unsplash-gardenAAA.jpg'
    assert decode_and_extract(raw).phash not in response.text  # upload fingerprint not returned
    api_url, api_kwargs = unsplash.api_calls[0]
    assert api_kwargs['params']['query'] == 'flowers'
    assert api_kwargs['headers']['Authorization'] == 'Client-ID test-key-not-real'


def test_scope_controls_which_candidates_are_listed(unsplash):
    with TestClient(app) as client:
        close = post(client, 'garden-cropped.jpg', 'category=flowers&phash_scope=close').json()
        broad = post(client, 'garden-cropped.jpg', 'category=flowers&phash_scope=exploratory').json()
    assert close['results'] == []
    assert [(row['photo_id'], row['phash_distance'], row['phash_tier']) for row in broad['results']] == [
        ('gardenAAA', 18, 'exploratory')]


def test_repeat_search_uses_cache_not_another_api_request(unsplash):
    with TestClient(app) as client:
        first = post(client, 'garden-compressed.jpg', 'category=flowers').json()
        downloads_after_first = len(unsplash.calls)
        second = post(client, 'coast-compressed.jpg', 'category=flowers').json()
    assert first['from_cache'] is False and second['from_cache'] is True
    assert len(unsplash.api_calls) == 1
    assert len(unsplash.calls) == downloads_after_first  # candidate fingerprints were remembered
    assert [row['photo_id'] for row in second['results']] == ['coastBBB']


def test_bad_category_and_scope_are_rejected(unsplash):
    with TestClient(app) as client:
        assert post(client, 'garden-original.png', 'category=selfie', 'image/png').status_code == 400
        assert post(client, 'garden-original.png', 'category=', 'image/png').status_code == 400
        assert post(client, 'garden-original.png', 'category=food&phash_scope=x', 'image/png').status_code == 400
    assert unsplash.calls == []


def test_rate_limit_is_explained(monkeypatch, unsplash):
    unsplash.api_status = 403
    with TestClient(app) as client:
        response = post(client, 'garden-original.png', 'category=food', 'image/png')
    assert response.status_code == 503 and 'hourly request limit' in response.json()['detail']


def test_candidates_on_other_hosts_are_never_downloaded(monkeypatch, unsplash):
    unsplash.extra_photos = [unsplash.photo('evilDDD', regular='https://example.com/evil.jpg'),
                             unsplash.photo('plainEEE', regular='http://images.unsplash.com/plainEEE')]
    with TestClient(app) as client:
        data = post(client, 'garden-original.png', 'category=nature', 'image/png').json()
    assert data['checked_references'] == 3  # the two unexpected addresses were skipped
    assert all(url.startswith(('https://api.unsplash.com', 'https://images.unsplash.com/')) for url, _ in unsplash.calls)


def test_thumbnail_only_for_photos_from_a_recent_search(unsplash):
    with TestClient(app) as client:
        assert client.get('/api/unsplash/thumbnail/gardenAAA').status_code == 404  # no search yet
        post(client, 'garden-original.png', 'category=flowers', 'image/png')
        ok = client.get('/api/unsplash/thumbnail/gardenAAA')
        assert ok.status_code == 200 and ok.headers['content-type'] == 'image/png'
        assert ok.content == (SAMPLES / 'garden-original.png').read_bytes()
        assert client.get('/api/unsplash/thumbnail/neverSeen').status_code == 404
        assert client.get('/api/unsplash/thumbnail/bad id!').status_code == 404
