import { NextResponse } from 'next/server';
import mlService from '@/services/mlService';
import nasaApi from '@/services/nasaApi';

// Mock air quality monitoring stations
const mockAirQualityStations = [
  {
    id: 'aqs_001',
    name: 'Downtown Central Monitor',
    location: { lat: 40.7589, lng: -73.9851 },
    measurements: {
      pm25: 18.5, pm10: 25.2, no2: 45.3, o3: 35.8, co: 1.2, so2: 8.7
    },
    aqi: 62,
    category: 'moderate',
    lastUpdated: new Date(),
    status: 'operational'
  },
  {
    id: 'aqs_002', 
    name: 'North District Air Monitor',
    location: { lat: 40.7831, lng: -73.9712 },
    measurements: {
      pm25: 12.3, pm10: 18.9, no2: 32.1, o3: 42.6, co: 0.9, so2: 5.4
    },
    aqi: 48,
    category: 'good',
    lastUpdated: new Date(),
    status: 'operational'
  }
];

export async function POST(request) {
  try {
    const { lat, lon, radius = 10, timeframe = 'current' } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    console.log(`Monitoring air quality using NASA data for location: ${lat}, ${lon}`);

    // Get nearby air quality stations
    const nearbyStations = mockAirQualityStations.filter(station => {
      const distance = calculateDistance(lat, lon, station.location.lat, station.location.lng);
      return distance <= radius;
    });

    try {
      // Use real NASA data for air quality analysis
      const nasaAirQualityData = await nasaApi.getAirQualityData(lat, lon);
      const populationData = await nasaApi.getSEDACPopulation(lat, lon);
      
      // Enhance with ML service prediction if available
      let airQualityData;
      try {
        airQualityData = await mlService.predictPM25(nasaAirQualityData, nearbyStations);
      } catch (mlError) {
        console.log('ML prediction unavailable, using NASA data directly');
        airQualityData = {
          pm25: nasaAirQualityData.pm25_estimated,
          pm10: nasaAirQualityData.pm25_estimated * 1.4,
          no2: nasaAirQualityData.no2,
          so2: nasaAirQualityData.so2,
          o3: 35 + Math.random() * 20, // Estimated
          co: 0.5 + Math.random() * 1.5, // Estimated
          aod: nasaAirQualityData.aod
        };
      }

      // Calculate AQI from NASA data
      const aqiResult = calculateAQI(airQualityData.pm25);
      
      // Generate enhanced source attribution using NASA data
      const sourceAttribution = generateSourceAttribution(airQualityData, nasaAirQualityData);
      
      // Generate health recommendations
      const healthRecommendations = generateHealthRecommendations(aqiResult.aqi);

      console.log(`NASA API provided air quality data with AQI: ${aqiResult.aqi}`);

      return NextResponse.json({
        success: true,
        location: { lat, lon },
      timestamp: new Date(),
        airQuality: {
      measurements: airQualityData,
          aqi: aqiResult,
          sourceAttribution,
          healthRecommendations
        },
        nasaData: {
          sources: nasaAirQualityData.sources,
          timestamp: nasaAirQualityData.timestamp,
          api_key_used: nasaAirQualityData.sources?.api_key_used
        },
        populationData: {
          density: populationData.density,
          source: populationData.source
        },
        nearbyStations,
        apiStatus: 'NASA_API_ACTIVE'
      });

    } catch (nasaError) {
      console.error('NASA API error, using fallback data:', nasaError.message);
      
      // Use mock data as fallback
      const airQualityData = generateMockAirQuality(lat, lon, nearbyStations);
      const aqiResult = calculateAQI(airQualityData.pm25);
      const sourceAttribution = generateSourceAttribution(airQualityData);
      const healthRecommendations = generateHealthRecommendations(aqiResult.aqi);

    return NextResponse.json({
      success: true,
      location: { lat, lon },
      timestamp: new Date(),
      airQuality: {
        measurements: airQualityData,
        aqi: aqiResult,
          sourceAttribution,
          healthRecommendations
        },
        nearbyStations,
        apiStatus: 'FALLBACK_DATA',
        warning: 'NASA API unavailable, using simulated data'
      });
    }

  } catch (error) {
    console.error('Error monitoring air quality:', error);
    return NextResponse.json(
      { error: 'Failed to monitor air quality' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const radius = parseFloat(searchParams.get('radius') || '10');
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Filter stations by location
    const stations = mockAirQualityStations.filter(station => {
      const distance = calculateDistance(lat, lon, station.location.lat, station.location.lng);
      return distance <= radius;
    }).map(station => ({
      ...station,
      distance: calculateDistance(lat, lon, station.location.lat, station.location.lng)
    }));

    // Calculate area air quality
    const areaAQI = calculateAreaAQI(stations);

    return NextResponse.json({
      success: true,
      stations,
      areaAQI,
      count: stations.length
    });

  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
}

// Utility functions
function generateMockAirQuality(lat, lon, stations) {
  // Generate realistic air quality data based on location
  const baseValues = {
    pm25: 15 + Math.random() * 30,
    pm10: 20 + Math.random() * 40,
    no2: 25 + Math.random() * 50,
    o3: 30 + Math.random() * 40,
    co: 0.5 + Math.random() * 2,
    so2: 5 + Math.random() * 15
  };

  // Adjust based on nearby stations if available
  if (stations.length > 0) {
    const stationAvg = stations.reduce((sum, station) => {
      return {
        pm25: sum.pm25 + station.measurements.pm25,
        pm10: sum.pm10 + station.measurements.pm10,
        no2: sum.no2 + station.measurements.no2,
        o3: sum.o3 + station.measurements.o3,
        co: sum.co + station.measurements.co,
        so2: sum.so2 + station.measurements.so2
      };
    }, { pm25: 0, pm10: 0, no2: 0, o3: 0, co: 0, so2: 0 });

    // Blend with station averages
    Object.keys(baseValues).forEach(key => {
      const stationValue = stationAvg[key] / stations.length;
      baseValues[key] = (baseValues[key] + stationValue) / 2;
    });
  }

  return baseValues;
}

function calculateAQI(pm25) {
  // EPA AQI calculation for PM2.5
  let aqi;
  if (pm25 <= 12.0) aqi = pm25 * 50 / 12.0;
  else if (pm25 <= 35.4) aqi = 50 + (pm25 - 12.0) * 50 / (35.4 - 12.0);
  else if (pm25 <= 55.4) aqi = 100 + (pm25 - 35.4) * 50 / (55.4 - 35.4);
  else if (pm25 <= 150.4) aqi = 150 + (pm25 - 55.4) * 50 / (150.4 - 55.4);
  else if (pm25 <= 250.4) aqi = 200 + (pm25 - 150.4) * 100 / (250.4 - 150.4);
  else aqi = 300 + (pm25 - 250.4) * 100 / (350.4 - 250.4);

  return {
    aqi: Math.round(aqi),
    category: getAQICategory(aqi),
    primaryPollutant: 'pm25'
  };
}

function getAQICategory(aqi) {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';  
  if (aqi <= 150) return 'unhealthy_for_sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very_unhealthy';
  return 'hazardous';
}

function generateSourceAttribution(measurements, nasaData = null) {
  // Enhanced source attribution using NASA data
  const sources = {
    traffic: 0.35,
    industrial: 0.25,
    residential: 0.20,
    natural: 0.20
  };

  // Adjust based on actual measurements
  if (measurements.no2 > 40) sources.traffic += 0.1;
  if (measurements.so2 > 10) sources.industrial += 0.1;
  
  // Enhanced attribution using NASA satellite data
  if (nasaData) {
    // Higher NO2 from satellites indicates more traffic/industrial sources
    if (nasaData.no2 > 30) {
      sources.traffic += 0.05;
      sources.industrial += 0.05;
    }
    
    // Higher SO2 typically indicates industrial/power plant sources
    if (nasaData.so2 > 8) {
      sources.industrial += 0.1;
    }
    
    // AOD can indicate natural dust or anthropogenic aerosols
    if (nasaData.aod > 0.3) {
      sources.natural += 0.05;
    }
  }
  
  // Normalize to ensure sum equals 1
  const total = Object.values(sources).reduce((sum, val) => sum + val, 0);
  Object.keys(sources).forEach(key => {
    sources[key] = sources[key] / total;
  });

  return sources;
}

function generateHealthRecommendations(aqi) {
  if (aqi <= 50) {
    return ['Air quality is good. Ideal for outdoor activities.'];
  } else if (aqi <= 100) {
    return ['Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion.'];
  } else if (aqi <= 150) {
    return ['Air quality is unhealthy for sensitive groups. Consider reducing outdoor activities.'];
  } else {
    return ['Air quality is unhealthy. Avoid prolonged outdoor activities.'];
  }
}

function calculateAreaAQI(stations) {
  if (stations.length === 0) return null;
  
  const avgAQI = stations.reduce((sum, station) => sum + station.aqi, 0) / stations.length;
  return {
    aqi: Math.round(avgAQI),
    category: getAQICategory(avgAQI),
    stationsUsed: stations.length
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}