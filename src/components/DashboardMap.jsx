'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader } from '@googlemaps/js-api-loader';
import { 
  MapPinIcon, 
  ExclamationTriangleIcon,
  CloudIcon,
  HeartIcon,
  CubeIcon 
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
        // Initialize 3D Map
        const { Map3DElement } = await google.maps.importLibrary('maps3d');
        
        const map3d = new Map3DElement({
          center: mapCenter,
          range: 1000,
          tilt: 60,
          heading: 0,
          mapId: 'citywise-3d-map' // You'll need to create this in Google Cloud Console
        });

        mapRef.current.appendChild(map3d);
        map3DRef.current = map3d;

        // Add click listener
        map3d.addEventListener('gmp-click', handleMapClick);
        
        setIsMapLoaded(true);
        
        // Load initial data
        loadWorkflowData();
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

    const cameraViews = {
      default: { range: 1000, tilt: 60, heading: 0 },
      overhead: { range: 2000, tilt: 0, heading: 0 },
      street: { range: 200, tilt: 75, heading: 45 },
      bird: { range: 500, tilt: 45, heading: 30 }
    };

    const view = cameraViews[viewType] || cameraViews.default;
    
    try {
      await map3DRef.current.flyCameraTo({
        center: mapCenter,
        range: view.range,
        tilt: view.tilt,
        heading: view.heading
      });
      setActiveCamera(viewType);
    } catch (error) {
      console.error('Error switching camera view:', error);
    }
  };

  const layerOverlays = {
    overview: ['Population Density', 'Infrastructure', 'All Facilities'],
    waste: ['Thermal Anomalies', 'Waste Facilities', 'Collection Routes', 'Illegal Dumps'],
    healthcare: ['Healthcare Facilities', 'Demographics', 'Access Zones', 'Emergency Routes'],
    airquality: ['Air Quality Stations', 'Pollution Sources', 'AQI Zones', 'Wind Patterns']
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Map Header */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CubeIcon className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              3D Photorealistic Map - {activeWorkflow.charAt(0).toUpperCase() + activeWorkflow.slice(1)}
            </h3>
          </div>
          
          <div className="flex space-x-2">
            <select
              value={mapMode}
              onChange={(e) => setMapMode(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="3d">3D Photorealistic</option>
              <option value="satellite">Satellite</option>
              <option value="terrain">Terrain</option>
            </select>
          </div>
        </div>
        
        {/* Layer Controls */}
        <div className="mt-3 flex flex-wrap gap-2">
          {layerOverlays[activeWorkflow]?.map((layer) => (
            <button
              key={layer}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
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
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeCamera === view
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)} View
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-96">
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
            onClick={() => setZoom(Math.min(zoom + 1, 18))}
            className="w-8 h-8 bg-white dark:bg-gray-800 shadow-lg rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 1, 3))}
            className="w-8 h-8 bg-white dark:bg-gray-800 shadow-lg rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center"
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
