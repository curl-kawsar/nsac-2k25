import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'analyst', 'viewer', 'emergency_responder'],
    default: 'viewer'
  },
  organization: String,
  preferences: {
    alertTypes: [{
      type: String,
      enum: ['waste_dump_detected', 'air_quality_alert', 'healthcare_emergency', 'facility_recommendation']
    }],
    notificationMethods: [{
      type: String,
      enum: ['email', 'sms', 'push', 'dashboard']
    }],
    dashboardLayout: {
      widgets: [String],
      layout: String
    },
    mapPreferences: {
      defaultZoom: Number,
      defaultCenter: [Number],
      preferredLayers: [String]
    }
  },
  areas: [{ // Areas of responsibility/interest
    name: String,
    boundary: {
      type: {
        type: String,
        enum: ['Polygon']
      },
      coordinates: []
    }
  }],
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Alert Schema
const AlertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: String,
  type: {
    type: String,
    enum: ['waste_management', 'healthcare', 'air_quality', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'emergency'],
    default: 'info'
  },
  location: {
    type: {
      type: String,
      enum: ['Point', 'Polygon']
    },
    coordinates: []
  },
  data: mongoose.Schema.Types.Mixed, // Associated data (e.g., measurement values, facility info)
  recipients: [{ // Users who should receive this alert
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    methods: [String], // notification methods for this user
    sentAt: Date,
    readAt: Date
  }],
  source: {
    system: String, // which system generated the alert
    dataSource: String, // NASA dataset, sensor, etc.
    confidence: Number
  },
  actions: [{ // Actions taken in response to alert
    action: String,
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    takenAt: Date,
    notes: String
  }],
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
});

// System Configuration Schema
const SystemConfigSchema = new mongoose.Schema({
  nasaApiKeys: {
    earthdataLogin: String,
    cmrSearch: String,
    modis: String,
    landsat: String
  },
  alertThresholds: {
    airQuality: {
      pm25: Number,
      no2: Number,
      aqi: Number
    },
    waste: {
      temperatureThreshold: Number,
      confidenceThreshold: Number
    },
    healthcare: {
      accessThreshold: Number, // minutes
      densityThreshold: Number // people per facility
    }
  },
  modelSettings: {
    airQualityModel: {
      version: String,
      updateFrequency: Number,
      parameters: mongoose.Schema.Types.Mixed
    },
    wasteOptimization: {
      geneticAlgorithm: {
        populationSize: Number,
        generations: Number,
        mutationRate: Number
      }
    }
  },
  dataUpdateSchedules: {
    nasaData: String, // cron format
    predictions: String,
    reports: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index({ email: 1 });
AlertSchema.index({ location: '2dsphere' });
AlertSchema.index({ type: 1, status: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
export const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', SystemConfigSchema);
