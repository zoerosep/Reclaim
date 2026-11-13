from fastapi.testclient import TestClient

from backend.app.main import app


def test_empty_catalog_is_seeded_automatically_on_startup(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    monkeypatch.setenv('RECLAIM_AUTO_SEED', '1')
    with TestClient(app) as client:
        health = client.get('/api/health').json()
        assert health['reference_count'] == 8
        ids = [row['id'] for row in client.get('/api/catalog').json()]
        assert 'garden-original' in ids and 'coast-original' in ids


def test_auto_seed_can_be_switched_off(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    monkeypatch.setenv('RECLAIM_AUTO_SEED', '0')
    with TestClient(app) as client:
        assert client.get('/api/health').json()['reference_count'] == 0


def test_seed_script_still_works(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    from backend.scripts import seed_demo
    seed_demo.main()
    assert 'Indexed garden-original.png' in capsys.readouterr().out
