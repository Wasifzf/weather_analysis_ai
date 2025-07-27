# 🌤️ Weather Anomaly Detection Platform

An AI-powered weather anomaly detection platform that combines statistical analysis, machine learning, and Gemini AI to identify and explain unusual weather patterns.

## 🎯 Project Overview

This platform is designed to win multiple hackathon categories:
- **Best Data Hack** ⭐ (Primary target)
- **Best Use of Gemini API** - AI-powered insights and explanations
- **Best Use of MongoDB Atlas** - Store historical weather data and anomalies
- **Best UI/UX** - Interactive weather visualizations

## 🚀 Core Features

### 1. Real-Time Weather Data Collection
- Pull from APIs like OpenWeatherMap, WeatherAPI, or NOAA
- Collect temperature, precipitation, humidity, pressure, wind patterns
- Historical data comparison (1901-2024)

### 2. Anomaly Detection Engine
- Statistical analysis (z-scores, moving averages)
- Machine learning models for pattern recognition
- Identify temperature extremes, unusual precipitation, pressure drops

### 3. Gemini AI Integration
- Natural language explanations: "This temperature spike is 15°F above the 30-year average for July"
- Climate context: AI explains what weather patterns mean
- Prediction insights: "Based on current patterns, expect..."
- Chat interface: Users can ask "Why was this week so hot?"

### 4. MongoDB Atlas Data Layer
- Store historical weather data efficiently
- Save detected anomalies with metadata
- User location preferences and alert settings

## 🏗️ Architecture

```
weather-app-backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entrypoint
│   ├── models.py            # Pydantic models
│   ├── db.py                # MongoDB connection
│   ├── ingest.py            # Data ingestion
│   ├── anomaly.py           # Anomaly detection
│   ├── gemini.py            # Gemini AI integration
│   └── utils.py             # Helper functions
│
├── requirements.txt
└── README.md
```

## 🛠️ Setup Instructions

### 1. Prerequisites
- Python 3.8+
- MongoDB Atlas account
- Gemini API key (optional, for AI features)

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd weather-app-backend

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# Gemini AI (optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Weather API (optional, for real-time data)
WEATHER_API_KEY=your_weather_api_key_here
```

### 4. Run the Application

```bash
# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## 📊 API Endpoints

### Health & Status
- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /config/status` - Configuration status

### Data Management
- `POST /ingest/historical` - Ingest historical weather data
- `GET /data/summary` - Get weather data summary
- `GET /data/range` - Get weather data for year range

### Anomaly Detection
- `POST /anomalies/detect` - Run anomaly detection
- `GET /anomalies` - Get detected anomalies
- `GET /anomalies/{anomaly_id}` - Get specific anomaly with AI explanation

### AI Features
- `POST /ai/chat` - Chat with Gemini AI
- `GET /ai/climate-analysis` - Get climate trend analysis
- `GET /ai/insights` - Get weather insights

### Dashboard
- `GET /dashboard/summary` - Get comprehensive dashboard summary

## 🔍 Anomaly Detection Methods

### 1. Statistical Analysis
- **Z-Score Method**: Identifies values that deviate significantly from the mean
- **Moving Averages**: Detects trends and deviations from expected patterns
- **Percentile Analysis**: Finds extreme values based on historical distribution

### 2. Machine Learning
- **Isolation Forest**: Unsupervised anomaly detection
- **DBSCAN**: Density-based clustering for outlier detection
- **Trend Analysis**: Linear regression for climate change detection

### 3. Extreme Event Detection
- **Record Highs/Lows**: Identifies historical records
- **Seasonal Anomalies**: Compares current patterns to seasonal norms
- **Multi-variable Analysis**: Considers temperature, precipitation, and pressure together

## 🤖 AI Integration Features

### Gemini AI Capabilities
- **Natural Language Explanations**: Convert statistical anomalies into human-readable insights
- **Climate Context**: Explain what weather patterns mean in broader climate context
- **Predictive Insights**: Suggest what current patterns might indicate for the future
- **Interactive Chat**: Allow users to ask questions about weather data

### Example AI Responses
- "This temperature spike is 15°F above the 30-year average for July"
- "Based on current patterns, expect increased precipitation in the coming months"
- "This anomaly suggests a shift in seasonal weather patterns"

## 📈 Data Visualization (Frontend Ready)

The API provides data in formats ready for:
- **Heat maps** showing temperature anomalies over time
- **Rainfall deviation charts**
- **Extreme weather event timeline**
- **Geographic anomaly mapping**
- **Climate trend analysis charts**

## 🎯 Demo Video Hook

**Opening Line**: "Remember that crazy heatwave last month? My AI-powered weather platform detected it was the most extreme temperature anomaly in 20 years - let me show you how..."

## 📊 Sample Anomalies to Showcase

- Recent temperature records in your region
- Unusual precipitation patterns
- Pressure drops indicating severe weather
- Seasonal shifts (early/late seasons)

## 🚀 Quick Implementation Path

### Day 1:
- ✅ Set up weather API integration
- ✅ Build basic anomaly detection algorithm
- ✅ Create MongoDB schema for weather data
- ✅ Start collecting data

### Day 2:
- ✅ Integrate Gemini for AI explanations
- 🔄 Build interactive dashboard
- 🔄 Create demo video showing recent extremes
- 🔄 Polish UI and add compelling visualizations

## 🔧 Development

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest
```

### Code Structure
- **Modular Design**: Each component is self-contained
- **Type Hints**: Full type annotation for better development experience
- **Error Handling**: Comprehensive error handling and logging
- **API Documentation**: Auto-generated with FastAPI

## 📝 API Documentation

Once the server is running, visit:
- **Interactive API Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏆 Winning Strategy

This platform is designed to win by:
1. **Demonstrating real value** with actual anomaly detection
2. **Showcasing AI integration** with natural language explanations
3. **Using modern tech stack** (FastAPI, MongoDB Atlas, Gemini AI)
4. **Providing compelling visualizations** and insights
5. **Telling a story** about climate change and weather patterns

---

**Ready to detect the next weather anomaly?** 🌪️ 