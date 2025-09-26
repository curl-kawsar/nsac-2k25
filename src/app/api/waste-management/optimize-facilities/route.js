import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { WasteFacility, EnvironmentalData } from '@/models/WasteManagement';
import { DemographicData } from '@/models/Healthcare';
import optimizationService from '@/services/optimizationService';

export async function POST(request) {
  try {
    await connectDB();
    
    const { 
      bounds, 
      facilityTypes = ['collection', 'recycling', 'treatment'],
      maxFacilities = 5,
      constraints = {}
    } = await request.json();
    
    if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
      return NextResponse.json(
        { error: 'Bounds are required (north, south, east, west)' },
        { status: 400 }
      );
    }

    // Get population centers in the area
    const populationCenters = await DemographicData.find({
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

    // Get existing facilities
    const existingFacilities = await WasteFacility.find({
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

    // Get environmental data for constraints
    const environmentalData = await EnvironmentalData.find({
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

    // Prepare optimization constraints
    const optimizationConstraints = {
      bounds: bounds,
      maxFacilities: maxFacilities,
      facilityTypes: facilityTypes,
      minCapacity: constraints.minCapacity || 1000,
      maxCapacity: constraints.maxCapacity || 10000,
      environmentalZones: environmentalData.map(data => ({
        lat: data.location.coordinates[1],
        lon: data.location.coordinates[0],
        bufferDistance: 2, // 2km buffer from sensitive areas
        type: 'environmental_sensitive'
      })),
      costConstraints: constraints.budget || 50000000, // Default 50M budget
      accessibilityRequirements: constraints.accessibilityRequirements || {}
    };

    // Format population centers for optimization
    const formattedPopulationCenters = populationCenters.map(center => ({
      lat: center.location.coordinates[1],
      lon: center.location.coordinates[0],
      population: center.population.total,
      wasteGeneration: center.population.total * 1.2 // kg per person per day
    }));

    // Format existing facilities
    const formattedExistingFacilities = existingFacilities.map(facility => ({
      lat: facility.location.coordinates[1],
      lon: facility.location.coordinates[0],
      type: facility.type,
      capacity: facility.capacity,
      currentLoad: facility.currentLoad || 0
    }));

    // Run genetic algorithm optimization
    console.log('Starting facility optimization...');
    const optimizationResult = await optimizationService.optimizeFacilityPlacement(
      formattedPopulationCenters,
      formattedExistingFacilities,
      optimizationConstraints
    );

    // Process optimization results
    const recommendedFacilities = optimizationResult.entity.map((facility, index) => ({
      id: `proposed_${index}`,
      location: {
        type: 'Point',
        coordinates: [facility.lon, facility.lat]
      },
      type: facility.type,
      capacity: Math.round(facility.capacity),
      estimatedCost: this.calculateFacilityCost(facility),
      servingPopulation: this.calculateServingPopulation(facility, formattedPopulationCenters),
      environmentalImpact: this.assessEnvironmentalImpact(facility, environmentalData),
      accessibility: this.calculateAccessibilityScore(facility, formattedPopulationCenters),
      status: 'proposed'
    }));

    // Calculate optimization metrics
    const metrics = {
      totalCoverage: this.calculateTotalCoverage(recommendedFacilities, formattedPopulationCenters),
      totalCost: recommendedFacilities.reduce((sum, f) => sum + f.estimatedCost, 0),
      averageAccessTime: this.calculateAverageAccessTime(recommendedFacilities, formattedPopulationCenters),
      environmentalScore: this.calculateEnvironmentalScore(recommendedFacilities, environmentalData),
      fitnessScore: optimizationResult.fitness
    };

    // Save optimization results
    const optimizationRecord = {
      timestamp: new Date(),
      bounds: bounds,
      recommendedFacilities: recommendedFacilities,
      metrics: metrics,
      parameters: optimizationConstraints
    };

    return NextResponse.json({
      success: true,
      recommendedFacilities: recommendedFacilities,
      metrics: metrics,
      optimizationDetails: {
        algorithm: 'genetic_algorithm',
        generations: 100,
        populationSize: 50,
        fitnessScore: optimizationResult.fitness
      }
    });

  } catch (error) {
    console.error('Error optimizing waste facilities:', error);
    return NextResponse.json(
      { error: 'Failed to optimize facility placement' },
      { status: 500 }
    );
  }
}

function calculateFacilityCost(facility) {
  const baseCosts = {
    collection: 500000,
    recycling: 2000000,
    treatment: 5000000,
    disposal: 3000000
  };
  
  const baseCost = baseCosts[facility.type] || 1000000;
  const capacityCost = facility.capacity * 200;
  
  return baseCost + capacityCost;
}

function calculateServingPopulation(facility, populationCenters) {
  let servingPopulation = 0;
  const serviceRadius = 15; // 15km service radius
  
  populationCenters.forEach(center => {
    const distance = Math.sqrt(
      Math.pow(facility.lat - center.lat, 2) + 
      Math.pow(facility.lon - center.lon, 2)
    ) * 111.32; // Approximate km per degree
    
    if (distance <= serviceRadius) {
      servingPopulation += center.population;
    }
  });
  
  return servingPopulation;
}

function assessEnvironmentalImpact(facility, environmentalData) {
  // Lower score means lower environmental impact (better)
  let impactScore = 0.5; // Base impact
  
  environmentalData.forEach(data => {
    const distance = Math.sqrt(
      Math.pow(facility.lat - data.location.coordinates[1], 2) + 
      Math.pow(facility.lon - data.location.coordinates[0], 2)
    ) * 111.32;
    
    if (distance < 2) { // Within 2km of sensitive area
      impactScore += 0.3;
    } else if (distance < 5) { // Within 5km
      impactScore += 0.1;
    }
  });
  
  return Math.min(impactScore, 1.0);
}

function calculateAccessibilityScore(facility, populationCenters) {
  let accessibilityScore = 0;
  let totalPopulation = 0;
  
  populationCenters.forEach(center => {
    const distance = Math.sqrt(
      Math.pow(facility.lat - center.lat, 2) + 
      Math.pow(facility.lon - center.lon, 2)
    ) * 111.32;
    
    const accessScore = Math.max(0, 1 - distance / 20); // Normalized to 20km
    accessibilityScore += accessScore * center.population;
    totalPopulation += center.population;
  });
  
  return totalPopulation > 0 ? accessibilityScore / totalPopulation : 0;
}

function calculateTotalCoverage(facilities, populationCenters) {
  let coveredPopulation = 0;
  let totalPopulation = populationCenters.reduce((sum, center) => sum + center.population, 0);
  
  populationCenters.forEach(center => {
    let isCovered = false;
    
    facilities.forEach(facility => {
      const distance = Math.sqrt(
        Math.pow(facility.location.coordinates[1] - center.lat, 2) + 
        Math.pow(facility.location.coordinates[0] - center.lon, 2)
      ) * 111.32;
      
      if (distance <= 15) { // 15km service radius
        isCovered = true;
      }
    });
    
    if (isCovered) {
      coveredPopulation += center.population;
    }
  });
  
  return totalPopulation > 0 ? coveredPopulation / totalPopulation : 0;
}

function calculateAverageAccessTime(facilities, populationCenters) {
  let totalTime = 0;
  let totalPopulation = 0;
  
  populationCenters.forEach(center => {
    let minTime = Infinity;
    
    facilities.forEach(facility => {
      const distance = Math.sqrt(
        Math.pow(facility.location.coordinates[1] - center.lat, 2) + 
        Math.pow(facility.location.coordinates[0] - center.lon, 2)
      ) * 111.32;
      
      const travelTime = distance / 40 * 60; // Assume 40 km/h, convert to minutes
      minTime = Math.min(minTime, travelTime);
    });
    
    if (minTime !== Infinity) {
      totalTime += minTime * center.population;
      totalPopulation += center.population;
    }
  });
  
  return totalPopulation > 0 ? totalTime / totalPopulation : 0;
}

function calculateEnvironmentalScore(facilities, environmentalData) {
  let totalScore = 0;
  
  facilities.forEach(facility => {
    let facilityScore = 1.0;
    
    environmentalData.forEach(data => {
      const distance = Math.sqrt(
        Math.pow(facility.location.coordinates[1] - data.location.coordinates[1], 2) + 
        Math.pow(facility.location.coordinates[0] - data.location.coordinates[0], 2)
      ) * 111.32;
      
      if (distance < 2) {
        facilityScore -= 0.3;
      } else if (distance < 5) {
        facilityScore -= 0.1;
      }
    });
    
    totalScore += Math.max(0, facilityScore);
  });
  
  return facilities.length > 0 ? totalScore / facilities.length : 0;
}
