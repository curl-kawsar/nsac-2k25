import { NextResponse } from 'next/server';
import { optimizationService } from '@/services/optimizationService';

// Mock waste management facilities
const mockFacilities = [
  {
    id: 'facility_001',
    name: 'Central Waste Processing Plant',
    type: 'processing',
    location: { lat: 40.7589, lng: -73.9851 },
    capacity: 500,
    currentLoad: 350,
    efficiency: 0.87,
    status: 'operational'
  },
  {
    id: 'facility_002', 
    name: 'North District Recycling Center',
    type: 'recycling',
    location: { lat: 40.7831, lng: -73.9712 },
    capacity: 300,
    currentLoad: 180,
    efficiency: 0.92,
    status: 'operational'
  },
  {
    id: 'facility_003',
    name: 'East Side Transfer Station',
    type: 'transfer',
    location: { lat: 40.7505, lng: -73.9934 },
    capacity: 200,
    currentLoad: 160,
    efficiency: 0.78,
    status: 'maintenance'
  }
];

export async function POST(request) {
  try {
    const { lat, lon, radius = 10, facilityType = 'all' } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Filter facilities by type if specified
    let facilities = mockFacilities;
    if (facilityType !== 'all') {
      facilities = facilities.filter(f => f.type === facilityType);
    }

    // Calculate distances and filter by radius
    const facilitiesWithDistance = facilities.map(facility => ({
      ...facility,
      distance: calculateDistance(lat, lon, facility.location.lat, facility.location.lng)
    })).filter(facility => facility.distance <= radius);

    // Use optimization service to find optimal facility placement
    const optimizationResult = optimizationService.optimizeFacilityPlacement({
      targetLocation: { lat, lon },
      existingFacilities: facilitiesWithDistance,
      populationData: await getMockPopulationData(lat, lon),
      constraints: {
        maxDistance: radius,
        minCapacity: 100,
        preferredTypes: facilityType === 'all' ? ['processing', 'recycling'] : [facilityType]
      }
    });

    return NextResponse.json({
      success: true,
      optimization: optimizationResult,
      existingFacilities: facilitiesWithDistance,
      recommendations: generateRecommendations(facilitiesWithDistance, optimizationResult)
    });

  } catch (error) {
    console.error('Error optimizing waste facilities:', error);
    return NextResponse.json(
      { error: 'Failed to optimize waste facilities' },
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
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Filter and calculate distances
    let facilities = mockFacilities;
    if (type && type !== 'all') {
      facilities = facilities.filter(f => f.type === type);
    }

    const facilitiesWithDistance = facilities.map(facility => ({
      ...facility,
      distance: calculateDistance(lat, lon, facility.location.lat, facility.location.lng)
    })).filter(facility => facility.distance <= radius);

    // Sort by distance
    facilitiesWithDistance.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      success: true,
      facilities: facilitiesWithDistance,
      count: facilitiesWithDistance.length
    });

  } catch (error) {
    console.error('Error fetching waste facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste facilities' },
      { status: 500 }
    );
  }
}

async function getMockPopulationData(lat, lon) {
  // Mock population density data
  return {
    density: Math.floor(Math.random() * 2000) + 500, // 500-2500 people per km²
    demographics: {
      residential: 0.6,
      commercial: 0.25,
      industrial: 0.15
    },
    wasteGeneration: Math.floor(Math.random() * 100) + 50 // 50-150 tons per day
  };
}

function generateRecommendations(facilities, optimization) {
  const recommendations = [];
  
  // Check facility utilization
  facilities.forEach(facility => {
    const utilization = facility.currentLoad / facility.capacity;
    if (utilization > 0.9) {
      recommendations.push({
        type: 'capacity_warning',
        facility: facility.name,
        message: `Facility at ${utilization * 100}% capacity - consider expansion or load redistribution`,
        priority: 'high'
      });
    }
  });

  // Check for service gaps
  if (facilities.length < 3) {
    recommendations.push({
      type: 'coverage_gap',
      message: 'Limited waste facility coverage in this area - consider new facility placement',
      priority: 'medium'
    });
  }

  // Optimization suggestions
  if (optimization && optimization.suggestions) {
    optimization.suggestions.forEach(suggestion => {
      recommendations.push({
        type: 'optimization',
        message: suggestion.description,
        priority: suggestion.priority,
        coordinates: suggestion.location
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