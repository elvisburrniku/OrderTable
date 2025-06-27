
import React from 'react';

interface StandardLoadingProps {
  message?: string;
  showLogo?: boolean;
}

export function StandardLoading({ 
  message = "Loading...", 
  showLogo = true 
}: StandardLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {showLogo && (
          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-white font-bold text-xl">RT</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">ReadyTable</h2>
          </div>
        )}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}
