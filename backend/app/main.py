from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine
from app import models
from app.routers import admin, auth, locations, predictions, routes, traffic

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_application: FastAPI):
    example_secrets = {
        "local-development-only-secret-change-before-deploying",
        "replace-with-a-long-random-secret-before-deployment",
    }
    if settings.app_env.lower() == "production" and (
        settings.secret_key in example_secrets or len(settings.secret_key) < 32
    ):
        raise RuntimeError("Set a unique SECRET_KEY of at least 32 characters before production startup.")
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Traffic Prediction System API",
    description="Traffic observations, congestion forecasts, routes, and account services.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for api_router in (auth.router, locations.router, traffic.router, predictions.router, routes.router, admin.router):
    app.include_router(api_router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exception: Exception) -> JSONResponse:
    logger.exception("Unhandled application error", exc_info=exception)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})