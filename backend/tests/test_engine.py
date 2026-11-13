import json
import subprocess
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.engine import metadata
from backend.app.features import decode_and_extract
from backend.app.main import app

SAMPLES = Path(__file__).resolve().parents[1] / 'demo_reference_images'
GARDEN = SAMPLES / 'garden-original.png'


def jpeg_with_exif() -> bytes:
    image = Image.new('RGB', (64, 48), (120, 80, 40))
    exif = Image.Exif()
    exif[0x010F] = 'TestCam'      # Make
    exif[0x0110] = 'Model One'    # Model
    stream = BytesIO()
    image.save(stream, format='JPEG', exif=exif)
    return stream.getvalue()


def test_analyze_returns_engine_report_without_exiftool(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    monkeypatch.setattr(metadata, 'exiftool_path', lambda: None)
    raw = GARDEN.read_bytes()
    with TestClient(app) as client:
        response = client.post('/api/analyze', content=raw, headers={'Content-Type': 'image/png'})
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'completed'
    assert data['image_info'] == {'format': 'PNG', 'width': 760, 'height': 520, 'mode': 'RGB', 'size': len(raw)}
    # Same pHash the search uses, plus the two extra fingerprints from the engine.
    assert data['hashes']['phash'] == decode_and_extract(raw).phash
    assert len(data['hashes']['dhash']) == 16 and len(data['hashes']['ahash']) == 16
    analysis = data['image_analysis']
    assert analysis['file_readable'] is True and analysis['channels'] == 3
    assert 0 < analysis['average_brightness'] < 255 and analysis['average_contrast'] > 0
    assert data['metadata']['reader'] == 'pillow'
    assert 'ExifTool is not installed' in data['metadata']['note']
    assert sorted(p.name for p in tmp_path.iterdir()) == ['refs.sqlite3']  # upload not written to disk


def test_analyze_rejects_non_images(monkeypatch, tmp_path):
    monkeypatch.setenv('RECLAIM_DB_PATH', str(tmp_path / 'refs.sqlite3'))
    with TestClient(app) as client:
        assert client.post('/api/analyze', content=b'nope', headers={'Content-Type': 'image/png'}).status_code == 422
        assert client.post('/api/analyze', content=b'nope', headers={'Content-Type': 'text/plain'}).status_code == 415


def test_pillow_fallback_reads_basic_exif(monkeypatch):
    monkeypatch.setattr(metadata, 'exiftool_path', lambda: None)
    result = metadata.get_metadata(jpeg_with_exif())
    assert result['metadata_available'] is True
    assert result['metadata']['IFD0:Make'] == 'TestCam'
    assert result['metadata']['IFD0:Model'] == 'Model One'


def test_exiftool_reads_from_stdin_and_hides_pipe_details(monkeypatch):
    seen = {}

    def fake_run(command, **kwargs):
        seen['command'], seen['input'] = command, kwargs.get('input')
        payload = [{
            'SourceFile': '-', 'System:FilePermissions': 'prw-------',
            'System:FileModifyDate': '2026:11:12 21:44:11-06:00',
            'File:FileType': 'JPEG', 'IFD0:Make': 'TestCam',
            'ICC_Profile:RedTRC': '(Binary data 2060 bytes, use -b option to extract)',
        }]
        return subprocess.CompletedProcess(command, 0, stdout=json.dumps(payload).encode(), stderr=b'')

    monkeypatch.setattr(metadata, 'exiftool_path', lambda: '/usr/bin/exiftool')
    monkeypatch.setattr(metadata.subprocess, 'run', fake_run)
    raw = jpeg_with_exif()
    result = metadata.get_metadata(raw)
    assert seen['command'][-1] == '-' and seen['input'] == raw  # piped, never a file path
    assert result['reader'] == 'exiftool' and result['metadata_available'] is True
    assert result['metadata']['IFD0:Make'] == 'TestCam'
    assert not any(key == 'SourceFile' or key.startswith('System:') for key in result['metadata'])


def test_exiftool_failure_falls_back_to_pillow(monkeypatch):
    def broken(command, **kwargs):
        raise subprocess.TimeoutExpired(command, 20)

    monkeypatch.setattr(metadata, 'exiftool_path', lambda: '/usr/bin/exiftool')
    monkeypatch.setattr(metadata.subprocess, 'run', broken)
    result = metadata.get_metadata(jpeg_with_exif())
    assert result['reader'] == 'pillow' and result['metadata']['IFD0:Make'] == 'TestCam'
    assert 'timed out' in result['note']


def test_large_camera_sized_images_are_accepted():
    # 32 megapixels: the size of a bundled image-engine test photo the old 16 MP cap rejected.
    stream = BytesIO()
    Image.new('L', (7372, 4392), 128).save(stream, format='PNG')
    features = decode_and_extract(stream.getvalue())
    assert (features.width, features.height) == (7372, 4392)
