import { Matrix } from 'ml-matrix';

class MLService {
  constructor() {
    this.models = {
      pm25Prediction: null,
      aqiCalculation: null,
      sourceAttribution: null
    };
    
    // WHO Air Quality Guidelines
    this.whoGuidelines = {
      pm25: 15, // µg/m³ annual mean
      pm10: 45, // µg/m³ annual mean
      no2: 25, // µg/m³ annual mean
      so2: 40, // µg/m³ 24-hour mean
      co: 4000, // µg/m³ 8-hour mean
      o3: 100 // µg/m³ 8-hour mean
    };
    
    // AQI breakpoints (US EPA standard)
    this.aqiBreakpoints = {
      pm25: [
        { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
        { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
        { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
        { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
        { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
        { low: 250.5, high: 350.4, aqiLow: 301, aqiHigh: 400 },
        { low: 350.5, high: 500.4, aqiLow: 401, aqiHigh: 500 }
      ],
      pm10: [
        { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
        { low: 55, high: 154, aqiLow: 51, aqiHigh: 100 },
        { low: 155, high: 254, aqiLow: 101, aqiHigh: 150 },
        { low: 255, high: 354, aqiLow: 151, aqiHigh: 200 },
        { low: 355, high: 424, aqiLow: 201, aqiHigh: 300 },
        { low: 425, high: 504, aqiLow: 301, aqiHigh: 400 },
        { low: 505, high: 604, aqiLow: 401, aqiHigh: 500 }
      ]
    };
  }

  // Train PM2.5 prediction model using satellite data
  trainPM25Model(trainingData) {
    try {
      // Features: AOD, NO2, SO2, meteorological data, land use
      const features = trainingData.map(sample => [
        sample.aod || 0,
        sample.no2 || 0,
        sample.so2 || 0,
        sample.temperature || 0,
        sample.humidity || 0,
        sample.windSpeed || 0,
        sample.pressure || 0,
        sample.landUse || 0, // encoded land use type
        sample.elevation || 0,
        sample.populationDensity || 0
      ]);

      const targets = trainingData.map(sample => sample.pm25);

      // Simple linear regression model
      const X = new Matrix(features);
      const y = Matrix.columnVector(targets);

      // Add bias term
      const ones = Matrix.ones(X.rows, 1);
      const XWithBias = Matrix.columnVector(ones).concat(X);

      // Calculate weights using normal equation: w = (X^T * X)^-1 * X^T * y
      const XTranspose = XWithBias.transpose();
      const weights = XTranspose.mmul(XWithBias).inverse().mmul(XTranspose).mmul(y);

      this.models.pm25Prediction = {
        weights: weights.to1DArray(),
        meanFeatures: this.calculateMean(features),
        stdFeatures: this.calculateStd(features, this.calculateMean(features)),
        trainedAt: new Date()
      };

      return {
        success: true,
        rmse: this.calculateRMSE(this.predictPM25Batch(features), targets),
        r2: this.calculateR2(this.predictPM25Batch(features), targets)
      };
    } catch (error) {
      console.error('Error training PM2.5 model:', error);
      throw error;
    }
  }

  // Predict PM2.5 concentration for a single location
  predictPM25(features) {
    if (!this.models.pm25Prediction) {
      throw new Error('PM2.5 prediction model not trained');
    }

    try {
      // Normalize features
      const normalizedFeatures = features.map((feature, index) => {
        const mean = this.models.pm25Prediction.meanFeatures[index];
        const std = this.models.pm25Prediction.stdFeatures[index];
        return std > 0 ? (feature - mean) / std : 0;
      });

      // Add bias term
      const input = [1, ...normalizedFeatures];
      
      // Calculate prediction
      let prediction = 0;
      for (let i = 0; i < input.length; i++) {
        prediction += input[i] * this.models.pm25Prediction.weights[i];
      }

      return Math.max(0, prediction); // Ensure non-negative
    } catch (error) {
      console.error('Error predicting PM2.5:', error);
      throw error;
    }
  }

  // Batch prediction for multiple locations
  predictPM25Batch(featuresArray) {
    return featuresArray.map(features => this.predictPM25(features));
  }

  // Calculate Air Quality Index (AQI)
  calculateAQI(pollutantData) {
    let maxAQI = 0;
    let primaryPollutant = '';

    Object.keys(pollutantData).forEach(pollutant => {
      if (this.aqiBreakpoints[pollutant]) {
        const concentration = pollutantData[pollutant];
        const aqi = this.concentrationToAQI(concentration, pollutant);
        
        if (aqi > maxAQI) {
          maxAQI = aqi;
          primaryPollutant = pollutant;
        }
      }
    });

    return {
      aqi: Math.round(maxAQI),
      primaryPollutant: primaryPollutant,
      category: this.getAQICategory(maxAQI),
      healthMessage: this.getHealthMessage(maxAQI)
    };
  }

  // Convert pollutant concentration to AQI
  concentrationToAQI(concentration, pollutant) {
    const breakpoints = this.aqiBreakpoints[pollutant];
    if (!breakpoints) return 0;

    for (const bp of breakpoints) {
      if (concentration >= bp.low && concentration <= bp.high) {
        const aqiRange = bp.aqiHigh - bp.aqiLow;
        const concentrationRange = bp.high - bp.low;
        const aqi = ((aqiRange / concentrationRange) * (concentration - bp.low)) + bp.aqiLow;
        return aqi;
      }
    }

    // If concentration exceeds highest breakpoint
    const lastBp = breakpoints[breakpoints.length - 1];
    return lastBp.aqiHigh;
  }

  // Get AQI category
  getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  // Get health message based on AQI
  getHealthMessage(aqi) {
    if (aqi <= 50) {
      return 'Air quality is considered satisfactory, and air pollution poses little or no risk.';
    } else if (aqi <= 100) {
      return 'Air quality is acceptable; however, there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.';
    } else if (aqi <= 150) {
      return 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.';
    } else if (aqi <= 200) {
      return 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.';
    } else if (aqi <= 300) {
      return 'Health warnings of emergency conditions. The entire population is more likely to be affected.';
    } else {
      return 'Health alert: everyone may experience more serious health effects.';
    }
  }

  // Multi-source data fusion for comprehensive air quality assessment
  fuseAirQualityData(sources) {
    const fusedData = {
      pm25: 0,
      pm10: 0,
      no2: 0,
      so2: 0,
      co: 0,
      o3: 0,
      weights: {},
      confidence: 0
    };

    let totalWeight = 0;

    // Weight each source based on reliability and recency
    sources.forEach(source => {
      const weight = this.calculateSourceWeight(source);
      totalWeight += weight;

      Object.keys(source.measurements).forEach(pollutant => {
        if (fusedData.hasOwnProperty(pollutant)) {
          fusedData[pollutant] += source.measurements[pollutant] * weight;
        }
      });

      fusedData.weights[source.type] = weight;
    });

    // Normalize by total weight
    if (totalWeight > 0) {
      Object.keys(fusedData).forEach(key => {
        if (typeof fusedData[key] === 'number' && key !== 'confidence') {
          fusedData[key] /= totalWeight;
        }
      });
    }

    fusedData.confidence = this.calculateFusionConfidence(sources, totalWeight);
    
    return fusedData;
  }

  // Calculate weight for each data source
  calculateSourceWeight(source) {
    let weight = 1.0;

    // Source reliability weights
    const reliabilityWeights = {
      'ground_station': 1.0,
      'satellite': 0.8,
      'model_prediction': 0.6
    };

    weight *= reliabilityWeights[source.type] || 0.5;

    // Temporal weight (newer data gets higher weight)
    const age = (Date.now() - new Date(source.timestamp).getTime()) / (1000 * 60 * 60); // hours
    const temporalWeight = Math.exp(-age / 24); // Exponential decay over 24 hours
    weight *= temporalWeight;

    // Confidence weight
    if (source.confidence) {
      weight *= source.confidence;
    }

    return weight;
  }

  // Calculate confidence of fused data
  calculateFusionConfidence(sources, totalWeight) {
    if (sources.length === 0) return 0;

    // Base confidence on number of sources and their individual confidences
    const avgConfidence = sources.reduce((sum, source) => sum + (source.confidence || 0.5), 0) / sources.length;
    const sourceCountBonus = Math.min(sources.length / 3, 1); // Bonus for having multiple sources
    
    return Math.min(avgConfidence * sourceCountBonus, 1.0);
  }

  // Pollution source attribution using statistical methods
  attributePollutionSources(measurements, meteorology, landUse, emissions) {
    const attribution = {
      traffic: 0,
      industry: 0,
      biomass_burning: 0,
      residential: 0,
      power_generation: 0,
      natural: 0
    };

    try {
      // Traffic attribution (based on NO2/PM ratio and road density)
      const no2PmRatio = measurements.no2 / Math.max(measurements.pm25, 1);
      if (no2PmRatio > 2 && landUse.roadDensity > 0.5) {
        attribution.traffic = Math.min(no2PmRatio * landUse.roadDensity * 0.3, 0.8);
      }

      // Industrial attribution (based on SO2 levels and industrial land use)
      if (measurements.so2 > 20 && landUse.industrial > 0.1) {
        attribution.industry = Math.min(measurements.so2 / 100 * landUse.industrial, 0.7);
      }

      // Biomass burning attribution (based on PM/CO ratio and fire data)
      const pmCoRatio = measurements.pm25 / Math.max(measurements.co, 1);
      if (emissions.fireCount > 0 && pmCoRatio > 0.01) {
        attribution.biomass_burning = Math.min(emissions.fireCount / 10 * pmCoRatio, 0.6);
      }

      // Residential attribution (based on land use and seasonal patterns)
      if (landUse.residential > 0.3) {
        attribution.residential = Math.min(landUse.residential * 0.4, 0.5);
      }

      // Power generation attribution (based on SO2 and distance to power plants)
      if (measurements.so2 > 10 && landUse.powerPlantProximity < 5) {
        attribution.power_generation = Math.min((measurements.so2 - 10) / 50 * (5 - landUse.powerPlantProximity) / 5, 0.4);
      }

      // Natural sources (baseline)
      const totalAttribution = Object.values(attribution).reduce((sum, val) => sum + val, 0);
      attribution.natural = Math.max(0, 1 - totalAttribution);

      // Normalize to ensure sum equals 1
      const normalizationFactor = Object.values(attribution).reduce((sum, val) => sum + val, 0);
      if (normalizationFactor > 0) {
        Object.keys(attribution).forEach(key => {
          attribution[key] /= normalizationFactor;
        });
      }

      return attribution;
    } catch (error) {
      console.error('Error in pollution source attribution:', error);
      return attribution;
    }
  }

  // Check if pollutant concentrations exceed WHO guidelines
  checkWHOThresholds(measurements) {
    const exceedances = [];

    Object.keys(this.whoGuidelines).forEach(pollutant => {
      if (measurements[pollutant] && measurements[pollutant] > this.whoGuidelines[pollutant]) {
        exceedances.push({
          pollutant: pollutant,
          measured: measurements[pollutant],
          guideline: this.whoGuidelines[pollutant],
          exceedanceFactor: measurements[pollutant] / this.whoGuidelines[pollutant]
        });
      }
    });

    return exceedances;
  }

  // Generate air quality forecast
  generateForecast(currentMeasurements, meteorologicalForecast, emissionProjections) {
    const forecast = [];

    for (let hour = 1; hour <= 24; hour++) {
      const meteo = meteorologicalForecast[hour - 1] || meteorologicalForecast[meteorologicalForecast.length - 1];
      
      // Simple persistence model with meteorological adjustments
      const forecastMeasurements = { ...currentMeasurements };

      // Wind speed effect (higher wind speed reduces concentrations)
      const windFactor = Math.exp(-meteo.windSpeed / 10);
      
      // Atmospheric stability effect
      const stabilityFactor = meteo.atmosphericStability || 1.0;
      
      // Emission factor based on time of day
      const emissionFactor = this.getEmissionFactor(hour);

      Object.keys(forecastMeasurements).forEach(pollutant => {
        if (typeof forecastMeasurements[pollutant] === 'number') {
          forecastMeasurements[pollutant] *= windFactor * stabilityFactor * emissionFactor;
        }
      });

      const aqi = this.calculateAQI(forecastMeasurements);

      forecast.push({
        hour: hour,
        timestamp: new Date(Date.now() + hour * 60 * 60 * 1000),
        measurements: forecastMeasurements,
        aqi: aqi.aqi,
        category: aqi.category,
        confidence: Math.max(0.3, 1.0 - hour * 0.02) // Decreasing confidence with time
      });
    }

    return forecast;
  }

  // Get emission factor based on time of day
  getEmissionFactor(hour) {
    // Typical diurnal emission pattern (higher during rush hours)
    const rushHourMorning = hour >= 7 && hour <= 9;
    const rushHourEvening = hour >= 17 && hour <= 19;
    
    if (rushHourMorning || rushHourEvening) {
      return 1.3; // 30% increase during rush hours
    } else if (hour >= 0 && hour <= 6) {
      return 0.7; // Lower emissions at night
    } else {
      return 1.0; // Normal emissions
    }
  }

  // Helper functions
  calculateMean(data) {
    const means = [];
    const numFeatures = data[0].length;
    
    for (let i = 0; i < numFeatures; i++) {
      let sum = 0;
      for (let j = 0; j < data.length; j++) {
        sum += data[j][i];
      }
      means.push(sum / data.length);
    }
    
    return means;
  }

  calculateStd(data, means) {
    const stds = [];
    const numFeatures = data[0].length;
    
    for (let i = 0; i < numFeatures; i++) {
      let sumSquaredDiff = 0;
      for (let j = 0; j < data.length; j++) {
        sumSquaredDiff += Math.pow(data[j][i] - means[i], 2);
      }
      stds.push(Math.sqrt(sumSquaredDiff / data.length));
    }
    
    return stds;
  }

  calculateRMSE(predictions, actual) {
    let sumSquaredError = 0;
    for (let i = 0; i < predictions.length; i++) {
      sumSquaredError += Math.pow(predictions[i] - actual[i], 2);
    }
    return Math.sqrt(sumSquaredError / predictions.length);
  }

  calculateR2(predictions, actual) {
    const meanActual = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    
    let totalSumSquares = 0;
    let residualSumSquares = 0;
    
    for (let i = 0; i < actual.length; i++) {
      totalSumSquares += Math.pow(actual[i] - meanActual, 2);
      residualSumSquares += Math.pow(actual[i] - predictions[i], 2);
    }
    
    return 1 - (residualSumSquares / totalSumSquares);
  }
}

export default new MLService();
