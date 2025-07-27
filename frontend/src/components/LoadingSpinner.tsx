import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="card text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Weather Data</h2>
      <p className="text-gray-500">Analyzing 123 years of climate data...</p>
    </div>
  );
};

export default LoadingSpinner; 