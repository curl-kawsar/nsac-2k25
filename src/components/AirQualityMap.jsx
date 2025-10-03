'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function AirQualityMap({ 
  airQualityResults,
  onLocationSelect 
}) {
  console.log('AirQualityMap received results:', airQualityResults);
  
  const [isClient, setIsClient] = useState(false);
  const [airQualityStations, setAirQualityStations] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Memoize air quality stations for performance
  const memoizedAirQualityStations = useMemo(() => {
    console.log('AirQualityMap: Processing air quality results:', airQualityResults);
    const stations = airQualityResults?.stations || [];
    console.log('AirQualityMap: Extracted stations:', stations);
    return stations;
  }, [airQualityResults]);

  // Auto-fit bounds to show all air quality stations
  const autoFitBounds = useCallback((stations) => {
    if (stations.length > 0 && mapRef.current) {
      const timeoutId = setTimeout(() => {
        const map = mapRef.current;
        if (map && stations.length > 0) {
          try {
            const L = require('leaflet');
            const bounds = stations.map(station => [station.location.lat, station.location.lng]);
            const latLngBounds = L.latLngBounds(bounds);
            map.fitBounds(latLngBounds, { 
              padding: [20, 20],
              maxZoom: 14,
              animate: true,
              duration: 0.5
            });
          } catch (error) {
            console.warn('Error fitting bounds:', error);
          }
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    console.log('AirQualityMap: Stations effect triggered:', memoizedAirQualityStations);
    if (memoizedAirQualityStations.length > 0) {
      setAirQualityStations(memoizedAirQualityStations);
      console.log(`AirQualityMap: ${memoizedAirQualityStations.length} air quality stations loaded`);
      console.log('AirQualityMap: Stations data:', memoizedAirQualityStations);
      autoFitBounds(memoizedAirQualityStations);
    } else {
      console.log('AirQualityMap: No air quality stations to display');
      setAirQualityStations([]);
    }
  }, [memoizedAirQualityStations, autoFitBounds]);

  // Get map center from air quality results or default
  const getMapCenter = () => {
    if (airQualityResults?.searchArea) {
      return [airQualityResults.searchArea.lat, airQualityResults.searchArea.lon];
    }
    if (airQualityStations.length > 0) {
      return [airQualityStations[0].location.lat, airQualityStations[0].location.lng];
    }
    return [23.8103, 90.4125]; // Dhaka default
  };

  if (!isClient) {
    return (
      <div className="relative w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">☁️</div>
          <div className="text-gray-600">Loading Air Quality Map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full rounded-lg overflow-hidden">
        <MapContainer
          center={getMapCenter()}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          preferCanvas={true}
          zoomControl={true}
          attributionControl={true}
          maxZoom={18}
          minZoom={3}
          worldCopyJump={true}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
        >
          {/* Satellite Tile Layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={18}
            tileSize={256}
            zoomOffset={0}
            updateWhenIdle={true}
            updateWhenZooming={false}
            keepBuffer={2}
            maxNativeZoom={18}
          />
          
          {/* Street Labels Overlay */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={18}
            opacity={0.8}
          />

          {/* Search Area Circle */}
          {airQualityResults?.searchArea && (
            <Circle
              center={[airQualityResults.searchArea.lat, airQualityResults.searchArea.lon]}
              radius={5000} // 5km radius
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
                opacity: 0.6,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#3b82f6', fontSize: '14px' }}>🎯 Search Area</h3>
                  <div style={{ fontSize: '12px' }}>
                    <div><strong>City:</strong> {airQualityResults.city}</div>
                    <div><strong>Date:</strong> {airQualityResults.date}</div>
                    <div><strong>AQI:</strong> {airQualityResults.aqi}</div>
                  </div>
                </div>
              </Popup>
            </Circle>
          )}

          {/* Air Quality Stations */}
          {console.log('AirQualityMap: About to render stations:', airQualityStations.length)}
          {airQualityStations.map((station, index) => {
            console.log(`AirQualityMap: Rendering station ${index}:`, station);
            const aqi = station.aqi || 50;
            const radius = Math.max(10, Math.min(25, aqi / 8)); // Larger radius for better visibility
            const color = aqi <= 50 ? '#16a34a' :   // Good - Green
                         aqi <= 100 ? '#eab308' :  // Moderate - Yellow
                         aqi <= 150 ? '#ea580c' :  // Unhealthy for Sensitive - Orange
                         aqi <= 200 ? '#dc2626' :  // Unhealthy - Red
                         aqi <= 300 ? '#7c3aed' :  // Very Unhealthy - Purple
                         '#991b1b';                // Hazardous - Dark Red
            
            return (
              <CircleMarker
                key={`air-quality-${index}-${station.location.lat}-${station.location.lng}`}
                center={[station.location.lat, station.location.lng]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.8,
                  weight: 3,
                  opacity: 1
                }}
              >
                <Popup>
                  <div style={{ padding: '12px', textAlign: 'center', minWidth: '250px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: color, fontSize: '16px' }}>☁️ {station.name}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '8px' }}>
                      <div><strong>AQI:</strong> <span style={{ color: color, fontWeight: 'bold' }}>{aqi}</span></div>
                      <div><strong>Category:</strong> {station.category}</div>
                    </div>
                    {station.measurements && (
                      <div style={{ marginTop: '12px', fontSize: '12px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Pollutant Levels:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                          {station.measurements.pm25 && <div><strong>PM2.5:</strong> {station.measurements.pm25.toFixed(1)} µg/m³</div>}
                          {station.measurements.o3 && <div><strong>O₃:</strong> {station.measurements.o3.toFixed(1)} µg/m³</div>}
                          {station.measurements.no2 && <div><strong>NO₂:</strong> {station.measurements.no2.toFixed(1)} µg/m³</div>}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                      📍 {station.location.lat.toFixed(4)}, {station.location.lng.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      Status: {station.status} • Updated: {new Date(station.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Fallback message when no stations */}
          {airQualityStations.length === 0 && airQualityResults && (
            <CircleMarker
              center={getMapCenter()}
              radius={15}
              pathOptions={{
                color: '#6b7280',
                fillColor: '#6b7280',
                fillOpacity: 0.5,
                weight: 2,
                opacity: 1,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div style={{ padding: '12px', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '14px' }}>ℹ️ Air Quality Data</h3>
                  <div style={{ fontSize: '12px' }}>
                    <div><strong>City:</strong> {airQualityResults.city}</div>
                    <div><strong>AQI:</strong> {airQualityResults.aqi}</div>
                    <div><strong>Category:</strong> {airQualityResults.category}</div>
                    <div><strong>Driver:</strong> {airQualityResults.driver}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                    No monitoring stations generated for this location
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>

      {/* Air Quality Legend */}
      {(airQualityStations.length > 0 || airQualityResults) && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg text-xs shadow-lg border">
          <div className="font-semibold mb-2 text-gray-800">☁️ Air Quality Index</div>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>
              <span className="text-gray-700">0-50 Good</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <span className="text-gray-700">51-100 Moderate</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-600 mr-2"></div>
              <span className="text-gray-700">101-150 Unhealthy</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
              <span className="text-gray-700">151-200 Very Unhealthy</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-600 mr-2"></div>
              <span className="text-gray-700">201-300 Hazardous</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-900 mr-2"></div>
              <span className="text-gray-700">300+ Dangerous</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-300">
            <div className="text-gray-600 text-xs">
              Stations: {airQualityStations.length}
              {airQualityResults && (
                <div>City AQI: <span className="font-semibold">{airQualityResults.aqi}</span></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Overlay */}
      {airQualityResults && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
          <div className="text-sm font-semibold text-gray-800 mb-1">
            🌍 {airQualityResults.city}
          </div>
          <div className="text-xs text-gray-600">
            <div>Date: {airQualityResults.date}</div>
            <div>AQI: <span className="font-semibold">{airQualityResults.aqi}</span></div>
            <div>Status: <span className="font-semibold">{airQualityResults.category}</span></div>
            <div>Driver: <span className="font-semibold">{airQualityResults.driver}</span></div>
          </div>
          {airQualityResults.meta && (
            <div className="text-xs text-gray-500 mt-1 pt-1 border-t">
              Source: {airQualityResults.meta.source || 'NASA API'}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {!isClient && (
        <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">☁️</div>
            <div className="text-gray-600">Loading Air Quality Map...</div>
          </div>
        </div>
      )}
    </div>
  );
}
