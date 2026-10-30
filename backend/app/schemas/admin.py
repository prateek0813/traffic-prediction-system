from pydantic import BaseModel


class AdminSummary(BaseModel):
    users: int
    locations: int
    traffic_records: int
    predictions: int
    saved_routes: int
    average_speed_kmh: float
    congestion_counts: dict[str, int]