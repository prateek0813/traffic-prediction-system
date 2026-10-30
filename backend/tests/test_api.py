import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.database import Base, get_db
from app.main import app
from app.models import Location, User


@pytest.fixture
def client(monkeypatch):
    test_engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=test_engine)
    monkeypatch.setattr(main_module, "engine", test_engine)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


def register_and_login(client: TestClient) -> str:
    registration = client.post(
        "/api/auth/register",
        json={"name": "Traffic Tester", "email": "tester@example.com", "password": "TrafficPass123"},
    )
    assert registration.status_code == 201
    login = client.post(
        "/api/auth/login",
        json={"email": "tester@example.com", "password": "TrafficPass123"},
    )
    assert login.status_code == 200
    assert "httponly" in login.headers.get("set-cookie", "").lower()
    return login.json()["access_token"]


def test_health_and_registration_login_me(client):
    assert client.get("/health").json() == {"status": "ok"}
    token = register_and_login(client)

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "tester@example.com"
    assert "hashed_password" not in response.json()


def test_location_mutation_requires_admin(client):
    payload = {
        "name": "Test Junction",
        "city": "Bengaluru",
        "latitude": 12.9,
        "longitude": 77.6,
        "road_type": "arterial",
    }
    assert client.post("/api/locations", json=payload).status_code == 401
    token = register_and_login(client)

    response = client.post(
        "/api/locations",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_prediction_history_is_private_to_authenticated_user(client):
    register_and_login(client)
    assert client.get("/api/predictions/history").status_code == 401

    response = client.get(
        "/api/predictions/history",
    )

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


def test_logout_clears_browser_authentication_cookie(client):
    register_and_login(client)

    response = client.post("/api/auth/logout")

    assert response.status_code == 204
    assert client.get("/api/auth/me").status_code == 401