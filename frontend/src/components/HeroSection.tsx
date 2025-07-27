import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Thermometer, CloudRain, Wind } from 'lucide-react';
import { WeatherSummary, Anomaly } from '../types';

interface HeroSectionProps {
  summary: WeatherSummary | null;
  anomalies: Anomaly[];
  loading: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ summary, anomalies, loading }) => {
  const activeAnomalies = anomalies.filter(a => a.severity === 'extreme' || a.severity === 'high');
  const currentTemp = summary ? summary.avg_temperature : 0;
  const normalTemp = 27.98; // Historical average from your data
  const tempDeviation = currentTemp - normalTemp;

  const getSeverityColor = (count: number) => {
    if (count >= 10) return 'bg-red-500';
    if (count >= 5) return 'bg-orange-500';
    if (count >= 1) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSeverityText = (count: number) => {
    if (count >= 10) return 'EXTREME RISK';
    if (count >= 5) return 'HIGH RISK';
    if (count >= 1) return 'MODERATE RISK';
    return 'NORMAL CONDITIONS';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-800 text-white p-8 rounded-2xl mb-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="h-16 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-800 text-white p-8 rounded-2xl mb-8 relative overflow-hidden"
    >
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-16 h-16 bg-white rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-10 left-1/3 w-12 h-12 bg-white rounded-full animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Live Anomaly Counter */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-8 h-8 mr-2 text-yellow-300" />
              <h3 className="text-lg font-semibold">Active Anomalies</h3>
            </div>
            <div className="text-6xl font-bold mb-2">
              {activeAnomalies.length}
            </div>
            <p className="text-blue-100">Currently Detected</p>
          </motion.div>

          {/* Current vs Normal Widget */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-2">
              <Thermometer className="w-8 h-8 mr-2 text-red-300" />
              <h3 className="text-lg font-semibold">Temperature Status</h3>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <div className="text-3xl font-bold">{currentTemp.toFixed(1)}°C</div>
                <p className="text-blue-100">Current Avg</p>
              </div>
              <div className="text-2xl">vs</div>
              <div>
                <div className="text-3xl font-bold text-blue-200">{normalTemp}°C</div>
                <p className="text-blue-100">Historical</p>
              </div>
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
              tempDeviation > 2 ? 'bg-red-500' : 
              tempDeviation > 0 ? 'bg-orange-500' : 
              tempDeviation < -2 ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {tempDeviation > 0 ? '+' : ''}{tempDeviation.toFixed(1)}°C deviation
            </div>
          </motion.div>

          {/* Severity Alert Bar */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-2">
              <Wind className="w-8 h-8 mr-2 text-green-300" />
              <h3 className="text-lg font-semibold">Risk Level</h3>
            </div>
            <div className={`${getSeverityColor(activeAnomalies.length)} text-white px-6 py-4 rounded-xl font-bold text-xl mb-2`}>
              {getSeverityText(activeAnomalies.length)}
            </div>
            <div className="grid grid-cols-4 gap-1 mt-4">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-2 rounded ${
                    i < Math.min(activeAnomalies.length, 20) 
                      ? getSeverityColor(activeAnomalies.length)
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <p className="text-blue-100 text-sm mt-2">
              {summary?.total_records.toLocaleString()} records analyzed
            </p>
          </motion.div>
        </div>

        {/* Quick Stats Row */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center"
        >
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{summary?.total_records || 0}</div>
            <div className="text-blue-200 text-sm">Total Records</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">{anomalies.length}</div>
            <div className="text-blue-200 text-sm">Anomalies Found</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">123</div>
            <div className="text-blue-200 text-sm">Years of Data</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl font-bold">
              {anomalies.filter(a => a.severity === 'extreme').length}
            </div>
            <div className="text-blue-200 text-sm">Extreme Events</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HeroSection; 