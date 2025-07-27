import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TimeseriesData {
  dates: string[];
  anomalies: number[];
  z_scores: number[];
  significant: boolean[];
  values: number[];
  historical_avg: number[];
}

interface AnomalyTimelineProps {
  timeseriesData: {
    precipitation?: TimeseriesData;
    max_temperature?: TimeseriesData;
    min_temperature?: TimeseriesData;
  };
}

const AnomalyTimeline: React.FC<AnomalyTimelineProps> = ({ timeseriesData }) => {
  const [activeMetric, setActiveMetric] = useState<'precipitation' | 'max_temperature' | 'min_temperature'>('precipitation');

  if (!timeseriesData || Object.keys(timeseriesData).length === 0) {
    return (
      <div className="card animate-slide-up">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          📈 Anomaly Timeline
        </h3>
        <div className="text-center py-8 text-gray-500">
          No anomaly timeseries data available
        </div>
      </div>
    );
  }

  const currentData = timeseriesData[activeMetric];
  
  if (!currentData) {
    return (
      <div className="card animate-slide-up">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          📈 Anomaly Timeline
        </h3>
        <div className="text-center py-8 text-gray-500">
          No data available for {activeMetric.replace('_', ' ')}
        </div>
      </div>
    );
  }

  // Prepare chart data matching notebook style  
  const chartData = {
    labels: currentData.dates,
    datasets: [
      // Main anomaly line (matching notebook style)
      {
        label: `${activeMetric === 'precipitation' ? 'Precipitation' : activeMetric.replace('_', ' ')} Anomaly`,
        data: currentData.anomalies,
        borderColor: activeMetric === 'precipitation' ? '#3b82f6' : 
                     activeMetric === 'max_temperature' ? '#ef4444' : '#10b981',
        backgroundColor: activeMetric === 'precipitation' ? 'rgba(59, 130, 246, 0.1)' : 
                        activeMetric === 'max_temperature' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
        fill: false,
      },
      // Significant anomalies scatter points (matching notebook highlighting)
      {
        label: 'Significant Anomalies (|Z-score| ≥ 2)',
        data: currentData.dates.map((date, index) => ({
          x: date,
          y: currentData.significant[index] ? currentData.anomalies[index] : null
        })).filter(point => point.y !== null),
        type: 'line' as const,
        backgroundColor: activeMetric === 'precipitation' ? '#1d4ed8' : 
                        activeMetric === 'max_temperature' ? '#dc2626' : '#059669',
        borderColor: activeMetric === 'precipitation' ? '#1d4ed8' : 
                     activeMetric === 'max_temperature' ? '#dc2626' : '#059669',
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: `Monthly ${activeMetric === 'precipitation' ? 'Precipitation' : 
               activeMetric.replace('_', ' ')} Anomalies (1901–2024)`,
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          },
          label: (context: any) => {
            const index = context.dataIndex;
            const anomaly = currentData.anomalies[index];
            const zScore = currentData.z_scores[index];
            const value = currentData.values[index];
            const historicalAvg = currentData.historical_avg[index];
            const isSignificant = currentData.significant[index];
            
            const unit = activeMetric === 'precipitation' ? 'mm' : '°C';
            
            return [
              `Anomaly: ${anomaly.toFixed(2)}${unit}`,
              `Z-Score: ${zScore.toFixed(2)}`,
              `Actual: ${value.toFixed(2)}${unit}`,
              `Historical Avg: ${historicalAvg.toFixed(2)}${unit}`,
              `Significant: ${isSignificant ? 'Yes' : 'No'}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'year' as const,
          displayFormats: {
            year: 'yyyy'
          }
        },
        title: {
          display: true,
          text: 'Date',
          color: '#374151',
          font: {
            size: 14
          }
        },
        grid: {
          color: '#e5e7eb',
          lineWidth: 0.5
        },
        ticks: {
          color: '#6b7280'
        }
      },
      y: {
        title: {
          display: true,
          text: `Anomaly (${activeMetric === 'precipitation' ? 'mm' : '°C'})`,
          color: '#374151',
          font: {
            size: 14
          }
        },
        grid: {
          color: '#e5e7eb',
          lineWidth: 0.5
        },
        ticks: {
          color: '#6b7280'
        }
      }
    }
  };

  // Calculate summary statistics
  const significantCount = currentData.significant.filter(Boolean).length;
  const totalCount = currentData.dates.length;
  const maxAnomalyIndex = currentData.anomalies.indexOf(Math.max(...currentData.anomalies));
  const minAnomalyIndex = currentData.anomalies.indexOf(Math.min(...currentData.anomalies));

  return (
    <div className="card animate-slide-up">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          📈 Anomaly Timeline (Notebook Style)
        </h3>
        
        {/* Metric selector tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveMetric('precipitation')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'precipitation'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Precipitation
          </button>
          <button
            onClick={() => setActiveMetric('max_temperature')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'max_temperature'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Max Temp
          </button>
          <button
            onClick={() => setActiveMetric('min_temperature')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'min_temperature'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Min Temp
          </button>
        </div>
      </div>

      <div className="h-96 mb-4">
        <Line data={chartData} options={options} />
      </div>

      {/* Summary statistics matching notebook style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold text-gray-700">Significant Anomalies</p>
          <p className="text-2xl font-bold text-blue-600">
            {significantCount} / {totalCount}
          </p>
          <p className="text-gray-500">|Z-score| ≥ 2.0</p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold text-gray-700">Highest Anomaly</p>
          <p className="text-2xl font-bold text-red-600">
            +{currentData.anomalies[maxAnomalyIndex]?.toFixed(2)}{activeMetric === 'precipitation' ? 'mm' : '°C'}
          </p>
          <p className="text-gray-500">
            {new Date(currentData.dates[maxAnomalyIndex]).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
          </p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold text-gray-700">Lowest Anomaly</p>
          <p className="text-2xl font-bold text-blue-600">
            {currentData.anomalies[minAnomalyIndex]?.toFixed(2)}{activeMetric === 'precipitation' ? 'mm' : '°C'}
          </p>
          <p className="text-gray-500">
            {new Date(currentData.dates[minAnomalyIndex]).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Methodology (from notebook):</strong> Anomalies calculated as deviation from monthly historical averages. 
          Z-scores computed using monthly anomaly standard deviations. Threshold: |Z-score| ≥ 2.0 for significance.
        </p>
      </div>
    </div>
  );
};

export default AnomalyTimeline; 