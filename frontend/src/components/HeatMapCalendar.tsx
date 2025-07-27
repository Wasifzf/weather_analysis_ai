import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Anomaly } from '../types';

interface HeatMapCalendarProps {
  anomalies: Anomaly[];
  year?: number;
}

const HeatMapCalendar: React.FC<HeatMapCalendarProps> = ({ anomalies, year = 2024 }) => {
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [hoveredDay, setHoveredDay] = useState<any>(null);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Process anomalies into calendar data
  const calendarData = useMemo(() => {
    const data: { [key: string]: { anomalies: Anomaly[], maxDeviation: number, color: string } } = {};
    
    // Initialize all days of the year
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        data[dateKey] = { anomalies: [], maxDeviation: 0, color: '#ebedf0' };
      }
    }

    // Add anomaly data
    anomalies.forEach(anomaly => {
      // Extract year and month from anomaly description
      const yearMatch = anomaly.description.match(/(\d{4})/);
      const monthMatch = anomaly.description.match(/(\w+)\s+(\d{4})/);
      
      if (yearMatch && monthMatch) {
        const anomalyYear = parseInt(yearMatch[1]);
        const monthName = monthMatch[1];
        const monthIndex = monthNames.findIndex(m => monthName.includes(m)) + 1;
        
        if (anomalyYear >= year - 5 && anomalyYear <= year && monthIndex > 0) {
          // Assign to a random day in that month for demo purposes
          const daysInMonth = new Date(anomalyYear, monthIndex, 0).getDate();
          const randomDay = Math.floor(Math.random() * daysInMonth) + 1;
          const dateKey = `${anomalyYear}-${monthIndex.toString().padStart(2, '0')}-${randomDay.toString().padStart(2, '0')}`;
          
          if (data[dateKey]) {
            data[dateKey].anomalies.push(anomaly);
            data[dateKey].maxDeviation = Math.max(data[dateKey].maxDeviation, Math.abs(anomaly.z_score));
            
            // Color based on deviation intensity
            const absZScore = Math.abs(anomaly.z_score);
            if (absZScore >= 3) {
              data[dateKey].color = anomaly.data_type === 'temperature' ? '#b91c1c' : '#1e40af'; // Red for hot, blue for cold
            } else if (absZScore >= 2) {
              data[dateKey].color = anomaly.data_type === 'temperature' ? '#dc2626' : '#2563eb';
            } else if (absZScore >= 1.5) {
              data[dateKey].color = anomaly.data_type === 'temperature' ? '#f59e0b' : '#3b82f6';
            } else {
              data[dateKey].color = '#10b981'; // Green for mild
            }
          }
        }
      }
    });

    return data;
  }, [anomalies, year]);

  const getWeeksInYear = (year: number) => {
    const weeks = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Find the first Sunday of the year (or the year start if it's Sunday)
    const firstSunday = new Date(startDate);
    while (firstSunday.getDay() !== 0) {
      firstSunday.setDate(firstSunday.getDate() - 1);
    }

    const currentDate = new Date(firstSunday);
    while (currentDate <= endDate || weeks.length < 53) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
        const dayData = calendarData[dateKey] || { anomalies: [], maxDeviation: 0, color: '#ebedf0' };
        
        week.push({
          date: new Date(currentDate),
          dateKey,
          ...dayData,
          isCurrentYear: currentDate.getFullYear() === year
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
      if (currentDate.getFullYear() > year) break;
    }
    
    return weeks;
  };

  const weeks = getWeeksInYear(year);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          🗓️ Temperature Anomaly Calendar - {year}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8"></div> {/* Space for day labels */}
            {monthNames.map((month, index) => (
              <div key={month} className="text-xs text-gray-600 text-center" style={{ width: `${(weeks.length / 12) * 12}px` }}>
                {index % 2 === 0 ? month : ''}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col mr-2">
              <div className="h-3"></div>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={day} className="text-xs text-gray-600 h-3 leading-3 mb-1">
                  {index % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>

            {/* Heat map */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <motion.div
                      key={day.dateKey}
                      className="w-3 h-3 rounded-sm cursor-pointer border border-gray-300"
                      style={{ backgroundColor: day.isCurrentYear ? day.color : '#f3f4f6' }}
                      whileHover={{ scale: 1.2 }}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => setSelectedDay(day)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && hoveredDay.anomalies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm max-w-xs"
          style={{
            left: '50%',
            top: '100%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredDay.date.toLocaleDateString()}
          </div>
          <div className="text-gray-300">
            {hoveredDay.anomalies.length} anomal{hoveredDay.anomalies.length === 1 ? 'y' : 'ies'} detected
          </div>
          {hoveredDay.anomalies.slice(0, 2).map((anomaly, index) => (
            <div key={index} className="mt-1 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                anomaly.severity === 'extreme' ? 'bg-red-500' :
                anomaly.severity === 'high' ? 'bg-orange-500' :
                anomaly.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></span>
              {anomaly.data_type} anomaly (Z: {anomaly.z_score.toFixed(1)})
            </div>
          ))}
        </motion.div>
      )}

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded-sm"></div>
          <span>No anomalies</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded-sm"></div>
          <span>Mild (1.5-2.0σ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
          <span>Moderate (2.0-2.5σ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded-sm"></div>
          <span>Extreme (>2.5σ)</span>
        </div>
      </div>
    </div>
  );
};

export default HeatMapCalendar; 