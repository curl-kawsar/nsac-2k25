'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox access token - using your personal token
mapboxgl.accessToken = "pk.eyJ1Ijoia2F3c2FyNDIwIiwiYSI6ImNtZzl6eDZxbjBlangya29sdnVhdjI4NjQifQ.RkeJjEVd3s1IyKp0r7Kqrw";

export default function MapboxMap({ 
  activeWorkflow, 
  alerts, 
  thermalDetectionResults, 
  onLocationSelect 
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-74.006);
  const [lat, setLat] = useState(40.7128);
  const [zoom, setZoom] = useState(12);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    console.log('Initializing Mapbox map...');
    console.log('Container:', mapContainer.current);
    console.log('Access token:', mapboxgl.accessToken);

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Start with basic streets, then switch to satellite
        center: [lng, lat],
        zoom: zoom,
        pitch: 60, // 3D tilt
        bearing: 0,
        antialias: true // For smooth 3D rendering
      });

      console.log('Map instance created:', map.current);
    } catch (error) {
      console.error('Error creating Mapbox map:', error);
      return;
    }

    // Add error handling
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e);
      setMapError(e.error?.message || 'Map failed to load');
    });

    // Add load event
    map.current.on('load', () => {
      console.log('Mapbox map loaded successfully');
      setIsMapLoaded(true);
    });

    // Add 3D buildings layer
    map.current.on('style.load', () => {
      console.log('Mapbox style loaded');
      try {
        // Add 3D buildings
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout['text-field']
        )?.id;

        if (labelLayerId) {
          map.current.addLayer(
            {
              id: 'add-3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
              }
            },
            labelLayerId
          );
          console.log('3D buildings layer added');
        } else {
          console.warn('Label layer not found, skipping 3D buildings');
        }
      } catch (buildingError) {
        console.error('Error adding 3D buildings:', buildingError);
      }
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Update coordinates on move
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    // Handle map clicks
    map.current.on('click', (e) => {
      if (onLocationSelect) {
        onLocationSelect({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng
        });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Handle thermal detection results
  useEffect(() => {
    if (!map.current || !isMapLoaded || !thermalDetectionResults?.dumps) return;

    const spots = thermalDetectionResults.dumps;
    console.log(`Adding ${spots.length} thermal spots to Mapbox map`);

    // Clear existing thermal layers
    if (map.current.getLayer('thermal-heatmap')) {
      map.current.removeLayer('thermal-heatmap');
    }
    if (map.current.getSource('thermal-data')) {
      map.current.removeSource('thermal-data');
    }

    // Create GeoJSON data for thermal spots
    const thermalGeoJSON = {
      type: 'FeatureCollection',
      features: spots.map(spot => ({
        type: 'Feature',
        properties: {
          temperature: spot.temperature || 35,
          confidence: spot.confidence || 0.8,
          intensity: Math.max(0.1, Math.min(1.0, (spot.temperature - 20) / 40))
        },
        geometry: {
          type: 'Point',
          coordinates: [spot.location.lng, spot.location.lat]
        }
      }))
    };

    // Add thermal data source
    map.current.addSource('thermal-data', {
      type: 'geojson',
      data: thermalGeoJSON
    });

    // Add heatmap layer
    map.current.addLayer({
      id: 'thermal-heatmap',
      type: 'heatmap',
      source: 'thermal-data',
      maxzoom: 15,
      paint: {
        // Increase the heatmap weight based on temperature
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'intensity'],
          0, 0,
          1, 1
        ],
        // Increase the heatmap color weight by zoom level
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        // Color ramp for heatmap - thermal colors
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',
          0.1, 'rgba(0, 255, 255, 0.3)',
          0.3, 'rgba(0, 255, 0, 0.5)',
          0.5, 'rgba(255, 255, 0, 0.7)',
          0.7, 'rgba(255, 165, 0, 0.8)',
          1, 'rgba(255, 0, 0, 1)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 20,
          15, 60
        ],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0
        ]
      }
    });

    // Add circle layer for individual points at high zoom
    map.current.addLayer({
      id: 'thermal-points',
      type: 'circle',
      source: 'thermal-data',
      minzoom: 14,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'intensity'],
          0, 10,
          1, 30
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'temperature'],
          20, '#ffff00',
          35, '#ff9900',
          45, '#ff0000',
          60, '#8b0000'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add popups for thermal points
    map.current.on('click', 'thermal-points', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const { temperature, confidence } = e.features[0].properties;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div style="padding: 10px; text-align: center;">
            <h3 style="margin: 0 0 5px 0; color: #ff4444;">🔥 Thermal Anomaly</h3>
            <p style="margin: 5px 0;"><strong>Temperature:</strong> ${temperature.toFixed(1)}°C</p>
            <p style="margin: 5px 0;"><strong>Confidence:</strong> ${(confidence * 100).toFixed(0)}%</p>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              Detected by NASA FIRMS
            </p>
          </div>
        `)
        .addTo(map.current);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'thermal-points', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'thermal-points', () => {
      map.current.getCanvas().style.cursor = '';
    });

    // Fly to thermal detection area
    if (spots.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      spots.forEach(spot => {
        bounds.extend([spot.location.lng, spot.location.lat]);
      });

      map.current.fitBounds(bounds, {
        padding: 50,
        pitch: 60,
        bearing: 0,
        duration: 2000
      });
    }

    console.log('Thermal heatmap added to Mapbox successfully');

  }, [thermalDetectionResults, isMapLoaded]);

  // Show error state if map failed to load
  if (mapError) {
    return (
      <div className="relative w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Map Failed to Load</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
      
      {/* Map Info Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono">
        <div>Lng: {lng} | Lat: {lat}</div>
        <div>Zoom: {zoom}</div>
        <div className="text-xs text-gray-300 mt-1">
          {isMapLoaded ? '🌍 Mapbox 3D Ready' : '⏳ Loading...'}
        </div>
      </div>

      {/* Controls Info */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
        <div className="font-semibold mb-1">🎮 Controls:</div>
        <div>• Drag to pan</div>
        <div>• Scroll to zoom</div>
        <div>• Ctrl+Drag to rotate</div>
        <div>• Shift+Drag to tilt</div>
      </div>

      {/* Thermal Detection Status */}
      {thermalDetectionResults && (
        <div className="absolute top-4 right-20 bg-red-600/90 text-white px-3 py-2 rounded-lg text-sm">
          <div className="font-semibold">🔥 Thermal Detection Active</div>
          <div className="text-xs">
            {thermalDetectionResults.detectedDumps} spots detected
          </div>
        </div>
      )}
    </div>
  );
}
