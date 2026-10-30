from __future__ import annotations

import os
import random
from datetime import date, datetime, timedelta

import bcrypt
from dotenv import load_dotenv
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Location, TrafficRecord, User


LOCATIONS = [
    ("Silk Board Junction", 12.9177, 77.6233, "arterial", 1650),
    ("Hebbal Flyover", 13.0358, 77.5970, "highway", 1500),
    ("Marathahalli Bridge", 12.9591, 77.6974, "arterial", 1450),
    ("KR Puram Bridge", 13.0075, 77.6959, "highway", 1550),
    ("Electronic City Phase 1", 12.8452, 77.6602, "arterial", 1300),
    ("Whitefield Main Road", 12.9698, 77.7500, "arterial", 1250),
    ("Indiranagar 100 Feet Road", 12.9784, 77.6408, "urban", 1050),
    ("M.G. Road", 12.9756, 77.6068, "urban", 1180),
    ("Majestic Junction", 12.9767, 77.5713, "urban", 1400),
    ("Outer Ring Road - Bellandur", 12.9250, 77.6760, "highway", 1600),
    ("Banashankari Junction", 12.9250, 77.5640, "arterial", 1120),
    ("Yeshwanthpur Circle", 13.0285, 77.5400, "arterial", 1280),
    ("Koramangala 5th Block", 12.9345, 77.6171, "urban", 1080),
    ("Jayanagar 4th Block", 12.9250, 77.5838, "urban", 980),
    ("NICE Road - Bannerghatta Exit", 12.8819, 77.6000, "highway", 1220),
]

HOURLY_PROFILE = (
    0.23, 0.18, 0.14, 0.12, 0.12, 0.16, 0.25, 0.48,
    0.78, 0.92, 0.70, 0.54, 0.52, 0.55, 0.57, 0.63,
    0.76, 0.92, 1.00, 0.88, 0.60, 0.45, 0.36, 0.29,
)

ROAD_SPEEDS = {"highway": 68.0, "arterial": 48.0, "urban": 34.0}
INDIAN_HOLIDAYS = {(1, 26), (8, 15), (10, 2), (2026, 8, 26)}


def is_holiday(day: date) -> bool:
    return (day.month, day.day) in INDIAN_HOLIDAYS or (day.year, day.month, day.day) in INDIAN_HOLIDAYS


def weather_for_month(month: int, rng: random.Random) -> str:
    rainy_probability = 0.22 if month in (6, 7, 8, 9) else 0.08
    return rng.choices(
        ["Clear", "Cloudy", "Rainy", "Foggy"],
        weights=[0.53, 0.25, rainy_probability, 0.04],
        k=1,
    )[0]


def congestion_for_ratio(ratio: float) -> str:
    if ratio < 0.35:
        return "Low"
    if ratio < 0.58:
        return "Moderate"
    if ratio < 0.80:
        return "High"
    return "Severe"


def build_record(
    location: Location,
    timestamp: datetime,
    peak_volume: int,
    rng: random.Random,
) -> TrafficRecord:
    holiday = is_holiday(timestamp.date())
    weekend_factor = 0.68 if timestamp.weekday() >= 5 else 1.0
    holiday_factor = 0.52 if holiday else 1.0
    weather = weather_for_month(timestamp.month, rng)
    weather_volume_factor = {"Clear": 1.0, "Cloudy": 1.02, "Rainy": 1.08, "Foggy": 0.92}[weather]
    expected_count = (
        peak_volume
        * HOURLY_PROFILE[timestamp.hour]
        * weekend_factor
        * holiday_factor
        * weather_volume_factor
    )
    vehicle_count = max(0, round(rng.gauss(expected_count, max(12, expected_count * 0.08))))
    volume_ratio = vehicle_count / peak_volume
    weather_speed_factor = {"Clear": 1.0, "Cloudy": 0.94, "Rainy": 0.78, "Foggy": 0.72}[weather]
    speed = ROAD_SPEEDS[location.road_type] * (1 - min(0.68, volume_ratio * 0.52))
    speed = max(5.0, rng.gauss(speed * weather_speed_factor, 3.2))

    return TrafficRecord(
        location_id=location.id,
        timestamp=timestamp,
        vehicle_count=vehicle_count,
        avg_speed=round(speed, 1),
        congestion_level=congestion_for_ratio(volume_ratio),
        weather=weather,
        is_holiday=holiday,
    )


def ensure_demo_user(session, name: str, email: str, password: str, role: str) -> None:
    normalized_email = email.strip().lower()
    user = session.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        session.add(
            User(name=name, email=normalized_email, hashed_password=password_hash, role=role)
        )


def seed() -> None:
    load_dotenv()
    Base.metadata.create_all(bind=engine)
    rng = random.Random(20261030)
    end = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=90)
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@example.com").strip().lower()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "AdminPass123!")
    user_email = os.getenv("SEED_USER_EMAIL", "user@example.com").strip().lower()
    user_password = os.getenv("SEED_USER_PASSWORD", "UserPass123!")

    with SessionLocal() as session:
        ensure_demo_user(
            session,
            "Traffic Admin",
            admin_email,
            admin_password,
            "admin",
        )
        ensure_demo_user(
            session,
            "Demo User",
            user_email,
            user_password,
            "user",
        )

        locations_by_name = {
            location.name: location
            for location in session.scalars(select(Location)).all()
        }
        seeded_locations: list[tuple[Location, int]] = []
        for name, latitude, longitude, road_type, peak_volume in LOCATIONS:
            location = locations_by_name.get(name)
            if location is None:
                location = Location(
                    name=name,
                    city="Bengaluru",
                    latitude=latitude,
                    longitude=longitude,
                    road_type=road_type,
                )
                session.add(location)
                session.flush()
            else:
                location.latitude = latitude
                location.longitude = longitude
                location.city = "Bengaluru"
                location.road_type = road_type
            seeded_locations.append((location, peak_volume))

        session.flush()
        records_added = 0
        for location, peak_volume in seeded_locations:
            existing_timestamps = set(
                session.scalars(
                    select(TrafficRecord.timestamp).where(
                        TrafficRecord.location_id == location.id,
                        TrafficRecord.timestamp >= start,
                        TrafficRecord.timestamp < end,
                    )
                ).all()
            )
            new_records = []
            timestamp = start
            while timestamp < end:
                if timestamp not in existing_timestamps:
                    new_records.append(build_record(location, timestamp, peak_volume, rng))
                timestamp += timedelta(hours=1)
            session.add_all(new_records)
            records_added += len(new_records)

        session.commit()

    hours_per_location = int((end - start).total_seconds() // 3600)
    print(f"Seed complete: {len(LOCATIONS)} locations, {records_added:,} traffic records added.")
    print(f"Traffic window: {start.isoformat()} through {end.isoformat()} (end exclusive; {hours_per_location} hourly slots/location).")
    print(f"Demo admin: {admin_email} / {admin_password}")
    print(f"Demo user:  {user_email} / {user_password}")


if __name__ == "__main__":
    seed()