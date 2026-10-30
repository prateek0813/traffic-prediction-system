from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.ml.predict import clear_model_cache
from app.ml.train import train_model
from app.models import Location, Prediction, SavedRoute, TrafficRecord, User
from app.schemas.admin import AdminSummary
from app.schemas.auth import UserRead

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/summary", response_model=AdminSummary)
def admin_summary(database: Session = Depends(get_db)) -> dict:
    counts = {}
    for key, model in (
        ("users", User),
        ("locations", Location),
        ("traffic_records", TrafficRecord),
        ("predictions", Prediction),
        ("saved_routes", SavedRoute),
    ):
        counts[key] = database.scalar(select(func.count()).select_from(model)) or 0
    average_speed = database.scalar(select(func.avg(TrafficRecord.avg_speed))) or 0
    congestion_rows = database.execute(
        select(TrafficRecord.congestion_level, func.count(TrafficRecord.id)).group_by(
            TrafficRecord.congestion_level
        )
    ).all()
    congestion_counts = {level: 0 for level in ("Low", "Moderate", "High", "Severe")}
    congestion_counts.update({level: count for level, count in congestion_rows})
    return {
        **counts,
        "average_speed_kmh": round(float(average_speed), 1),
        "congestion_counts": congestion_counts,
    }


@router.get("/users", response_model=list[UserRead])
def list_users(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    database: Session = Depends(get_db),
) -> list[User]:
    return list(
        database.scalars(select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)).all()
    )


@router.post("/retrain")
def retrain_model(database: Session = Depends(get_db)) -> dict:
    try:
        metrics = train_model(session=database)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    clear_model_cache()
    return {"message": "Traffic model retrained successfully.", "metrics": metrics}