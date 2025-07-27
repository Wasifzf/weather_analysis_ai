import math
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

from .db import get_weather_collection, get_anomaly_collection
from .models import Anomaly, WeatherDataType, AnomalySeverity

class AnomalyDetector:
    def __init__(self):
        self.weather_collection = get_weather_collection()
        self.anomaly_collection = get_anomaly_collection()
        
    def calculate_mean(self, values: List[float]) -> float:
        """Calculate mean of a list of values"""
        if not values:
            return 0.0
        return sum(values) / len(values)
    
    def calculate_std(self, values: List[float]) -> float:
        """Calculate standard deviation of a list of values"""
        if len(values) < 2:
            return 0.0
        mean_val = self.calculate_mean(values)
        variance = sum((x - mean_val) ** 2 for x in values) / (len(values) - 1)
        return math.sqrt(variance)
    
    def calculate_z_score(self, value: float, mean: float, std: float) -> float:
        """Calculate z-score for a value"""
        if std == 0:
            return 0
        return (value - mean) / std
    
    def determine_severity(self, z_score: float) -> AnomalySeverity:
        """Determine anomaly severity based on z-score thresholds from notebook"""
        abs_z = abs(z_score)
        if abs_z >= 2.5:
            return AnomalySeverity.EXTREME
        elif abs_z >= 2.0:
            return AnomalySeverity.HIGH
        elif abs_z >= 1.5:
            return AnomalySeverity.MEDIUM
        else:
            return AnomalySeverity.LOW
    
    def get_weather_dataframe(self, location: str = "default") -> pd.DataFrame:
        """
        Convert MongoDB weather data to pandas DataFrame matching notebook structure
        """
        try:
            weather_data = list(self.weather_collection.find({"location": location}).sort("year", 1))
            
            if not weather_data:
                return pd.DataFrame()
            
            # Convert to DataFrame matching notebook structure
            df_data = []
            for record in weather_data:
                df_data.append({
                    '_id': str(record['_id']),
                    'date': datetime(record['year'], record.get('month', 1), 1),
                    'year': record['year'],
                    'month': record.get('month', 1),
                    'pr': record['pr_total'],  # precipitation
                    'tasmax': record['tasmax_avg'],  # max temperature
                    'tasmin': record['tasmin_avg'],  # min temperature
                    'location': location
                })
            
            df = pd.DataFrame(df_data)
            df['date'] = pd.to_datetime(df['date'])
            
            return df
            
        except Exception as e:
            print(f"❌ Error creating weather DataFrame: {e}")
            return pd.DataFrame()
    
    def calculate_monthly_historical_averages(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate monthly historical averages exactly as in the notebook
        """
        try:
            # Calculate monthly averages for each indicator
            monthly_averages = df.groupby('month').agg({
                'pr': 'mean',
                'tasmax': 'mean', 
                'tasmin': 'mean'
            }).reset_index()
            
            # Rename columns to match notebook structure
            monthly_averages.rename(columns={
                'pr': 'pr_monthly_avg_historical',
                'tasmax': 'tasmax_monthly_avg_historical',
                'tasmin': 'tasmin_monthly_avg_historical'
            }, inplace=True)
            
            return monthly_averages
            
        except Exception as e:
            print(f"❌ Error calculating monthly historical averages: {e}")
            return pd.DataFrame()
    
    def calculate_anomalies_with_zscores(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate anomalies and z-scores exactly as in the notebook
        """
        try:
            # Get monthly historical averages
            monthly_averages = self.calculate_monthly_historical_averages(df)
            
            # Merge monthly averages back to main dataframe
            df_anomalies = pd.merge(df, monthly_averages, on='month', how='left')
            
            # Calculate anomalies as current_value - monthly_historical_average
            df_anomalies['pr_anomaly'] = df_anomalies['pr'] - df_anomalies['pr_monthly_avg_historical']
            df_anomalies['tasmax_anomaly'] = df_anomalies['tasmax'] - df_anomalies['tasmax_monthly_avg_historical']
            df_anomalies['tasmin_anomaly'] = df_anomalies['tasmin'] - df_anomalies['tasmin_monthly_avg_historical']
            
            # Calculate standard deviation of anomalies for each month
            anomaly_std = df_anomalies.groupby('month').agg({
                'pr_anomaly': 'std',
                'tasmax_anomaly': 'std', 
                'tasmin_anomaly': 'std'
            }).reset_index()
            
            # Rename columns to match notebook
            anomaly_std.rename(columns={
                'pr_anomaly': 'pr_anomaly_std',
                'tasmax_anomaly': 'tasmax_anomaly_std',
                'tasmin_anomaly': 'tasmin_anomaly_std'
            }, inplace=True)
            
            # Merge anomaly standard deviations back
            df_anomalies = pd.merge(df_anomalies, anomaly_std, on='month', how='left')
            
            # Calculate z-scores as anomaly / anomaly_std (exactly as in notebook)
            df_anomalies['pr_anomaly_zscore'] = df_anomalies['pr_anomaly'] / df_anomalies['pr_anomaly_std']
            df_anomalies['tasmax_anomaly_zscore'] = df_anomalies['tasmax_anomaly'] / df_anomalies['tasmax_anomaly_std']
            df_anomalies['tasmin_anomaly_zscore'] = df_anomalies['tasmin_anomaly'] / df_anomalies['tasmin_anomaly_std']
            
            # Identify significant anomalies (z-score threshold = 2, as in notebook)
            zscore_threshold = 2.0
            df_anomalies['pr_anomaly_significant'] = abs(df_anomalies['pr_anomaly_zscore']) >= zscore_threshold
            df_anomalies['tasmax_anomaly_significant'] = abs(df_anomalies['tasmax_anomaly_zscore']) >= zscore_threshold
            df_anomalies['tasmin_anomaly_significant'] = abs(df_anomalies['tasmin_anomaly_zscore']) >= zscore_threshold
            
            # Fill NaN values with 0 for z-scores (when std = 0)
            df_anomalies['pr_anomaly_zscore'] = df_anomalies['pr_anomaly_zscore'].fillna(0)
            df_anomalies['tasmax_anomaly_zscore'] = df_anomalies['tasmax_anomaly_zscore'].fillna(0)
            df_anomalies['tasmin_anomaly_zscore'] = df_anomalies['tasmin_anomaly_zscore'].fillna(0)
            
            return df_anomalies
            
        except Exception as e:
            print(f"❌ Error calculating anomalies with z-scores: {e}")
            return pd.DataFrame()
    
    def get_notebook_style_anomalies(self, location: str = "default") -> List[Anomaly]:
        """
        Generate anomalies using the exact methodology from the notebook
        """
        try:
            # Get weather data as DataFrame
            df = self.get_weather_dataframe(location)
            if df.empty:
                print("❌ No weather data available")
                return []
            
            # Calculate anomalies and z-scores using notebook methodology
            df_anomalies = self.calculate_anomalies_with_zscores(df)
            if df_anomalies.empty:
                print("❌ Failed to calculate anomalies")
                return []
            
            anomalies = []
            
            # Convert to Anomaly objects
            for _, row in df_anomalies.iterrows():
                # Process precipitation anomalies
                if row['pr_anomaly_significant'] and not pd.isna(row['pr_anomaly_zscore']):
                    anomaly = Anomaly(
                        weather_data_id=str(row['_id']),
                        anomaly_type=WeatherDataType.PRECIPITATION,
                        severity=self.determine_severity(row['pr_anomaly_zscore']),
                        value=float(row['pr']),
                        expected_value=float(row['pr_monthly_avg_historical']),
                        deviation=float(row['pr_anomaly']),
                        z_score=float(row['pr_anomaly_zscore']),
                        description=f"Precipitation anomaly in {row['year']}-{row['month']:02d}: {row['pr']:.2f}mm (monthly avg: {row['pr_monthly_avg_historical']:.2f}mm, anomaly: {row['pr_anomaly']:.2f}mm, z-score: {row['pr_anomaly_zscore']:.2f})",
                        location=location,
                        # Additional notebook-style data
                        monthly_historical_avg=float(row['pr_monthly_avg_historical']),
                        monthly_anomaly_std=float(row['pr_anomaly_std']),
                        is_significant=True
                    )
                    anomalies.append(anomaly)
                
                # Process maximum temperature anomalies
                if row['tasmax_anomaly_significant'] and not pd.isna(row['tasmax_anomaly_zscore']):
                    anomaly = Anomaly(
                        weather_data_id=str(row['_id']),
                        anomaly_type=WeatherDataType.TEMPERATURE,
                        severity=self.determine_severity(row['tasmax_anomaly_zscore']),
                        value=float(row['tasmax']),
                        expected_value=float(row['tasmax_monthly_avg_historical']),
                        deviation=float(row['tasmax_anomaly']),
                        z_score=float(row['tasmax_anomaly_zscore']),
                        description=f"Maximum temperature anomaly in {row['year']}-{row['month']:02d}: {row['tasmax']:.2f}°C (monthly avg: {row['tasmax_monthly_avg_historical']:.2f}°C, anomaly: {row['tasmax_anomaly']:.2f}°C, z-score: {row['tasmax_anomaly_zscore']:.2f})",
                        location=location,
                        # Additional notebook-style data
                        monthly_historical_avg=float(row['tasmax_monthly_avg_historical']),
                        monthly_anomaly_std=float(row['tasmax_anomaly_std']),
                        is_significant=True,
                        metric_type='tasmax'
                    )
                    anomalies.append(anomaly)
                
                # Process minimum temperature anomalies
                if row['tasmin_anomaly_significant'] and not pd.isna(row['tasmin_anomaly_zscore']):
                    anomaly = Anomaly(
                        weather_data_id=str(row['_id']),
                        anomaly_type=WeatherDataType.TEMPERATURE,
                        severity=self.determine_severity(row['tasmin_anomaly_zscore']),
                        value=float(row['tasmin']),
                        expected_value=float(row['tasmin_monthly_avg_historical']),
                        deviation=float(row['tasmin_anomaly']),
                        z_score=float(row['tasmin_anomaly_zscore']),
                        description=f"Minimum temperature anomaly in {row['year']}-{row['month']:02d}: {row['tasmin']:.2f}°C (monthly avg: {row['tasmin_monthly_avg_historical']:.2f}°C, anomaly: {row['tasmin_anomaly']:.2f}°C, z-score: {row['tasmin_anomaly_zscore']:.2f})",
                        location=location,
                        # Additional notebook-style data
                        monthly_historical_avg=float(row['tasmin_monthly_avg_historical']),
                        monthly_anomaly_std=float(row['tasmin_anomaly_std']),
                        is_significant=True,
                        metric_type='tasmin'
                    )
                    anomalies.append(anomaly)
            
            print(f"📊 Generated {len(anomalies)} significant anomalies using notebook methodology")
            return anomalies
            
        except Exception as e:
            print(f"❌ Error generating notebook-style anomalies: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_anomaly_timeseries_data(self, location: str = "default") -> Dict[str, Any]:
        """
        Get anomaly data formatted for time series visualization (matching notebook plots)
        """
        try:
            # Get weather data as DataFrame
            df = self.get_weather_dataframe(location)
            if df.empty:
                return {}
            
            # Calculate anomalies and z-scores
            df_anomalies = self.calculate_anomalies_with_zscores(df)
            if df_anomalies.empty:
                return {}
            
            # Prepare data for each metric (matching notebook structure)
            timeseries_data = {
                'precipitation': {
                    'dates': df_anomalies['date'].dt.strftime('%Y-%m-%d').tolist(),
                    'anomalies': df_anomalies['pr_anomaly'].tolist(),
                    'z_scores': df_anomalies['pr_anomaly_zscore'].tolist(),
                    'significant': df_anomalies['pr_anomaly_significant'].tolist(),
                    'values': df_anomalies['pr'].tolist(),
                    'historical_avg': df_anomalies['pr_monthly_avg_historical'].tolist()
                },
                'max_temperature': {
                    'dates': df_anomalies['date'].dt.strftime('%Y-%m-%d').tolist(),
                    'anomalies': df_anomalies['tasmax_anomaly'].tolist(),
                    'z_scores': df_anomalies['tasmax_anomaly_zscore'].tolist(),
                    'significant': df_anomalies['tasmax_anomaly_significant'].tolist(),
                    'values': df_anomalies['tasmax'].tolist(),
                    'historical_avg': df_anomalies['tasmax_monthly_avg_historical'].tolist()
                },
                'min_temperature': {
                    'dates': df_anomalies['date'].dt.strftime('%Y-%m-%d').tolist(),
                    'anomalies': df_anomalies['tasmin_anomaly'].tolist(),
                    'z_scores': df_anomalies['tasmin_anomaly_zscore'].tolist(),
                    'significant': df_anomalies['tasmin_anomaly_significant'].tolist(),
                    'values': df_anomalies['tasmin'].tolist(),
                    'historical_avg': df_anomalies['tasmin_monthly_avg_historical'].tolist()
                }
            }
            
            return timeseries_data
            
        except Exception as e:
            print(f"❌ Error getting anomaly timeseries data: {e}")
            return {}
    
    def detect_extreme_events(self, location: str = "default") -> List[Anomaly]:
        """
        Detect extreme weather events (record highs/lows) with monthly context
        """
        try:
            weather_data = list(self.weather_collection.find({"location": location}).sort("year", 1))
            
            if not weather_data:
                return []
            
            anomalies = []
            
            # Group by month to find monthly records
            monthly_records = {}
            for record in weather_data:
                month = record.get('month', 1)
                if month not in monthly_records:
                    monthly_records[month] = []
                monthly_records[month].append(record)
            
            # Find records for each month
            for month, records in monthly_records.items():
                if len(records) < 10:  # Need sufficient data
                    continue
                
                max_temps = [r['tasmax_avg'] for r in records]
                min_temps = [r['tasmin_avg'] for r in records]
                precips = [r['pr_total'] for r in records]
                
                max_temp = max(max_temps)
                min_temp = min(min_temps)
                max_precip = max(precips)
                
                # Find records that are monthly extremes
                for record in records:
                    year = record['year']
                    
                    # Record high temperature for this month
                    if record['tasmax_avg'] == max_temp:
                        z_score = (max_temp - self.calculate_mean(max_temps)) / self.calculate_std(max_temps)
                        if abs(z_score) >= 2.0:  # Only if statistically significant
                            anomaly = Anomaly(
                                weather_data_id=str(record["_id"]),
                                anomaly_type=WeatherDataType.TEMPERATURE,
                                severity=AnomalySeverity.EXTREME,
                                value=float(max_temp),
                                expected_value=float(self.calculate_mean(max_temps)),
                                deviation=float(max_temp - self.calculate_mean(max_temps)),
                                z_score=float(z_score),
                                description=f"Record high temperature for month {month}: {max_temp:.2f}°C in {year} (z-score: {z_score:.2f})",
                                location=location
                            )
                            anomalies.append(anomaly)
                    
                    # Record low temperature for this month
                    if record['tasmin_avg'] == min_temp:
                        z_score = (min_temp - self.calculate_mean(min_temps)) / self.calculate_std(min_temps)
                        if abs(z_score) >= 2.0:  # Only if statistically significant
                            anomaly = Anomaly(
                                weather_data_id=str(record["_id"]),
                                anomaly_type=WeatherDataType.TEMPERATURE,
                                severity=AnomalySeverity.EXTREME,
                                value=float(min_temp),
                                expected_value=float(self.calculate_mean(min_temps)),
                                deviation=float(min_temp - self.calculate_mean(min_temps)),
                                z_score=float(z_score),
                                description=f"Record low temperature for month {month}: {min_temp:.2f}°C in {year} (z-score: {z_score:.2f})",
                                location=location
                            )
                            anomalies.append(anomaly)
                    
                    # Record high precipitation for this month
                    if record['pr_total'] == max_precip:
                        z_score = (max_precip - self.calculate_mean(precips)) / self.calculate_std(precips)
                        if abs(z_score) >= 2.0:  # Only if statistically significant
                            anomaly = Anomaly(
                                weather_data_id=str(record["_id"]),
                                anomaly_type=WeatherDataType.PRECIPITATION,
                                severity=AnomalySeverity.EXTREME,
                                value=float(max_precip),
                                expected_value=float(self.calculate_mean(precips)),
                                deviation=float(max_precip - self.calculate_mean(precips)),
                                z_score=float(z_score),
                                description=f"Record high precipitation for month {month}: {max_precip:.2f}mm in {year} (z-score: {z_score:.2f})",
                                location=location
                            )
                            anomalies.append(anomaly)
            
            return anomalies
            
        except Exception as e:
            print(f"❌ Error in extreme event detection: {e}")
            return []
    
    def detect_moving_average_anomalies(self, location: str = "default", 
                                      window_size: int = 10) -> List[Anomaly]:
        """
        Detect anomalies using moving average method (keeping original for now)
        """
        try:
            # Get weather data
            weather_data = list(self.weather_collection.find({"location": location}).sort("year", 1))
            
            if len(weather_data) < window_size:
                return []
            
            anomalies = []
            
            # Calculate moving averages for temperature
            if 'tas_avg' in weather_data[0]:
                values = [d['tas_avg'] for d in weather_data]
                
                # Calculate moving averages
                moving_averages = []
                moving_stds = []
                
                for i in range(len(values)):
                    start = max(0, i - window_size // 2)
                    end = min(len(values), i + window_size // 2 + 1)
                    window_data = values[start:end]
                    
                    ma = self.calculate_mean(window_data)
                    ma_std = self.calculate_std(window_data)
                    
                    moving_averages.append(ma)
                    moving_stds.append(ma_std)
                
                # Find points that deviate significantly from moving average
                for i in range(window_size, len(values) - window_size):
                    current_temp = values[i]
                    ma_temp = moving_averages[i]
                    ma_std = moving_stds[i]
                    
                    if ma_std > 0:
                        z_score = (current_temp - ma_temp) / ma_std
                        
                        # Use proper threshold (≥ 2.0 for significance)
                        if abs(z_score) >= 2.0:
                            severity = self.determine_severity(z_score)
                            
                            anomaly = Anomaly(
                                weather_data_id=str(weather_data[i]["_id"]),
                                anomaly_type=WeatherDataType.TEMPERATURE,
                                severity=severity,
                                value=float(current_temp),
                                expected_value=float(ma_temp),
                                deviation=float(current_temp - ma_temp),
                                z_score=float(z_score),
                                description=f"Moving average anomaly: {current_temp:.2f} vs {ma_temp:.2f} (z-score: {z_score:.2f})",
                                location=location
                            )
                            
                            anomalies.append(anomaly)
            
            return anomalies
            
        except Exception as e:
            print(f"❌ Error in moving average anomaly detection: {e}")
            return []
    
    def save_anomalies(self, anomalies: List[Anomaly]) -> Dict[str, Any]:
        """
        Save detected anomalies to MongoDB
        """
        try:
            if not anomalies:
                return {"success": True, "message": "No anomalies to save", "saved_count": 0}
            
            # Convert to dict for MongoDB insertion
            anomaly_dicts = [anomaly.dict() for anomaly in anomalies]
            
            # Remove duplicates based on weather_data_id and anomaly_type
            unique_anomalies = []
            seen = set()
            
            for anomaly in anomaly_dicts:
                key = (anomaly['weather_data_id'], anomaly['anomaly_type'])
                if key not in seen:
                    seen.add(key)
                    unique_anomalies.append(anomaly)
            
            if unique_anomalies:
                result = self.anomaly_collection.insert_many(unique_anomalies)
                print(f"✅ Saved {len(result.inserted_ids)} anomalies to database")
                
                return {
                    "success": True,
                    "message": f"Successfully saved {len(result.inserted_ids)} anomalies",
                    "saved_count": len(result.inserted_ids)
                }
            else:
                return {"success": True, "message": "No new anomalies to save", "saved_count": 0}
                
        except Exception as e:
            print(f"❌ Error saving anomalies: {e}")
            return {
                "success": False,
                "message": f"Error saving anomalies: {str(e)}",
                "saved_count": 0
            }
    
    def get_anomalies(self, location: str = "default", 
                     severity: Optional[AnomalySeverity] = None,
                     limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieve anomalies from database
        """
        try:
            query = {"location": location}
            if severity:
                # Properly extract the enum value
                if hasattr(severity, 'value'):
                    severity_str = severity.value
                else:
                    severity_str = str(severity).lower()
                
                query["severity"] = severity_str
                print(f"🔍 Original severity: {severity}")
                print(f"🔍 Converted severity: '{severity_str}'")
            
            print(f"🔍 Full query: {query}")
            cursor = self.anomaly_collection.find(query).sort("detected_at", -1).limit(limit)
            results = list(cursor)
            print(f"🔍 Found {len(results)} anomalies")
            
            # Convert datetime objects to ISO strings for JSON serialization
            for result in results:
                if 'detected_at' in result and result['detected_at']:
                    result['detected_at'] = result['detected_at'].isoformat()
                # Convert ObjectId to string
                if '_id' in result:
                    result['_id'] = str(result['_id'])
            
            return results
            
        except Exception as e:
            import traceback
            print(f"❌ Error retrieving anomalies: {e}")
            traceback.print_exc()
            return []
    
    def run_full_anomaly_detection(self, location: str = "default") -> Dict[str, Any]:
        """
        Run anomaly detection using notebook methodology and save results
        """
        try:
            print(f"🔍 Starting anomaly detection using notebook methodology for {location}...")
            
            # Clear old anomalies first
            self.anomaly_collection.delete_many({"location": location})
            print("🗑️ Cleared old anomalies")
            
            # Run notebook-style anomaly detection (primary method)
            notebook_anomalies = self.get_notebook_style_anomalies(location)
            
            # Optional: Include extreme events as well for completeness
            extreme_events = self.detect_extreme_events(location)
            
            # Combine all anomalies
            all_anomalies = notebook_anomalies + extreme_events
            
            print(f"📊 Detected {len(all_anomalies)} anomalies:")
            print(f"  - Notebook methodology (significant): {len(notebook_anomalies)}")
            print(f"  - Extreme events (monthly records): {len(extreme_events)}")
            
            # Save to database
            save_result = self.save_anomalies(all_anomalies)
            
            # Get timeseries data for visualization
            timeseries_data = self.get_anomaly_timeseries_data(location)
            
            return {
                "success": True,
                "total_detected": len(all_anomalies),
                "notebook_anomalies_count": len(notebook_anomalies),
                "extreme_events_count": len(extreme_events), 
                "save_result": save_result,
                "timeseries_data": timeseries_data
            }
            
        except Exception as e:
            print(f"❌ Error in full anomaly detection: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }

# Global instance
anomaly_detector = AnomalyDetector()
