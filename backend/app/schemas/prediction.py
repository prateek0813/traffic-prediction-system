from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PredictionCreate(BaseModel):
    location_id: int = Field(gt=0)
    predicted_for: datetime
    weather: str = Field(min_length=2, max_length=40)
    is_holiday: bool = False


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    location_id: int
    predicted_for: datetime
    predicted_vehicle_count: int
    predicted_speed: float
    congestion_level: str
    confidence: float
    created_at: datetime