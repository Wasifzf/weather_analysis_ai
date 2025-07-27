import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Radar, ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart } from 'recharts';
import { Anomaly } from '../types';
import { CloudRain, Droplets, Sun } from 'lucide-react';

interface PrecipitationRadarProps {
  anomalies: Anomaly[];
}

const PrecipitationRadar: React.FC<PrecipitationRadarProps> = ({ anomalies }) => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Pakistan's typical monthly precipitation (mm)
  const historicalPrecipitation = [
    15, 20, 30, 25, 15, 60, 150, 120, 80, 10, 5, 10
  ];

  const radarData = useMemo(() => {
    const monthlyData = monthNames.map((month, index) => {
      const historical = historicalPrecipitation[index];
      
      // Find precipitation anomalies for this month
      const monthAnomalies = anomalies.filter(anomaly => 
        anomaly.data_type === 'precipitation' && 
        anomaly.description.toLowerCase().includes(month.toLowerCase())
      );

      // Calculate current precipitation based on anomalies
      let current = historical;
      if (monthAnomalies.length > 0) {
        const avgAnomaly = monthAnomalies.reduce((sum, a) => sum + a.z_score, 0) / monthAnomalies.length;
        const stdDev = historical * 0.3; // Rough estimate
        current = Math.max(0, historical + (avgAnomaly * stdDev));
      }

      const deviation = ((current - historical) / historical) * 100;
      
      return {
        month,
        historical,
        current: Math.round(current),
        deviation: Math.round(deviation),
        severity: Math.abs(deviation) > 50 ? 'extreme' : 
                 Math.abs(deviation) > 25 ? 'high' : 
                 Math.abs(deviation) > 10 ? 'medium' : 'low',
        isDrought: current < historical * 0.5,
        isFlood: current > historical * 2
      };
    });

    return monthlyData;
  }, [anomalies]);

  const maxValue = Math.max(...radarData.map(d => Math.max(d.historical, d.current)));

  const getSeasonalContext = (monthIndex: number) => {
    if (monthIndex >= 5 && monthIndex <= 8) return 'Monsoon Season';
    if (monthIndex >= 11 || monthIndex <= 1) return 'Winter (Dry)';
    if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
    return 'Post-Monsoon';
  };

  const droughtMonths = radarData.filter(d => d.isDrought).length;
  const floodMonths = radarData.filter(d => d.isFlood).length;
  const extremeMonths = radarData.filter(d => d.severity === 'extreme').length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          🌧️ Precipitation Radar Analysis
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Historical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Current</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar Chart */}
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, maxValue * 1.1]}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
              />
              <Radar
                name="Historical Average"
                dataKey="historical"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Radar
                name="Current Pattern"
                dataKey="current"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Indicators */}
        <div className="space-y-4">
          {/* Alert Summary */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg"
          >
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <CloudRain className="w-5 h-5" />
              Precipitation Status
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Drought Risk:</span>
                <span className={`font-semibold ${droughtMonths > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {droughtMonths} month{droughtMonths !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Flood Risk:</span>
                <span className={`font-semibold ${floodMonths > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {floodMonths} month{floodMonths !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Extreme Deviations:</span>
                <span className={`font-semibold ${extremeMonths > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                  {extremeMonths} month{extremeMonths !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Seasonal Patterns */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg"
          >
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Droplets className="w-5 h-5" />
              Seasonal Insights
            </h4>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                <span>Monsoon (Jun-Sep): {
                  radarData.slice(5, 9).reduce((sum, d) => sum + d.current, 0)
                }mm total</span>
              </div>
              <div className="text-xs text-green-600">
                Normal monsoon: {radarData.slice(5, 9).reduce((sum, d) => sum + d.historical, 0)}mm
              </div>
            </div>
          </motion.div>

          {/* Monthly Extremes */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg"
          >
            <h4 className="font-semibold text-purple-800 mb-3">
              Notable Deviations
            </h4>
            <div className="space-y-2 text-sm">
              {radarData
                .filter(d => Math.abs(d.deviation) > 25)
                .slice(0, 3)
                .map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-purple-700">{month.month}:</span>
                    <span className={`font-semibold ${
                      month.deviation > 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {month.deviation > 0 ? '+' : ''}{month.deviation}%
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Monthly Detail Cards */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {radarData.map((month, index) => (
          <motion.div
            key={month.month}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-3 rounded-lg border-2 ${
              month.isDrought ? 'border-orange-300 bg-orange-50' :
              month.isFlood ? 'border-blue-300 bg-blue-50' :
              Math.abs(month.deviation) > 25 ? 'border-purple-300 bg-purple-50' :
              'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold text-gray-800">{month.month}</div>
              <div className="text-2xl font-bold text-gray-900 my-1">
                {month.current}
                <span className="text-xs text-gray-500 ml-1">mm</span>
              </div>
              <div className="text-xs text-gray-600">
                vs {month.historical}mm normal
              </div>
              <div className={`text-xs font-semibold mt-1 ${
                month.deviation > 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {month.deviation > 0 ? '+' : ''}{month.deviation}%
              </div>
              {month.isDrought && (
                <div className="text-xs text-orange-600 font-semibold mt-1">DROUGHT</div>
              )}
              {month.isFlood && (
                <div className="text-xs text-blue-600 font-semibold mt-1">FLOOD RISK</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PrecipitationRadar; 