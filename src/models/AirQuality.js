import mongoose from 'mongoose';

// Air Quality Measurement Schema
const AirQualityMeasurementSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  measurements: {
    pm25: Number, // PM2.5 concentration (μg/m³)
    pm10: Number, // PM10 concentration (μg/m³)
    no2: Number,  // NO2 concentration (OMI data)
    so2: Number,  // SO2 concentration (OMI data)
    co: Number,   // CO concentration
    o3: Number,   // Ozone concentration
    aod: Number,  // Aerosol Optical Depth (MODIS)
    aqi: Number   // Calculated Air Quality Index
  },
  dataSource: {
    type: String,
    enum: ['satellite', 'ground_station', 'model_prediction'],
    required: true
  },
  quality: {
    type: String,
    enum: ['good', 'moderate', 'unhealthy_sensitive', 'unhealthy', 'very_unhealthy', 'hazardous']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  }
});

// Air Quality Prediction Schema
const AirQualityPredictionSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },
  predictionDate: Date,
  forecastHorizon: Number, // hours
  predictions: {
    pm25: Number,
    pm10: Number,
    no2: Number,
    so2: Number,
    aqi: Number
  },
  modelInfo: {
    name: String,
    version: String,
    accuracy: Number
  },
  confidence: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pollution Source Attribution Schema
const PollutionSourceSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point', 'Polygon']
    },
    coordinates: []
  },
  sourceType: {
    type: String,
    enum: ['traffic', 'industry', 'biomass_burning', 'residential', 'power_generation', 'natural']
  },
  contribution: {
    pm25: Number, // percentage contribution
    no2: Number,
    so2: Number
  },
  intensity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  firmsData: { // For biomass burning
    fireCount: Number,
    brightness: Number,
    confidence: Number
  },
  analysisDate: {
    type: Date,
    default: Date.now
  }
});

// Air Quality Alert Schema
const AirQualityAlertSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point', 'Polygon']
    },
    coordinates: []
  },
  alertType: {
    type: String,
    enum: ['who_threshold_exceeded', 'aqi_unhealthy', 'rapid_deterioration', 'forecast_warning']
  },
  pollutant: {
    type: String,
    enum: ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']
  },
  currentValue: Number,
  thresholdValue: Number,
  severity: {
    type: String,
    enum: ['moderate', 'high', 'very_high', 'extreme']
  },
  affectedPopulation: Number,
  healthRecommendations: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
});

// Health Risk Assessment Schema
const HealthRiskAssessmentSchema = new mongoose.Schema({
  area: String,
  location: {
    type: {
      type: String,
      enum: ['Polygon']
    },
    coordinates: []
  },
  timeframe: {
    start: Date,
    end: Date
  },
  riskFactors: {
    airQuality: {
      averageAQI: Number,
      exceedanceDays: Number, // days above WHO guidelines
      primaryPollutant: String
    },
    vulnerablePopulation: {
      children: Number,
      elderly: Number,
      respiratoryConditions: Number,
      cardiovascularConditions: Number
    }
  },
  healthImpacts: {
    respiratoryRisk: Number,
    cardiovascularRisk: Number,
    cancerRisk: Number,
    overallRisk: Number
  },
  recommendations: [String],
  calculatedAt: {
    type: Date,
    default: Date.now
  }
});

// Policy Intervention Simulation Schema
const PolicyInterventionSchema = new mongoose.Schema({
  name: String,
  description: String,
  interventionType: {
    type: String,
    enum: ['traffic_restriction', 'emission_standards', 'green_spaces', 'industrial_regulation']
  },
  targetArea: {
    type: {
      type: String,
      enum: ['Polygon']
    },
    coordinates: []
  },
  parameters: {
    emissionReduction: Number, // percentage
    implementationCost: Number,
    timeframe: Number // months
  },
  simulationResults: {
    predictedAQIImprovement: Number,
    healthBenefits: {
      reducedMortality: Number,
      reducedHospitalizations: Number
    },
    economicImpact: Number
  },
  simulatedAt: {
    type: Date,
    default: Date.now
  }
});

AirQualityMeasurementSchema.index({ location: '2dsphere' });
AirQualityPredictionSchema.index({ location: '2dsphere' });
PollutionSourceSchema.index({ location: '2dsphere' });
AirQualityAlertSchema.index({ location: '2dsphere' });
HealthRiskAssessmentSchema.index({ location: '2dsphere' });
PolicyInterventionSchema.index({ targetArea: '2dsphere' });

export const AirQualityMeasurement = mongoose.models.AirQualityMeasurement || mongoose.model('AirQualityMeasurement', AirQualityMeasurementSchema);
export const AirQualityPrediction = mongoose.models.AirQualityPrediction || mongoose.model('AirQualityPrediction', AirQualityPredictionSchema);
export const PollutionSource = mongoose.models.PollutionSource || mongoose.model('PollutionSource', PollutionSourceSchema);
export const AirQualityAlert = mongoose.models.AirQualityAlert || mongoose.model('AirQualityAlert', AirQualityAlertSchema);
export const HealthRiskAssessment = mongoose.models.HealthRiskAssessment || mongoose.model('HealthRiskAssessment', HealthRiskAssessmentSchema);
export const PolicyIntervention = mongoose.models.PolicyIntervention || mongoose.model('PolicyIntervention', PolicyInterventionSchema);
