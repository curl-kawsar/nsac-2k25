import { NextResponse } from 'next/server';
import { optimizationService } from '@/services/optimizationService';

// Mock healthcare facilities
const mockHealthcareFacilities = [
  {
    id: 'hospital_001',
    name: 'Central Medical Center',
    type: 'hospital',
    location: { lat: 40.7589, lng: -73.9851 },
    capacity: 500,
    currentPatients: 420,
    services: ['emergency', 'surgery', 'cardiology', 'oncology'],
    waitTime: 45,
    quality: 0.92,
    status: 'operational'
  },
  {
    id: 'clinic_001',
    name: 'North District Health Clinic',
    type: 'clinic',
    location: { lat: 40.7831, lng: -73.9712 },
    capacity: 100,
    currentPatients: 65,
    services: ['primary_care', 'pediatrics', 'vaccination'],
    waitTime: 20,
    quality: 0.87,
    status: 'operational'
  },
  {
    id: 'urgent_001',
    name: 'East Side Urgent Care',
    type: 'urgent_care',
    location: { lat: 40.7505, lng: -73.9934 },
    capacity: 50,
    currentPatients: 38,
    services: ['urgent_care', 'x_ray', 'lab_work'],
    waitTime: 35,
    quality: 0.81,
    status: 'operational'
  },
  {
    id: 'specialty_001',
    name: 'Metropolitan Heart Institute',
    type: 'specialty',
    location: { lat: 40.7614, lng: -73.9776 },
    capacity: 80,
    currentPatients: 45,
    services: ['cardiology', 'cardiac_surgery', 'rehabilitation'],
    waitTime: 60,
    quality: 0.95,
    status: 'operational'
  }
];

// Mock population health data
const mockPopulationData = [
  {
    area: 'downtown',
    location: { lat: 40.7589, lng: -73.9851 },
    population: 15000,
    demographics: {
      age_0_18: 0.22,
      age_19_64: 0.65,
      age_65_plus: 0.13
    },
    healthMetrics: {
      chronicDiseases: 0.18,
      emergencyVisits: 120, // per 1000 people per year
      preventiveCare: 0.75
    },
    socioeconomic: {
      income_level: 'medium',
      insurance_coverage: 0.85
    }
  },
  {
    area: 'north_district',
    location: { lat: 40.7831, lng: -73.9712 },
    population: 12000,
    demographics: {
      age_0_18: 0.28,
      age_19_64: 0.58,
      age_65_plus: 0.14
    },
    healthMetrics: {
      chronicDiseases: 0.15,
      emergencyVisits: 95,
      preventiveCare: 0.82
    },
    socioeconomic: {
      income_level: 'high',
      insurance_coverage: 0.92
    }
  }
];

export async function POST(request) {
  try {
    const { 
      lat, 
      lon, 
      radius = 10,
      serviceType = 'all',
      analysisType = 'access' // access, capacity, quality
    } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    console.log(`Analyzing healthcare access using NASA data for location: ${lat}, ${lon}`);

    // Filter facilities by location and service type  
    let relevantFacilities = mockHealthcareFacilities.filter(facility => {
      const distance = calculateDistance(lat, lon, facility.location.lat, facility.location.lng);
      return distance <= radius;
    });

    if (serviceType !== 'all') {
      relevantFacilities = relevantFacilities.filter(facility => 
        facility.services.includes(serviceType) || facility.type === serviceType
      );
    }

    try {
      // Get enhanced population data from NASA SEDAC
      const nasaPopulationData = await nasaApi.getSEDACPopulation(lat, lon);
      
      // Get additional Earth observation data for context
      const earthAssets = await nasaApi.getEarthAssets(lat, lon, new Date().toISOString().split('T')[0]);
      
      // Enhanced population data with NASA insights
      const populationData = {
        ...nasaPopulationData,
        earthObservations: {
          urbanization_level: earthAssets ? 'satellite_derived' : 'estimated',
          land_use_context: 'mixed_urban'
        }
      };

      // Perform enhanced healthcare access analysis with NASA data
      const accessAnalysis = analyzeHealthcareAccess(
        { lat, lon }, 
        relevantFacilities, 
        populationData,
        analysisType
      );

      // Use optimization service for recommendations
      const optimizationResult = optimizationService.optimizeHealthcareAccess({
        targetLocation: { lat, lon },
        facilities: relevantFacilities,
        populationData,
        analysisType,
        constraints: {
          maxTravelTime: 30, // minutes
          minQualityScore: 0.8,
          capacityThreshold: 0.9
        }
      });

      console.log(`Healthcare access analysis completed using NASA population data (density: ${populationData.density})`);

      return NextResponse.json({
        success: true,
        analysis: accessAnalysis,
        facilities: relevantFacilities,
        populationData: {
          ...populationData,
          nasaSource: true
        },
        optimization: optimizationResult,
        recommendations: generateHealthcareRecommendations(accessAnalysis, optimizationResult),
        apiStatus: 'NASA_API_ACTIVE'
      });

    } catch (nasaError) {
      console.error('NASA API error, using fallback data:', nasaError.message);
      
      // Fallback to mock population data
      const populationData = getPopulationDataForArea(lat, lon, radius);

      const accessAnalysis = analyzeHealthcareAccess(
        { lat, lon }, 
        relevantFacilities, 
        populationData,
        analysisType
      );

      const optimizationResult = optimizationService.optimizeHealthcareAccess({
        targetLocation: { lat, lon },
        facilities: relevantFacilities,
        populationData,
        analysisType,
        constraints: {
          maxTravelTime: 30,
          minQualityScore: 0.8,
          capacityThreshold: 0.9
        }
      });

      return NextResponse.json({
        success: true,
        analysis: accessAnalysis,
        facilities: relevantFacilities,
        populationData,
        optimization: optimizationResult,
        recommendations: generateHealthcareRecommendations(accessAnalysis, optimizationResult),
        apiStatus: 'FALLBACK_DATA',
        warning: 'NASA API unavailable, using simulated population data'
      });
    }

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
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const radius = parseFloat(searchParams.get('radius') || '10');
    const type = searchParams.get('type');
    const service = searchParams.get('service');
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Filter facilities by location
    let filteredFacilities = mockHealthcareFacilities.map(facility => ({
      ...facility,
      distance: calculateDistance(lat, lon, facility.location.lat, facility.location.lng)
    })).filter(facility => facility.distance <= radius);

    // Apply additional filters
    if (type && type !== 'all') {
      filteredFacilities = filteredFacilities.filter(f => f.type === type);
    }

    if (service) {
      filteredFacilities = filteredFacilities.filter(f => f.services.includes(service));
    }

    // Sort by distance
    filteredFacilities.sort((a, b) => a.distance - b.distance);

    // Calculate basic access metrics
    const accessMetrics = calculateAccessMetrics(filteredFacilities);

    return NextResponse.json({
      success: true,
      facilities: filteredFacilities,
      accessMetrics,
      count: filteredFacilities.length
    });

  } catch (error) {
    console.error('Error fetching healthcare facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch healthcare facilities' },
      { status: 500 }
    );
  }
}

function analyzeHealthcareAccess(location, facilities, populationData, analysisType) {
  const analysis = {
    location,
    analysisType,
    metrics: {},
    coverage: {},
    gaps: []
  };

  // Calculate basic access metrics
  analysis.metrics = {
    totalFacilities: facilities.length,
    averageDistance: facilities.length > 0 ? 
      facilities.reduce((sum, f) => sum + calculateDistance(location.lat, location.lng, f.location.lat, f.location.lng), 0) / facilities.length : 0,
    averageCapacityUtilization: facilities.length > 0 ? 
      facilities.reduce((sum, f) => sum + (f.currentPatients / f.capacity), 0) / facilities.length : 0,
    averageWaitTime: facilities.length > 0 ? 
      facilities.reduce((sum, f) => sum + f.waitTime, 0) / facilities.length : 0,
    averageQuality: facilities.length > 0 ? 
      facilities.reduce((sum, f) => sum + f.quality, 0) / facilities.length : 0
  };

  // Analyze service coverage
  const serviceTypes = ['emergency', 'primary_care', 'specialty', 'urgent_care'];
  analysis.coverage = {};
  
  serviceTypes.forEach(service => {
    const serviceProviders = facilities.filter(f => f.services.includes(service));
    analysis.coverage[service] = {
      available: serviceProviders.length > 0,
      count: serviceProviders.length,
      averageDistance: serviceProviders.length > 0 ? 
        serviceProviders.reduce((sum, f) => sum + calculateDistance(location.lat, location.lng, f.location.lat, f.location.lng), 0) / serviceProviders.length : null
    };
  });

  // Identify gaps
  serviceTypes.forEach(service => {
    if (!analysis.coverage[service].available) {
      analysis.gaps.push({
        type: 'service_gap',
        service,
        severity: 'high',
        description: `No ${service} facilities available within radius`
      });
    } else if (analysis.coverage[service].averageDistance > 10) {
      analysis.gaps.push({
        type: 'distance_gap',
        service,
        severity: 'medium',
        description: `${service} facilities are far (${analysis.coverage[service].averageDistance.toFixed(1)}km average)`
      });
    }
  });

  // Check capacity issues
  facilities.forEach(facility => {
    const utilization = facility.currentPatients / facility.capacity;
    if (utilization > 0.9) {
      analysis.gaps.push({
        type: 'capacity_issue',
        facility: facility.name,
        severity: utilization > 0.95 ? 'high' : 'medium',
        description: `${facility.name} is at ${(utilization * 100).toFixed(1)}% capacity`
      });
    }
  });

  return analysis;
}

function getPopulationDataForArea(lat, lon, radius) {
  // Find closest population data point
  const closest = mockPopulationData.reduce((prev, curr) => {
    const prevDist = calculateDistance(lat, lon, prev.location.lat, prev.location.lng);
    const currDist = calculateDistance(lat, lon, curr.location.lat, curr.location.lng);
    return currDist < prevDist ? curr : prev;
  });

  return closest;
}

function calculateAccessMetrics(facilities) {
  if (facilities.length === 0) {
    return {
      totalFacilities: 0,
      averageDistance: null,
      capacityUtilization: null,
      qualityScore: null
    };
  }

  return {
    totalFacilities: facilities.length,
    averageDistance: (facilities.reduce((sum, f) => sum + f.distance, 0) / facilities.length).toFixed(2),
    capacityUtilization: ((facilities.reduce((sum, f) => sum + (f.currentPatients / f.capacity), 0) / facilities.length) * 100).toFixed(1),
    qualityScore: (facilities.reduce((sum, f) => sum + f.quality, 0) / facilities.length).toFixed(2),
    emergencyAccess: facilities.some(f => f.services.includes('emergency')),
    specialtyAccess: facilities.some(f => f.type === 'specialty')
  };
}

function generateHealthcareRecommendations(analysis, optimization) {
  const recommendations = [];

  // Service gap recommendations
  analysis.gaps.forEach(gap => {
    if (gap.type === 'service_gap') {
      recommendations.push({
        type: 'service_expansion',
        priority: gap.severity,
        message: `Consider establishing ${gap.service} facility in this area`,
        action: 'facility_planning'
      });
    } else if (gap.type === 'capacity_issue') {
      recommendations.push({
        type: 'capacity_expansion',
        priority: gap.severity,
        message: gap.description + ' - consider expansion or load balancing',
        facility: gap.facility
      });
    }
  });

  // Quality improvements
  if (analysis.metrics.averageQuality < 0.85) {
    recommendations.push({
      type: 'quality_improvement',
      priority: 'medium',
      message: 'Average facility quality below optimal - consider quality improvement programs',
      currentScore: analysis.metrics.averageQuality
    });
  }

  // Wait time optimization
  if (analysis.metrics.averageWaitTime > 45) {
    recommendations.push({
      type: 'efficiency_improvement',
      priority: 'medium',
      message: `High average wait times (${analysis.metrics.averageWaitTime} min) - optimize scheduling and capacity`,
      currentWaitTime: analysis.metrics.averageWaitTime
    });
  }

  // Add optimization-specific recommendations
  if (optimization && optimization.suggestions) {
    optimization.suggestions.forEach(suggestion => {
      recommendations.push({
        type: 'optimization',
        priority: suggestion.priority,
        message: suggestion.description,
        coordinates: suggestion.location,
        impact: suggestion.estimatedImpact
      });
    });
  }

  return recommendations;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}