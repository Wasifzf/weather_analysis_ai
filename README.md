# 🌤️ Weather Analysis AI

An AI-powered weather anomaly detection platform that combines statistical analysis, and Gemini AI to identify and explain unusual weather patterns.

## ⭐ **Winner of Best Use of MongoDB Atlas at MLH DATAHACKFEST** - Store historical weather data, anomalies and vector embeddings for RAG.

## Core Features

### 1. Historical Weather Data Collection
- 
- Collect temperature, precipitation, min and max averages from 1900 - 2024
- Historical data comparison 

### 2. Anomaly Detection Engine
- Statistical analysis (z-scores, moving averages)
- Identify temperature extremes, unusual precipitation, pressure drops
- Visualize data to identify unsual trends and extremes in data

### 3. Gemini AI Integration
- Natural language explanations: "This temperature spike is 15°F above the 30-year average for July"
- Climate context: AI explains what weather patterns mean
- Prediction insights: "Based on current patterns, expect..."
- Chat interface: Users can ask "Why was this week so hot?"

### 4. MongoDB Atlas Data Layer
- Store historical weather data efficiently
- Save detected anomalies with metadata
- User location preferences and alert settings

## Architecture

```
To be added
```

## Setup Instructions

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

## API Endpoints

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

## Anomaly Detection Methods

### 1. Statistical Analysis
- **Z-Score Method**: Identifies values that deviate significantly from the mean
- **Moving Averages**: Detects trends and deviations from expected patterns
- **Percentile Analysis**: Finds extreme values based on historical distribution


### 2. Extreme Event Detection
- **Record Highs/Lows**: Identifies historical records
- **Seasonal Anomalies**: Compares current patterns to seasonal norms
- **Multi-variable Analysis**: Considers temperature, precipitation together

## AI Integration Features

### Gemini AI Capabilities
- **Natural Language Explanations**: Convert statistical anomalies into human-readable insights
- **Climate Context**: Explain what weather patterns mean in broader climate context
- **Predictive Insights**: Suggest what current patterns might indicate for the future
- **Interactive Chat**: Allow users to ask questions about weather data

### Example AI Responses
- "This temperature spike is 15°F above the 30-year average for July"
- "Based on current patterns, expect increased precipitation in the coming months"
- "This anomaly suggests a shift in seasonal weather patterns"

## Data Visualization (Frontend Ready)

The API provides data in formats ready for:
- **Rainfall deviation charts**
- **Extreme weather events**
- **Climate trend analysis charts**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
