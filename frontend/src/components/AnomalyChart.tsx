import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { Anomaly } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

interface AnomalyChartProps {
  anomalies: Anomaly[];
  loading?: boolean;
}

const AnomalyChart: React.FC<AnomalyChartProps> = ({ anomalies, loading }) => {
  if (loading) {
    return (
      <div className="card animate-slide-up">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 Anomaly Distribution (Z-Score Analysis)
        </h3>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading anomaly data...</div>
        </div>
      </div>
    );
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="card animate-slide-up">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 Anomaly Distribution (Z-Score Analysis)
        </h3>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">No anomalies detected</p>
            <p className="text-sm">Run anomaly detection to see results</p>
          </div>
        </div>
      </div>
    );
  }

  // Extract year from description and prepare data for scatter plot
  const chartData = anomalies.map(anomaly => {
    // Try to extract year from description
    const yearMatch = anomaly.description.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2020;
    
    return {
      x: year,
      y: Math.abs(anomaly.z_score),
      severity: anomaly.severity,
      type: anomaly.anomaly_type,
      description: anomaly.description,
      value: anomaly.value,
      expected_value: anomaly.expected_value,
      z_score: anomaly.z_score,
      is_significant: anomaly.is_significant,
      metric_type: anomaly.metric_type
    };
  });

  // Separate data by type and severity for better visualization
  const precipitationData = chartData.filter(d => d.type === 'precipitation');
  const temperatureData = chartData.filter(d => d.type === 'temperature');
  
  // Further separate temperature by metric type if available
  const maxTempData = temperatureData.filter(d => d.metric_type === 'tasmax');
  const minTempData = temperatureData.filter(d => d.metric_type === 'tasmin');
  const otherTempData = temperatureData.filter(d => !d.metric_type || (d.metric_type !== 'tasmax' && d.metric_type !== 'tasmin'));

  const data = {
    datasets: [
      {
        label: 'Precipitation Anomalies',
        data: precipitationData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointRadius: (context: any) => {
          const point = context.raw;
          return point.is_significant ? 8 : 5;
        },
        pointHoverRadius: 10,
      },
      {
        label: 'Max Temperature Anomalies',
        data: maxTempData.length > 0 ? maxTempData : otherTempData.slice(0, Math.ceil(otherTempData.length / 2)),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        pointRadius: (context: any) => {
          const point = context.raw;
          return point.is_significant ? 8 : 5;
        },
        pointHoverRadius: 10,
      },
      {
        label: 'Min Temperature Anomalies',
        data: minTempData.length > 0 ? minTempData : otherTempData.slice(Math.ceil(otherTempData.length / 2)),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        pointRadius: (context: any) => {
          const point = context.raw;
          return point.is_significant ? 8 : 5;
        },
        pointHoverRadius: 10,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12
          },
          usePointStyle: true,
        }
      },
      title: {
        display: true,
        text: 'Weather Anomalies by Year and Z-Score (Notebook Methodology)',
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const point = context[0];
            return `Year: ${point.parsed.x}`;
          },
          label: (context: any) => {
            const point = context.raw;
            const unit = point.type === 'precipitation' ? 'mm' : '°C';
            return [
              `${context.dataset.label}`,
              `Z-Score: ${point.z_score.toFixed(2)} (|${Math.abs(point.z_score).toFixed(2)}|)`,
              `Actual: ${point.value.toFixed(2)}${unit}`,
              `Expected: ${point.expected_value.toFixed(2)}${unit}`,
              `Deviation: ${(point.value - point.expected_value).toFixed(2)}${unit}`,
              `Significant: ${point.is_significant ? 'Yes (|Z| ≥ 2.0)' : 'No'}`,
              `Severity: ${point.severity.toUpperCase()}`,
              `Metric: ${point.metric_type || point.type}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Year',
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
          text: 'Z-Score (Absolute Value)',
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
        },
        min: 0
      }
    }
  };

  // Calculate statistics for the info panel
  const significantAnomalies = anomalies.filter(a => a.is_significant);
  const extremeAnomalies = anomalies.filter(a => a.severity === 'extreme');
  const avgZScore = anomalies.reduce((sum, a) => sum + Math.abs(a.z_score), 0) / anomalies.length;

  return (
    <div className="card animate-slide-up">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        📊 Anomaly Distribution (Z-Score Analysis)
      </h3>
      <div className="h-96 mb-4">
        <Scatter data={data} options={options} />
      </div>
      
      {/* Statistics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
        <div className="text-center">
          <p className="font-semibold text-gray-700">Total Anomalies</p>
          <p className="text-2xl font-bold text-blue-600">{anomalies.length}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700">Significant (|Z| ≥ 2)</p>
          <p className="text-2xl font-bold text-green-600">{significantAnomalies.length}</p>
          <p className="text-xs text-gray-500">{((significantAnomalies.length / anomalies.length) * 100).toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700">Extreme Events</p>
          <p className="text-2xl font-bold text-red-600">{extremeAnomalies.length}</p>
          <p className="text-xs text-gray-500">{((extremeAnomalies.length / anomalies.length) * 100).toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700">Avg |Z-Score|</p>
          <p className="text-2xl font-bold text-purple-600">{avgZScore.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Notebook Methodology:</strong> Larger points indicate statistically significant anomalies (|Z-score| ≥ 2.0). 
          Z-scores calculated using monthly anomaly standard deviations from historical baselines.
        </p>
      </div>
    </div>
  );
};

export default AnomalyChart; 