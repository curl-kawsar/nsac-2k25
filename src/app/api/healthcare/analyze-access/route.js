import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { HealthcareFacility, DemographicData, HealthcareAccess, EmergencyPreparedness } from '@/models/Healthcare';
import { Alert } from '@/models/User';
import nasaApi from '@/services/nasaApi';
import optimizationService from '@/services/optimizationService';
import { distance } from '@turf/turf';

export async function POST(request) {
  try {
    await connectDB();
    
    const { 
      bounds,
      analysisType = 'comprehensive',
      populationThreshold = 10000,
      accessTimeThreshold = 30 // minutes
    } = await request.json();
    
    if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
      return NextResponse.json(
        { error: 'Bounds are required (north, south, east, west)' },
        { status: 400 }
      );
    }

    console.log('Starting healthcare access analysis...');

    // Get demographic data for the area
    const demographicData = await DemographicData.find({
      location: {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [[
              [bounds.west, bounds.south],
              [bounds.east, bounds.south],
              [bounds.east, bounds.north],
              [bounds.west, bounds.north],
              [bounds.west, bounds.south]
            ]]
          }
        }
      }
    });

    // Get existing healthcare facilities
    const healthcareFacilities = await HealthcareFacility.find({
      location: {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [[
              [bounds.west, bounds.south],
              [bounds.east, bounds.south],
              [bounds.east, bounds.north],
              [bounds.west, bounds.north],
              [bounds.west, bounds.south]
            ]]
          }
        }
      },
      status: 'active'
    });

    // Fetch environmental data for health risk assessment
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    console.log('Fetching environmental data...');
    const [no2Data, heatStressData, precipitationData, groundwaterData] = await Promise.all([
      nasaApi.getOMIData(centerLat, centerLon, startDate.toISOString(), endDate.toISOString(), 'NO2'),
      nasaApi.getECOSTRESSLST(centerLat, centerLon, startDate.toISOString(), endDate.toISOString()),
      nasaApi.getGPMPrecipitation(centerLat, centerLon, startDate.toISOString(), endDate.toISOString()),
      nasaApi.getGRACEGroundwater(centerLat, centerLon, startDate.toISOString(), endDate.toISOString())
    ]);

    // Process environmental factors
    const environmentalFactors = this.processEnvironmentalData(
      no2Data, heatStressData, precipitationData, groundwaterData
    );

    // Analyze healthcare access for each demographic area
    const accessAnalysis = [];
    const healthcareDeserts = [];
    
    for (const area of demographicData) {
      const areaCoords = area.location.coordinates[0] || [area.location.coordinates];
      const areaCentroid = this.calculateCentroid(areaCoords);
      
      // Find nearest healthcare facilities
      const nearestFacilities = this.findNearestFacilities(
        areaCentroid, 
        healthcareFacilities, 
        5 // top 5 nearest
      );

      // Calculate access metrics
      const accessMetrics = this.calculateAccessMetrics(
        areaCentroid,
        nearestFacilities,
        area.population.total
      );

      // Check if this is a healthcare desert
      const isHealthcareDesert = this.isHealthcareDesert(
        area.population.total,
        accessMetrics.nearestFacility.travelTime,
        populationThreshold,
        accessTimeThreshold
      );

      if (isHealthcareDesert) {
        healthcareDeserts.push({
          area: area.area,
          population: area.population.total,
          distanceToNearestFacility: accessMetrics.nearestFacility.distance,
          travelTimeToNearestFacility: accessMetrics.nearestFacility.travelTime,
          facilitiesWithin30Min: nearestFacilities.filter(f => f.travelTime <= 30).length
        });
      }

      // Calculate environmental health risk score
      const healthRiskScore = this.calculateHealthRiskScore(
        area,
        environmentalFactors,
        accessMetrics
      );

      const healthcareAccess = {
        area: area.area,
        location: areaCentroid,
        population: area.population,
        socioeconomic: area.socioeconomic,
        accessMetrics: accessMetrics,
        environmentalFactors: {
          airQuality: environmentalFactors.airQuality,
          heatStress: environmentalFactors.heatStress,
          floodRisk: environmentalFactors.floodRisk,
          waterSecurity: environmentalFactors.waterSecurity
        },
        healthRiskScore: healthRiskScore,
        isHealthcareDesert: isHealthcareDesert,
        vulnerabilityScore: this.calculateVulnerabilityScore(area, accessMetrics),
        recommendations: this.generateRecommendations(area, accessMetrics, isHealthcareDesert)
      };

      accessAnalysis.push(healthcareAccess);

      // Save to database
      const healthcareAccessRecord = new HealthcareAccess({
        area: area.area,
        location: {
          type: 'Point',
          coordinates: [areaCentroid[0], areaCentroid[1]]
        },
        metrics: {
          nearestFacility: accessMetrics.nearestFacility,
          healthcareDesert: isHealthcareDesert,
          populationServed: accessMetrics.populationServed,
          facilityRatio: accessMetrics.facilityRatio
        },
        environmentalFactors: {
          airQuality: environmentalFactors.airQuality,
          heatStress: environmentalFactors.heatStress,
          floodRisk: environmentalFactors.floodRisk,
          waterSecurity: environmentalFactors.waterSecurity
        },
        healthRiskScore: healthRiskScore,
        calculatedAt: new Date()
      });

      await healthcareAccessRecord.save();
    }

    // Generate facility placement recommendations if needed
    let facilityRecommendations = [];
    if (analysisType === 'comprehensive' || analysisType === 'optimization') {
      console.log('Generating facility placement recommendations...');
      facilityRecommendations = await this.generateFacilityRecommendations(
        demographicData,
        healthcareFacilities,
        environmentalFactors,
        bounds
      );
    }

    // Generate emergency preparedness assessment
    const emergencyPreparedness = await this.assessEmergencyPreparedness(
      demographicData,
      healthcareFacilities,
      environmentalFactors
    );

    // Create alerts for critical healthcare deserts
    for (const desert of healthcareDeserts) {
      if (desert.population > populationThreshold) {
        await this.createHealthcareAccessAlert(desert, bounds);
      }
    }

    // Calculate overall statistics
    const statistics = {
      totalPopulation: demographicData.reduce((sum, area) => sum + area.population.total, 0),
      healthcareDeserts: healthcareDeserts.length,
      averageAccessTime: accessAnalysis.reduce((sum, a) => sum + a.accessMetrics.nearestFacility.travelTime, 0) / accessAnalysis.length,
      averageHealthRisk: accessAnalysis.reduce((sum, a) => sum + a.healthRiskScore, 0) / accessAnalysis.length,
      facilitiesCount: healthcareFacilities.length,
      facilitiesPerCapita: healthcareFacilities.length / (demographicData.reduce((sum, area) => sum + area.population.total, 0) / 100000)
    };

    return NextResponse.json({
      success: true,
      analysis: {
        bounds: bounds,
        timestamp: new Date(),
        accessAnalysis: accessAnalysis,
        healthcareDeserts: healthcareDeserts,
        facilityRecommendations: facilityRecommendations,
        emergencyPreparedness: emergencyPreparedness,
        statistics: statistics,
        environmentalFactors: environmentalFactors
      },
      recommendations: {
        criticalAreas: healthcareDeserts.slice(0, 5), // Top 5 priority areas
        suggestedFacilities: facilityRecommendations.slice(0, 3), // Top 3 facility recommendations
        policyInterventions: this.generatePolicyRecommendations(accessAnalysis, statistics)
      }
    });

  } catch (error) {
    console.error('Error analyzing healthcare access:', error);
    return NextResponse.json(
      { error: 'Failed to analyze healthcare access' },
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
    const radius = parseFloat(searchParams.get('radius') || '10');
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Get healthcare access data for the area
    const accessData = await HealthcareAccess.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radius * 1000
        }
      }
    }).sort({ calculatedAt: -1 }).limit(50);

    // Get healthcare facilities
    const facilities = await HealthcareFacility.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radius * 1000
        }
      },
      status: 'active'
    });

    return NextResponse.json({
      success: true,
      accessData: accessData,
      facilities: facilities,
      summary: {
        accessPoints: accessData.length,
        facilitiesCount: facilities.length,
        averageRiskScore: accessData.reduce((sum, a) => sum + (a.healthRiskScore || 0), 0) / Math.max(accessData.length, 1)
      }
    });

  } catch (error) {
    console.error('Error fetching healthcare access data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch healthcare access data' },
      { status: 500 }
    );
  }
}

// Helper functions
function processEnvironmentalData(no2Data, heatStressData, precipitationData, groundwaterData) {
  return {
    airQuality: this.processAirQualityData(no2Data),
    heatStress: this.processHeatStressData(heatStressData),
    floodRisk: this.processFloodRiskData(precipitationData),
    waterSecurity: this.processWaterSecurityData(groundwaterData)
  };
}

function processAirQualityData(no2Data) {
  // Process NO2 data and calculate air quality index
  if (no2Data.feed && no2Data.feed.entry && no2Data.feed.entry.length > 0) {
    return 0.3 + Math.random() * 0.4; // Simulated air quality score 0-1
  }
  return 0.5; // Default moderate air quality
}

function processHeatStressData(heatStressData) {
  // Process ECOSTRESS LST data
  if (heatStressData.feed && heatStressData.feed.entry && heatStressData.feed.entry.length > 0) {
    return 0.2 + Math.random() * 0.6; // Simulated heat stress score 0-1
  }
  return 0.4; // Default moderate heat stress
}

function processFloodRiskData(precipitationData) {
  // Process GPM precipitation data for flood risk
  if (precipitationData.feed && precipitationData.feed.entry && precipitationData.feed.entry.length > 0) {
    return 0.1 + Math.random() * 0.5; // Simulated flood risk score 0-1
  }
  return 0.3; // Default low-moderate flood risk
}

function processWaterSecurityData(groundwaterData) {
  // Process GRACE groundwater data
  if (groundwaterData.feed && groundwaterData.feed.entry && groundwaterData.feed.entry.length > 0) {
    return 0.4 + Math.random() * 0.4; // Simulated water security score 0-1
  }
  return 0.6; // Default good water security
}

function calculateCentroid(coordinates) {
  let sumLat = 0, sumLon = 0;
  let count = 0;
  
  coordinates.forEach(coord => {
    if (Array.isArray(coord) && coord.length >= 2) {
      sumLon += coord[0];
      sumLat += coord[1];
      count++;
    }
  });
  
  return count > 0 ? [sumLon / count, sumLat / count] : [0, 0];
}

function findNearestFacilities(location, facilities, limit = 5) {
  const facilitiesWithDistance = facilities.map(facility => {
    const dist = distance(
      location,
      facility.location.coordinates,
      { units: 'kilometers' }
    );
    
    return {
      ...facility.toObject(),
      distance: dist,
      travelTime: dist / 40 * 60 // Assume 40 km/h, convert to minutes
    };
  });
  
  return facilitiesWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

function calculateAccessMetrics(location, nearestFacilities, population) {
  const nearestFacility = nearestFacilities[0] || {
    distance: Infinity,
    travelTime: Infinity,
    facilityType: 'none'
  };
  
  const facilitiesWithin30Min = nearestFacilities.filter(f => f.travelTime <= 30);
  const facilitiesWithin60Min = nearestFacilities.filter(f => f.travelTime <= 60);
  
  return {
    nearestFacility: {
      distance: nearestFacility.distance,
      travelTime: nearestFacility.travelTime,
      facilityType: nearestFacility.type || 'none'
    },
    facilitiesWithin30Min: facilitiesWithin30Min.length,
    facilitiesWithin60Min: facilitiesWithin60Min.length,
    populationServed: population,
    facilityRatio: nearestFacilities.length > 0 ? population / nearestFacilities.length : population
  };
}

function isHealthcareDesert(population, travelTime, populationThreshold, timeThreshold) {
  return population > populationThreshold && travelTime > timeThreshold;
}

function calculateHealthRiskScore(area, environmentalFactors, accessMetrics) {
  let riskScore = 0;
  
  // Environmental factors (40% weight)
  riskScore += (1 - environmentalFactors.airQuality) * 10;
  riskScore += environmentalFactors.heatStress * 10;
  riskScore += environmentalFactors.floodRisk * 10;
  riskScore += (1 - environmentalFactors.waterSecurity) * 10;
  
  // Access factors (30% weight)
  riskScore += Math.min(accessMetrics.nearestFacility.travelTime / 60, 1) * 15;
  riskScore += Math.max(0, 1 - accessMetrics.facilitiesWithin30Min / 3) * 15;
  
  // Demographic vulnerability (30% weight)
  const vulnerablePopulation = (area.population.ageStructure.under5 + area.population.ageStructure.over65) / area.population.total;
  riskScore += vulnerablePopulation * 15;
  riskScore += area.socioeconomic.povertyRate * 15;
  
  return Math.min(riskScore, 100);
}

function calculateVulnerabilityScore(area, accessMetrics) {
  let vulnerability = 0;
  
  // Age vulnerability
  const ageVulnerability = (area.population.ageStructure.under5 + area.population.ageStructure.over65) / area.population.total;
  vulnerability += ageVulnerability * 30;
  
  // Socioeconomic vulnerability
  vulnerability += area.socioeconomic.povertyRate * 25;
  vulnerability += (1 - area.socioeconomic.educationLevel.tertiary) * 15;
  
  // Access vulnerability
  vulnerability += Math.min(accessMetrics.nearestFacility.travelTime / 60, 1) * 30;
  
  return Math.min(vulnerability, 100);
}

function generateRecommendations(area, accessMetrics, isHealthcareDesert) {
  const recommendations = [];
  
  if (isHealthcareDesert) {
    recommendations.push('Priority area for new healthcare facility placement');
    recommendations.push('Implement mobile health services');
    recommendations.push('Improve transportation infrastructure');
  }
  
  if (accessMetrics.nearestFacility.travelTime > 45) {
    recommendations.push('Consider satellite clinic or telemedicine services');
  }
  
  if (area.socioeconomic.povertyRate > 0.3) {
    recommendations.push('Implement community health worker programs');
    recommendations.push('Provide subsidized healthcare access');
  }
  
  if ((area.population.ageStructure.under5 + area.population.ageStructure.over65) / area.population.total > 0.3) {
    recommendations.push('Focus on age-specific healthcare services');
    recommendations.push('Implement preventive care programs');
  }
  
  return recommendations;
}

async function generateFacilityRecommendations(demographicData, existingFacilities, environmentalFactors, bounds) {
  const constraints = {
    bounds: bounds,
    maxFacilities: 3,
    facilityTypes: ['clinic', 'hospital', 'emergency'],
    minCapacity: 1000,
    maxCapacity: 10000,
    availableServices: ['general', 'emergency', 'maternal', 'pediatric', 'geriatric']
  };
  
  const healthcareNeeds = demographicData.map(area => ({
    location: area.location.coordinates,
    population: area.population.total,
    requiredCapacity: area.population.total * 0.15 // 15% annual healthcare utilization
  }));
  
  try {
    const recommendations = await optimizationService.optimizeHealthcareFacilities(
      demographicData,
      healthcareNeeds,
      environmentalFactors,
      constraints
    );
    
    return recommendations.slice(0, 3); // Top 3 recommendations
  } catch (error) {
    console.error('Error generating facility recommendations:', error);
    return [];
  }
}

async function assessEmergencyPreparedness(demographicData, healthcareFacilities, environmentalFactors) {
  const totalPopulation = demographicData.reduce((sum, area) => sum + area.population.total, 0);
  const emergencyFacilities = healthcareFacilities.filter(f => f.services.includes('emergency')).length;
  
  const preparedness = {
    emergencyCapacity: emergencyFacilities * 100, // Assume 100 beds per emergency facility
    populationCoverage: emergencyFacilities > 0 ? Math.min(emergencyFacilities * 50000 / totalPopulation, 1) : 0,
    climatRisks: [
      environmentalFactors.heatStress > 0.7 ? 'extreme_heat' : null,
      environmentalFactors.floodRisk > 0.6 ? 'flooding' : null,
      environmentalFactors.airQuality < 0.3 ? 'air_pollution' : null
    ].filter(risk => risk !== null),
    preparednessScore: this.calculatePreparednessScore(emergencyFacilities, totalPopulation, environmentalFactors),
    recommendations: this.generateEmergencyRecommendations(emergencyFacilities, totalPopulation, environmentalFactors)
  };
  
  // Save emergency preparedness assessment
  const emergencyPrep = new EmergencyPreparedness({
    area: 'analysis_region',
    riskFactors: {
      naturalDisasters: preparedness.climatRisks,
      climateRisks: preparedness.climatRisks,
      populationVulnerability: demographicData.reduce((sum, area) => sum + area.socioeconomic.povertyRate, 0) / demographicData.length
    },
    resources: {
      emergencyFacilities: emergencyFacilities,
      evacuationRoutes: [], // Would be calculated from road network
      emergencySupplies: emergencyFacilities * 1000 // Estimated supplies
    },
    preparednessScore: preparedness.preparednessScore,
    recommendations: preparedness.recommendations,
    lastAssessment: new Date()
  });
  
  await emergencyPrep.save();
  
  return preparedness;
}

function calculatePreparednessScore(emergencyFacilities, totalPopulation, environmentalFactors) {
  let score = 50; // Base score
  
  // Facility adequacy (40 points)
  const facilityRatio = emergencyFacilities / (totalPopulation / 100000);
  score += Math.min(facilityRatio * 20, 40);
  
  // Environmental resilience (30 points)
  const environmentalScore = (environmentalFactors.airQuality + (1 - environmentalFactors.heatStress) + (1 - environmentalFactors.floodRisk) + environmentalFactors.waterSecurity) / 4;
  score += environmentalScore * 30;
  
  // Infrastructure (30 points) - simplified
  score += 20; // Assume moderate infrastructure
  
  return Math.min(score, 100);
}

function generateEmergencyRecommendations(emergencyFacilities, totalPopulation, environmentalFactors) {
  const recommendations = [];
  
  if (emergencyFacilities / (totalPopulation / 100000) < 1) {
    recommendations.push('Increase emergency healthcare capacity');
  }
  
  if (environmentalFactors.floodRisk > 0.6) {
    recommendations.push('Develop flood-resistant healthcare infrastructure');
    recommendations.push('Create emergency evacuation plans');
  }
  
  if (environmentalFactors.heatStress > 0.7) {
    recommendations.push('Implement heat wave response protocols');
    recommendations.push('Ensure cooling systems in healthcare facilities');
  }
  
  if (environmentalFactors.airQuality < 0.3) {
    recommendations.push('Prepare for air pollution health emergencies');
    recommendations.push('Stock respiratory medications and equipment');
  }
  
  return recommendations;
}

async function createHealthcareAccessAlert(healthcareDesert, bounds) {
  const alert = new Alert({
    title: 'Healthcare Desert Identified',
    message: `Area with ${healthcareDesert.population} people has limited healthcare access. Nearest facility is ${healthcareDesert.travelTimeToNearestFacility.toFixed(1)} minutes away.`,
    type: 'healthcare',
    severity: 'warning',
    location: {
      type: 'Polygon',
      coordinates: [[
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
        [bounds.west, bounds.south]
      ]]
    },
    data: {
      population: healthcareDesert.population,
      travelTime: healthcareDesert.travelTimeToNearestFacility,
      facilitiesWithin30Min: healthcareDesert.facilitiesWithin30Min
    },
    source: {
      system: 'healthcare_access_analysis',
      dataSource: 'demographic_spatial_analysis',
      confidence: 0.9
    }
  });
  
  await alert.save();
  return alert;
}

function generatePolicyRecommendations(accessAnalysis, statistics) {
  const recommendations = [];
  
  if (statistics.healthcareDeserts > 0) {
    recommendations.push({
      type: 'facility_expansion',
      priority: 'high',
      description: 'Expand healthcare facilities in underserved areas',
      estimatedCost: statistics.healthcareDeserts * 2000000,
      estimatedImpact: 'Reduce healthcare deserts by 50%'
    });
  }
  
  if (statistics.averageAccessTime > 30) {
    recommendations.push({
      type: 'transportation',
      priority: 'medium',
      description: 'Improve transportation infrastructure and services',
      estimatedCost: 5000000,
      estimatedImpact: 'Reduce average access time by 25%'
    });
  }
  
  if (statistics.facilitiesPerCapita < 0.5) {
    recommendations.push({
      type: 'capacity_building',
      priority: 'high',
      description: 'Increase overall healthcare capacity',
      estimatedCost: 10000000,
      estimatedImpact: 'Improve facilities per capita ratio'
    });
  }
  
  return recommendations;
}
