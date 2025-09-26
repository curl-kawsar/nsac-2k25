import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { WasteRoute, WasteFacility } from '@/models/WasteManagement';
import optimizationService from '@/services/optimizationService';

export async function POST(request) {
  try {
    await connectDB();
    
    const { 
      depot,
      wastePoints,
      vehicles,
      constraints = {}
    } = await request.json();
    
    if (!depot || !wastePoints || !vehicles) {
      return NextResponse.json(
        { error: 'Depot, waste points, and vehicles are required' },
        { status: 400 }
      );
    }

    // Validate and format input data
    const formattedVehicles = vehicles.map(vehicle => ({
      id: vehicle.id,
      capacity: vehicle.capacity || 1000,
      averageSpeed: vehicle.averageSpeed || 40, // km/h
      fuelEfficiency: vehicle.fuelEfficiency || 8, // km/l
      operatingCost: vehicle.operatingCost || 100 // per hour
    }));

    const formattedWastePoints = wastePoints.map(point => ({
      id: point.id,
      lat: point.lat,
      lon: point.lon,
      wasteAmount: point.wasteAmount || 50, // kg
      priority: point.priority || 'normal',
      timeWindow: point.timeWindow || { start: '06:00', end: '18:00' },
      serviceTime: point.serviceTime || 15 // minutes
    }));

    const formattedDepot = {
      id: depot.id || 'depot',
      lat: depot.lat,
      lon: depot.lon
    };

    // Apply constraints
    const optimizationConstraints = {
      maxRouteTime: constraints.maxRouteTime || 8, // hours
      maxRouteDistance: constraints.maxRouteDistance || 200, // km
      timeWindows: constraints.enforceTimeWindows || false,
      fuelConstraints: constraints.fuelConstraints || false,
      driverBreaks: constraints.driverBreaks || false
    };

    // Solve VRP
    console.log('Starting route optimization...');
    const routes = await optimizationService.solveVRP(
      formattedVehicles,
      formattedWastePoints,
      formattedDepot
    );

    // Enhance routes with additional calculations
    const optimizedRoutes = routes.map((route, index) => {
      const enhancedRoute = {
        ...route,
        routeId: `route_${Date.now()}_${index}`,
        totalFuelCost: this.calculateFuelCost(route, formattedVehicles.find(v => v.id === route.vehicleId)),
        totalOperatingCost: this.calculateOperatingCost(route, formattedVehicles.find(v => v.id === route.vehicleId)),
        efficiency: this.calculateRouteEfficiency(route),
        wasteCollected: route.currentLoad,
        co2Emissions: this.calculateCO2Emissions(route, formattedVehicles.find(v => v.id === route.vehicleId)),
        estimatedCompletionTime: this.calculateCompletionTime(route)
      };

      return enhancedRoute;
    });

    // Calculate overall optimization metrics
    const optimizationMetrics = {
      totalRoutes: optimizedRoutes.length,
      totalDistance: optimizedRoutes.reduce((sum, route) => sum + route.totalDistance, 0),
      totalTime: optimizedRoutes.reduce((sum, route) => sum + route.totalTime, 0),
      totalWasteCollected: optimizedRoutes.reduce((sum, route) => sum + route.wasteCollected, 0),
      totalCost: optimizedRoutes.reduce((sum, route) => sum + route.totalOperatingCost, 0),
      totalCO2Emissions: optimizedRoutes.reduce((sum, route) => sum + route.co2Emissions, 0),
      vehicleUtilization: this.calculateVehicleUtilization(optimizedRoutes, formattedVehicles),
      coveragePercentage: this.calculateCoveragePercentage(optimizedRoutes, formattedWastePoints),
      averageEfficiency: optimizedRoutes.reduce((sum, route) => sum + route.efficiency, 0) / optimizedRoutes.length
    };

    // Save routes to database
    const savedRoutes = [];
    for (const route of optimizedRoutes) {
      const wasteRoute = new WasteRoute({
        routeId: route.routeId,
        vehicle: {
          id: route.vehicleId,
          capacity: formattedVehicles.find(v => v.id === route.vehicleId).capacity,
          fuelEfficiency: formattedVehicles.find(v => v.id === route.vehicleId).fuelEfficiency
        },
        waypoints: route.waypoints.map(wp => ({
          location: {
            type: 'Point',
            coordinates: [wp.lon, wp.lat]
          },
          estimatedTime: wp.estimatedTime || 0,
          wasteAmount: wp.wasteAmount || 0
        })),
        totalDistance: route.totalDistance,
        estimatedDuration: route.totalTime,
        optimizedAt: new Date(),
        status: 'planned'
      });

      await wasteRoute.save();
      savedRoutes.push(wasteRoute);
    }

    return NextResponse.json({
      success: true,
      routes: optimizedRoutes,
      metrics: optimizationMetrics,
      savedRoutes: savedRoutes.map(r => r._id),
      optimizationDetails: {
        algorithm: 'nearest_neighbor_vrp',
        constraints: optimizationConstraints,
        processingTime: new Date()
      }
    });

  } catch (error) {
    console.error('Error optimizing waste collection routes:', error);
    return NextResponse.json(
      { error: 'Failed to optimize collection routes' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status') || 'planned';
    const date = searchParams.get('date');
    
    // Build query
    const query = { status };
    
    if (vehicleId) {
      query['vehicle.id'] = vehicleId;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      query.optimizedAt = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const routes = await WasteRoute.find(query)
      .sort({ optimizedAt: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      routes: routes,
      count: routes.length
    });

  } catch (error) {
    console.error('Error fetching waste collection routes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

// Update route status
export async function PATCH(request) {
  try {
    await connectDB();
    
    const { routeId, status, actualData } = await request.json();
    
    if (!routeId || !status) {
      return NextResponse.json(
        { error: 'Route ID and status are required' },
        { status: 400 }
      );
    }

    const updateData = { status };
    
    if (actualData) {
      updateData.actualDistance = actualData.distance;
      updateData.actualDuration = actualData.duration;
      updateData.actualWasteCollected = actualData.wasteCollected;
      updateData.completedAt = new Date();
    }

    const updatedRoute = await WasteRoute.findOneAndUpdate(
      { routeId: routeId },
      updateData,
      { new: true }
    );

    if (!updatedRoute) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      route: updatedRoute
    });

  } catch (error) {
    console.error('Error updating route status:', error);
    return NextResponse.json(
      { error: 'Failed to update route status' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateFuelCost(route, vehicle) {
  const fuelPrice = 1.5; // per liter
  const fuelConsumed = route.totalDistance / vehicle.fuelEfficiency;
  return fuelConsumed * fuelPrice;
}

function calculateOperatingCost(route, vehicle) {
  const fuelCost = this.calculateFuelCost(route, vehicle);
  const timeCost = route.totalTime * vehicle.operatingCost;
  return fuelCost + timeCost;
}

function calculateRouteEfficiency(route) {
  // Efficiency based on waste collected per km
  return route.currentLoad / Math.max(route.totalDistance, 1);
}

function calculateCO2Emissions(route, vehicle) {
  // Approximate CO2 emissions in kg
  const fuelConsumed = route.totalDistance / vehicle.fuelEfficiency;
  const co2PerLiter = 2.31; // kg CO2 per liter of diesel
  return fuelConsumed * co2PerLiter;
}

function calculateCompletionTime(route) {
  const now = new Date();
  const completionTime = new Date(now.getTime() + route.totalTime * 60 * 60 * 1000);
  return completionTime;
}

function calculateVehicleUtilization(routes, vehicles) {
  const utilizedVehicles = new Set(routes.map(r => r.vehicleId));
  return utilizedVehicles.size / vehicles.length;
}

function calculateCoveragePercentage(routes, wastePoints) {
  const coveredPoints = new Set();
  
  routes.forEach(route => {
    route.waypoints.forEach(waypoint => {
      if (waypoint.id && waypoint.id !== 'depot') {
        coveredPoints.add(waypoint.id);
      }
    });
  });
  
  return coveredPoints.size / wastePoints.length;
}
