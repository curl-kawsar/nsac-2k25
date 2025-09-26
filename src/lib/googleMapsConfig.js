// Google Maps Configuration for CityWISE Platform
// Based on Google Maps Platform 3D Maps Documentation
// https://developers.google.com/maps/documentation/javascript/3d/overview

export const GOOGLE_MAPS_CONFIG = {
  // API Configuration
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY',
  version: 'weekly', // Use latest features including 3D
  libraries: ['marker', 'geometry', 'maps3d'], // Essential libraries for CityWISE
  
  // Map Configuration
  defaultCenter: { lat: 40.7128, lng: -74.0060 }, // NYC coordinates
  defaultZoom: 15,
  mapId: 'citywise-3d-map', // Custom map ID for styling
  
  // 3D Settings
  default3DConfig: {
    range: 1000,
    tilt: 60,
    heading: 0,
    altitudeMode: 'RELATIVE_TO_GROUND'
  },
  
  // Camera Presets for different workflows
  cameraPresets: {
    overview: {
      range: 2000,
      tilt: 45,
      heading: 0,
      description: 'Wide area view for general analysis'
    },
    waste: {
      range: 800,
      tilt: 70,
      heading: 45,
      description: 'Ground-level view for facility inspection'
    },
    healthcare: {
      range: 1200,
      tilt: 50,
      heading: 0,
      description: 'Mid-level view for access analysis'
    },
    airquality: {
      range: 1500,
      tilt: 30,
      heading: 0,
      description: 'Elevated view for pollution dispersion'
    }
  },
  
  // Marker Styles for CityWISE workflows
  markerStyles: {
    waste_management: {
      illegal_dump: {
        color: '#dc2626', // Red
        size: 'large',
        animation: 'pulse'
      },
      facility: {
        color: '#059669', // Green
        size: 'medium',
        animation: 'none'
      },
      route: {
        color: '#2563eb', // Blue
        strokeWidth: 3,
        opacity: 0.8
      }
    },
    healthcare: {
      hospital: {
        color: '#dc2626', // Red
        size: 'large',
        animation: 'none'
      },
      clinic: {
        color: '#f59e0b', // Amber
        size: 'medium',
        animation: 'none'
      },
      emergency: {
        color: '#ef4444', // Red
        size: 'large',
        animation: 'pulse'
      },
      desert_zone: {
        color: '#fca5a5', // Light red
        fillOpacity: 0.3,
        strokeColor: '#dc2626',
        strokeWidth: 2
      }
    },
    air_quality: {
      monitoring_station: {
        color: '#8b5cf6', // Purple
        size: 'medium',
        animation: 'none'
      },
      pollution_source: {
        color: '#f59e0b', // Amber
        size: 'small',
        animation: 'bounce'
      },
      aqi_zone: {
        // Dynamic colors based on AQI value
        good: '#10b981',       // Green (0-50)
        moderate: '#f59e0b',   // Yellow (51-100)
        unhealthy_sg: '#f97316', // Orange (101-150)
        unhealthy: '#ef4444',  // Red (151-200)
        very_unhealthy: '#8b5cf6', // Purple (201-300)
        hazardous: '#7c2d12'   // Maroon (301+)
      }
    }
  },
  
  // 3D Model Configuration
  models3D: {
    waste_facility: {
      scale: { x: 1, y: 1, z: 2 },
      altitudeMode: 'RELATIVE_TO_GROUND',
      animation: 'none'
    },
    healthcare_building: {
      scale: { x: 1.2, y: 1.2, z: 3 },
      altitudeMode: 'RELATIVE_TO_GROUND',
      animation: 'none'
    },
    air_quality_column: {
      scale: { x: 0.5, y: 0.5, z: 1 }, // Dynamic Z based on AQI
      altitudeMode: 'RELATIVE_TO_GROUND',
      animation: 'grow'
    }
  },
  
  // Performance Settings
  performance: {
    maxMarkers: 500,
    maxPolygons: 100,
    max3DModels: 50,
    enableClustering: true,
    clusterRadius: 50
  },
  
  // Layer Visibility by Workflow
  defaultLayers: {
    overview: ['population', 'infrastructure', 'all_facilities'],
    waste: ['thermal_anomalies', 'waste_facilities', 'collection_routes'],
    healthcare: ['healthcare_facilities', 'demographics', 'access_zones'],
    airquality: ['air_stations', 'pollution_sources', 'aqi_zones']
  }
};

// Utility Functions

/**
 * Get AQI color based on value
 * @param {number} aqi - Air Quality Index value
 * @returns {string} Hex color code
 */
export function getAQIColor(aqi) {
  const colors = GOOGLE_MAPS_CONFIG.markerStyles.air_quality.aqi_zone;
  
  if (aqi <= 50) return colors.good;
  if (aqi <= 100) return colors.moderate;
  if (aqi <= 150) return colors.unhealthy_sg;
  if (aqi <= 200) return colors.unhealthy;
  if (aqi <= 300) return colors.very_unhealthy;
  return colors.hazardous;
}

/**
 * Get camera configuration for workflow
 * @param {string} workflow - Active workflow
 * @returns {object} Camera configuration
 */
export function getCameraConfig(workflow) {
  return GOOGLE_MAPS_CONFIG.cameraPresets[workflow] || GOOGLE_MAPS_CONFIG.cameraPresets.overview;
}

/**
 * Get marker style for specific type
 * @param {string} workflow - Workflow type
 * @param {string} markerType - Marker type
 * @returns {object} Marker style configuration
 */
export function getMarkerStyle(workflow, markerType) {
  return GOOGLE_MAPS_CONFIG.markerStyles[workflow]?.[markerType] || {};
}

/**
 * Validate Google Maps API key
 * @returns {boolean} True if API key is valid
 */
export function validateApiKey() {
  const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
  return apiKey && apiKey !== 'DEMO_KEY' && apiKey.length > 10;
}

/**
 * Generate Map ID for Google Cloud Console
 * @returns {string} Formatted map ID
 */
export function generateMapId() {
  return `citywise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Development Configuration
export const DEV_CONFIG = {
  showDebugInfo: process.env.NODE_ENV === 'development',
  enableConsoleLogging: true,
  fallbackToStaticMap: true,
  simulateApiErrors: false
};

export default GOOGLE_MAPS_CONFIG;
