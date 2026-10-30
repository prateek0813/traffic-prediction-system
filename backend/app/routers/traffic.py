from datetime import datetime, timedelta, timezone
import random

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Location, TrafficRecord
from app.schemas.traffic import TrafficHistoryResponse, TrafficRecordRead

router = APIRouter(prefix="/api/traffic", tags=["traffic"])


@router.get("/live")
def live_traffic(database: Session = Depends(get_db)) -> list[dict]:
    latest = (
        select(
            TrafficRecord.location_id.label("location_id"),
            func.max(TrafficRecord.timestamp).label("latest_timestamp"),
        )
        .group_by(TrafficRecord.location_id)
        .subquery()
    )
    rows = database.execute(
        select(Location, TrafficRecord)
        .join(latest, latest.c.location_id == Location.id)
        .join(
            TrafficRecord,
            (TrafficRecord.location_id == latest.c.location_id)
            & (TrafficRecord.timestamp == latest.c.latest_timestamp),
        )
        .order_by(Location.name)
    ).all()
    now = datetime.now(timezone.utc)
    results = []
    for location, record in rows:
        rng = random.Random(f"{location.id}-{now.strftime('%Y%m%d%H%M')}")
        results.append(
            {
                "location_id": location.id,
                "location_name": location.name,
                "city": location.city,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "timestamp": now,
                "vehicle_count": max(0, round(record.vehicle_count * rng.uniform(0.94, 1.06))),
                "avg_speed": round(max(0, record.avg_speed * rng.uniform(0.93, 1.07)), 1),
                "congestion_level": record.congestion_level,
                "weather": record.weather,
            }
        )
    return results


@router.get("/history", response_model=TrafficHistoryResponse)
def traffic_history(
    location_id: int = Query(gt=0),
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    database: Session = Depends(get_db),
) -> dict:
    if start and end and start > end:
        raise HTTPException(status_code=422, detail="start must be earlier than or equal to end.")
    if database.get(Location, location_id) is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    query = select(TrafficRecord).where(TrafficRecord.location_id == location_id)
    count_query = select(func.count()).select_from(TrafficRecord).where(
        TrafficRecord.location_id == location_id
    )
    if start:
        query = query.where(TrafficRecord.timestamp >= start)
        count_query = count_query.where(TrafficRecord.timestamp >= start)
    if end:
        query = query.where(TrafficRecord.timestamp <= end)
        count_query = count_query.where(TrafficRecord.timestamp <= end)
    total = database.scalar(count_query) or 0
    items = database.scalars(
        query.order_by(TrafficRecord.timestamp.desc()).offset(offset).limit(limit)
    ).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/stats")
def traffic_stats(database: Session = Depends(get_db)) -> dict:
    total = database.scalar(select(func.count(TrafficRecord.id))) or 0
    average_speed = database.scalar(select(func.avg(TrafficRecord.avg_speed))) or 0
    congestion_rows = database.execute(
        select(TrafficRecord.congestion_level, func.count(TrafficRecord.id)).group_by(
            TrafficRecord.congestion_level
        )
    ).all()
    congestion_counts = {level: 0 for level in ("Low", "Moderate", "High", "Severe")}
    congestion_counts.update({level: count for level, count in congestion_rows})
    peak_rows = database.execute(
        select(
            extract("hour", TrafficRecord.timestamp).label("hour"),
            func.avg(TrafficRecord.vehicle_count).label("average_vehicles"),
        )
        .group_by("hour")
        .order_by(func.avg(TrafficRecord.vehicle_count).desc())
        .limit(3)
    ).all()
    busiest_rows = database.execute(
        select(
            Location.id,
            Location.name,
            func.avg(TrafficRecord.vehicle_count).label("average_vehicles"),
        )
        .join(TrafficRecord, TrafficRecord.location_id == Location.id)
        .group_by(Location.id, Location.name)
        .order_by(func.avg(TrafficRecord.vehicle_count).desc())
        .limit(5)
    ).all()
    return {
        "total_records": total,
        "average_speed_kmh": round(float(average_speed), 1),
        "congestion_counts": congestion_counts,
        "peak_hours": [
            {"hour": int(hour), "average_vehicles": round(float(avg), 1)}
            for hour, avg in peak_rows
        ],
        "busiest_locations": [
            {"location_id": location_id, "name": name, "average_vehicles": round(float(avg), 1)}
            for location_id, name, avg in busiest_rows
        ],
        "updated_at": datetime.now(timezone.utc),
    }