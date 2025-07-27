import React, { useState, useEffect } from 'react';
import { weatherAPI } from './services/api';
import { WeatherSummary, Anomaly, AIInsights, AnomalyTimeseriesResponse } from './types';
import WeatherTrends from './components/WeatherTrends';
import AIInsightsPanel from './components/AIInsightsPanel';
import LoadingSpinner from './components/LoadingSpinner';
import Chatbot from './components/Chatbot';

function App() {
  const [summary, setSummary] = useState<WeatherSummary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [timeseriesData, setTimeseriesData] = useState<AnomalyTimeseriesResponse>({});
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [summaryData, anomalyData, timeseriesResponse, insightsData] = await Promise.all([
        weatherAPI.getSummary(),
        weatherAPI.getAnomalies(undefined, 20),
        weatherAPI.getAnomalyTimeseries('default').catch(() => ({})), // Don't fail if timeseries unavailable
        weatherAPI.getAIInsights().catch(() => null) // Don't fail if AI is unavailable
      ]);

      setSummary(summaryData);
      setAnomalies(anomalyData.anomalies);
      setTimeseriesData(timeseriesResponse);
      setAIInsights(insightsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runAnomalyDetection = async () => {
    try {
      setLoading(true);
      await weatherAPI.detectAnomalies();
      // Reload data after detection
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run anomaly detection');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-sm border-b border-white border-opacity-20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                🌤️ Weather Analysis AI
              </h1>
              <p className="text-blue-200 mt-1">
                AI-powered analysis of 123 years of climate data (1901-2024)
              </p>
            </div>
            <button
              onClick={runAnomalyDetection}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              🔍 Run Detection
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Main Weather Analysis Dashboard */}
        <div className="mt-8">
          <WeatherTrends timeseriesData={timeseriesData} />
        </div>

        {/* AI Insights */}
        <div className="mt-8 max-w-4xl mx-auto">
          <AIInsightsPanel insights={aiInsights} />
        </div>

        {/* Chatbot */}
        <Chatbot />

        {/* Footer */}
        <footer className="mt-16 text-center text-blue-200">
          <p>
            <a href="https://www.weatheranomaly.com" className="text-blue-200 hover:text-blue-300"></a>
          </p>
          <p className="mt-2 text-sm">
            Analyzing {summary?.total_records.toLocaleString()} weather records with AI-powered insights
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App; 