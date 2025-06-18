import React from 'react';
import Spinner from './Spinner';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      {/* Logo with Pulse Animation */}
      
      {/* Spinner */}
      <Spinner 
        size="lg" 
        variant="primary" 
        className="mb-4 text-[#0052B4]" 
      />
      
      {/* Loading Message and Progress Bar Container */}
      <div className="text-center flex flex-col items-center space-y-3 w-full max-w-xs">
        <h3 className="text-xl font-semibold text-[#0052B4] animate-fade-in">
          {message}
        </h3>
        
        {/* Progress Bar - Now centered with the text and spinner */}
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-[#0052B4] via-[#0066ff] to-[#ED0000] animate-loading-progress"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;