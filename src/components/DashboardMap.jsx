'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader } from '@googlemaps/js-api-loader';
import { 
  MapPinIcon, 
  ExclamationTriangleIcon,
  CloudIcon,
  HeartIcon,
  CubeIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

export default function DashboardMap({ activeWorkflow, alerts, onLocationSelect }) {
  const mapRef = useRef(null);
  const map3DRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC default
  const [zoom, setZoom] = useState(15);
  const [mapMode, setMapMode] = useState('3d');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [activeCamera, setActiveCamera] = useState('default');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Google Maps API Loader
  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY',
    version: 'weekly',
    libraries: ['marker', 'geometry']
  });

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (isMapLoaded && map3DRef.current) {
      updateWorkflowLayers();
    }
  }, [activeWorkflow, isMapLoaded]);

  const initializeMap = async () => {
    try {
      await loader.load();
      
      if (mapRef.current) {
        // Initialize 3D Map with Photorealistic 3D Tiles
        const { Map3DElement } = await google.maps.importLibrary('maps3d');
        
        const map3d = new Map3DElement({
          center: mapCenter,
          range: 1000,
          tilt: 67.5, // Optimal tilt for 3D visualization (recommended by Google)
          heading: 0,
          mapId: 'citywise-3d-map', // You'll need to create this in Google Cloud Console
          defaultLabelsDisabled: false, // Show place labels
          defaultUIDisabled: false // Enable default UI controls
        });

        mapRef.current.appendChild(map3d);
        map3DRef.current = map3d;

        // Add click listener for location selection
        map3d.addEventListener('gmp-click', handleMapClick);
        
        // Add camera change listener for smooth transitions
        map3d.addEventListener('gmp-camerachange', (event) => {
          const { center, range, tilt, heading } = event.detail;
          if (center) {
            setMapCenter({ lat: center.lat, lng: center.lng });
            setZoom(range / 100);
          }
        });
        
        setIsMapLoaded(true);
        
        // Load initial data with slight delay for smoother experience
        setTimeout(() => {
          loadWorkflowData();
        }, 500);
      }
    } catch (error) {
      console.error('Error loading Google Maps 3D:', error);
      // Fallback to 2D map
      initializeFallbackMap();
    }
  };

  const initializeFallbackMap = async () => {
    try {
      const { Map } = await google.maps.importLibrary('maps');
      
      const map = new Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom,
        mapTypeId: 'satellite',
        tilt: 45
      });

      map3DRef.current = map;
      map.addListener('click', handleMapClick);
      setIsMapLoaded(true);
      loadWorkflowData();
    } catch (error) {
      console.error('Error loading fallback map:', error);
    }
  };

  const handleMapClick = (event) => {
    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    
    setSelectedLocation({ lat, lng });
    onLocationSelect && onLocationSelect([lat, lng]);
    
    // Add selection marker
    addSelectionMarker({ lat, lng });
  };

  const addSelectionMarker = async ({ lat, lng }) => {
    if (!map3DRef.current) return;

    try {
      const { Marker3DElement } = await google.maps.importLibrary('maps3d');
      
      const marker = new Marker3DElement({
        position: { lat, lng },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true
      });

      map3DRef.current.append(marker);
    } catch (error) {
      console.error('Error adding selection marker:', error);
    }
  };

  const loadWorkflowData = async () => {
    // Clear existing markers
    clearMarkers();
    
    // Add workflow-specific markers and overlays
    switch (activeWorkflow) {
      case 'waste':
        await loadWasteManagementData();
        break;
      case 'healthcare':
        await loadHealthcareData();
        break;
      case 'airquality':
        await loadAirQualityData();
        break;
      default:
        await loadOverviewData();
    }
  };

  const loadWasteManagementData = async () => {
    if (!map3DRef.current) return;

    try {
      const { Marker3DElement, Model3DElement } = await google.maps.importLibrary('maps3d');

      // Add waste facilities as 3D models
      const wasteFacilities = [
        { lat: 40.7580, lng: -73.9855, type: 'recycling', height: 20 },
        { lat: 40.6892, lng: -74.0445, type: 'treatment', height: 35 },
        { lat: 40.7295, lng: -73.9965, type: 'collection', height: 15 }
      ];

      for (const facility of wasteFacilities) {
        const marker = new Marker3DElement({
          position: { lat: facility.lat, lng: facility.lng },
          altitudeMode: 'RELATIVE_TO_GROUND',
          extruded: true
        });

        // Add 3D building model for facilities
        const model = new Model3DElement({
          position: { lat: facility.lat, lng: facility.lng },
          scale: { x: 1, y: 1, z: facility.height / 10 },
          altitudeMode: 'RELATIVE_TO_GROUND'
        });

        map3DRef.current.append(marker);
        map3DRef.current.append(model);
      }

      // Add thermal anomaly alerts
      await addAlertMarkers('waste_management');
      
    } catch (error) {
      console.error('Error loading waste management data:', error);
    }
  };

  const loadHealthcareData = async () => {
    if (!map3DRef.current) return;

    try {
      const { Marker3DElement, Polygon3DElement } = await google.maps.importLibrary('maps3d');

      // Add healthcare facilities
      const healthcareFacilities = [
        { lat: 40.7589, lng: -73.9441, type: 'hospital', size: 'large' },
        { lat: 40.7282, lng: -73.9942, type: 'clinic', size: 'medium' },
        { lat: 40.6782, lng: -74.0442, type: 'emergency', size: 'large' }
      ];

      for (const facility of healthcareFacilities) {
        const marker = new Marker3DElement({
          position: { lat: facility.lat, lng: facility.lng },
          altitudeMode: 'RELATIVE_TO_GROUND',
          extruded: true
        });

        map3DRef.current.append(marker);
      }

      // Add healthcare desert polygons
      const healthcareDeserts = [
        {
          paths: [
            { lat: 40.6500, lng: -74.0500 },
            { lat: 40.6500, lng: -74.0200 },
            { lat: 40.6800, lng: -74.0200 },
            { lat: 40.6800, lng: -74.0500 }
          ]
        }
      ];

      for (const desert of healthcareDeserts) {
        const polygon = new Polygon3DElement({
          outerCoordinates: desert.paths,
          altitudeMode: 'RELATIVE_TO_GROUND',
          extruded: true,
          fillColor: '#ff6b6b',
          fillOpacity: 0.3
        });

        map3DRef.current.append(polygon);
      }

      await addAlertMarkers('healthcare');
      
    } catch (error) {
      console.error('Error loading healthcare data:', error);
    }
  };

  const loadAirQualityData = async () => {
    if (!map3DRef.current) return;

    try {
      const { Marker3DElement, Polygon3DElement } = await google.maps.importLibrary('maps3d');

      // Add air quality monitoring stations
      const airQualityStations = [
        { lat: 40.7489, lng: -73.9680, aqi: 95, height: 150 },
        { lat: 40.7128, lng: -74.0060, aqi: 120, height: 200 },
        { lat: 40.6928, lng: -73.9903, aqi: 85, height: 100 }
      ];

      for (const station of airQualityStations) {
        // Create 3D columns representing AQI levels
        const aqiColumn = new Polygon3DElement({
          outerCoordinates: [
            { lat: station.lat - 0.001, lng: station.lng - 0.001 },
            { lat: station.lat - 0.001, lng: station.lng + 0.001 },
            { lat: station.lat + 0.001, lng: station.lng + 0.001 },
            { lat: station.lat + 0.001, lng: station.lng - 0.001 }
          ],
          altitudeMode: 'RELATIVE_TO_GROUND',
          extruded: true,
          fillColor: getAQIColor(station.aqi),
          fillOpacity: 0.7,
          strokeColor: '#ffffff',
          strokeWidth: 2
        });

        map3DRef.current.append(aqiColumn);
      }

      // Add pollution source markers
      const pollutionSources = [
        { lat: 40.7580, lng: -73.9855, type: 'traffic', intensity: 'high' },
        { lat: 40.6892, lng: -74.0445, type: 'industry', intensity: 'medium' },
        { lat: 40.7295, lng: -73.9965, type: 'residential', intensity: 'low' }
      ];

      for (const source of pollutionSources) {
        const marker = new Marker3DElement({
          position: { lat: source.lat, lng: source.lng },
          altitudeMode: 'RELATIVE_TO_GROUND',
          extruded: true
        });

        map3DRef.current.append(marker);
      }

      await addAlertMarkers('air_quality');
      
    } catch (error) {
      console.error('Error loading air quality data:', error);
    }
  };

  const loadOverviewData = async () => {
    // Load combined data from all workflows
    await Promise.all([
      loadWasteManagementData(),
      loadHealthcareData(),
      loadAirQualityData()
    ]);
  };

  const addAlertMarkers = async (type) => {
    if (!map3DRef.current) return;

    try {
      const { Marker3DElement } = await google.maps.importLibrary('maps3d');
      
      const relevantAlerts = alerts.filter(alert => alert.type === type);
      
      for (const alert of relevantAlerts) {
        if (alert.location) {
          const marker = new Marker3DElement({
            position: { lat: alert.location[0], lng: alert.location[1] },
            altitudeMode: 'RELATIVE_TO_GROUND',
            extruded: true
          });

          map3DRef.current.append(marker);
        }
      }
    } catch (error) {
      console.error('Error adding alert markers:', error);
    }
  };

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  };

  const clearMarkers = () => {
    // Clear existing markers and overlays
    setMarkers([]);
    if (map3DRef.current && map3DRef.current.children) {
      // Remove all child elements (markers, models, polygons)
      while (map3DRef.current.firstChild) {
        map3DRef.current.removeChild(map3DRef.current.firstChild);
      }
    }
  };

  const updateWorkflowLayers = () => {
    loadWorkflowData();
  };

  const switchCameraView = async (viewType) => {
    if (!map3DRef.current) return;

    // Optimized camera views for Photorealistic 3D Maps
    // Tilt: 67.5° is optimal for 3D visualization (Google recommendation)
    const cameraViews = {
      default: { range: 1000, tilt: 67.5, heading: 0, duration: 2000 },
      overhead: { range: 2500, tilt: 30, heading: 0, duration: 2500 },
      street: { range: 150, tilt: 80, heading: 45, duration: 2000 },
      bird: { range: 600, tilt: 67.5, heading: 135, duration: 2000 }
    };

    const view = cameraViews[viewType] || cameraViews.default;
    
    try {
      await map3DRef.current.flyCameraTo({
        center: mapCenter,
        range: view.range,
        tilt: view.tilt,
        heading: view.heading,
        endCameraOptions: {
          tilt: view.tilt,
          range: view.range
        }
      }, { duration: view.duration });
      setActiveCamera(viewType);
    } catch (error) {
      console.error('Error switching camera view:', error);
    }
  };

  // Handle zoom in/out for 3D maps with smooth animations
  const handleZoomIn = async () => {
    if (!map3DRef.current) return;
    
    try {
      // Get current camera position or use mapCenter
      const currentRange = zoom * 100; // Convert zoom level to range
      const newRange = Math.max(currentRange * 0.6, 50); // Zoom in by 40%, min 50m
      const newZoom = newRange / 100;
      
      await map3DRef.current.flyCameraTo({
        center: mapCenter,
        range: newRange,
        tilt: 67.5, // Maintain optimal 3D viewing angle
        heading: 0,
        endCameraOptions: {
          tilt: 67.5,
          range: newRange
        }
      }, { duration: 800 }); // Smooth 800ms animation
      
      setZoom(newZoom);
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  };

  const handleZoomOut = async () => {
    if (!map3DRef.current) return;
    
    try {
      // Get current camera position or use mapCenter
      const currentRange = zoom * 100; // Convert zoom level to range
      const newRange = Math.min(currentRange * 1.5, 10000); // Zoom out by 50%, max 10km
      const newZoom = newRange / 100;
      
      await map3DRef.current.flyCameraTo({
        center: mapCenter,
        range: newRange,
        tilt: 67.5, // Maintain optimal 3D viewing angle
        heading: 0,
        endCameraOptions: {
          tilt: 67.5,
          range: newRange
        }
      }, { duration: 800 }); // Smooth 800ms animation
      
      setZoom(newZoom);
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const layerOverlays = {
    overview: ['Population Density', 'Infrastructure', 'All Facilities'],
    waste: ['Thermal Anomalies', 'Waste Facilities', 'Collection Routes', 'Illegal Dumps'],
    healthcare: ['Healthcare Facilities', 'Demographics', 'Access Zones', 'Emergency Routes'],
    airquality: ['Air Quality Stations', 'Pollution Sources', 'AQI Zones', 'Wind Patterns']
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
    }`}>
      {/* Map Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 border-b border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CubeIcon className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white drop-shadow-lg">
              3D Photorealistic Map - {activeWorkflow.charAt(0).toUpperCase() + activeWorkflow.slice(1)}
            </h3>
          </div>
          
          <div className="flex space-x-2 items-center">
            <select
              value={mapMode}
              onChange={(e) => setMapMode(e.target.value)}
              className="px-3 py-1.5 text-sm border border-white/30 rounded-md bg-white/10 backdrop-blur-sm text-white font-medium hover:bg-white/20 transition-colors"
            >
              <option value="3d" className="text-gray-900">3D Photorealistic</option>
              <option value="satellite" className="text-gray-900">Satellite</option>
              <option value="terrain" className="text-gray-900">Terrain</option>
            </select>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-md text-white hover:bg-white/20 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Layer Controls */}
        <div className="mt-3 flex flex-wrap gap-2">
          {layerOverlays[activeWorkflow]?.map((layer) => (
            <button
              key={layer}
              className="px-3 py-1.5 text-xs bg-white/20 backdrop-blur-sm text-white font-medium rounded-md hover:bg-white/30 transition-colors border border-white/20"
            >
              {layer}
            </button>
          ))}
        </div>

        {/* Camera Controls */}
        <div className="mt-3 flex space-x-2">
          {['default', 'overhead', 'street', 'bird'].map((view) => (
            <button
              key={view}
              onClick={() => switchCameraView(view)}
              disabled={!isMapLoaded}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                activeCamera === view
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)} View
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative ${
        isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[700px] lg:h-[800px]'
      }`}>
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
            />
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading 3D Map...</span>
          </div>
        )}
        
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ display: isMapLoaded ? 'block' : 'none' }}
        />

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button
            onClick={handleZoomIn}
            disabled={!isMapLoaded}
            className="w-8 h-8 bg-white dark:bg-gray-800 shadow-lg rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            disabled={!isMapLoaded}
            className="w-8 h-8 bg-white dark:bg-gray-800 shadow-lg rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            −
          </button>
        </div>

        {/* 3D Status Indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex items-center space-x-2">
          <CubeIcon className="w-3 h-3" />
          <span>3D Mode Active</span>
          {!isMapLoaded && <span>• Loading...</span>}
        </div>
      </div>

      {/* Map Footer */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
          <div>
            {selectedLocation ? (
              <span>Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</span>
            ) : (
              <span>Click on 3D map to select location</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>{alerts.length} active alerts</span>
            <span>•</span>
            <span>Powered by Google Maps 3D</span>
          </div>
        </div>
      </div>
    </div>
  );
}
