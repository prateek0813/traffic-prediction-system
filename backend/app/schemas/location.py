from pydantic import BaseModel, ConfigDict, Field


class LocationFields(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    city: str = Field(min_length=2, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    road_type: str = Field(min_length=2, max_length=40)


class LocationCreate(LocationFields):
    city: str = "Bengaluru"


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    road_type: str | None = Field(default=None, min_length=2, max_length=40)


class LocationRead(LocationFields):
    model_config = ConfigDict(from_attributes=True)

    id: int