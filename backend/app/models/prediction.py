from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        CheckConstraint("predicted_vehicle_count >= 0", name="ck_predictions_vehicle_count"),
        CheckConstraint("predicted_speed >= 0", name="ck_predictions_speed"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_predictions_confidence"),
        CheckConstraint(
            "congestion_level IN ('Low', 'Moderate', 'High', 'Severe')",
            name="ck_predictions_congestion_level",
        ),
        Index("ix_predictions_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    predicted_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    predicted_vehicle_count: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_speed: Mapped[float] = mapped_column(Float, nullable=False)
    congestion_level: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="predictions")
    location: Mapped[Location] = relationship(back_populates="predictions")