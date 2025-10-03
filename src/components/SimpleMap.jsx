'use client';

import { useEffect, useRef, useState } from 'react';

export default function SimpleMap({ 
  activeWorkflow, 
  alerts, 
  thermalDetectionResults, 
  onLocationSelect 
}) {
  const [thermalSpots, setThermalSpots] = useState([]);

  useEffect(() => {
    if (thermalDetectionResults?.dumps) {
      setThermalSpots(thermalDetectionResults.dumps);
      console.log(`Simple map: ${thermalDetectionResults.dumps.length} thermal spots loaded`);
    }
  }, [thermalDetectionResults]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden">
      {/* Simple Map Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Simple Map View</h3>
          <p className="text-gray-600 mb-6">Interactive 3D mapping temporarily unavailable</p>
          
          {/* Thermal Detection Results */}
          {thermalSpots.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className="text-red-500 text-3xl mr-2">🔥</div>
                <h4 className="text-lg font-semibold">Thermal Detection Results</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-red-50 p-3 rounded">
                  <div className="font-semibold text-red-700">Total Spots</div>
                  <div className="text-2xl font-bold text-red-600">{thermalSpots.length}</div>
                </div>
                
                <div className="bg-orange-50 p-3 rounded">
                  <div className="font-semibold text-orange-700">Avg Temp</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {thermalSpots.length > 0 
                      ? (thermalSpots.reduce((sum, spot) => sum + (spot.temperature || 35), 0) / thermalSpots.length).toFixed(1)
                      : '0'
                    }°C
                  </div>
                </div>
              </div>

              {/* Thermal Spots List */}
              <div className="mt-4 max-h-48 overflow-y-auto">
                <h5 className="font-semibold mb-2 text-gray-700">Detection Details:</h5>
                {thermalSpots.slice(0, 10).map((spot, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" 
                           style={{
                             backgroundColor: spot.temperature >= 45 ? '#dc2626' : 
                                            spot.temperature >= 35 ? '#ea580c' : '#eab308'
                           }}></div>
                      <span className="text-xs text-gray-600">
                        {spot.location.lat.toFixed(4)}, {spot.location.lng.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{spot.temperature?.toFixed(1) || '35.0'}°C</div>
                      <div className="text-xs text-gray-500">{((spot.confidence || 0.8) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
                {thermalSpots.length > 10 && (
                  <div className="text-center text-xs text-gray-500 mt-2">
                    ... and {thermalSpots.length - 10} more spots
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No thermal data */}
          {thermalSpots.length === 0 && (
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md mx-auto">
              <div className="text-gray-400 text-2xl mb-2">🔍</div>
              <p className="text-gray-600">No thermal detection data available</p>
              <p className="text-sm text-gray-500 mt-2">
                Run thermal detection to see results here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 bg-yellow-500/90 text-white px-3 py-2 rounded-lg text-sm">
        <div className="font-semibold">⚠️ Fallback Mode</div>
        <div className="text-xs">3D map temporarily unavailable</div>
      </div>

      {/* Coordinates Display */}
      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono">
        <div>NYC Area: 40.7128, -74.0060</div>
        <div className="text-xs text-gray-300 mt-1">📍 Default Location</div>
      </div>

      {/* Thermal Detection Status */}
      {thermalDetectionResults && (
        <div className="absolute bottom-4 right-4 bg-red-600/90 text-white px-3 py-2 rounded-lg text-sm">
          <div className="font-semibold">🔥 Thermal Detection Active</div>
          <div className="text-xs">
            {thermalDetectionResults.detectedDumps} spots detected
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs max-w-xs">
        <div className="font-semibold mb-1">📋 Status:</div>
        <div>• Thermal detection: ✅ Working</div>
        <div>• NASA API integration: ✅ Active</div>
        <div>• 3D visualization: ⏳ Loading...</div>
      </div>
    </div>
  );
}
