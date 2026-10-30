from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.ml.predict import ModelNotTrainedError, forecast_24_hours, predict_traffic
from app.models import Location, Prediction, User
from app.schemas.prediction import PredictionCreate, PredictionRead

router = APIRouter(prefix="/api", tags=["predictions"])


@router.post("/predict", response_model=PredictionRead, status_code=201)
def create_prediction(
    payload: PredictionCreate,
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Prediction:
    if database.get(Location, payload.location_id) is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    try:
        result = predict_traffic(
            payload.location_id,
            payload.predicted_for,
            payload.weather,
            payload.is_holiday,
        )
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    prediction = Prediction(
        user_id=user.id,
        location_id=payload.location_id,
        predicted_for=payload.predicted_for,
        predicted_vehicle_count=result["predicted_vehicle_count"],
        predicted_speed=result["predicted_speed"],
        congestion_level=result["congestion_level"],
        confidence=result["confidence"],
    )
    database.add(prediction)
    database.commit()
    database.refresh(prediction)
    return prediction


@router.get("/predict/forecast/{location_id}")
def get_forecast(
    location_id: int,
    weather: str = "Clear",
    database: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    if database.get(Location, location_id) is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    try:
        forecast = forecast_24_hours(location_id, weather=weather)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"location_id": location_id, "forecast": forecast}


@router.get("/predictions/history")
def prediction_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    database: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    count_query = select(func.count(Prediction.id)).where(Prediction.user_id == user.id)
    query = select(Prediction).where(Prediction.user_id == user.id)
    total = database.scalar(count_query) or 0
    items = database.scalars(
        query.order_by(Prediction.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return {
        "items": [PredictionRead.model_validate(item) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }