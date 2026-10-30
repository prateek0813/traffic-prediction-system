from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models import Location, Prediction, SavedRoute, SearchHistory
from app.models.traffic_record import TrafficRecord
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
def list_locations(
    city: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    database: Session = Depends(get_db),
) -> list[Location]:
    query = select(Location).order_by(Location.city, Location.name)
    if city:
        query = query.where(func.lower(Location.city) == city.strip().lower())
    return list(database.scalars(query.offset(offset).limit(limit)).all())


@router.get("/{location_id}", response_model=LocationRead)
def get_location(location_id: int, database: Session = Depends(get_db)) -> Location:
    location = database.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    return location


@router.post("", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    database: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> Location:
    location = Location(**payload.model_dump())
    database.add(location)
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(status_code=409, detail="A location with this name already exists.") from None
    database.refresh(location)
    return location


@router.put("/{location_id}", response_model=LocationRead)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    database: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> Location:
    location = database.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(location, field, value)
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(status_code=409, detail="A location with this name already exists.") from None
    database.refresh(location)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int,
    database: Session = Depends(get_db),
    _admin=Depends(require_admin),
) -> None:
    location = database.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    database.execute(delete(Prediction).where(Prediction.location_id == location_id))
    database.execute(
        delete(SavedRoute).where(
            or_(SavedRoute.from_location_id == location_id, SavedRoute.to_location_id == location_id)
        )
    )
    database.execute(
        delete(SearchHistory).where(
            or_(SearchHistory.from_location_id == location_id, SearchHistory.to_location_id == location_id)
        )
    )
    database.delete(location)
    database.commit()