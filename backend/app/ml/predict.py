from __future__ import annotations

from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.ml.features import make_feature_row
from app.ml.train import MODEL_PATH

CONGESTION_LEVELS = ("Low", "Moderate", "High", "Severe")


class ModelNotTrainedError(RuntimeError):
    pass


@lru_cache(maxsize=2)
def load_model_bundle(model_path: str = str(MODEL_PATH)) -> dict[str, Any]:
    artifact_path = Path(model_path)
    if not artifact_path.is_file():
        raise ModelNotTrainedError(
            "Traffic model is not trained. Run `python -m app.ml.train` from the backend folder."
        )
    bundle = joblib.load(artifact_path)
    if not isinstance(bundle, dict) or not {"regressor", "classifier"}.issubset(bundle):
        raise ModelNotTrainedError("The saved traffic model artifact is invalid; retrain the model.")
    return bundle


def clear_model_cache() -> None:
    load_model_bundle.cache_clear()


def predict_traffic(
    location_id: int,
    timestamp: datetime,
    weather: str,
    is_holiday: bool = False,
) -> dict[str, Any]:
    features = make_feature_row(location_id, timestamp, weather, is_holiday)
    bundle = load_model_bundle()

    regression_result = np.asarray(bundle["regressor"].predict(features))[0]
    predicted_count = max(0, int(round(float(regression_result[0]))))
    predicted_speed = max(0.0, round(float(regression_result[1]), 1))

    classifier = bundle["classifier"]
    congestion_level = str(classifier.predict(features)[0])
    if congestion_level not in CONGESTION_LEVELS:
        raise ModelNotTrainedError("The saved model returned an unknown congestion level.")
    probabilities = classifier.predict_proba(features)[0]
    classes = list(classifier.classes_)
    confidence = float(probabilities[classes.index(congestion_level)])

    return {
        "predicted_vehicle_count": predicted_count,
        "predicted_speed": predicted_speed,
        "congestion_level": congestion_level,
        "confidence": round(min(1.0, max(0.0, confidence)), 4),
    }


def forecast_24_hours(
    location_id: int,
    start_datetime: datetime | None = None,
    weather: str = "Clear",
) -> list[dict[str, Any]]:
    start = start_datetime or datetime.now().replace(minute=0, second=0, microsecond=0)
    forecast = []
    for hour_offset in range(24):
        predicted_for = start + timedelta(hours=hour_offset)
        forecast.append(
            {
                "timestamp": predicted_for.isoformat(),
                **predict_traffic(location_id, predicted_for, weather),
            }
        )
    return forecast