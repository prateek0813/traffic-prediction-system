from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.ml.features import (
    CATEGORICAL_COLUMNS,
    FEATURE_COLUMNS,
    make_training_features,
)
from app.models import TrafficRecord

CONGESTION_LEVELS = ("Low", "Moderate", "High", "Severe")
TARGET_COLUMNS = ("vehicle_count", "avg_speed")
MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "traffic_model.joblib"


def load_training_data(session: Session) -> pd.DataFrame:
    records = session.scalars(
        select(TrafficRecord).order_by(TrafficRecord.timestamp, TrafficRecord.location_id)
    ).all()
    if not records:
        raise ValueError("No traffic records found. Run `python -m scripts.seed` first.")
    return pd.DataFrame(
        [
            {
                "location_id": record.location_id,
                "timestamp": record.timestamp,
                "vehicle_count": record.vehicle_count,
                "avg_speed": record.avg_speed,
                "congestion_level": record.congestion_level,
                "weather": record.weather,
                "is_holiday": record.is_holiday,
            }
            for record in records
        ]
    )


def make_pipeline(estimator: Any) -> Pipeline:
    preprocessing = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), list(CATEGORICAL_COLUMNS))
        ],
        remainder="passthrough",
    )
    return Pipeline(
        steps=[
            ("features", preprocessing),
            ("model", estimator),
        ]
    )


def train_model(
    session: Session | None = None,
    output_path: Path | str = MODEL_PATH,
) -> dict[str, Any]:
    owns_session = session is None
    database = session or SessionLocal()
    try:
        records = load_training_data(database)
    finally:
        if owns_session:
            database.close()

    if len(records) < 20:
        raise ValueError("At least 20 traffic records are required to train and evaluate the model.")

    features = make_training_features(records)
    ordered_indices = records["timestamp"].sort_values(kind="stable").index
    split_index = int(len(ordered_indices) * 0.8)
    if split_index < 2 or split_index >= len(ordered_indices):
        raise ValueError("Not enough traffic records for a chronological train/test split.")

    train_indices = ordered_indices[:split_index]
    test_indices = ordered_indices[split_index:]
    train_features = features.loc[train_indices, list(FEATURE_COLUMNS)]
    test_features = features.loc[test_indices, list(FEATURE_COLUMNS)]
    train_targets = records.loc[train_indices, list(TARGET_COLUMNS)]
    test_targets = records.loc[test_indices, list(TARGET_COLUMNS)]
    train_classes = records.loc[train_indices, "congestion_level"]
    test_classes = records.loc[test_indices, "congestion_level"]

    regressor = make_pipeline(
        RandomForestRegressor(
            n_estimators=160,
            max_depth=20,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
    )
    classifier = make_pipeline(
        RandomForestClassifier(
            n_estimators=160,
            max_depth=20,
            min_samples_leaf=2,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1,
        )
    )
    regressor.fit(train_features, train_targets)
    classifier.fit(train_features, train_classes)

    regression_predictions = regressor.predict(test_features)
    class_predictions = classifier.predict(test_features)
    metrics = {
        "records": len(records),
        "train_records": len(train_indices),
        "test_records": len(test_indices),
        "vehicle_count_mae": float(
            mean_absolute_error(test_targets["vehicle_count"], regression_predictions[:, 0])
        ),
        "vehicle_count_rmse": float(
            np.sqrt(mean_squared_error(test_targets["vehicle_count"], regression_predictions[:, 0]))
        ),
        "vehicle_count_r2": float(
            r2_score(test_targets["vehicle_count"], regression_predictions[:, 0])
        ),
        "avg_speed_mae": float(
            mean_absolute_error(test_targets["avg_speed"], regression_predictions[:, 1])
        ),
        "avg_speed_rmse": float(
            np.sqrt(mean_squared_error(test_targets["avg_speed"], regression_predictions[:, 1]))
        ),
        "avg_speed_r2": float(
            r2_score(test_targets["avg_speed"], regression_predictions[:, 1])
        ),
        "congestion_accuracy": float(accuracy_score(test_classes, class_predictions)),
        "congestion_report": classification_report(
            test_classes,
            class_predictions,
            labels=list(CONGESTION_LEVELS),
            target_names=list(CONGESTION_LEVELS),
            zero_division=0,
        ),
    }

    artifact_path = Path(output_path)
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "regressor": regressor,
            "classifier": classifier,
            "feature_columns": list(FEATURE_COLUMNS),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "metrics": metrics,
        },
        artifact_path,
    )

    print(f"Training records: {metrics['train_records']:,}; test records: {metrics['test_records']:,}")
    print(
        "Vehicle count: "
        f"MAE={metrics['vehicle_count_mae']:.2f}, "
        f"RMSE={metrics['vehicle_count_rmse']:.2f}, "
        f"R2={metrics['vehicle_count_r2']:.3f}"
    )
    print(
        "Average speed: "
        f"MAE={metrics['avg_speed_mae']:.2f}, "
        f"RMSE={metrics['avg_speed_rmse']:.2f}, "
        f"R2={metrics['avg_speed_r2']:.3f}"
    )
    print(f"Congestion accuracy: {metrics['congestion_accuracy']:.3f}")
    print(metrics["congestion_report"])
    print(f"Model saved to: {artifact_path.resolve()}")
    return metrics


if __name__ == "__main__":
    train_model()