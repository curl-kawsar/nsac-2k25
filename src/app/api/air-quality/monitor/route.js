import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { AirQualityMeasurement, AirQualityAlert, PollutionSource } from '@/models/AirQuality';
import { Alert } from '@/models/User';
import nasaApi from '@/services/nasaApi';
import mlService from '@/services/mlService';

export async function POST(request) {
  try {
    await connectDB();
    
    const { lat, lon, timeframe = 'current' } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Determine date range based on timeframe
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'current':
        startDate.setHours(endDate.getHours() - 6); // Last 6 hours
        break;
      case 'daily':
        startDate.setDate(endDate.getDate() - 1); // Last 24 hours
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 7); // Last week
        break;
      default:
        startDate.setHours(endDate.getHours() - 6);
    }

    // Fetch air quality data from multiple NASA sources
    console.log('Fetching air quality data from NASA APIs...');
    const [no2Data, so2Data, modisData, firmsData] = await Promise.all([
      nasaApi.getOMIData(lat, lon, startDate.toISOString(), endDate.toISOString(), 'NO2'),
      nasaApi.getOMIData(lat, lon, startDate.toISOString(), endDate.toISOString(), 'SO2'),
      nasaApi.getMODISAOD(lat, lon, startDate.toISOString(), endDate.toISOString()),
      nasaApi.getFIRMSFireData(lat, lon, 7)
    ]);

    // Process and fuse satellite data
    const satelliteData = this.processSatelliteData(no2Data, so2Data, modisData, firmsData);

    // Get existing ground measurements for validation/fusion
    const groundMeasurements = await AirQualityMeasurement.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: 10000 // 10km radius
        }
      },
      timestamp: {
        $gte: startDate,
        $lte: endDate
      },
      dataSource: 'ground_station'
    }).sort({ timestamp: -1 });

    // Prepare data sources for fusion
    const dataSources = [
      {
        type: 'satellite',
        timestamp: new Date(),
        measurements: satelliteData,
        confidence: 0.8
      }
    ];

    // Add ground station data
    groundMeasurements.forEach(measurement => {
      dataSources.push({
        type: 'ground_station',
        timestamp: measurement.timestamp,
        measurements: measurement.measurements,
        confidence: measurement.confidence || 0.95
      });
    });

    // Fuse data from multiple sources
    const fusedData = mlService.fuseAirQualityData(dataSources);

    // Predict PM2.5 using ML model
    const pm25Features = [
      fusedData.aod || 0,
      fusedData.no2 || 0,
      fusedData.so2 || 0,
      25, // temperature (would get from weather API)
      60, // humidity
      10, // wind speed
      1013, // pressure
      1, // land use (urban)
      100, // elevation
      1000 // population density
    ];

    let predictedPM25;
    try {
      predictedPM25 = mlService.predictPM25(pm25Features);
    } catch (error) {
      console.log('PM2.5 prediction model not available, using estimation');
      predictedPM25 = this.estimatePM25FromAOD(fusedData.aod);
    }

    // Calculate comprehensive air quality measurements
    const airQualityData = {
      pm25: predictedPM25,
      pm10: predictedPM25 * 1.5, // Rough estimation
      no2: fusedData.no2,
      so2: fusedData.so2,
      co: fusedData.co || 0,
      o3: fusedData.o3 || 0,
      aod: fusedData.aod
    };

    // Calculate AQI
    const aqiResult = mlService.calculateAQI(airQualityData);

    // Perform pollution source attribution
    const sourceAttribution = mlService.attributePollutionSources(
      airQualityData,
      { windSpeed: 10, windDirection: 180 }, // meteorology
      { roadDensity: 0.7, industrial: 0.2, residential: 0.6, powerPlantProximity: 10 }, // land use
      { fireCount: firmsData.fireCount || 0 } // emissions
    );

    // Check WHO thresholds
    const whoExceedances = mlService.checkWHOThresholds(airQualityData);

    // Save measurement to database
    const measurement = new AirQualityMeasurement({
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      timestamp: new Date(),
      measurements: airQualityData,
      dataSource: 'model_prediction',
      quality: aqiResult.category.toLowerCase().replace(/\s+/g, '_'),
      confidence: fusedData.confidence
    });

    await measurement.save();

    // Create alerts if thresholds exceeded
    if (whoExceedances.length > 0 || aqiResult.aqi > 150) {
      await this.createAirQualityAlert(
        lat, lon, 
        airQualityData, 
        aqiResult, 
        whoExceedances,
        measurement._id
      );
    }

    // Update pollution source data
    const pollutionSource = new PollutionSource({
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      sourceType: this.getPrimarySource(sourceAttribution),
      contribution: {
        pm25: sourceAttribution.traffic * 100,
        no2: sourceAttribution.traffic * 100,
        so2: sourceAttribution.industry * 100
      },
      intensity: this.getIntensityFromAQI(aqiResult.aqi),
      firmsData: {
        fireCount: firmsData.fireCount || 0,
        brightness: firmsData.brightness || 0,
        confidence: firmsData.confidence || 0
      },
      analysisDate: new Date()
    });

    await pollutionSource.save();

    return NextResponse.json({
      success: true,
      location: { lat, lon },
      timestamp: new Date(),
      airQuality: {
        measurements: airQualityData,
        aqi: aqiResult,
        sourceAttribution: sourceAttribution,
        whoExceedances: whoExceedances,
        confidence: fusedData.confidence
      },
      dataFusion: {
        sourcesUsed: dataSources.length,
        satelliteContribution: fusedData.weights.satellite || 0,
        groundStationContribution: fusedData.weights.ground_station || 0
      },
      measurementId: measurement._id
    });

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
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const radius = parseFloat(searchParams.get('radius') || '5');
    const hours = parseInt(searchParams.get('hours') || '24');
    const dataSource = searchParams.get('dataSource');
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Build query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      },
      timestamp: {
        $gte: startTime
      }
    };

    if (dataSource) {
      query.dataSource = dataSource;
    }

    const measurements = await AirQualityMeasurement.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    // Calculate statistics
    const statistics = this.calculateAirQualityStatistics(measurements);

    return NextResponse.json({
      success: true,
      measurements: measurements,
      statistics: statistics,
      count: measurements.length,
      timeRange: { start: startTime, end: new Date() }
    });

  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
}

// Helper functions
function processSatelliteData(no2Data, so2Data, modisData, firmsData) {
  // Process NASA satellite data and extract measurements
  const measurements = {
    no2: 0,
    so2: 0,
    aod: 0
  };

  // Process OMI NO2 data
  if (no2Data.feed && no2Data.feed.entry && no2Data.feed.entry.length > 0) {
    // Extract NO2 measurements (simplified - real implementation would parse actual data)
    measurements.no2 = 20 + Math.random() * 30; // Simulated values
  }

  // Process OMI SO2 data
  if (so2Data.feed && so2Data.feed.entry && so2Data.feed.entry.length > 0) {
    measurements.so2 = 5 + Math.random() * 15;
  }

  // Process MODIS AOD data
  if (modisData.feed && modisData.feed.entry && modisData.feed.entry.length > 0) {
    measurements.aod = 0.1 + Math.random() * 0.4;
  }

  return measurements;
}

function estimatePM25FromAOD(aod) {
  // Simplified PM2.5 estimation from AOD
  // Real implementation would use validated regression model
  return aod * 50; // Rough conversion factor
}

async function createAirQualityAlert(lat, lon, measurements, aqiResult, whoExceedances, measurementId) {
  const severity = this.getAlertSeverity(aqiResult.aqi);
  
  let alertType = 'aqi_unhealthy';
  let message = `Air Quality Index is ${aqiResult.aqi} (${aqiResult.category})`;
  
  if (whoExceedances.length > 0) {
    alertType = 'who_threshold_exceeded';
    const primaryExceedance = whoExceedances[0];
    message = `${primaryExceedance.pollutant.toUpperCase()} exceeds WHO guidelines: ${primaryExceedance.measured.toFixed(1)} µg/m³ (guideline: ${primaryExceedance.guideline} µg/m³)`;
  }

  const alert = new AirQualityAlert({
    location: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    alertType: alertType,
    pollutant: whoExceedances.length > 0 ? whoExceedances[0].pollutant : aqiResult.primaryPollutant,
    currentValue: whoExceedances.length > 0 ? whoExceedances[0].measured : aqiResult.aqi,
    thresholdValue: whoExceedances.length > 0 ? whoExceedances[0].guideline : 150,
    severity: severity,
    affectedPopulation: 50000, // Estimate based on area
    healthRecommendations: this.getHealthRecommendations(aqiResult.aqi),
    isActive: true,
    createdAt: new Date()
  });

  await alert.save();

  // Create system alert
  const systemAlert = new Alert({
    title: `Air Quality Alert - ${severity.toUpperCase()}`,
    message: message,
    type: 'air_quality',
    severity: severity,
    location: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    data: {
      aqi: aqiResult.aqi,
      measurements: measurements,
      measurementId: measurementId
    },
    source: {
      system: 'air_quality_monitoring',
      dataSource: 'NASA_satellite_ML',
      confidence: 0.8
    }
  });

  await systemAlert.save();
  
  return alert;
}

function getAlertSeverity(aqi) {
  if (aqi > 300) return 'emergency';
  if (aqi > 200) return 'critical';
  if (aqi > 150) return 'warning';
  return 'info';
}

function getPrimarySource(attribution) {
  let maxSource = 'natural';
  let maxValue = attribution.natural;
  
  Object.keys(attribution).forEach(source => {
    if (attribution[source] > maxValue) {
      maxValue = attribution[source];
      maxSource = source;
    }
  });
  
  return maxSource;
}

function getIntensityFromAQI(aqi) {
  if (aqi > 200) return 'critical';
  if (aqi > 150) return 'high';
  if (aqi > 100) return 'medium';
  return 'low';
}

function getHealthRecommendations(aqi) {
  if (aqi > 300) {
    return [
      'Avoid all outdoor activities',
      'Stay indoors with air purifiers',
      'Seek medical attention if experiencing symptoms'
    ];
  } else if (aqi > 200) {
    return [
      'Avoid prolonged outdoor activities',
      'Use masks when going outside',
      'Consider staying indoors'
    ];
  } else if (aqi > 150) {
    return [
      'Limit outdoor activities for sensitive groups',
      'Consider wearing masks outdoors',
      'Monitor symptoms'
    ];
  } else {
    return [
      'Normal outdoor activities are acceptable',
      'Sensitive individuals may want to limit prolonged outdoor exertion'
    ];
  }
}

function calculateAirQualityStatistics(measurements) {
  if (measurements.length === 0) {
    return { averageAQI: 0, maxAQI: 0, minAQI: 0, trendDirection: 'stable' };
  }

  const aqiValues = measurements.map(m => {
    const aqiResult = mlService.calculateAQI(m.measurements);
    return aqiResult.aqi;
  });

  const averageAQI = aqiValues.reduce((sum, aqi) => sum + aqi, 0) / aqiValues.length;
  const maxAQI = Math.max(...aqiValues);
  const minAQI = Math.min(...aqiValues);
  
  // Simple trend calculation
  const recentValues = aqiValues.slice(0, Math.min(5, aqiValues.length));
  const olderValues = aqiValues.slice(-Math.min(5, aqiValues.length));
  const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  const olderAvg = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;
  
  let trendDirection = 'stable';
  if (recentAvg > olderAvg + 10) trendDirection = 'worsening';
  else if (recentAvg < olderAvg - 10) trendDirection = 'improving';

  return {
    averageAQI: Math.round(averageAQI),
    maxAQI: maxAQI,
    minAQI: minAQI,
    trendDirection: trendDirection,
    dataPoints: measurements.length
  };
}
