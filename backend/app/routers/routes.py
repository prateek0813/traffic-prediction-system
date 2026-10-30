from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Location, SavedRoute, SearchHistory, TrafficRecord, User
from app.schemas.route import RouteOption, RouteSuggestionRequest, RouteSuggestionResponse

router = APIRouter(prefix="/api/route-suggestion", tags=["routes"])
ROAD_SPEEDS = {"highway": 68.0, "arterial": 48.0, "urban": 34.0}


def distance_km(start: Location, end: Location) -> float:
    lat1, lat2 = radians(start.latitude), radians(end.latitude)
    delta_lat = lat2 - lat1
    delta_lon = radians(end.longitude - start.longitude)
    value = sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    return 6371.0 * 2 * asin(sqrt(value))


@router.post("", response_model=RouteSuggestionResponse)
def suggest_route(
    payload: RouteSuggestionRequest,
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RouteSuggestionResponse:
    locations = database.scalars(select(Location).order_by(Location.name)).all()
    by_id = {location.id: location for location in locations}
    source = by_id.get(payload.from_location_id)
    destination = by_id.get(payload.to_location_id)
    if source is None or destination is None:
        raise HTTPException(status_code=404, detail="Source or destination location was not found.")

    latest = (
        select(
            TrafficRecord.location_id.label("location_id"),
            func.max(TrafficRecord.timestamp).label("latest_timestamp"),
        )
        .group_by(TrafficRecord.location_id)
        .subquery()
    )
    speeds = {
        location_id: speed
        for location_id, speed in database.execute(
            select(TrafficRecord.location_id, TrafficRecord.avg_speed)
            .join(latest, latest.c.location_id == TrafficRecord.location_id)
            .where(TrafficRecord.timestamp == latest.c.latest_timestamp)
        ).all()
    }

    def option(path: list[Location]) -> RouteOption:
        total_distance = 0.0
        travel_time = 0.0
        delay = 0.0
        segment_speeds = []
        for first, second in zip(path, path[1:]):
            segment_distance = distance_km(first, second)
            typical_speed = ROAD_SPEEDS.get(first.road_type, 35.0)
            observed_speed = speeds.get(first.id, typical_speed)
            segment_time = segment_distance / max(5.0, observed_speed) * 60
            free_flow_time = segment_distance / typical_speed * 60
            total_distance += segment_distance
            travel_time += segment_time
            delay += max(0.0, segment_time - free_flow_time)
            segment_speeds.append(observed_speed)
        average_speed = sum(segment_speeds) / max(1, len(segment_speeds))
        ratio = average_speed / 68.0
        congestion = "Low" if ratio >= 0.75 else "Moderate" if ratio >= 0.5 else "High" if ratio >= 0.3 else "Severe"
        return RouteOption(
            location_ids=[location.id for location in path],
            location_names=[location.name for location in path],
            distance_km=round(total_distance, 2),
            estimated_travel_minutes=round(travel_time, 1),
            estimated_delay_minutes=round(delay, 1),
            congestion_level=congestion,
        )

    candidates = [option([source, destination])]
    intermediates = sorted(
        (
            location
            for location in locations
            if location.id not in {source.id, destination.id}
        ),
        key=lambda location: distance_km(source, location) + distance_km(location, destination),
    )[:5]
    candidates.extend(option([source, via, destination]) for via in intermediates)
    candidates.sort(key=lambda route: route.estimated_travel_minutes)
    recommended, alternatives = candidates[0], candidates[1:]

    database.add(
        SearchHistory(
            user_id=user.id,
            from_location_id=source.id,
            to_location_id=destination.id,
        )
    )
    if payload.save_route:
        database.add(
            SavedRoute(
                user_id=user.id,
                from_location_id=source.id,
                to_location_id=destination.id,
            )
        )
    database.commit()
    return RouteSuggestionResponse(
        recommended=recommended,
        alternatives=alternatives,
        created_at=datetime.now(timezone.utc),
        note="Travel times use straight-line segments and the latest available speeds; this is not turn-by-turn routing.",
    )