import mongoose from 'mongoose';

// Illegal Dump Site Detection
const IllegalDumpSchema = new mongoose.Schema({
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
  temperature: {
    type: Number,
    required: true
  },
  detectionDate: {
    type: Date,
    default: Date.now
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  populationDensity: Number,
  environmentalRisk: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['detected', 'verified', 'cleaning', 'resolved'],
    default: 'detected'
  },
  alertSent: {
    type: Boolean,
    default: false
  }
});

// Waste Facility Optimization
const WasteFacilitySchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    enum: ['collection', 'recycling', 'treatment', 'disposal']
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
  currentLoad: Number,
  efficiency: Number,
  operationalCost: Number,
  environmentalImpact: Number,
  status: {
    type: String,
    enum: ['active', 'inactive', 'proposed'],
    default: 'active'
  },
  servingPopulation: Number
});

// Waste Collection Routes
const WasteRouteSchema = new mongoose.Schema({
  routeId: String,
  vehicle: {
    id: String,
    capacity: Number,
    fuelEfficiency: Number
  },
  waypoints: [{
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    },
    estimatedTime: Number,
    wasteAmount: Number
  }],
  totalDistance: Number,
  estimatedDuration: Number,
  optimizedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed'],
    default: 'planned'
  }
});

// Environmental Monitoring
const EnvironmentalDataSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  data: {
    aod: Number, // MODIS Aerosol Optical Depth
    groundwater: Number, // GRACE data
    soilMoisture: Number,
    temperature: Number,
    contamination: {
      level: Number,
      type: String
    }
  }
});

IllegalDumpSchema.index({ location: '2dsphere' });
WasteFacilitySchema.index({ location: '2dsphere' });
EnvironmentalDataSchema.index({ location: '2dsphere' });

export const IllegalDump = mongoose.models.IllegalDump || mongoose.model('IllegalDump', IllegalDumpSchema);
export const WasteFacility = mongoose.models.WasteFacility || mongoose.model('WasteFacility', WasteFacilitySchema);
export const WasteRoute = mongoose.models.WasteRoute || mongoose.model('WasteRoute', WasteRouteSchema);
export const EnvironmentalData = mongoose.models.EnvironmentalData || mongoose.model('EnvironmentalData', EnvironmentalDataSchema);
