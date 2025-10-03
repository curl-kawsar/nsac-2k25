import { NextResponse } from 'next/server';
import { optimizationService } from '@/services/optimizationService';

// Mock waste collection routes and vehicles
const mockRoutes = [
  {
    id: 'route_001',
    name: 'Downtown Collection Route',
    vehicle: 'Truck_A1',
    stops: [
      { lat: 40.7589, lng: -73.9851, address: '123 Main St', estimatedTime: 15 },
      { lat: 40.7614, lng: -73.9776, address: '456 Broadway', estimatedTime: 12 },
      { lat: 40.7505, lng: -73.9934, address: '789 Park Ave', estimatedTime: 18 }
    ],
    totalDistance: 12.5,
    estimatedDuration: 120,
    efficiency: 0.85,
    status: 'active'
  },
  {
    id: 'route_002',
    name: 'Residential North Route', 
    vehicle: 'Truck_B2',
    stops: [
      { lat: 40.7831, lng: -73.9712, address: '321 Oak St', estimatedTime: 20 },
      { lat: 40.7749, lng: -73.9857, address: '654 Pine St', estimatedTime: 16 },
      { lat: 40.7677, lng: -73.9718, address: '987 Elm St', estimatedTime: 14 }
    ],
    totalDistance: 15.2,
    estimatedDuration: 150,
    efficiency: 0.78,
    status: 'scheduled'
  }
];

const mockVehicles = [
  {
    id: 'Truck_A1',
    type: 'compactor',
    capacity: 25,
    currentLoad: 18,
    fuelLevel: 0.75,
    location: { lat: 40.7589, lng: -73.9851 },
    status: 'collecting'
  },
  {
    id: 'Truck_B2',
    type: 'recycling',
    capacity: 30,
    currentLoad: 12,
    fuelLevel: 0.90,
    location: { lat: 40.7831, lng: -73.9712 },
    status: 'en_route'
  },
  {
    id: 'Truck_C3',
    type: 'compactor',
    capacity: 25,
    currentLoad: 0,
    fuelLevel: 1.0,
    location: { lat: 40.7505, lng: -73.9934 },
    status: 'available'
  }
];

export async function POST(request) {
  try {
    const { 
      lat, 
      lon, 
      radius = 10, 
      vehicleType = 'all',
      optimizationType = 'distance' // distance, time, fuel
    } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Get relevant routes within radius
    const relevantRoutes = mockRoutes.filter(route => {
      return route.stops.some(stop => {
        const distance = calculateDistance(lat, lon, stop.lat, stop.lng);
        return distance <= radius;
      });
    });

    // Get available vehicles
    let availableVehicles = mockVehicles;
    if (vehicleType !== 'all') {
      availableVehicles = availableVehicles.filter(v => v.type === vehicleType);
    }

    // Use optimization service to optimize routes
    const optimizationResult = optimizationService.optimizeWasteRoutes({
      centerPoint: { lat, lon },
      radius,
      existingRoutes: relevantRoutes,
      availableVehicles,
      optimizationType,
      constraints: {
        maxRouteTime: 300, // 5 hours
        maxStopsPerRoute: 15,
        vehicleCapacity: true
      }
    });

    // Generate performance metrics
    const metrics = calculateRouteMetrics(relevantRoutes, availableVehicles);

    return NextResponse.json({
      success: true,
      optimization: optimizationResult,
      existingRoutes: relevantRoutes,
      availableVehicles,
      metrics,
      recommendations: generateRouteRecommendations(optimizationResult, metrics)
    });

  } catch (error) {
    console.error('Error optimizing waste routes:', error);
    return NextResponse.json(
      { error: 'Failed to optimize waste routes' },
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
    const status = searchParams.get('status');
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Filter routes by location and status
    let filteredRoutes = mockRoutes.filter(route => {
      return route.stops.some(stop => {
        const distance = calculateDistance(lat, lon, stop.lat, stop.lng);
        return distance <= radius;
      });
    });

    if (status) {
      filteredRoutes = filteredRoutes.filter(route => route.status === status);
    }

    // Get vehicle information for each route
    const routesWithVehicles = filteredRoutes.map(route => ({
      ...route,
      vehicleInfo: mockVehicles.find(v => v.id === route.vehicle)
    }));

    return NextResponse.json({
      success: true,
      routes: routesWithVehicles,
      vehicles: mockVehicles,
      count: routesWithVehicles.length
    });

  } catch (error) {
    console.error('Error fetching waste routes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waste routes' },
      { status: 500 }
    );
  }
}

function calculateRouteMetrics(routes, vehicles) {
  const totalRoutes = routes.length;
  const activeRoutes = routes.filter(r => r.status === 'active').length;
  const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
  const averageEfficiency = routes.reduce((sum, route) => sum + route.efficiency, 0) / totalRoutes;
  
  const vehicleUtilization = vehicles.reduce((sum, vehicle) => {
    return sum + (vehicle.currentLoad / vehicle.capacity);
  }, 0) / vehicles.length;

  return {
    totalRoutes,
    activeRoutes,
    totalDistance: totalDistance.toFixed(1),
    averageEfficiency: (averageEfficiency * 100).toFixed(1),
    vehicleUtilization: (vehicleUtilization * 100).toFixed(1),
    availableVehicles: vehicles.filter(v => v.status === 'available').length,
    fuelEfficiency: calculateAverageFuelLevel(vehicles)
  };
}

function calculateAverageFuelLevel(vehicles) {
  const totalFuel = vehicles.reduce((sum, vehicle) => sum + vehicle.fuelLevel, 0);
  return ((totalFuel / vehicles.length) * 100).toFixed(1);
}

function generateRouteRecommendations(optimization, metrics) {
  const recommendations = [];
  
  // Vehicle utilization check
  if (parseFloat(metrics.vehicleUtilization) > 90) {
    recommendations.push({
      type: 'capacity_warning',
      message: 'High vehicle utilization detected - consider adding more vehicles',
      priority: 'high'
    });
  }

  // Efficiency check
  if (parseFloat(metrics.averageEfficiency) < 75) {
    recommendations.push({
      type: 'efficiency_improvement',
      message: 'Route efficiency below optimal - consider route optimization',
      priority: 'medium'
    });
  }

  // Fuel check
  if (parseFloat(metrics.fuelEfficiency) < 25) {
    recommendations.push({
      type: 'fuel_warning',
      message: 'Low fuel levels detected in fleet - schedule refueling',
      priority: 'high'
    });
  }

  // Add optimization-specific recommendations
  if (optimization && optimization.improvements) {
    optimization.improvements.forEach(improvement => {
      recommendations.push({
        type: 'optimization',
        message: improvement.description,
        priority: improvement.priority,
        savings: improvement.estimatedSavings
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