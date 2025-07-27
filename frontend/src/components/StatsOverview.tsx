import React from 'react';
import { WeatherSummary } from '../types';

interface StatsOverviewProps {
  summary: WeatherSummary;
  anomalyCount: number;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ summary, anomalyCount }) => {
  const dataSpan = summary.date_range.end_year - summary.date_range.start_year + 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      {/* Total Records */}
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Total Records</p>
            <p className="text-3xl font-bold text-white">
              {summary.total_records.toLocaleString()}
            </p>
            <p className="text-blue-200 text-xs mt-1">Weather observations</p>
          </div>
          <div className="text-4xl opacity-80">📊</div>
        </div>
      </div>

      {/* Data Span */}
      <div className="stat-card bg-gradient-to-br from-green-500 to-teal-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Data Span</p>
            <p className="text-3xl font-bold text-white">{dataSpan}</p>
            <p className="text-green-200 text-xs mt-1">
              {summary.date_range.start_year} - {summary.date_range.end_year}
            </p>
          </div>
          <div className="text-4xl opacity-80">📅</div>
        </div>
      </div>

      {/* Anomalies Detected */}
      <div className="stat-card bg-gradient-to-br from-red-500 to-pink-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-sm font-medium">Anomalies Detected</p>
            <p className="text-3xl font-bold text-white">{anomalyCount}</p>
            <p className="text-red-200 text-xs mt-1">Statistical outliers</p>
          </div>
          <div className="text-4xl opacity-80">⚠️</div>
        </div>
      </div>

      {/* Average Temperature */}
      <div className="stat-card bg-gradient-to-br from-orange-500 to-red-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">Avg Temperature</p>
            <p className="text-3xl font-bold text-white">
              {summary.avg_temperature.toFixed(1)}°C
            </p>
            <p className="text-orange-200 text-xs mt-1">Historical average</p>
          </div>
          <div className="text-4xl opacity-80">🌡️</div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview; 