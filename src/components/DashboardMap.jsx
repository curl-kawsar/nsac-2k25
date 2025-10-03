'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { 
  MapPinIcon, 
  ExclamationTriangleIcon,
  CloudIcon,
  HeartIcon,
  CubeIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function DashboardMap({ activeWorkflow, alerts, onLocationSelect, thermalDetectionResults }) {
  const mapRef = useRef(null);
  const map3DRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC default
  const [zoom, setZoom] = useState(15);
  const [mapMode, setMapMode] = useState('3d');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [activeCamera, setActiveCamera] = useState('default');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thermalSpots, setThermalSpots] = useState([]);
  const [showThermalOverlay, setShowThermalOverlay] = useState(false);
  const [heatMapLayer, setHeatMapLayer] = useState(null);
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [regularMap, setRegularMap] = useState(null); // For heatmap compatibility

  // Google Maps API Loader (no longer need visualization library)
  const loader = new Loader({
    apiKey: "AIzaSyD4FZThhkEqmJ4wulBCQATOO3BWFuPXO5A",
    version: 'weekly',
    libraries: ['marker', 'geometry', 'places'] // Removed deprecated 'visualization'
  });

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (isMapLoaded && map3DRef.current) {
      updateWorkflowLayers();
    }
  }, [activeWorkflow, isMapLoaded]);

  // Update thermal spots when detection results change
  useEffect(() => {
    if (thermalDetectionResults && thermalDetectionResults.dumps) {
      setThermalSpots(thermalDetectionResults.dumps);
      setShowThermalOverlay(true);
      if (isMapLoaded) {
        if (showHeatMap) {
          addThermalHeatMap(thermalDetectionResults.dumps);
        } else {
          addThermalSpotMarkers(thermalDetectionResults.dumps);
        }
      }
    }
  }, [thermalDetectionResults, isMapLoaded]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isMapLoaded && searchInputRef.current && !autocompleteRef.current) {
      // Add slight delay to ensure DOM is fully ready
      const timer = setTimeout(() => {
        initializeAutocomplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded]);

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
      
      // Add thermal spots if available
      if (showThermalOverlay && thermalSpots.length > 0) {
        if (showHeatMap) {
          await addThermalHeatMap(thermalSpots);
        } else {
          await addThermalSpotMarkers(thermalSpots);
        }
      }
      
    } catch (error) {
      console.error('Error loading waste management data:', error);
    }
  };

  // Add thermal spot markers to the map
  const addThermalSpotMarkers = async (spots) => {
    if (!map3DRef.current || !spots || spots.length === 0) return;

    try {
      const { Marker3DElement, Polygon3DElement } = await google.maps.importLibrary('maps3d');
      
      // Clear existing thermal markers first
      clearThermalMarkers();
      
      for (const spot of spots) {
        // Create thermal anomaly visualization based on temperature
        const intensity = getThermalIntensity(spot.temperature);
        const color = getThermalColor(spot.temperature);
        
        // Create a 3D column representing the thermal anomaly
        const thermalColumn = document.createElement('gmp-polygon-3d');
        const radius = 0.0005; // ~50m radius
        
        // Create circular polygon
        const coordinates = [];
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * 2 * Math.PI;
          coordinates.push({
            lat: spot.location.lat + radius * Math.cos(angle),
            lng: spot.location.lng + radius * Math.sin(angle)
          });
        }
        
        thermalColumn.outerCoordinates = coordinates;
        thermalColumn.altitudeMode = 'RELATIVE_TO_GROUND';
        thermalColumn.extruded = true;
        thermalColumn.fillColor = color;
        thermalColumn.fillOpacity = 0.7;
        thermalColumn.strokeColor = '#ffffff';
        thermalColumn.strokeWidth = 2;
        
        // Set height based on temperature
        const height = Math.max(10, (spot.temperature - 20) * 2); // Scale temperature to height
        thermalColumn.drawsOccludedSegments = true;
        
        map3DRef.current.appendChild(thermalColumn);

        // Add marker at the center
        const marker = document.createElement('gmp-marker-3d');
        marker.position = { lat: spot.location.lat, lng: spot.location.lng };
        marker.altitudeMode = 'RELATIVE_TO_GROUND';
        marker.extruded = true;
        
        // Create custom content with temperature info
        const markerContent = document.createElement('div');
        markerContent.className = 'thermal-marker';
        markerContent.innerHTML = `
          <div style="
            background: ${color};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            text-align: center;
            min-width: 60px;
          ">
            🔥 ${spot.temperature.toFixed(1)}°C
            <br>
            <span style="font-size: 10px; opacity: 0.9;">
              ${(spot.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        `;
        
        marker.appendChild(markerContent);
        map3DRef.current.appendChild(marker);
      }
      
      console.log(`Added ${spots.length} thermal spot markers to map`);
      
      // Automatically fly to the thermal detection area
      if (spots.length > 0) {
        flyToThermalArea(spots);
      }
      
    } catch (error) {
      console.error('Error adding thermal spot markers:', error);
    }
  };

  // Clear thermal markers (fixed for 3D map elements)
  const clearThermalMarkers = () => {
    if (!map3DRef.current) return;
    
    try {
      // Remove existing thermal markers from 3D map
      const children = Array.from(map3DRef.current.children || []);
      children.forEach(child => {
        if (child.tagName === 'GMP-MARKER-3D' && child.getAttribute('data-thermal') === 'true') {
          child.remove();
        }
      });
    } catch (error) {
      console.warn('Error clearing thermal markers:', error);
    }
  };

  // Get thermal intensity (0-1 scale)
  const getThermalIntensity = (temperature) => {
    const minTemp = 25;
    const maxTemp = 60;
    return Math.min(1, Math.max(0, (temperature - minTemp) / (maxTemp - minTemp)));
  };

  // Get color based on temperature
  const getThermalColor = (temperature) => {
    if (temperature >= 50) return '#ff0000'; // Critical - Red
    if (temperature >= 40) return '#ff6600'; // High - Orange-Red
    if (temperature >= 35) return '#ff9900'; // Medium - Orange
    return '#ffcc00'; // Low - Yellow
  };

  // Custom thermal heat map visualization (Google HeatmapLayer deprecated)
  const addThermalHeatMap = async (spots) => {
    if (!map3DRef.current || !spots || spots.length === 0) return;

    try {
      console.log('Creating custom thermal heat map with', spots.length, 'spots...');
      
      // Clear existing heat map
      if (heatMapLayer) {
        if (heatMapLayer.remove) heatMapLayer.remove();
        setHeatMapLayer(null);
      }

      // Create canvas-based heat map overlay
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match map container
      const mapRect = mapRef.current.getBoundingClientRect();
      canvas.width = mapRect.width;
      canvas.height = mapRect.height;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '1000';
      canvas.style.opacity = '0.8'; // Increased opacity for better visibility
      
      // Get current map bounds for coordinate conversion with validation
      const center = map3DRef.current?.center || mapCenter;
      const range = map3DRef.current?.range || 1000;
      
      // Validate center coordinates
      const validCenter = {
        lat: isFinite(center.lat) ? center.lat : mapCenter.lat,
        lng: isFinite(center.lng) ? center.lng : mapCenter.lng
      };
      
      // Validate range
      const validRange = isFinite(range) && range > 0 ? range : 1000;
      
      // Calculate pixels per degree with validation
      const metersPerDegree = 111320; // at equator
      const pixelsPerMeter = Math.min(canvas.width, canvas.height) / validRange;
      const pixelsPerDegree = metersPerDegree * pixelsPerMeter;
      
      // Function to convert lat/lng to canvas pixels with validation
      const latLngToPixel = (lat, lng) => {
        // Validate input coordinates
        if (!isFinite(lat) || !isFinite(lng)) {
          console.warn('Invalid coordinates:', { lat, lng });
          return { x: -1, y: -1 }; // Return invalid position
        }
        
        const x = canvas.width / 2 + (lng - validCenter.lng) * pixelsPerDegree;
        const y = canvas.height / 2 - (lat - validCenter.lat) * pixelsPerDegree; // Inverted Y
        
        // Validate calculated pixels
        if (!isFinite(x) || !isFinite(y)) {
          console.warn('Invalid pixel calculation:', { x, y, lat, lng });
          return { x: -1, y: -1 }; // Return invalid position
        }
        
        return { x, y };
      };
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw heat points with validation
      spots.forEach(spot => {
        // Validate spot data
        if (!spot?.location?.lat || !spot?.location?.lng || !isFinite(spot.temperature)) {
          console.warn('Invalid spot data:', spot);
          return;
        }
        
        const pixel = latLngToPixel(spot.location.lat, spot.location.lng);
        
        // Skip if invalid pixel coordinates or outside canvas bounds
        if (pixel.x < 0 || pixel.x > canvas.width || pixel.y < 0 || pixel.y > canvas.height) {
          return;
        }
        
        // Calculate radius and intensity based on temperature with validation
        const temperature = isFinite(spot.temperature) ? spot.temperature : 25;
        const intensity = Math.max(0.1, Math.min(1.0, (temperature - 20) / 40));
        const radius = Math.max(30, intensity * 120); // 30-120px radius for better visibility
        
        // Validate radius
        if (!isFinite(radius) || radius <= 0) {
          console.warn('Invalid radius:', radius);
          return;
        }
        
        // Create radial gradient for heat effect with validation
        try {
          const gradient = ctx.createRadialGradient(pixel.x, pixel.y, 0, pixel.x, pixel.y, radius);
        
          // Color based on temperature
          let color;
          if (temperature >= 50) {
            color = `rgba(139, 0, 0, ${intensity})`; // Dark red
          } else if (temperature >= 40) {
            color = `rgba(255, 0, 0, ${intensity})`; // Red
          } else if (temperature >= 35) {
            color = `rgba(255, 127, 0, ${intensity})`; // Orange
          } else {
            color = `rgba(255, 255, 0, ${intensity})`; // Yellow
          }
          
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color.replace(/[\d.]+\)$/g, `${intensity * 0.5})`)); // Fade out
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge
          
          // Draw the heat point
          ctx.save();
          ctx.globalCompositeOperation = 'screen'; // Blend mode for heat effect
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(pixel.x, pixel.y, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
          
        } catch (gradientError) {
          console.warn('Error creating gradient for spot:', spot, gradientError);
        }
      });
      
      // Add blur effect for smoother heat map
      ctx.filter = 'blur(3px)';
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
      
      // Add canvas to map
      mapRef.current.appendChild(canvas);
      
      // Store reference for cleanup
      setHeatMapLayer({ remove: () => canvas.remove(), canvas });
      
      // Note: Real-time updates would require manual camera tracking
      // For now, heat map is static but functional
      
      console.log('Custom heat map created successfully');
      
      // Automatically fly to the thermal detection area
      if (spots.length > 0) {
        flyToThermalArea(spots);
      }
      
    } catch (error) {
      console.error('Custom heat map creation failed:', error);
      console.log('Using 3D markers as fallback');
      addThermalSpotMarkers(spots);
    }
  };

  // Fly camera to thermal detection area
  const flyToThermalArea = (spots) => {
    if (!map3DRef.current || !spots || spots.length === 0) return;

    try {
      // Calculate center of all thermal spots
      const validSpots = spots.filter(spot => 
        spot?.location?.lat && 
        spot?.location?.lng && 
        isFinite(spot.location.lat) && 
        isFinite(spot.location.lng)
      );

      if (validSpots.length === 0) return;

      // Calculate bounding box
      let minLat = validSpots[0].location.lat;
      let maxLat = validSpots[0].location.lat;
      let minLng = validSpots[0].location.lng;
      let maxLng = validSpots[0].location.lng;

      validSpots.forEach(spot => {
        minLat = Math.min(minLat, spot.location.lat);
        maxLat = Math.max(maxLat, spot.location.lat);
        minLng = Math.min(minLng, spot.location.lng);
        maxLng = Math.max(maxLng, spot.location.lng);
      });

      // Calculate center point
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      // Calculate appropriate range based on spread of points
      const latSpread = maxLat - minLat;
      const lngSpread = maxLng - minLng;
      const maxSpread = Math.max(latSpread, lngSpread);
      
      // Convert degrees to approximate meters (rough calculation)
      const metersPerDegree = 111320;
      const spreadInMeters = maxSpread * metersPerDegree;
      
      // Set range with some padding (minimum 500m, maximum 10km)
      const range = Math.max(500, Math.min(10000, spreadInMeters * 2));

      console.log(`Flying to thermal area: center(${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}), range: ${range}m`);

      // Fly to the thermal detection area
      const targetCamera = {
        center: { lat: centerLat, lng: centerLng },
        range: range,
        tilt: 67.5,
        heading: map3DRef.current.heading || 0
      };

      // Try multiple methods to ensure camera movement
      if (map3DRef.current.flyCameraTo) {
        map3DRef.current.flyCameraTo({
          endCamera: targetCamera,
          durationMillis: 2000
        });
      } else if (map3DRef.current.flyCameraAround) {
        map3DRef.current.flyCameraAround({
          camera: targetCamera,
          durationMillis: 2000
        });
      } else {
        // Direct property setting as fallback
        map3DRef.current.center = targetCamera.center;
        map3DRef.current.range = targetCamera.range;
        map3DRef.current.tilt = targetCamera.tilt;
      }

    } catch (error) {
      console.warn('Error flying to thermal area:', error);
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
    
    // Custom heat map cleanup (canvas-based)
    if (heatMapLayer) {
      try {
        if (heatMapLayer.remove) {
          heatMapLayer.remove();
        } else if (heatMapLayer.canvas) {
          heatMapLayer.canvas.remove();
        }
      } catch (error) {
        console.warn('Error clearing custom heatmap:', error);
      }
      setHeatMapLayer(null);
    }
    
    // Remove any remaining canvas elements
    if (mapRef.current) {
      const canvasElements = mapRef.current.querySelectorAll('canvas[style*="z-index: 1000"]');
      canvasElements.forEach(canvas => {
        try {
          canvas.remove();
        } catch (error) {
          console.warn('Error removing canvas element:', error);
        }
      });
    }
    
    setRegularMap(null);
    
    // Clear 3D elements
    if (map3DRef.current && map3DRef.current.children) {
      try {
        while (map3DRef.current.firstChild) {
          map3DRef.current.removeChild(map3DRef.current.firstChild);
        }
      } catch (error) {
        console.warn('Error clearing 3D elements:', error);
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

  // Initialize Google Places Autocomplete
  const initializeAutocomplete = async () => {
    try {
      const { Autocomplete } = await google.maps.importLibrary('places');

      if (!searchInputRef.current) {
        console.error('Search input ref not available');
        return;
      }

      const autocomplete = new Autocomplete(searchInputRef.current, {
        fields: ['geometry', 'name', 'formatted_address', 'place_id'],
        types: [], // Empty array allows all types (addresses, cities, landmarks, etc.)
        componentRestrictions: {} // No restrictions - worldwide search
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.geometry) {
          handlePlaceSelect(place);
        } else {
          console.log('No details available for input: ' + searchInputRef.current.value);
        }
      });

      autocompleteRef.current = autocomplete;
      console.log('✅ Autocomplete initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing autocomplete:', error);
    }
  };

  // Handle location selection from search
  const handlePlaceSelect = async (place) => {
    if (!place.geometry || !place.geometry.location) {
      console.error('No geometry data for place');
      return;
    }

    const newCenter = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    console.log('📍 Flying to:', place.formatted_address || place.name);

    // Update state
    setMapCenter(newCenter);
    setSelectedLocation(newCenter);

    // Fly camera to new location with smooth animation
    if (map3DRef.current) {
      try {
        await map3DRef.current.flyCameraTo({
          center: newCenter,
          range: 800, // Good range for viewing the location
          tilt: 67.5,
          heading: 0,
          endCameraOptions: {
            tilt: 67.5,
            range: 800
          }
        }, { duration: 2000 });

        // Add a marker at the searched location
        await addSelectionMarker(newCenter);

        // Notify parent component if callback provided
        if (onLocationSelect) {
          onLocationSelect([newCenter.lat, newCenter.lng]);
        }

        console.log('✅ Successfully navigated to location');
      } catch (error) {
        console.error('❌ Error flying to location:', error);
      }
    }
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
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex items-center space-x-3">
            <CubeIcon className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white drop-shadow-lg">
              3D Photorealistic Map - {activeWorkflow.charAt(0).toUpperCase() + activeWorkflow.slice(1)}
            </h3>
          </div>
          
          {/* Location Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 pointer-events-none z-10" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isMapLoaded ? "Search for any location..." : "Loading map..."}
                defaultValue=""
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-white/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-white/60 font-medium hover:bg-white/20 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isMapLoaded}
                autoComplete="off"
              />
              {!isMapLoaded && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2 items-center">
            <select
              value={mapMode}
              onChange={(e) => setMapMode(e.target.value)}
              className="px-3 py-2 text-sm border border-white/30 rounded-md bg-white/10 backdrop-blur-sm text-white font-medium hover:bg-white/20 transition-colors"
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
