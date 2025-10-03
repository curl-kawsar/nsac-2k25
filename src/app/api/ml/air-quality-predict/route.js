import { NextResponse } from 'next/server';
import mlModelService from '@/services/mlModelService';

/**
 * Air Quality Prediction API using Trained ML Model
 * 
 * Uses the trained air_quality_predictor.pkl model to predict AQI
 * based on pollutant concentrations and meteorological data.
 * 
 * Features required:
 * - pm25: PM2.5 concentration (µg/m³)
 * - no2: NO2 concentration (µg/m³) 
 * - so2: SO2 concentration (µg/m³)
 * - o3: O3 concentration (µg/m³)
 * - co: CO concentration (mg/m³)
 * - temperature: Temperature (°C)
 * - humidity: Relative humidity (%)
 * - wind_speed: Wind speed (m/s)
 * - pressure: Atmospheric pressure (hPa)
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      pm25,
      no2,
      so2,
      o3,
      co,
      temperature,
      humidity,
      wind_speed,
      pressure,
      location,
      metadata = {}
    } = body;

    // Validate required parameters
    const requiredParams = ['pm25', 'no2', 'so2', 'o3', 'co', 'temperature', 'humidity', 'wind_speed', 'pressure'];
    const missingParams = requiredParams.filter(param => body[param] === undefined || body[param] === null);

    if (missingParams.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
        message: `The following parameters are required: ${missingParams.join(', ')}`,
        required_parameters: {
          pm25: 'PM2.5 concentration in µg/m³',
          no2: 'NO2 concentration in µg/m³',
          so2: 'SO2 concentration in µg/m³',
          o3: 'O3 concentration in µg/m³',
          co: 'CO concentration in mg/m³',
          temperature: 'Temperature in °C',
          humidity: 'Relative humidity in %',
          wind_speed: 'Wind speed in m/s',
          pressure: 'Atmospheric pressure in hPa'
        },
        example: {
          pm25: 25.5,
          no2: 40.2,
          so2: 15.8,
          o3: 65.3,
          co: 1.2,
          temperature: 22.5,
          humidity: 65,
          wind_speed: 3.2,
          pressure: 1013.25
        }
      }, { status: 400 });
    }

    // Validate parameter ranges
    const validationErrors = [];
    
    if (pm25 < 0 || pm25 > 500) validationErrors.push('pm25 must be between 0 and 500 µg/m³');
    if (no2 < 0 || no2 > 400) validationErrors.push('no2 must be between 0 and 400 µg/m³');
    if (so2 < 0 || so2 > 300) validationErrors.push('so2 must be between 0 and 300 µg/m³');
    if (o3 < 0 || o3 > 300) validationErrors.push('o3 must be between 0 and 300 µg/m³');
    if (co < 0 || co > 50) validationErrors.push('co must be between 0 and 50 mg/m³');
    if (temperature < -50 || temperature > 60) validationErrors.push('temperature must be between -50 and 60 °C');
    if (humidity < 0 || humidity > 100) validationErrors.push('humidity must be between 0 and 100 %');
    if (wind_speed < 0 || wind_speed > 50) validationErrors.push('wind_speed must be between 0 and 50 m/s');
    if (pressure < 800 || pressure > 1200) validationErrors.push('pressure must be between 800 and 1200 hPa');

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Parameter validation failed',
        validation_errors: validationErrors
      }, { status: 400 });
    }

    console.log('Air Quality ML Prediction Request:', {
      pm25, no2, so2, o3, co, temperature, humidity, wind_speed, pressure,
      location: location || 'Not specified'
    });

    // Prepare features for model
    const features = {
      pm25: parseFloat(pm25),
      no2: parseFloat(no2),
      so2: parseFloat(so2),
      o3: parseFloat(o3),
      co: parseFloat(co),
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      wind_speed: parseFloat(wind_speed),
      pressure: parseFloat(pressure)
    };

    // Get prediction from ML model
    const predictionResult = await mlModelService.predictAirQuality(features);

    if (!predictionResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Model prediction failed',
        message: predictionResult.error || 'Unknown error occurred during prediction',
        fallback_available: true
      }, { status: 500 });
    }

    // Enhanced response with additional insights
    const response = {
      success: true,
      prediction: predictionResult.prediction,
      model_info: {
        type: predictionResult.model,
        timestamp: predictionResult.timestamp,
        confidence: predictionResult.prediction.confidence
      },
      input_features: features,
      location: location || null,
      metadata: {
        ...metadata,
        api_version: '1.0',
        processing_time: new Date().toISOString()
      },
      health_recommendations: generateHealthRecommendations(predictionResult.prediction.aqi),
      pollutant_analysis: analyzePollutantContributions(features),
      data_quality: assessDataQuality(features)
    };

    console.log(`ML Air Quality Prediction completed: AQI ${predictionResult.prediction.aqi} (${predictionResult.prediction.category})`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Air Quality ML Prediction API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process air quality prediction request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get model information and health check
    const modelInfo = mlModelService.getModelInfo();
    const healthCheck = await mlModelService.healthCheck();

    return NextResponse.json({
      service: 'Air Quality ML Prediction API',
      version: '1.0',
      model_info: modelInfo,
      health_check: healthCheck,
      endpoints: {
        predict: {
          method: 'POST',
          description: 'Predict AQI using trained ML model',
          required_parameters: [
            'pm25', 'no2', 'so2', 'o3', 'co', 
            'temperature', 'humidity', 'wind_speed', 'pressure'
          ]
        }
      },
      example_request: {
        pm25: 25.5,
        no2: 40.2,
        so2: 15.8,
        o3: 65.3,
        co: 1.2,
        temperature: 22.5,
        humidity: 65,
        wind_speed: 3.2,
        pressure: 1013.25,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: "New York City"
        }
      }
    });

  } catch (error) {
    console.error('Air Quality ML API info error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get API information',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Generate health recommendations based on AQI
 */
function generateHealthRecommendations(aqi) {
  if (aqi <= 50) {
    return {
      level: 'Good',
      message: 'Air quality is satisfactory for most people.',
      recommendations: [
        'Enjoy outdoor activities',
        'No health precautions needed',
        'Good time for exercise outdoors'
      ],
      sensitive_groups: 'No restrictions'
    };
  } else if (aqi <= 100) {
    return {
      level: 'Moderate',
      message: 'Air quality is acceptable for most people, but sensitive individuals may experience minor issues.',
      recommendations: [
        'Sensitive people should consider reducing prolonged outdoor exertion',
        'Monitor symptoms if you have respiratory conditions',
        'Generally safe for outdoor activities'
      ],
      sensitive_groups: 'People with respiratory or heart conditions should be cautious'
    };
  } else if (aqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive Groups',
      message: 'Sensitive groups may experience health effects.',
      recommendations: [
        'Sensitive groups should reduce prolonged outdoor exertion',
        'Consider moving activities indoors',
        'Use air purifiers if available'
      ],
      sensitive_groups: 'Children, elderly, and people with heart/lung conditions should limit outdoor exposure'
    };
  } else if (aqi <= 200) {
    return {
      level: 'Unhealthy',
      message: 'Everyone may begin to experience health effects.',
      recommendations: [
        'Everyone should reduce prolonged outdoor exertion',
        'Avoid outdoor activities during peak pollution hours',
        'Keep windows closed and use air conditioning',
        'Wear masks when going outside'
      ],
      sensitive_groups: 'Sensitive groups should avoid outdoor activities'
    };
  } else if (aqi <= 300) {
    return {
      level: 'Very Unhealthy',
      message: 'Health alert: everyone may experience serious health effects.',
      recommendations: [
        'Everyone should avoid prolonged outdoor exertion',
        'Stay indoors with windows and doors closed',
        'Use air purifiers and avoid outdoor exercise',
        'Seek medical attention if experiencing symptoms'
      ],
      sensitive_groups: 'Sensitive groups should remain indoors'
    };
  } else {
    return {
      level: 'Hazardous',
      message: 'Health warning: emergency conditions affecting everyone.',
      recommendations: [
        'Everyone should avoid all outdoor activities',
        'Stay indoors with air purification systems',
        'Seek immediate medical attention for any symptoms',
        'Follow local emergency guidelines'
      ],
      sensitive_groups: 'Everyone should avoid outdoor exposure'
    };
  }
}

/**
 * Analyze pollutant contributions to overall AQI
 */
function analyzePollutantContributions(features) {
  const { pm25, no2, so2, o3, co } = features;
  
  // Calculate individual pollutant AQI contributions (simplified)
  const contributions = {
    pm25: {
      concentration: pm25,
      aqi_contribution: Math.round((pm25 / 35.4) * 100),
      percentage: 0,
      status: pm25 <= 12 ? 'Good' : pm25 <= 35.4 ? 'Moderate' : pm25 <= 55.4 ? 'Unhealthy for Sensitive' : 'Unhealthy'
    },
    no2: {
      concentration: no2,
      aqi_contribution: Math.round((no2 / 100) * 100),
      percentage: 0,
      status: no2 <= 53 ? 'Good' : no2 <= 100 ? 'Moderate' : no2 <= 360 ? 'Unhealthy for Sensitive' : 'Unhealthy'
    },
    o3: {
      concentration: o3,
      aqi_contribution: Math.round((o3 / 70) * 100),
      percentage: 0,
      status: o3 <= 54 ? 'Good' : o3 <= 70 ? 'Moderate' : o3 <= 85 ? 'Unhealthy for Sensitive' : 'Unhealthy'
    },
    so2: {
      concentration: so2,
      aqi_contribution: Math.round((so2 / 75) * 100),
      percentage: 0,
      status: so2 <= 35 ? 'Good' : so2 <= 75 ? 'Moderate' : so2 <= 185 ? 'Unhealthy for Sensitive' : 'Unhealthy'
    },
    co: {
      concentration: co,
      aqi_contribution: Math.round((co / 9) * 100),
      percentage: 0,
      status: co <= 4.4 ? 'Good' : co <= 9.4 ? 'Moderate' : co <= 12.4 ? 'Unhealthy for Sensitive' : 'Unhealthy'
    }
  };

  // Calculate percentages
  const totalContribution = Object.values(contributions).reduce((sum, p) => sum + p.aqi_contribution, 0);
  Object.keys(contributions).forEach(pollutant => {
    contributions[pollutant].percentage = totalContribution > 0 ? 
      Math.round((contributions[pollutant].aqi_contribution / totalContribution) * 100) : 0;
  });

  // Find dominant pollutant
  const dominantPollutant = Object.entries(contributions)
    .reduce((max, [key, value]) => value.aqi_contribution > max.contribution ? 
      { pollutant: key, contribution: value.aqi_contribution } : max, 
      { pollutant: 'pm25', contribution: 0 });

  return {
    pollutants: contributions,
    dominant_pollutant: dominantPollutant.pollutant,
    dominant_contribution: dominantPollutant.contribution,
    analysis: `${dominantPollutant.pollutant.toUpperCase()} is the primary contributor to air quality concerns`
  };
}

/**
 * Assess data quality of input features
 */
function assessDataQuality(features) {
  const { temperature, humidity, wind_speed, pressure } = features;
  
  let qualityScore = 100;
  const issues = [];

  // Check for extreme values that might indicate sensor issues
  if (temperature < -20 || temperature > 45) {
    qualityScore -= 10;
    issues.push('Extreme temperature reading');
  }
  
  if (humidity < 10 || humidity > 95) {
    qualityScore -= 10;
    issues.push('Extreme humidity reading');
  }
  
  if (wind_speed > 20) {
    qualityScore -= 5;
    issues.push('Very high wind speed');
  }
  
  if (pressure < 980 || pressure > 1040) {
    qualityScore -= 10;
    issues.push('Unusual atmospheric pressure');
  }

  return {
    score: Math.max(0, qualityScore),
    level: qualityScore >= 90 ? 'Excellent' : qualityScore >= 80 ? 'Good' : qualityScore >= 70 ? 'Fair' : 'Poor',
    issues: issues,
    confidence: qualityScore >= 90 ? 'High' : qualityScore >= 80 ? 'Medium' : 'Low'
  };
}
