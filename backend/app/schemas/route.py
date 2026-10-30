from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class RouteSuggestionRequest(BaseModel):
    from_location_id: int = Field(gt=0)
    to_location_id: int = Field(gt=0)
    save_route: bool = False

    @model_validator(mode="after")
    def ensure_distinct_locations(self):
        if self.from_location_id == self.to_location_id:
            raise ValueError("Source and destination must be different locations.")
        return self


class RouteOption(BaseModel):
    location_ids: list[int]
    location_names: list[str]
    distance_km: float
    estimated_travel_minutes: float
    estimated_delay_minutes: float
    congestion_level: str


class RouteSuggestionResponse(BaseModel):
    recommended: RouteOption
    alternatives: list[RouteOption]
    created_at: datetime
    note: str