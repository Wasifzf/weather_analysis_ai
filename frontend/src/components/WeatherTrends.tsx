import React, { useState } from 'react';
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

interface WeatherTrendsProps {
  timeseriesData: {
    precipitation?: TimeseriesData;
    max_temperature?: TimeseriesData;
    min_temperature?: TimeseriesData;
  };
}

const WeatherTrends: React.FC<WeatherTrendsProps> = ({ timeseriesData }) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'anomalies'>('trends');
  const [activeMetric, setActiveMetric] = useState<'precipitation' | 'temperature'>('precipitation');

  if (!timeseriesData || Object.keys(timeseriesData).length === 0) {
    return (
      <div className="card animate-slide-up">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          📊 Weather Analysis
        </h3>
        <div className="text-center py-8 text-gray-500">
          No weather data available. Click "Run Detection" to load data.
        </div>
      </div>
    );
  }

  // Function to calculate annual averages and 10-year moving averages
  const calculateTrendData = (data: TimeseriesData) => {
    // Group data by year and calculate annual averages
    const yearlyData: { [year: number]: { values: number[], count: number } } = {};
    
    data.dates.forEach((dateStr, index) => {
      const year = new Date(dateStr).getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = { values: [], count: 0 };
      }
      yearlyData[year].values.push(data.values[index]);
      yearlyData[year].count++;
    });

    // Calculate annual averages
    const years = Object.keys(yearlyData).map(Number).sort();
    const annualValues = years.map(year => {
      const sum = yearlyData[year].values.reduce((a, b) => a + b, 0);
      return sum / yearlyData[year].values.length;
    });

    // Calculate 10-year moving averages
    const movingAverages = [];
    const window = 10;
    
    for (let i = 0; i < annualValues.length; i++) {
      if (i < window - 1) {
        movingAverages.push(null); // Not enough data for moving average
      } else {
        const windowSum = annualValues.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        movingAverages.push(windowSum / window);
      }
    }

    return {
      years: years.map(year => year.toString()),
      annualValues,
      movingAverages: movingAverages.filter(val => val !== null),
      movingAverageYears: years.slice(window - 1).map(year => year.toString())
    };
  };

  // Function to calculate average temperature from max and min
  const calculateAverageTemp = () => {
    if (!timeseriesData.max_temperature || !timeseriesData.min_temperature) return null;
    
    const maxTemp = timeseriesData.max_temperature;
    const minTemp = timeseriesData.min_temperature;
    
    // Calculate average temp for each date
    const avgValues = maxTemp.values.map((maxVal, index) => (maxVal + minTemp.values[index]) / 2);
    
    return {
      dates: maxTemp.dates,
      values: avgValues,
      anomalies: [],
      z_scores: [],
      significant: [],
      historical_avg: []
    };
  };

  // Function to get only significant anomalies aggregated by year
  const getSignificantAnomalies = (data: TimeseriesData) => {
    const significantIndices = data.significant
      .map((isSignificant, index) => isSignificant ? index : -1)
      .filter(index => index !== -1);

    // Group significant anomalies by year
    const yearlyAnomalies: { [year: number]: { anomalies: number[], z_scores: number[], dates: string[] } } = {};
    
    significantIndices.forEach(index => {
      const date = data.dates[index];
      const year = new Date(date).getFullYear();
      
      if (!yearlyAnomalies[year]) {
        yearlyAnomalies[year] = { anomalies: [], z_scores: [], dates: [] };
      }
      
      yearlyAnomalies[year].anomalies.push(data.anomalies[index]);
      yearlyAnomalies[year].z_scores.push(data.z_scores[index]);
      yearlyAnomalies[year].dates.push(date);
    });

    // Get the most significant anomaly per year
    const years = Object.keys(yearlyAnomalies).map(Number).sort();
    const annualAnomalies = years.map(year => {
      const yearData = yearlyAnomalies[year];
      // Find the anomaly with highest absolute z-score for this year
      const maxZScoreIndex = yearData.z_scores.reduce((maxIndex, zScore, index) => 
        Math.abs(zScore) > Math.abs(yearData.z_scores[maxIndex]) ? index : maxIndex, 0);
      
      return {
        year: year.toString(),
        anomaly: yearData.anomalies[maxZScoreIndex],
        z_score: yearData.z_scores[maxZScoreIndex],
        date: yearData.dates[maxZScoreIndex]
      };
    });

    return annualAnomalies;
  };

  // Prepare data based on active tab
  const getChartData = () => {
    if (activeTab === 'trends') {
      if (activeMetric === 'precipitation') {
        if (!timeseriesData.precipitation) return { labels: [], datasets: [] };
        
        const trendData = calculateTrendData(timeseriesData.precipitation);
        
        return {
          labels: trendData.years,
          datasets: [
            {
              label: 'Annual Precipitation',
              data: trendData.annualValues,
              borderColor: 'rgba(59, 130, 246, 0.4)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 1,
              fill: false,
            },
            {
              label: 'Precipitation (10Y Avg)',
              data: trendData.movingAverages,
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 5,
              borderWidth: 3,
              fill: false,
            }
          ]
        };
      } else {
        // Temperature - show all three on same chart
        const datasets = [];
        let baseYears: string[] = [];
        
        if (timeseriesData.max_temperature) {
          const maxTempData = calculateTrendData(timeseriesData.max_temperature);
          baseYears = maxTempData.years;
          
          datasets.push(
            {
              label: 'Max Temperature',
              data: maxTempData.annualValues,
              borderColor: 'rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 1,
              fill: false,
            },
            {
              label: 'Max Temp (10Y Avg)',
              data: maxTempData.movingAverages,
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 5,
              borderWidth: 3,
              fill: false,
            }
          );
        }
        
        if (timeseriesData.min_temperature) {
          const minTempData = calculateTrendData(timeseriesData.min_temperature);
          
          datasets.push(
            {
              label: 'Min Temperature',
              data: minTempData.annualValues,
              borderColor: 'rgba(16, 185, 129, 0.4)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 1,
              fill: false,
            },
            {
              label: 'Min Temp (10Y Avg)',
              data: minTempData.movingAverages,
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 5,
              borderWidth: 3,
              fill: false,
            }
          );
        }
        
        // Add average temperature
        const avgTempData = calculateAverageTemp();
        if (avgTempData) {
          const avgTrendData = calculateTrendData(avgTempData);
          
          datasets.push(
            {
              label: 'Mean Temperature',
              data: avgTrendData.annualValues,
              borderColor: 'rgba(107, 114, 128, 0.4)',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 1,
              fill: false,
            },
            {
              label: 'Mean Temp (10Y Avg)',
              data: avgTrendData.movingAverages,
              borderColor: '#6b7280',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 5,
              borderWidth: 3,
              fill: false,
            }
          );
        }
        
        return {
          labels: baseYears,
          datasets
        };
      }
    } else {
      // Anomalies - show only significant anomalies per metric
      if (activeMetric === 'precipitation' && timeseriesData.precipitation) {
        const significantAnomalies = getSignificantAnomalies(timeseriesData.precipitation);
        // Create a dataset with y values only at anomaly years, null elsewhere
        const trendData = calculateTrendData(timeseriesData.precipitation);
        const anomalyPoints = trendData.years.map(year => {
          const found = significantAnomalies.find(a => a.year === year);
          return found ? found.anomaly : null;
        });
        return {
          labels: trendData.years,
          datasets: [
            {
              label: 'Significant Precipitation Anomalies',
              data: anomalyPoints,
              borderColor: '#3b82f6',
              backgroundColor: '#3b82f6',
              pointRadius: anomalyPoints.map(v => (v !== null ? 6 : 0)) as any,
              pointHoverRadius: anomalyPoints.map(v => (v !== null ? 8 : 0)) as any,
              showLine: false,
              fill: false,
              tension: 0.1,
              borderWidth: 2,
            }
          ]
        };
      } else {
        // Temperature anomalies - show all three types
        const datasets = [];
        let baseYears: string[] = [];
        if (timeseriesData.max_temperature) {
          const maxAnomalies = getSignificantAnomalies(timeseriesData.max_temperature);
          const maxTrendData = calculateTrendData(timeseriesData.max_temperature);
          baseYears = maxTrendData.years;
          const maxPoints = maxTrendData.years.map(year => {
            const found = maxAnomalies.find(a => a.year === year);
            return found ? found.anomaly : null;
          });
          datasets.push({
            label: 'Max Temperature Anomalies',
            data: maxPoints,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: maxPoints.map(v => (v !== null ? 6 : 0)) as any,
            pointHoverRadius: maxPoints.map(v => (v !== null ? 8 : 0)) as any,
            showLine: false,
            fill: false,
            tension: 0.1,
            borderWidth: 2,
          });
        }
        if (timeseriesData.min_temperature) {
          const minAnomalies = getSignificantAnomalies(timeseriesData.min_temperature);
          const minTrendData = calculateTrendData(timeseriesData.min_temperature);
          const minPoints = minTrendData.years.map(year => {
            const found = minAnomalies.find(a => a.year === year);
            return found ? found.anomaly : null;
          });
          datasets.push({
            label: 'Min Temperature Anomalies',
            data: minPoints,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            pointRadius: minPoints.map(v => (v !== null ? 6 : 0)) as any,
            pointHoverRadius: minPoints.map(v => (v !== null ? 8 : 0)) as any,
            showLine: false,
            fill: false,
            tension: 0.1,
            borderWidth: 2,
          });
        }
        return {
          labels: baseYears,
          datasets
        };
      }
    }
  };

  const chartData = getChartData();

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
        text: activeTab === 'trends' ? 
          (activeMetric === 'precipitation' ? 
            'Annual Precipitation in Pakistan (1901–2024) with 10-Year Moving Average' : 
            'Average Annual Temperatures in Pakistan (1901–2024) with 10-Year Moving Average') :
          (activeMetric === 'precipitation' ? 
            'Significant Precipitation Anomalies in Pakistan (1901-2024)' :
            'Significant Temperature Anomalies in Pakistan (1901-2024)'),
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `Year: ${context[0].label}`;
          },
          label: (context: any) => {
            const unit = activeMetric === 'precipitation' ? 'mm' : '°C';
            
            if (activeTab === 'trends') {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}${unit}`;
            } else {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}${unit} (Significant Anomaly)`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
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
          color: '#6b7280',
          callback: function(value: any, index: number) {
            // Show every 10th year for trends to avoid crowding
            const year = parseInt(this.getLabelForValue(value));
            return activeTab === 'trends' && year % 10 === 0 ? year : (activeTab === 'anomalies' ? year : '');
          }
        }
      },
      y: {
        title: {
          display: true,
          text: activeTab === 'trends' ? 
            `${activeMetric === 'precipitation' ? 'Precipitation (mm)' : 'Temperature (°C)'}` :
            `Anomaly (${activeMetric === 'precipitation' ? 'mm' : '°C'})`,
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

  // Calculate summary statistics for anomalies
  const getStats = () => {
    if (activeTab !== 'anomalies') return null;
    
    if (activeMetric === 'precipitation' && timeseriesData.precipitation) {
      const significantAnomalies = getSignificantAnomalies(timeseriesData.precipitation);
      return {
        total: significantAnomalies.length,
        positive: significantAnomalies.filter(a => a.anomaly > 0).length,
        negative: significantAnomalies.filter(a => a.anomaly < 0).length
      };
    } else {
      const maxAnomalies = timeseriesData.max_temperature ? getSignificantAnomalies(timeseriesData.max_temperature) : [];
      const minAnomalies = timeseriesData.min_temperature ? getSignificantAnomalies(timeseriesData.min_temperature) : [];
      
      return {
        maxTemp: maxAnomalies.length,
        minTemp: minAnomalies.length,
        total: maxAnomalies.length + minAnomalies.length
      };
    }
  };

  const stats = getStats();

  return (
    <div className="card animate-slide-up">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-800">
          📊 Weather Analysis Dashboard
        </h3>
        
        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'trends'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📈 Trends
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'anomalies'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🚨 Anomalies
          </button>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-gray-50 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveMetric('precipitation')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'precipitation'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🌧️ Precipitation
          </button>
          <button
            onClick={() => setActiveMetric('temperature')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMetric === 'temperature'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🌡️ Temperature
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 mb-6">
        <Line data={chartData} options={options} />
      </div>

      {/* Summary Statistics */}
      {activeTab === 'anomalies' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          {activeMetric === 'precipitation' ? (
            <>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Total Significant</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-500">Anomalies</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Wet Anomalies</p>
                <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
                <p className="text-xs text-gray-500">Above normal</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Dry Anomalies</p>
                <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
                <p className="text-xs text-gray-500">Below normal</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Max Temp Anomalies</p>
                <p className="text-2xl font-bold text-red-600">{stats.maxTemp}</p>
                <p className="text-xs text-gray-500">Significant events</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Min Temp Anomalies</p>
                <p className="text-2xl font-bold text-green-600">{stats.minTemp}</p>
                <p className="text-xs text-gray-500">Significant events</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Detection Threshold</p>
                <p className="text-2xl font-bold text-gray-600">|Z| ≥ 2.0</p>
                <p className="text-xs text-gray-500">Statistical significance</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Trend Statistics */}
      {activeTab === 'trends' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-center">
            <p className="font-semibold text-gray-700">Long-term Climate Trends (1901-2024)</p>
            <p className="text-sm text-gray-600 mt-2">
              {activeMetric === 'precipitation' ? (
                <>📈 <strong>Annual Data:</strong> Light line shows yearly averages<br/>
                📊 <strong>10-Year Moving Average:</strong> Bold line shows smoothed long-term trends</>
              ) : (
                <>🌡️ <strong>Combined View:</strong> Max, Min, and Mean temperatures with 10-year moving averages<br/>
                📊 <strong>Climate Patterns:</strong> Bold lines show long-term warming trends</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          {activeTab === 'trends' ? (
            activeMetric === 'precipitation' ? 
              <><strong>Trends View:</strong> Shows annual precipitation averages and 10-year moving averages to reveal long-term climate patterns.</> :
              <><strong>Temperature Trends:</strong> Shows max, min, and mean annual temperatures with 10-year smoothing to reveal warming patterns.</>
          ) : (
            <><strong>Anomalies View:</strong> Shows only statistically significant anomalies (|Z-score| ≥ 2.0) - one per year when they occur. These are actual climate anomalies, not normal variations.</>
          )}
        </p>
      </div>
    </div>
  );
};

export default WeatherTrends; 