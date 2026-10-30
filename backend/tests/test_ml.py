from datetime import datetime

import numpy as np
import pytest

from app.ml.features import make_feature_row, make_training_features
from app.ml.predict import predict_traffic


class FakeRegressor:
    def predict(self, features):
        return np.array([[981.6, 22.46]])


class FakeClassifier:
    classes_ = np.array(["High", "Low", "Moderate", "Severe"])

    def predict(self, features):
        return np.array(["Moderate"])

    def predict_proba(self, features):
        return np.array([[0.16, 0.08, 0.68, 0.08]])


def test_make_feature_row_encodes_calendar_and_weather():
    features = make_feature_row(7, datetime(2026, 10, 31, 8), "rainy", is_holiday=True)

    assert features.iloc[0].to_dict() == {
        "hour": 8,
        "day_of_week": 5,
        "is_weekend": 1,
        "month": 10,
        "is_holiday": 1,
        "weather": "Rainy",
        "location_id": 7,
    }


def test_make_feature_row_rejects_unknown_weather():
    with pytest.raises(ValueError, match="Unsupported weather"):
        make_feature_row(1, datetime(2026, 10, 30, 8), "dust storm")


def test_make_training_features_rejects_empty_data():
    import pandas as pd

    with pytest.raises(ValueError, match="no traffic records"):
        make_training_features(
            pd.DataFrame(columns=["timestamp", "weather", "is_holiday", "location_id"])
        )


def test_predict_traffic_returns_regression_and_classification(monkeypatch):
    bundle = {"regressor": FakeRegressor(), "classifier": FakeClassifier()}
    monkeypatch.setattr("app.ml.predict.load_model_bundle", lambda: bundle)

    result = predict_traffic(3, datetime(2026, 10, 30, 8), "Cloudy")

    assert result == {
        "predicted_vehicle_count": 982,
        "predicted_speed": 22.5,
        "congestion_level": "Moderate",
        "confidence": 0.68,
    }