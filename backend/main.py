from __future__ import annotations

import json
import logging
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .beauty_pipeline import BeautyPipeline
from .config import get_settings
from .models import BeautyConfig, BeautyResponse, FaceAnalysisResponse, SkinBrightenResponse

logger = logging.getLogger(__name__)

app = FastAPI(title="Beauty Editor Backend", version="1.0.0")
settings = get_settings()
pipeline = BeautyPipeline()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok"}


def _load_image(upload: UploadFile) -> np.ndarray:
    data = upload.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image payload")
    array = np.frombuffer(data, np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unsupported image format")
    return image


@app.post("/api/beauty/analyze", response_model=FaceAnalysisResponse)
async def analyze_face(image: UploadFile = File(...)) -> FaceAnalysisResponse:
    img = _load_image(image)
    meta = pipeline.analyze(img)
    if not meta:
        raise HTTPException(status_code=422, detail="Không phát hiện khuôn mặt hợp lệ")
    return FaceAnalysisResponse(faceMeta=meta)


@app.post("/api/beauty/apply", response_model=BeautyResponse)
async def apply_beauty(
    image: UploadFile = File(...),
    beautyConfig: str = Form(...),
) -> BeautyResponse:
    try:
        config = BeautyConfig.model_validate_json(beautyConfig)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid beautyConfig JSON: {exc}") from exc

    img = _load_image(image)
    processed, meta = pipeline.apply(img, config)
    data_url = pipeline.encode_image(processed)
    return BeautyResponse(image=data_url, faceMeta=meta)


@app.post("/api/beauty/brighten-skin", response_model=SkinBrightenResponse)
async def brighten_skin(
    image: UploadFile = File(...),
    whiten: float = Form(50, ge=0, le=100),
    preserveTexture: bool = Form(True),
    adaptiveMode: bool = Form(True),
) -> SkinBrightenResponse:
    """
    Endpoint chuyên dụng cho tính năng Sáng da nâng cao.
    Sử dụng thuật toán Frequency Separation và Adaptive Brightening để sáng hóa da tự nhiên.
    
    Args:
        image: Ảnh đầu vào
        whiten: Độ sáng da (0-100)
        preserveTexture: Giữ nguyên kết cấu da
        adaptiveMode: Chế độ sáng hóa thích ứng (sáng hóa vùng tối nhiều hơn)
    
    Returns:
        SkinBrightenResponse với ảnh đã xử lý
    """
    img = _load_image(image)
    
    # Tạo config chỉ với whiten
    from .models import SkinValues, BeautyConfig
    skin_values = SkinValues(whiten=whiten)
    config = BeautyConfig(skinValues=skin_values)
    
    # Áp dụng xử lý
    processed, meta = pipeline.apply(img, config)
    data_url = pipeline.encode_image(processed)
    
    return SkinBrightenResponse(image=data_url, faceMeta=meta)

