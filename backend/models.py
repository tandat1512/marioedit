from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PointModel(BaseModel):
    """Point coordinates as percentage (0-100)."""
    x: float = Field(..., ge=0, le=100, description="X coordinate as percentage")
    y: float = Field(..., ge=0, le=100, description="Y coordinate as percentage")


class SkinValues(BaseModel):
    smooth: int = Field(default=0, ge=0, le=100)
    whiten: int = Field(default=0, ge=0, le=100)
    even: int = Field(default=0, ge=0, le=100)
    korean: int = Field(default=0, ge=0, le=100)
    texture: int = Field(default=0, ge=0, le=100)


class AcneMode(BaseModel):
    auto: bool = Field(default=False, description="Auto AI Acne Removal")
    manualPoints: List[PointModel] = Field(default_factory=list, description="List of clicks for manual removal")


class FaceValues(BaseModel):
    slim: int = Field(default=0, ge=0, le=100)
    vline: int = Field(default=0, ge=0, le=100)
    chinShrink: int = Field(default=0, ge=0, le=100)
    forehead: int = Field(default=0, ge=0, le=100)
    jaw: int = Field(default=0, ge=0, le=100)
    noseSlim: int = Field(default=0, ge=0, le=100)
    noseBridge: int = Field(default=0, ge=0, le=100)


class EyeValues(BaseModel):
    enlarge: int = Field(default=0, ge=0, le=100)
    brightness: int = Field(default=0, ge=0, le=100)
    darkCircle: int = Field(default=0, ge=0, le=100)
    depth: int = Field(default=0, ge=0, le=100)
    eyelid: int = Field(default=0, ge=0, le=100)


class EyeMakeup(BaseModel):
    eyeliner: bool = Field(default=False)
    lens: str = Field(default="none", description="Lens color: none, blue, green, brown, etc.")


class MouthValues(BaseModel):
    smile: int = Field(default=0, ge=0, le=100)


class HairValues(BaseModel):
    smooth: int = Field(default=0, ge=0, le=100)
    volume: int = Field(default=0, ge=0, le=100)
    shine: int = Field(default=0, ge=0, le=100)


class BeautyConfig(BaseModel):
    """Configuration for beauty enhancement pipeline."""
    skinMode: Literal["natural", "strong"] = Field(default="natural")
    faceMode: Literal["natural"] = Field(default="natural")
    
    skinValues: SkinValues = Field(default_factory=SkinValues)
    acneMode: AcneMode = Field(default_factory=AcneMode)
    faceValues: FaceValues = Field(default_factory=FaceValues)
    eyeValues: EyeValues = Field(default_factory=EyeValues)
    eyeMakeup: EyeMakeup = Field(default_factory=EyeMakeup)
    mouthValues: MouthValues = Field(default_factory=MouthValues)
    lipstick: str = Field(default="none", description="Lipstick color: none, red, pink, coral, etc.")
    hairValues: HairValues = Field(default_factory=HairValues)
    hairColor: str = Field(default="none", description="Hair color: none, black, brown, blonde, etc.")


class LandmarkPoint(BaseModel):
    x: float
    y: float


class FaceMeta(BaseModel):
    """Face detection metadata."""
    bbox: List[int] = Field(..., description="Bounding box [x, y, width, height]")
    confidence: float = Field(..., ge=0, le=1)
    landmarks: List[LandmarkPoint] = Field(..., description="468 face landmarks")


class BeautyResponse(BaseModel):
    """Response from beauty enhancement."""
    image: str = Field(..., description="Base64 encoded image data URL")
    faceMeta: Optional[FaceMeta] = Field(default=None, description="Face detection metadata")


class FaceAnalysisResponse(BaseModel):
    """Response from face analysis."""
    faceMeta: Optional[FaceMeta] = Field(default=None, description="Face detection metadata")

