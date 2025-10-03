'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });

export default function LeafletMap({ 
  activeWorkflow, 
  alerts, 
  thermalDetectionResults,
  airQualityResults,
  healthcareResults, 
  onLocationSelect 
}) {
  console.log('LeafletMap props received:', {
    activeWorkflow,
    thermalDetectionResults: !!thermalDetectionResults,
    airQualityResults: !!airQualityResults,
    healthcareResults: !!healthcareResults
  });
  console.log('Air quality results prop:', airQualityResults);
  const [isClient, setIsClient] = useState(false);
  const [thermalSpots, setThermalSpots] = useState([]);
  const [airQualityStations, setAirQualityStations] = useState([]);
  
  // Test air quality station for debugging
  const testAirQualityStation = {
    id: 'test_station',
    name: 'Test Air Quality Station',
    location: { lat: 40.7128, lng: -74.0060 },
    aqi: 85,
    category: 'Moderate',
    measurements: { pm25: 25, o3: 45, no2: 15 },
    status: 'operational'
  };
  const [healthcareFacilities, setHealthcareFacilities] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Memoize thermal spots for performance
  const memoizedThermalSpots = useMemo(() => {
    return thermalDetectionResults?.dumps || [];
  }, [thermalDetectionResults?.dumps]);

  // Memoize air quality stations for performance
  const memoizedAirQualityStations = useMemo(() => {
    console.log('LeafletMap: Processing air quality results:', airQualityResults);
    const stations = airQualityResults?.stations || [];
    console.log('LeafletMap: Extracted stations:', stations);
    return stations;
  }, [airQualityResults]);

  // Memoize healthcare facilities for performance
  const memoizedHealthcareFacilities = useMemo(() => {
    const facilities = [];
    
    // Add existing facilities
    if (healthcareResults?.existingFacilities?.facilities) {
      healthcareResults.existingFacilities.facilities.forEach(facility => {
        facilities.push({
          ...facility,
          type: 'existing',
          facilityType: facility.type || 'healthcare'
        });
      });
    }
    
    // Add recommended new facilities
    if (healthcareResults?.recommendations?.newFacilities) {
      healthcareResults.recommendations.newFacilities.forEach(facility => {
        facilities.push({
          id: `recommended_${facility.rank}`,
          name: `Recommended ${facility.recommendedType || 'Healthcare'} Facility`,
          lat: facility.coordinates?.lat,
          lon: facility.coordinates?.lon,
          type: 'recommended',
          facilityType: facility.recommendedType || 'healthcare',
          rank: facility.rank,
          populationServed: facility.expectedImpact?.populationServed,
          priority: facility.expectedImpact?.priorityScore,
          estimatedCost: facility.implementation?.estimatedCost
        });
      });
    }
    
    return facilities.filter(f => f.lat && f.lon);
  }, [healthcareResults]);

  // Optimized auto-fit function
  const autoFitBounds = useCallback((spots, type = 'thermal') => {
    if (spots.length > 0 && mapRef.current) {
      const timeoutId = setTimeout(() => {
        const map = mapRef.current;
        if (map && spots.length > 0) {
          try {
            const L = require('leaflet');
            let bounds;
            
            // Handle different data structures
            if (type === 'airquality') {
              bounds = spots.map(station => [station.location.lat, station.location.lng]);
            } else if (type === 'healthcare') {
              bounds = spots.map(facility => [facility.lat, facility.lon]);
            } else {
              // Default thermal spots structure
              bounds = spots.map(spot => [spot.location.lat, spot.location.lng]);
            }
            
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
      }, 500); // Reduced timeout for faster response
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    if (memoizedThermalSpots.length > 0) {
      setThermalSpots(memoizedThermalSpots);
      console.log(`Leaflet map: ${memoizedThermalSpots.length} thermal spots loaded`);
      autoFitBounds(memoizedThermalSpots, 'thermal');
    }
  }, [memoizedThermalSpots, autoFitBounds]);

  useEffect(() => {
    console.log('Air quality stations effect triggered:', memoizedAirQualityStations);
    if (memoizedAirQualityStations.length > 0) {
      setAirQualityStations(memoizedAirQualityStations);
      console.log(`Leaflet map: ${memoizedAirQualityStations.length} air quality stations loaded`);
      console.log('Air quality stations data:', memoizedAirQualityStations);
      autoFitBounds(memoizedAirQualityStations, 'airquality');
    } else {
      console.log('No air quality stations to display');
      setAirQualityStations([]);
    }
  }, [memoizedAirQualityStations, autoFitBounds]);

  useEffect(() => {
    if (memoizedHealthcareFacilities.length > 0) {
      setHealthcareFacilities(memoizedHealthcareFacilities);
      console.log(`Leaflet map: ${memoizedHealthcareFacilities.length} healthcare facilities loaded`);
      autoFitBounds(memoizedHealthcareFacilities, 'healthcare');
    }
  }, [memoizedHealthcareFacilities, autoFitBounds]);

  // Custom icon for thermal spots
  const createThermalIcon = (temperature) => {
    if (typeof window === 'undefined') return null;
    
    const L = require('leaflet');
    const color = temperature >= 45 ? '#dc2626' : 
                  temperature >= 35 ? '#ea580c' : '#eab308';
    
    return L.divIcon({
      html: `<div style="
        background: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">🔥</div>`,
      className: 'thermal-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Custom icon for air quality stations
  const createAirQualityIcon = (aqi) => {
    if (typeof window === 'undefined') return null;
    
    const L = require('leaflet');
    const color = aqi <= 50 ? '#16a34a' :   // Good - Green
                 aqi <= 100 ? '#eab308' :  // Moderate - Yellow
                 aqi <= 150 ? '#ea580c' :  // Unhealthy for Sensitive - Orange
                 aqi <= 200 ? '#dc2626' :  // Unhealthy - Red
                 aqi <= 300 ? '#7c3aed' :  // Very Unhealthy - Purple
                 '#991b1b';                // Hazardous - Dark Red
    
    return L.divIcon({
      html: `<div style="
        background: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">☁️</div>`,
      className: 'air-quality-marker',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  };

  // Create healthcare facility icon
  const createHealthcareIcon = (facility) => {
    if (typeof window === 'undefined') return null;
    
    const L = require('leaflet');
    const isRecommended = facility.type === 'recommended';
    const facilityType = facility.facilityType || 'healthcare';
    
    // Colors based on facility type and status
    const colors = {
      hospital: isRecommended ? '#dc2626' : '#7c2d12',
      clinic: isRecommended ? '#2563eb' : '#1e3a8a',
      pharmacy: isRecommended ? '#16a34a' : '#14532d',
      emergency: isRecommended ? '#ea580c' : '#9a3412',
      healthcare: isRecommended ? '#7c3aed' : '#581c87'
    };
    
    const color = colors[facilityType] || colors.healthcare;
    
    // Icons based on facility type
    const icons = {
      hospital: '🏥',
      clinic: '🏢',
      pharmacy: '💊',
      emergency: '🚑',
      healthcare: '⚕️'
    };
    
    const icon = icons[facilityType] || icons.healthcare;
    
    return L.divIcon({
      html: `<div style="
        background: ${color};
        width: ${isRecommended ? '28px' : '24px'};
        height: ${isRecommended ? '28px' : '24px'};
        border-radius: 50%;
        border: ${isRecommended ? '3px' : '2px'} solid ${isRecommended ? '#fbbf24' : 'white'};
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isRecommended ? '14px' : '12px'};
      ">${icon}</div>`,
      className: `healthcare-facility-marker ${isRecommended ? 'recommended' : 'existing'}`,
      iconSize: isRecommended ? [28, 28] : [24, 24],
      iconAnchor: isRecommended ? [14, 14] : [12, 12]
    });
  };

  if (!isClient) {
    return (
      <div className="relative w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <div className="text-gray-600">Loading Map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full rounded-lg overflow-hidden">
        <MapContainer
          center={[40.7128, -74.006]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          preferCanvas={true}
          zoomControl={false}
          attributionControl={false}
          maxZoom={18}
          minZoom={3}
          worldCopyJump={true}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
        >
          {/* Optimized Satellite Tile Layer */}
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
          
          {/* Optimized Street Labels Overlay */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={18}
            tileSize={256}
            zoomOffset={0}
            updateWhenIdle={true}
            updateWhenZooming={false}
            keepBuffer={1}
            opacity={0.8}
          />

          {/* Search Area Circle */}
          {thermalDetectionResults?.searchArea && (
            <Circle
              center={[thermalDetectionResults.searchArea.lat, thermalDetectionResults.searchArea.lon]}
              radius={thermalDetectionResults.searchArea.radius * 1000} // Convert km to meters
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
              }}
            />
          )}

          {/* Optimized Thermal Spots - Limit to 50 for performance */}
          {thermalSpots.slice(0, 50).map((spot, index) => {
            const temperature = spot.temperature || 35;
            const radius = Math.max(6, Math.min(15, (temperature - 20) / 2.5));
            const color = temperature >= 45 ? '#dc2626' : 
                         temperature >= 35 ? '#ea580c' : '#eab308';
            
            return (
              <CircleMarker
                key={`thermal-${index}-${spot.location.lat}-${spot.location.lng}`}
                center={[spot.location.lat, spot.location.lng]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.8,
                  weight: 2,
                  opacity: 1
                }}
              >
                <Popup>
                  <div style={{ padding: '8px', textAlign: 'center', minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: '#ff4444', fontSize: '14px' }}>🔥 Thermal Anomaly</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '12px' }}>
                      <div><strong>Temp:</strong> {temperature.toFixed(1)}°C</div>
                      <div><strong>Confidence:</strong> {((spot.confidence || 0.8) * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                      📍 {spot.location.lat.toFixed(4)}, {spot.location.lng.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      NASA FIRMS Detection
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Air Quality Stations */}
          {console.log('About to render air quality stations:', airQualityStations.length)}
          {/* Test station for debugging */}
          {airQualityStations.length === 0 && activeWorkflow === 'airquality' && (
            <CircleMarker
              key="test-air-quality-station"
              center={[testAirQualityStation.location.lat, testAirQualityStation.location.lng]}
              radius={12}
              pathOptions={{
                color: '#eab308',
                fillColor: '#eab308',
                fillOpacity: 0.7,
                weight: 2,
                opacity: 1
              }}
            >
              <Popup>
                <div style={{ padding: '8px', textAlign: 'center', minWidth: '220px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#eab308', fontSize: '14px' }}>☁️ Test Air Quality Station</h3>
                  <div>AQI: {testAirQualityStation.aqi}</div>
                  <div>Category: {testAirQualityStation.category}</div>
                </div>
              </Popup>
            </CircleMarker>
          )}
          {airQualityStations.map((station, index) => {
            console.log(`Rendering air quality station ${index}:`, station);
            const aqi = station.aqi || 50;
            const radius = Math.max(8, Math.min(18, aqi / 10));
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
                  fillOpacity: 0.7,
                  weight: 2,
                  opacity: 1
                }}
              >
                <Popup>
                  <div style={{ padding: '8px', textAlign: 'center', minWidth: '220px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: color, fontSize: '14px' }}>☁️ Air Quality Station</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '12px' }}>
                      <div><strong>AQI:</strong> {aqi}</div>
                      <div><strong>Category:</strong> {station.category}</div>
                    </div>
                    {station.measurements && (
                      <div style={{ marginTop: '8px', fontSize: '11px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
                          {station.measurements.pm25 && <div>PM2.5: {station.measurements.pm25.toFixed(1)}</div>}
                          {station.measurements.o3 && <div>O₃: {station.measurements.o3.toFixed(1)}</div>}
                          {station.measurements.no2 && <div>NO₂: {station.measurements.no2.toFixed(1)}</div>}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                      📍 {station.location.lat.toFixed(4)}, {station.location.lng.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      {station.name || 'Air Quality Monitor'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Healthcare Facilities */}
          {healthcareFacilities.map((facility, index) => {
            const isRecommended = facility.type === 'recommended';
            const facilityType = facility.facilityType || 'healthcare';
            
            // Colors based on facility type and status
            const colors = {
              hospital: isRecommended ? '#dc2626' : '#7c2d12',
              clinic: isRecommended ? '#2563eb' : '#1e3a8a',
              pharmacy: isRecommended ? '#16a34a' : '#14532d',
              emergency: isRecommended ? '#ea580c' : '#9a3412',
              healthcare: isRecommended ? '#7c3aed' : '#581c87'
            };
            
            const color = colors[facilityType] || colors.healthcare;
            const radius = isRecommended ? 12 : 8;
            
            return (
              <CircleMarker
                key={`healthcare-${index}-${facility.lat}-${facility.lon}`}
                center={[facility.lat, facility.lon]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: isRecommended ? 0.9 : 0.7,
                  weight: isRecommended ? 3 : 2,
                  opacity: 1
                }}
              >
                <Popup>
                  <div style={{ padding: '8px', textAlign: 'center', minWidth: '240px' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: color, fontSize: '14px' }}>
                      {isRecommended ? '⭐ Recommended' : '🏥 Existing'} Healthcare Facility
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '12px', marginBottom: '8px' }}>
                      <div><strong>Type:</strong> {facilityType}</div>
                      <div><strong>Status:</strong> {isRecommended ? 'Recommended' : 'Existing'}</div>
                    </div>
                    
                    {isRecommended && (
                      <div style={{ marginBottom: '8px', fontSize: '11px', backgroundColor: '#fef3c7', padding: '4px', borderRadius: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                          <div><strong>Rank:</strong> #{facility.rank}</div>
                          <div><strong>Priority:</strong> {Math.round(facility.priority || 0)}</div>
                        </div>
                        {facility.populationServed && (
                          <div style={{ marginTop: '3px' }}>
                            <strong>Serves:</strong> {facility.populationServed.toLocaleString()} people
                          </div>
                        )}
                        {facility.estimatedCost && (
                          <div style={{ marginTop: '3px' }}>
                            <strong>Est. Cost:</strong> ${facility.estimatedCost.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                      📍 {facility.lat.toFixed(4)}, {facility.lon.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                      {facility.name || `${facilityType} Facility`}
                    </div>
                    {facility.source && (
                      <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                        Source: {facility.source}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Info Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono">
        <div>Search Area: {
          thermalDetectionResults?.searchArea ? 
            `${thermalDetectionResults.searchArea.lat.toFixed(4)}, ${thermalDetectionResults.searchArea.lon.toFixed(4)}` :
          airQualityResults?.searchArea ?
            `${airQualityResults.searchArea.lat.toFixed(4)}, ${airQualityResults.searchArea.lon.toFixed(4)}` :
          '40.7128, -74.0060'
        }</div>
        <div className="text-xs text-gray-300 mt-1">
          🌍 Leaflet Satellite Map
        </div>
        {thermalDetectionResults?.searchArea && (
          <div className="text-xs text-gray-300 mt-1">
            📍 Radius: {thermalDetectionResults.searchArea.radius}km
          </div>
        )}
        {airQualityResults && (
          <div className="text-xs text-gray-300 mt-1">
            ☁️ AQI: {airQualityResults.aqi} ({airQualityResults.category})
          </div>
        )}
      </div>

      {/* Controls Info */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
        <div className="font-semibold mb-1">🎮 Controls:</div>
        <div>• Drag to pan</div>
        <div>• Scroll to zoom</div>
        <div>• Click markers for details</div>
      </div>

      {/* Thermal Detection Status */}
      {thermalDetectionResults && (
        <div className="absolute top-4 right-4 bg-red-600/90 text-white px-3 py-2 rounded-lg text-sm">
          <div className="font-semibold">🔥 Thermal Detection Active</div>
          <div className="text-xs">
            {thermalDetectionResults.detectedDumps} total spots
          </div>
          {thermalDetectionResults.detectedDumps > 50 && (
            <div className="text-xs text-yellow-200">
              Showing top 50 for performance
            </div>
          )}
        </div>
      )}

      {airQualityResults && (
        <div className="absolute top-20 right-4 bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm">
          <div className="font-semibold">☁️ Air Quality Active</div>
          <div className="text-xs">
            AQI {airQualityResults.aqi} - {airQualityResults.category}
          </div>
          <div className="text-xs">
            {airQualityResults.stations?.length || 0} monitoring stations
          </div>
        </div>
      )}

      {/* Optimized Legend */}
      {thermalSpots.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg text-xs shadow-lg border">
          <div className="font-semibold mb-1 text-gray-800">🌡️ Heat Scale</div>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
              <span className="text-gray-700">45°C+ High</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-orange-600 mr-2"></div>
              <span className="text-gray-700">35-45°C Med</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-600 mr-2"></div>
              <span className="text-gray-700">25-35°C Low</span>
            </div>
          </div>
        </div>
      )}

      {/* Air Quality Legend */}
      {airQualityStations.length > 0 && (
        <div className={`absolute ${thermalSpots.length > 0 ? 'bottom-28' : 'bottom-4'} right-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg text-xs shadow-lg border`}>
          <div className="font-semibold mb-1 text-gray-800">☁️ AQI Scale</div>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-600 mr-2"></div>
              <span className="text-gray-700">0-50 Good</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
              <span className="text-gray-700">51-100 Moderate</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-orange-600 mr-2"></div>
              <span className="text-gray-700">101-150 Unhealthy</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-600 mr-2"></div>
              <span className="text-gray-700">151+ Very Unhealthy</span>
            </div>
          </div>
          <div className="mt-2 pt-1 border-t border-gray-300">
            <div className="text-gray-600 text-xs">Stations: {airQualityStations.length}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!isClient && (
        <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">🗺️</div>
            <div className="text-gray-600 font-medium">Loading Map...</div>
          </div>
        </div>
      )}
    </div>
  );
}
