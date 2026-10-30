from __future__ import annotations

from sqlalchemy import CheckConstraint, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_locations_latitude"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_locations_longitude"),
        Index("ix_locations_city_name", "city", "name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, default="Bengaluru")
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    road_type: Mapped[str] = mapped_column(String(40), nullable=False)

    traffic_records: Mapped[list[TrafficRecord]] = relationship(
        back_populates="location", cascade="all, delete-orphan"
    )
    predictions: Mapped[list[Prediction]] = relationship(back_populates="location")
    originating_routes: Mapped[list[SavedRoute]] = relationship(
        foreign_keys="SavedRoute.from_location_id", back_populates="from_location"
    )
    destination_routes: Mapped[list[SavedRoute]] = relationship(
        foreign_keys="SavedRoute.to_location_id", back_populates="to_location"
    )
    originating_searches: Mapped[list[SearchHistory]] = relationship(
        foreign_keys="SearchHistory.from_location_id", back_populates="from_location"
    )
    destination_searches: Mapped[list[SearchHistory]] = relationship(
        foreign_keys="SearchHistory.to_location_id", back_populates="to_location"
    )