import axios from 'axios';
import { APIResponse, WeatherSummary, AnomalyResponse, AIInsights, WeatherData, AnomalyTimeseriesResponse } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const weatherAPI = {
  // Get weather data summary
  getSummary: async (): Promise<WeatherSummary> => {
    const response = await api.get<APIResponse<WeatherSummary>>('/data/summary');
    return response.data.data;
  },

  // Get weather data by year range
  getWeatherByRange: async (startYear: number, endYear: number): Promise<{ records: WeatherData[], count: number }> => {
    const response = await api.get<APIResponse<{ records: WeatherData[], count: number }>>(
      `/data/range?start_year=${startYear}&end_year=${endYear}`
    );
    return response.data.data;
  },

  // Get anomalies
  getAnomalies: async (severity?: string, limit: number = 50): Promise<AnomalyResponse> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    params.append('limit', limit.toString());
    
    const response = await api.get<APIResponse<AnomalyResponse>>(`/anomalies?${params.toString()}`);
    return response.data.data;
  },

  // Get anomaly timeseries data (notebook style)
  getAnomalyTimeseries: async (location: string = 'default'): Promise<AnomalyTimeseriesResponse> => {
    const response = await api.get<APIResponse<AnomalyTimeseriesResponse>>(`/anomalies/timeseries?location=${location}`);
    return response.data.data;
  },

  // Run anomaly detection
  detectAnomalies: async (): Promise<any> => {
    const response = await api.post<APIResponse<any>>('/anomalies/detect');
    return response.data.data;
  },

  // Get AI insights
  getAIInsights: async (): Promise<AIInsights> => {
    const response = await api.get<APIResponse<AIInsights>>('/ai/insights');
    return response.data.data;
  },

  // Get climate analysis
  getClimateAnalysis: async (): Promise<{ analysis: string }> => {
    const response = await api.get<APIResponse<{ analysis: string }>>('/ai/climate-analysis');
    return response.data.data;
  },

  // Get dashboard summary
  getDashboardSummary: async (): Promise<any> => {
    const response = await api.get<APIResponse<any>>('/dashboard/summary');
    return response.data.data;
  },

  // Chat with AI (RAG)
  chatWithAI: async (message: string, context?: any): Promise<{ response: string; confidence?: number; sources?: string[] }> => {
    const response = await api.post<APIResponse<any>>('/ai/chat', {
      message,
      context: context || null
    });
    return response.data.data;
  },
};

export default api; 