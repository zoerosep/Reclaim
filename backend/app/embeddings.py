"""Optional real image embeddings. Disabled unless a LOCAL checkpoint is supplied.

Opt-in prerequisites: open_clip_torch + torch installed, and a compatible OpenCLIP
checkpoint downloaded by the developer *before* startup. No model download is
triggered on incoming image searches.
"""
from __future__ import annotations

import os
from pathlib import Path
from PIL import Image

_model = None
_preprocess = None


def configured() -> bool:
    path = os.getenv('RECLAIM_OPENCLIP_CHECKPOINT', '')
    return bool(path and Path(path).is_file())


def embed_image(pixels: Image.Image) -> list[float] | None:
    if not configured():
        return None
    global _model, _preprocess
    try:
        import open_clip
        import torch
    except ImportError as exc:
        raise RuntimeError('Install optional open_clip_torch and torch dependencies.') from exc
    if _model is None:
        checkpoint = str(Path(os.environ['RECLAIM_OPENCLIP_CHECKPOINT']).resolve())
        # Use a path (not a remote model tag), so this code does not fetch weights.
        _model, _, _preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32', pretrained=checkpoint, device='cpu'
        )
        _model.eval()
    tensor = _preprocess(pixels).unsqueeze(0)
    with torch.inference_mode():
        vector = _model.encode_image(tensor)
        vector = vector / vector.norm(dim=-1, keepdim=True).clamp(min=1e-12)
    return [float(item) for item in vector.squeeze(0).tolist()]
