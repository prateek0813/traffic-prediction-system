from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TrafficRecord(Base):
    __tablename__ = "traffic_records"
    __table_args__ = (
        UniqueConstraint("location_id", "timestamp", name="uq_traffic_location_timestamp"),
        CheckConstraint("vehicle_count >= 0", name="ck_traffic_vehicle_count"),
        CheckConstraint("avg_speed >= 0", name="ck_traffic_avg_speed"),
        CheckConstraint(
            "congestion_level IN ('Low', 'Moderate', 'High', 'Severe')",
            name="ck_traffic_congestion_level",
        ),
        Index("ix_traffic_location_time", "location_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    vehicle_count: Mapped[int] = mapped_column(Integer, nullable=False)
    avg_speed: Mapped[float] = mapped_column(Float, nullable=False)
    congestion_level: Mapped[str] = mapped_column(String(20), nullable=False)
    weather: Mapped[str] = mapped_column(String(40), nullable=False)
    is_holiday: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    location: Mapped[Location] = relationship(back_populates="traffic_records")