from __future__ import annotations

from datetime import datetime

import pandas as pd

WEATHER_CATEGORIES = ("Clear", "Cloudy", "Rainy", "Foggy")
FEATURE_COLUMNS = (
    "hour",
    "day_of_week",
    "is_weekend",
    "month",
    "is_holiday",
    "weather",
    "location_id",
)
CATEGORICAL_COLUMNS = ("weather", "location_id")


def normalize_weather(weather: str) -> str:
    normalized = weather.strip().casefold()
    categories = {category.casefold(): category for category in WEATHER_CATEGORIES}
    if normalized not in categories:
        allowed = ", ".join(WEATHER_CATEGORIES)
        raise ValueError(f"Unsupported weather '{weather}'. Choose one of: {allowed}.")
    return categories[normalized]


def make_feature_row(
    location_id: int,
    timestamp: datetime,
    weather: str,
    is_holiday: bool = False,
) -> pd.DataFrame:
    if location_id < 1:
        raise ValueError("location_id must be a positive integer.")

    normalized_weather = normalize_weather(weather)
    return pd.DataFrame(
        [
            {
                "hour": timestamp.hour,
                "day_of_week": timestamp.weekday(),
                "is_weekend": int(timestamp.weekday() >= 5),
                "month": timestamp.month,
                "is_holiday": int(is_holiday),
                "weather": normalized_weather,
                "location_id": location_id,
            }
        ],
        columns=FEATURE_COLUMNS,
    )


def make_training_features(records: pd.DataFrame) -> pd.DataFrame:
    required = {"timestamp", "weather", "is_holiday", "location_id"}
    missing = required.difference(records.columns)
    if missing:
        raise ValueError(f"Training data is missing columns: {', '.join(sorted(missing))}.")
    if records.empty:
        raise ValueError("Training data contains no traffic records.")

    timestamps = pd.to_datetime(records["timestamp"], utc=True, errors="raise")
    weather_values = records["weather"].astype(str).map(normalize_weather)
    return pd.DataFrame(
        {
            "hour": timestamps.dt.hour,
            "day_of_week": timestamps.dt.dayofweek,
            "is_weekend": (timestamps.dt.dayofweek >= 5).astype(int),
            "month": timestamps.dt.month,
            "is_holiday": records["is_holiday"].fillna(False).astype(bool).astype(int),
            "weather": weather_values,
            "location_id": pd.to_numeric(records["location_id"], errors="raise").astype(int),
        },
        columns=FEATURE_COLUMNS,
        index=records.index,
    )