from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class WeatherDataType(str, Enum):
    TEMPERATURE = "temperature"
    PRECIPITATION = "precipitation"
    HUMIDITY = "humidity"
    PRESSURE = "pressure"
    WIND = "wind"

class AnomalySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"

class WeatherData(BaseModel):
    """Weather data model for storage"""
    year: int
    month: Optional[int] = None
    day: Optional[int] = None
    tasmax_avg: float  # Maximum temperature average
    tasmin_avg: float  # Minimum temperature average
    tas_avg: float     # Average temperature
    pr_total: float    # Total precipitation
    location: Optional[str] = "default"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Anomaly(BaseModel):
    """Anomaly detection result model"""
    id: Optional[str] = None
    weather_data_id: str
    anomaly_type: WeatherDataType
    severity: AnomalySeverity
    value: float
    expected_value: float
    deviation: float
    z_score: float
    description: str
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    location: Optional[str] = "default"
    
    # Additional fields from notebook methodology
    monthly_historical_avg: Optional[float] = None  # Monthly historical average
    monthly_anomaly_std: Optional[float] = None     # Monthly anomaly standard deviation
    is_significant: Optional[bool] = False          # Whether anomaly is statistically significant (|z_score| >= 2)
    metric_type: Optional[str] = None               # Specific metric (pr, tasmax, tasmin)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AnomalyResponse(BaseModel):
    """API response model for anomalies"""
    anomaly: Anomaly
    ai_explanation: Optional[str] = None
    historical_context: Optional[Dict[str, Any]] = None

class UserPreference(BaseModel):
    """User preferences for alerts and locations"""
    user_id: str
    locations: List[str] = []
    alert_threshold: AnomalySeverity = AnomalySeverity.MEDIUM
    notification_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    """Chat message for Gemini AI interaction"""
    message: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    """Response from Gemini AI"""
    response: str
    confidence: Optional[float] = None
    sources: Optional[List[str]] = None

class WeatherSummary(BaseModel):
    """Summary statistics for weather data"""
    total_records: int
    date_range: Dict[str, str]
    avg_temperature: float
    avg_precipitation: float
    anomaly_count: int
    recent_anomalies: List[Anomaly] = []

class APIResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None
