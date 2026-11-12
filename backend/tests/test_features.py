from io import BytesIO
from PIL import Image
from backend.app.features import decode_and_extract, hamming, cosine_similarity, InvalidImage


def make_image(fmt='PNG', size=(180, 120)):
    image = Image.new('RGB', size, (17, 140, 40))
    for x in range(30, 100):
        for y in range(20, 75):
            image.putpixel((x, y), (190, 24, 81))
    stream = BytesIO()
    image.save(stream, format=fmt)
    return stream.getvalue()


def test_hashes_detect_exact_file():
    payload = make_image()
    one, two = decode_and_extract(payload), decode_and_extract(payload)
    assert one.sha256 == two.sha256
    assert one.phash == two.phash
    assert hamming(one.phash, two.phash) == 0


def test_compression_changes_sha_but_preserves_visual_hash():
    original = decode_and_extract(make_image('PNG'))
    compressed = decode_and_extract(make_image('JPEG'))
    assert original.sha256 != compressed.sha256
    assert hamming(original.phash, compressed.phash) <= 12


def test_invalid_data():
    try:
        decode_and_extract(b'hello not an image')
    except InvalidImage:
        pass
    else:
        raise AssertionError('Unsupported content should be rejected')


def test_cosine():
    assert round(cosine_similarity([1,0], [1,0]), 4) == 1.0
    assert round(cosine_similarity([1,0], [0,1]), 4) == 0.0
