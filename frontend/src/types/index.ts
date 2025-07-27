export interface WeatherData {
  _id: string;
  year: number;
  month?: number;
  tasmax_avg: number;
  tasmin_avg: number;
  tas_avg: number;
  pr_total: number;
  location: string;
  timestamp: string;
}

export interface Anomaly {
  _id: string;
  weather_data_id: string;
  anomaly_type: 'temperature' | 'precipitation';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  value: number;
  expected_value: number;
  deviation: number;
  z_score: number;
  description: string;
  detected_at: string;
  location: string;
  // Additional fields from notebook methodology
  monthly_historical_avg?: number;
  monthly_anomaly_std?: number;
  is_significant?: boolean;
  metric_type?: string;
}

// New interface for timeseries data from notebook methodology
export interface TimeseriesData {
  dates: string[];
  anomalies: number[];
  z_scores: number[];
  significant: boolean[];
  values: number[];
  historical_avg: number[];
}

export interface AnomalyTimeseriesResponse {
  precipitation?: TimeseriesData;
  max_temperature?: TimeseriesData;
  min_temperature?: TimeseriesData;
}

export interface WeatherSummary {
  total_records: number;
  date_range: {
    start_year: number;
    end_year: number;
  };
  avg_temperature: number;
  avg_precipitation: number;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

export interface AnomalyResponse {
  anomalies: Anomaly[];
  count: number;
}

export interface AIInsights {
  insights: string;
  anomaly_count: number;
  weather_summary: WeatherSummary;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  response: string;
  confidence?: number;
  sources?: string[];
} 