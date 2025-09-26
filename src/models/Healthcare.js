import mongoose from 'mongoose';

// Healthcare Facility Schema
const HealthcareFacilitySchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    enum: ['hospital', 'clinic', 'emergency', 'specialist', 'pharmacy']
  },
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
  capacity: Number,
  services: [String],
  operatingHours: {
    weekdays: String,
    weekends: String,
    emergency: Boolean
  },
  accessibility: {
    wheelchairAccessible: Boolean,
    publicTransport: Boolean,
    parking: Boolean
  },
  staff: {
    doctors: Number,
    nurses: Number,
    specialists: Number
  },
  equipment: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'proposed'],
    default: 'active'
  }
});

// Demographic Data Schema
const DemographicDataSchema = new mongoose.Schema({
  area: {
    type: String, // Administrative area identifier
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Polygon', 'Point']
    },
    coordinates: []
  },
  population: {
    total: Number,
    density: Number,
    ageStructure: {
      under5: Number,
      ages5to14: Number,
      ages15to64: Number,
      over65: Number
    },
    urbanRural: {
      urban: Number,
      rural: Number
    }
  },
  socioeconomic: {
    povertyRate: Number,
    medianIncome: Number,
    unemploymentRate: Number,
    educationLevel: {
      noEducation: Number,
      primary: Number,
      secondary: Number,
      tertiary: Number
    }
  },
  healthIndicators: {
    infantMortality: Number,
    lifeExpectancy: Number,
    chronicDisease: Number,
    accessToHealthcare: Number
  },
  dataSource: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Healthcare Access Analysis
const HealthcareAccessSchema = new mongoose.Schema({
  area: String,
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },
  metrics: {
    nearestFacility: {
      distance: Number, // in km
      travelTime: Number, // in minutes
      facilityType: String
    },
    healthcareDesert: Boolean, // >10,000 people or >30 min from facility
    populationServed: Number,
    facilityRatio: Number // people per facility
  },
  environmentalFactors: {
    airQuality: Number,
    heatStress: Number, // ECOSTRESS LST
    floodRisk: Number, // GPM precipitation
    waterSecurity: Number // GRACE data
  },
  healthRiskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
});

// Emergency Preparedness
const EmergencyPreparednessSchema = new mongoose.Schema({
  area: String,
  riskFactors: {
    naturalDisasters: [String],
    climateRisks: [String],
    populationVulnerability: Number
  },
  resources: {
    emergencyFacilities: Number,
    evacuationRoutes: [String],
    emergencySupplies: Number
  },
  preparednessScore: {
    type: Number,
    min: 0,
    max: 100
  },
  recommendations: [String],
  lastAssessment: {
    type: Date,
    default: Date.now
  }
});

HealthcareFacilitySchema.index({ location: '2dsphere' });
DemographicDataSchema.index({ location: '2dsphere' });
HealthcareAccessSchema.index({ location: '2dsphere' });

export const HealthcareFacility = mongoose.models.HealthcareFacility || mongoose.model('HealthcareFacility', HealthcareFacilitySchema);
export const DemographicData = mongoose.models.DemographicData || mongoose.model('DemographicData', DemographicDataSchema);
export const HealthcareAccess = mongoose.models.HealthcareAccess || mongoose.model('HealthcareAccess', HealthcareAccessSchema);
export const EmergencyPreparedness = mongoose.models.EmergencyPreparedness || mongoose.model('EmergencyPreparedness', EmergencyPreparednessSchema);
