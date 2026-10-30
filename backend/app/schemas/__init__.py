from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate
from app.schemas.prediction import PredictionCreate, PredictionRead
from app.schemas.route import RouteOption, RouteSuggestionRequest, RouteSuggestionResponse
from app.schemas.traffic import TrafficHistoryResponse, TrafficRecordRead

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserRead",
    "LocationCreate",
    "LocationRead",
    "LocationUpdate",
    "PredictionCreate",
    "PredictionRead",
    "RouteOption",
    "RouteSuggestionRequest",
    "RouteSuggestionResponse",
    "TrafficHistoryResponse",
    "TrafficRecordRead",
]