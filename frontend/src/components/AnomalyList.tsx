import React from 'react';
import { Anomaly } from '../types';

interface AnomalyListProps {
  anomalies: Anomaly[];
}

const AnomalyList: React.FC<AnomalyListProps> = ({ anomalies }) => {
  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return 'anomaly-extreme';
      case 'high':
        return 'anomaly-high';
      case 'medium':
        return 'anomaly-medium';
      case 'low':
        return 'anomaly-low';
      default:
        return 'anomaly-low';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'temperature' ? '🌡️' : '🌧️';
  };

  const formatZScore = (zScore: number) => {
    const sign = zScore >= 0 ? '+' : '';
    return `${sign}${zScore.toFixed(2)}`;
  };

  if (anomalies.length === 0) {
    return (
      <div className="card text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">No Anomalies Found</h3>
        <p className="text-gray-500">Run anomaly detection to find weather patterns.</p>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        📋 Recent Weather Anomalies
      </h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {anomalies.map((anomaly, index) => (
          <div
            key={anomaly._id}
            className={`p-4 rounded-lg transition-all hover:shadow-md ${getSeverityClass(anomaly.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {getSeverityIcon(anomaly.severity)}
                  </span>
                  <span className="text-lg">
                    {getTypeIcon(anomaly.anomaly_type)}
                  </span>
                  <span className="font-semibold capitalize">
                    {anomaly.severity} {anomaly.anomaly_type} Anomaly
                  </span>
                </div>
                
                <p className="text-sm mb-2 leading-relaxed">
                  {anomaly.description}
                </p>
                
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="bg-black bg-opacity-10 px-2 py-1 rounded">
                    <strong>Value:</strong> {anomaly.value.toFixed(2)}
                    {anomaly.anomaly_type === 'temperature' ? '°C' : 'mm'}
                  </span>
                  <span className="bg-black bg-opacity-10 px-2 py-1 rounded">
                    <strong>Expected:</strong> {anomaly.expected_value.toFixed(2)}
                    {anomaly.anomaly_type === 'temperature' ? '°C' : 'mm'}
                  </span>
                  <span className="bg-black bg-opacity-10 px-2 py-1 rounded">
                    <strong>Z-Score:</strong> {formatZScore(anomaly.z_score)}
                  </span>
                  <span className="bg-black bg-opacity-10 px-2 py-1 rounded">
                    <strong>Deviation:</strong> {anomaly.deviation >= 0 ? '+' : ''}{anomaly.deviation.toFixed(2)}
                    {anomaly.anomaly_type === 'temperature' ? '°C' : 'mm'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
        <p>
          <strong>Statistical Significance:</strong> Z-scores show how many standard deviations 
          from the monthly average. |Z| ≥ 2.5 indicates extremely rare events.
        </p>
      </div>
    </div>
  );
};

export default AnomalyList; 