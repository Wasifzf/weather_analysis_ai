from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
import uvicorn
import os

from .db import db
from .models import (
    WeatherData, Anomaly, AnomalyResponse, ChatMessage, ChatResponse,
    WeatherSummary, APIResponse, AnomalySeverity, WeatherDataType
)
from .ingest import data_ingestion
from .anomaly import anomaly_detector
from .gemini import gemini_ai

# Initialize FastAPI app
app = FastAPI(
    title="Weather Anomaly Detection Platform",
    description="AI-powered weather anomaly detection with Gemini integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Starting Weather Anomaly Detection Platform...")
    print(f"🤖 Gemini AI Available: {gemini_ai.is_configured()}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    db.close()
    print("👋 Shutting down Weather Anomaly Detection Platform...")

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Weather Anomaly Detection Platform API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db.client.admin.command('ping')
        return APIResponse(
            success=True,
            message="Service is healthy",
            data={
                "database": "connected",
                "gemini_ai": gemini_ai.is_configured()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Service unhealthy: {str(e)}")

# Data ingestion endpoints
@app.post("/ingest/historical")
async def ingest_historical_data(csv_file_path: str, location: str = "default"):
    """Ingest historical weather data from CSV file"""
    try:
        # Clean the file path - remove quotes and handle encoding
        csv_file_path = csv_file_path.strip().strip('"').strip("'")
        
        # Check if file exists
        if not os.path.exists(csv_file_path):
            return APIResponse(
                success=False,
                message=f"File not found: {csv_file_path}",
                data={"inserted_count": 0}
            )
        
        result = data_ingestion.ingest_historical_data(csv_file_path, location)
        return APIResponse(
            success=result["success"],
            message=result["message"],
            data={"inserted_count": result["inserted_count"]}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting data: {str(e)}")

@app.get("/data/summary")
async def get_weather_summary():
    """Get summary statistics of weather data"""
    try:
        summary = data_ingestion.get_weather_data_summary()
        return APIResponse(
            success=True,
            message="Weather data summary retrieved",
            data=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting summary: {str(e)}")

@app.get("/data/range")
async def get_weather_by_range(
    start_year: int = Query(..., ge=1900, le=2024),
    end_year: int = Query(..., ge=1900, le=2024),
    location: str = "default"
):
    """Get weather data for a specific year range"""
    try:
        if start_year > end_year:
            raise HTTPException(status_code=400, detail="Start year must be before end year")
        
        data = data_ingestion.get_weather_by_year_range(start_year, end_year, location)
        return APIResponse(
            success=True,
            message=f"Weather data for {start_year}-{end_year}",
            data={"records": data, "count": len(data)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting weather data: {str(e)}")

# Anomaly detection endpoints
@app.post("/anomalies/detect")
async def detect_anomalies(location: str = "default"):
    """Run full anomaly detection for a location"""
    try:
        result = anomaly_detector.run_full_anomaly_detection(location)
        return APIResponse(
            success=result["success"],
            message="Anomaly detection completed",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting anomalies: {str(e)}")

@app.get("/anomalies")
async def get_anomalies(
    location: str = "default",
    severity: Optional[AnomalySeverity] = None,
    limit: int = Query(50, ge=1, le=100)
):
    """Get detected anomalies"""
    try:
        anomalies = anomaly_detector.get_anomalies(location, severity, limit)
        return APIResponse(
            success=True,
            message=f"Retrieved {len(anomalies)} anomalies",
            data={"anomalies": anomalies, "count": len(anomalies)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting anomalies: {str(e)}")

@app.get("/anomalies/timeseries")
async def get_anomaly_timeseries(location: str = "default"):
    """Get anomaly timeseries data for visualization (matching notebook plots)"""
    try:
        timeseries_data = anomaly_detector.get_anomaly_timeseries_data(location)
        
        if not timeseries_data:
            return APIResponse(
                success=False,
                message="No timeseries data available",
                data={}
            )
        
        return APIResponse(
            success=True,
            message="Anomaly timeseries data retrieved",
            data=timeseries_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting anomaly timeseries: {str(e)}")

@app.get("/anomalies/{anomaly_id}")
async def get_anomaly_with_explanation(anomaly_id: str):
    """Get a specific anomaly with AI explanation"""
    try:
        from bson import ObjectId
        
        # Get anomaly from database
        anomaly_doc = anomaly_detector.anomaly_collection.find_one({"_id": ObjectId(anomaly_id)})
        if not anomaly_doc:
            raise HTTPException(status_code=404, detail="Anomaly not found")
        
        # Convert datetime and ObjectId for serialization
        if 'detected_at' in anomaly_doc and anomaly_doc['detected_at']:
            anomaly_doc['detected_at'] = anomaly_doc['detected_at'].isoformat()
        if '_id' in anomaly_doc:
            anomaly_doc['_id'] = str(anomaly_doc['_id'])
        
        # Convert to Anomaly model
        anomaly = Anomaly(**anomaly_doc)
        
        # Get historical context
        weather_data = data_ingestion.get_weather_by_year_range(
            anomaly.detected_at.year - 10, 
            anomaly.detected_at.year + 1,
            anomaly.location
        )
        
        # Generate AI explanation
        ai_explanation = gemini_ai.generate_anomaly_explanation(anomaly, {
            "recent_weather_data": weather_data[-5:] if weather_data else []
        })
        
        response = AnomalyResponse(
            anomaly=anomaly,
            ai_explanation=ai_explanation,
            historical_context={"recent_data_count": len(weather_data)}
        )
        
        return APIResponse(
            success=True,
            message="Anomaly with AI explanation retrieved",
            data=response.dict()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting anomaly: {str(e)}")

# AI/Gemini endpoints
@app.post("/ai/chat")
async def chat_with_ai(message: ChatMessage):
    """Chat with Gemini AI about weather data"""
    try:
        response = gemini_ai.chat_with_weather_data(message)
        return APIResponse(
            success=True,
            message="AI response generated",
            data=response.dict()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in AI chat: {str(e)}")

@app.get("/ai/climate-analysis")
async def get_climate_analysis(location: str = "default"):
    """Get AI-generated climate trend analysis"""
    try:
        # Get recent weather data for analysis
        weather_data = data_ingestion.get_weather_by_year_range(2014, 2024, location)
        
        if not weather_data:
            raise HTTPException(status_code=404, detail="No weather data available for analysis")
        
        # Convert ObjectId to string for JSON serialization
        for record in weather_data:
            if '_id' in record:
                record['_id'] = str(record['_id'])
        
        analysis = gemini_ai.generate_climate_trend_analysis(weather_data, location)
        
        return APIResponse(
            success=True,
            message="Climate analysis generated",
            data={
                "analysis": analysis,
                "data_period": f"{weather_data[0]['year']}-{weather_data[-1]['year']}",
                "data_points": len(weather_data)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating climate analysis: {str(e)}")

@app.get("/ai/insights")
async def get_weather_insights(location: str = "default"):
    """Get AI-generated weather insights"""
    try:
        # Get recent anomalies
        anomalies = anomaly_detector.get_anomalies(location, limit=10)
        
        # Get weather summary
        weather_summary = data_ingestion.get_weather_data_summary()
        
        # Convert anomalies to Anomaly objects, handling datetime serialization
        anomaly_objects = []
        for anomaly in anomalies:
            try:
                # Convert datetime string back to datetime object if needed
                if isinstance(anomaly.get('detected_at'), str):
                    from datetime import datetime
                    anomaly['detected_at'] = datetime.fromisoformat(anomaly['detected_at'])
                
                anomaly_obj = Anomaly(**anomaly)
                anomaly_objects.append(anomaly_obj)
            except Exception as e:
                print(f"Warning: Skipping anomaly due to serialization issue: {e}")
                continue
        
        insights = gemini_ai.generate_weather_insights(anomaly_objects, weather_summary)
        
        return APIResponse(
            success=True,
            message="Weather insights generated",
            data={
                "insights": insights,
                "anomaly_count": len(anomalies),
                "weather_summary": weather_summary
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

# Dashboard endpoints
@app.get("/dashboard/summary")
async def get_dashboard_summary(location: str = "default"):
    """Get comprehensive dashboard summary"""
    try:
        # Get weather summary
        weather_summary = data_ingestion.get_weather_data_summary()
        
        # Get recent anomalies
        recent_anomalies = anomaly_detector.get_anomalies(location, limit=5)
        
        # Get AI insights
        insights = gemini_ai.generate_weather_insights(
            [Anomaly(**a) for a in recent_anomalies], 
            weather_summary
        )
        
        return APIResponse(
            success=True,
            message="Dashboard summary retrieved",
            data={
                "weather_summary": weather_summary,
                "recent_anomalies": recent_anomalies,
                "ai_insights": insights,
                "gemini_available": gemini_ai.is_configured()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting dashboard summary: {str(e)}")

# Utility endpoints
@app.get("/config/status")
async def get_config_status():
    """Get configuration status of various services"""
    return APIResponse(
        success=True,
        message="Configuration status retrieved",
        data={
            "database": "connected" if db.client else "disconnected",
            "gemini_ai": gemini_ai.is_configured(),
            "weather_api": bool(data_ingestion.weather_api_key)
        }
    )

@app.get("/debug/anomaly-severities")
async def debug_anomaly_severities():
    """Debug endpoint to see what severity values are actually in the database"""
    try:
        # Get all unique severity values
        pipeline = [
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        severities = list(anomaly_detector.anomaly_collection.aggregate(pipeline))
        
        # Also get a few sample anomaly records
        sample_anomalies = list(anomaly_detector.anomaly_collection.find({}).limit(5))
        
        return APIResponse(
            success=True,
            message="Debug info retrieved",
            data={
                "severity_counts": severities,
                "sample_anomalies": sample_anomalies,
                "total_anomalies": anomaly_detector.anomaly_collection.count_documents({})
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting debug info: {str(e)}")

@app.get("/debug/simple")
async def debug_simple():
    """Simple debug endpoint to check basic database connectivity"""
    try:
        # Check if anomaly collection exists and has documents
        total_count = anomaly_detector.anomaly_collection.count_documents({})
        
        # Get one sample document
        sample = anomaly_detector.anomaly_collection.find_one({})
        
        return {
            "total_anomalies": total_count,
            "sample_document": sample,
            "collection_name": anomaly_detector.anomaly_collection.name
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/debug/raw")
async def debug_raw():
    """Raw database check bypassing models"""
    try:
        from .db import db
        
        # Direct database access
        anomaly_collection = db.get_collection("anomalies")
        
        # Count documents
        count = anomaly_collection.count_documents({})
        
        # Get one raw document
        raw_doc = anomaly_collection.find_one({})
        
        # List all collections in the database
        collections = db.db.list_collection_names()
        
        return {
            "anomaly_count": count,
            "raw_document": str(raw_doc),  # Convert to string to avoid serialization issues
            "all_collections": collections,
            "database_name": db.db.name
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)