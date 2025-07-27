import csv
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests
import os
from dotenv import load_dotenv

from .db import get_weather_collection
from .models import WeatherData

load_dotenv()

class DataIngestion:
    def __init__(self):
        self.weather_collection = get_weather_collection()
        self.weather_api_key = os.getenv("WEATHER_API_KEY")  # For real-time data
    
    def ingest_historical_data(self, csv_file_path: str, location: str = "default") -> Dict[str, Any]:
        """
        Ingest historical weather data from CSV file (without pandas)
        Format: date, pr, tasmax, tasmin, year, month
        """
        try:
            # Read CSV data using built-in csv module
            weather_records = []
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                for row in csv_reader:
                    try:
                        # Calculate average temperature from max and min
                        tasmax = float(row['tasmax'])
                        tasmin = float(row['tasmin'])
                        tas_avg = (tasmax + tasmin) / 2
                        
                        weather_data = WeatherData(
                            year=int(row['year']),
                            month=int(row['month']),
                            tasmax_avg=tasmax,
                            tasmin_avg=tasmin,
                            tas_avg=tas_avg,
                            pr_total=float(row['pr']),
                            location=location
                        )
                        weather_records.append(weather_data.dict())
                    except (ValueError, KeyError) as e:
                        print(f"Warning: Skipping invalid row: {e}")
                        continue
            
            print(f"📊 Loaded {len(weather_records)} records from {csv_file_path}")
            
            # Insert into MongoDB
            if weather_records:
                result = self.weather_collection.insert_many(weather_records)
                print(f"✅ Successfully ingested {len(result.inserted_ids)} records")
                
                return {
                    "success": True,
                    "message": f"Successfully ingested {len(result.inserted_ids)} records",
                    "inserted_count": len(result.inserted_ids)
                }
            else:
                return {
                    "success": False,
                    "message": "No valid records to insert",
                    "inserted_count": 0
                }
                
        except Exception as e:
            print(f"❌ Error ingesting historical data: {e}")
            return {
                "success": False,
                "message": f"Error ingesting data: {str(e)}",
                "inserted_count": 0
            }
    
    def get_weather_data_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics of stored weather data (without pandas)
        """
        try:
            total_records = self.weather_collection.count_documents({})
            
            if total_records == 0:
                return {
                    "total_records": 0,
                    "date_range": None,
                    "locations": []
                }
            
            # Get date range using MongoDB aggregation
            pipeline = [
                {"$group": {
                    "_id": None,
                    "min_year": {"$min": "$year"},
                    "max_year": {"$max": "$year"},
                    "avg_temp": {"$avg": "$tas_avg"},
                    "avg_precip": {"$avg": "$pr_total"}
                }}
            ]
            
            result = list(self.weather_collection.aggregate(pipeline))
            if result:
                stats = result[0]
                return {
                    "total_records": total_records,
                    "date_range": {
                        "start_year": stats["min_year"],
                        "end_year": stats["max_year"]
                    },
                    "avg_temperature": round(stats["avg_temp"], 2),
                    "avg_precipitation": round(stats["avg_precip"], 2)
                }
            
            return {"total_records": total_records}
            
        except Exception as e:
            print(f"❌ Error getting weather summary: {e}")
            return {"error": str(e)}
    
    def fetch_realtime_weather(self, location: str = "default") -> Optional[WeatherData]:
        """
        Fetch real-time weather data from external API
        Note: This is a placeholder - you'll need to implement with actual weather API
        """
        try:
            # Placeholder for real-time weather API integration
            # You can integrate with OpenWeatherMap, WeatherAPI, or NOAA
            print(f"🌤️ Fetching real-time weather for {location}")
            
            # For now, return None - implement actual API call
            return None
            
        except Exception as e:
            print(f"❌ Error fetching real-time weather: {e}")
            return None
    
    def get_weather_by_year_range(self, start_year: int, end_year: int, location: str = "default") -> List[Dict[str, Any]]:
        """
        Get weather data for a specific year range
        """
        try:
            query = {
                "year": {"$gte": start_year, "$lte": end_year},
                "location": location
            }
            
            cursor = self.weather_collection.find(query).sort("year", 1)
            return list(cursor)
            
        except Exception as e:
            print(f"❌ Error fetching weather data: {e}")
            return []
    
    def get_latest_weather_data(self, limit: int = 10, location: str = "default") -> List[Dict[str, Any]]:
        """
        Get the most recent weather data
        """
        try:
            query = {"location": location}
            cursor = self.weather_collection.find(query).sort("year", -1).limit(limit)
            return list(cursor)
            
        except Exception as e:
            print(f"❌ Error fetching latest weather data: {e}")
            return []

# Global instance
data_ingestion = DataIngestion()
