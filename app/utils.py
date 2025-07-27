import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

def calculate_statistics(data: List[float]) -> Dict[str, float]:
    """
    Calculate basic statistics for a list of numerical data
    """
    if not data:
        return {}
    
    mean_val = sum(data) / len(data)
    
    # Calculate variance and standard deviation
    variance = sum((x - mean_val) ** 2 for x in data) / len(data)
    std_val = math.sqrt(variance)
    
    return {
        "mean": float(mean_val),
        "median": float(sorted(data)[len(data)//2]) if data else 0.0,
        "std": float(std_val),
        "min": float(min(data)),
        "max": float(max(data)),
        "count": len(data)
    }

def detect_trend(data: List[float], years: List[int]) -> Dict[str, Any]:
    """
    Detect linear trend in time series data
    """
    if len(data) < 2 or len(years) < 2:
        return {"trend": 0, "slope": 0, "r_squared": 0}
    
    # Calculate linear regression manually
    n = len(data)
    sum_x = sum(years)
    sum_y = sum(data)
    sum_xy = sum(x * y for x, y in zip(years, data))
    sum_x2 = sum(x * x for x in years)
    
    # Calculate slope and intercept
    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    intercept = (sum_y - slope * sum_x) / n
    
    # Calculate R-squared
    y_pred = [slope * x + intercept for x in years]
    ss_res = sum((y - pred) ** 2 for y, pred in zip(data, y_pred))
    ss_tot = sum((y - sum_y/n) ** 2 for y in data)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    return {
        "trend": slope,
        "slope": float(slope),
        "intercept": float(intercept),
        "r_squared": float(r_squared),
        "trend_per_decade": float(slope * 10)
    }

def format_anomaly_description(anomaly_type: str, value: float, 
                             expected: float, year: int) -> str:
    """
    Format a human-readable anomaly description
    """
    deviation = value - expected
    deviation_str = f"+{deviation:.2f}" if deviation > 0 else f"{deviation:.2f}"
    
    if anomaly_type == "temperature":
        unit = "°C"
    elif anomaly_type == "precipitation":
        unit = "mm"
    else:
        unit = ""
    
    return f"{anomaly_type.title()} anomaly in {year}: {value:.2f}{unit} (expected: {expected:.2f}{unit}, deviation: {deviation_str}{unit})"

def categorize_severity(z_score: float) -> str:
    """
    Categorize anomaly severity based on z-score
    """
    abs_z = abs(z_score)
    if abs_z >= 3.0:
        return "extreme"
    elif abs_z >= 2.0:
        return "high"
    elif abs_z >= 1.5:
        return "medium"
    else:
        return "low"

def calculate_moving_average(data: List[float], window: int = 10) -> List[float]:
    """
    Calculate moving average for time series data
    """
    if len(data) < window:
        return data
    
    moving_avg = []
    for i in range(len(data)):
        start = max(0, i - window // 2)
        end = min(len(data), i + window // 2 + 1)
        window_data = data[start:end]
        moving_avg.append(sum(window_data) / len(window_data))
    
    return moving_avg

def find_extreme_values(data: List[float], threshold: float = 2.0) -> List[int]:
    """
    Find indices of extreme values in data (beyond threshold standard deviations)
    """
    if not data:
        return []
    
    mean_val = sum(data) / len(data)
    variance = sum((x - mean_val) ** 2 for x in data) / len(data)
    std_val = math.sqrt(variance)
    
    if std_val == 0:
        return []
    
    extreme_indices = []
    for i, value in enumerate(data):
        z_score = abs((value - mean_val) / std_val)
        if z_score >= threshold:
            extreme_indices.append(i)
    
    return extreme_indices

def prepare_chart_data(weather_data: List[Dict[str, Any]], 
                      anomaly_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prepare data for chart visualization
    """
    if not weather_data:
        return {}
    
    # Extract time series data
    years = [d['year'] for d in weather_data]
    temps = [d['tas_avg'] for d in weather_data]
    precip = [d['pr_total'] for d in weather_data]
    
    # Calculate trends
    temp_trend = detect_trend(temps, years)
    precip_trend = detect_trend(precip, years)
    
    # Prepare anomaly data for visualization
    anomaly_points = []
    for anomaly in anomaly_data:
        if 'year' in anomaly:
            anomaly_points.append({
                "year": anomaly['year'],
                "value": anomaly['value'],
                "severity": anomaly['severity'],
                "type": anomaly['anomaly_type']
            })
    
    return {
        "years": years,
        "temperature": temps,
        "precipitation": precip,
        "temperature_trend": temp_trend,
        "precipitation_trend": precip_trend,
        "anomalies": anomaly_points,
        "moving_avg_temp": calculate_moving_average(temps, 10),
        "moving_avg_precip": calculate_moving_average(precip, 10)
    }

def validate_date_range(start_year: int, end_year: int) -> bool:
    """
    Validate date range parameters
    """
    if start_year < 1900 or end_year > 2024:
        return False
    if start_year > end_year:
        return False
    return True

def sanitize_location(location: str) -> str:
    """
    Sanitize location string for database queries
    """
    # Remove special characters and normalize
    sanitized = location.strip().lower()
    sanitized = sanitized.replace(" ", "_")
    sanitized = "".join(c for c in sanitized if c.isalnum() or c == "_")
    return sanitized or "default"

def format_api_response(success: bool, message: str, 
                       data: Optional[Any] = None, 
                       error: Optional[str] = None) -> Dict[str, Any]:
    """
    Format standardized API response
    """
    response = {
        "success": success,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if data is not None:
        response["data"] = data
    
    if error is not None:
        response["error"] = error
    
    return response

def calculate_percentile_rank(value: float, data: List[float]) -> float:
    """
    Calculate percentile rank of a value in a dataset
    """
    if not data:
        return 0.0
    
    sorted_data = sorted(data)
    rank = 0
    for i, d in enumerate(sorted_data):
        if d <= value:
            rank = i + 1
    
    return (rank / len(sorted_data)) * 100

def get_seasonal_patterns(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze seasonal patterns in weather data
    """
    if not data or 'month' not in data[0]:
        return {}
    
    # Group by month
    monthly_data = {}
    for record in data:
        month = record.get('month', 1)
        if month not in monthly_data:
            monthly_data[month] = []
        monthly_data[month].append(record)
    
    # Calculate monthly averages
    monthly_stats = {}
    for month, records in monthly_data.items():
        temps = [r['tas_avg'] for r in records]
        precip = [r['pr_total'] for r in records]
        
        monthly_stats[month] = {
            "avg_temperature": sum(temps) / len(temps),
            "avg_precipitation": sum(precip) / len(precip),
            "count": len(records)
        }
    
    return monthly_stats

def export_data_to_csv(data: List[Dict[str, Any]], filename: str) -> bool:
    """
    Export data to CSV file using built-in csv module
    """
    try:
        import csv
        if not data:
            return False
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = data[0].keys()
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        return True
    except Exception as e:
        print(f"Error exporting data: {e}")
        return False

def load_data_from_csv(filename: str) -> List[Dict[str, Any]]:
    """
    Load data from CSV file using built-in csv module
    """
    try:
        import csv
        data = []
        with open(filename, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                data.append(row)
        return data
    except Exception as e:
        print(f"Error loading data: {e}")
        return []
