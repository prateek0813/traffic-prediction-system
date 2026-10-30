from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TrafficRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location_id: int
    timestamp: datetime
    vehicle_count: int
    avg_speed: float
    congestion_level: str
    weather: str
    is_holiday: bool


class TrafficHistoryResponse(BaseModel):
    items: list[TrafficRecordRead]
    total: int
    limit: int
    offset: int