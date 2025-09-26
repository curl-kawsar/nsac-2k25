import Genetic from 'genetic-js';
import { distance } from '@turf/turf';

class OptimizationService {
  constructor() {
    this.genetic = Genetic.create();
  }

  // Genetic Algorithm for Waste Facility Placement
  optimizeFacilityPlacement(populationCenters, existingFacilities, constraints) {
    const genetic = this.genetic;
    
    genetic.optimize = Genetic.Optimize.Maximize;
    genetic.select1 = Genetic.Select1.Tournament2;
    genetic.select2 = Genetic.Select2.Tournament2;
    genetic.mutate = Genetic.Mutate.GaussianReal;
    genetic.crossover = Genetic.Crossover.SinglePoint;

    // Define the fitness function
    genetic.fitness = (entity) => {
      return this.calculateFacilityFitness(entity, populationCenters, existingFacilities, constraints);
    };

    // Generate random solutions
    genetic.seed = () => {
      const numFacilities = constraints.maxFacilities || 5;
      const facilities = [];
      
      for (let i = 0; i < numFacilities; i++) {
        facilities.push({
          lat: constraints.bounds.south + Math.random() * (constraints.bounds.north - constraints.bounds.south),
          lon: constraints.bounds.west + Math.random() * (constraints.bounds.east - constraints.bounds.west),
          type: constraints.facilityTypes[Math.floor(Math.random() * constraints.facilityTypes.length)],
          capacity: constraints.minCapacity + Math.random() * (constraints.maxCapacity - constraints.minCapacity)
        });
      }
      
      return facilities;
    };

    genetic.generation = (pop, generation, stats) => {
      return generation < 100; // Run for 100 generations
    };

    const config = {
      iterations: 100,
      size: 50,
      crossover: 0.7,
      mutation: 0.3,
      skip: 10
    };

    return genetic.evolve(config);
  }

  // Fitness function for facility placement
  calculateFacilityFitness(facilities, populationCenters, existingFacilities, constraints) {
    let fitness = 0;
    
    // Factor 1: Population coverage
    const coverageScore = this.calculatePopulationCoverage(facilities, populationCenters);
    fitness += coverageScore * 0.4;
    
    // Factor 2: Cost efficiency
    const costScore = this.calculateCostEfficiency(facilities, constraints);
    fitness += costScore * 0.3;
    
    // Factor 3: Environmental impact
    const environmentalScore = this.calculateEnvironmentalImpact(facilities, constraints);
    fitness += environmentalScore * 0.2;
    
    // Factor 4: Accessibility
    const accessibilityScore = this.calculateAccessibility(facilities, populationCenters);
    fitness += accessibilityScore * 0.1;
    
    return fitness;
  }

  calculatePopulationCoverage(facilities, populationCenters) {
    let totalCovered = 0;
    let totalPopulation = 0;
    
    populationCenters.forEach(center => {
      totalPopulation += center.population;
      
      // Find nearest facility
      let minDistance = Infinity;
      facilities.forEach(facility => {
        const dist = distance(
          [center.lon, center.lat],
          [facility.lon, facility.lat],
          { units: 'kilometers' }
        );
        minDistance = Math.min(minDistance, dist);
      });
      
      // Population is covered if within service radius
      if (minDistance <= 10) { // 10km service radius
        totalCovered += center.population;
      }
    });
    
    return totalPopulation > 0 ? totalCovered / totalPopulation : 0;
  }

  calculateCostEfficiency(facilities, constraints) {
    let totalCost = 0;
    let totalCapacity = 0;
    
    facilities.forEach(facility => {
      // Simplified cost model
      const baseCost = 1000000; // Base facility cost
      const capacityCost = facility.capacity * 100;
      totalCost += baseCost + capacityCost;
      totalCapacity += facility.capacity;
    });
    
    return totalCost > 0 ? totalCapacity / totalCost : 0;
  }

  calculateEnvironmentalImpact(facilities, constraints) {
    // Lower environmental impact = higher score
    let impactScore = 1.0;
    
    facilities.forEach(facility => {
      // Penalize facilities near water bodies, protected areas, etc.
      if (constraints.environmentalZones) {
        constraints.environmentalZones.forEach(zone => {
          const dist = distance(
            [facility.lon, facility.lat],
            [zone.lon, zone.lat],
            { units: 'kilometers' }
          );
          
          if (dist < zone.bufferDistance) {
            impactScore -= 0.1;
          }
        });
      }
    });
    
    return Math.max(0, impactScore);
  }

  calculateAccessibility(facilities, populationCenters) {
    let accessibilityScore = 0;
    
    populationCenters.forEach(center => {
      let minTravelTime = Infinity;
      
      facilities.forEach(facility => {
        // Simplified travel time calculation
        const dist = distance(
          [center.lon, center.lat],
          [facility.lon, facility.lat],
          { units: 'kilometers' }
        );
        
        const travelTime = dist / 40; // Assume 40 km/h average speed
        minTravelTime = Math.min(minTravelTime, travelTime);
      });
      
      // Score based on travel time (lower is better)
      const timeScore = Math.max(0, 1 - minTravelTime / 60); // Normalize to 1 hour
      accessibilityScore += timeScore * center.population;
    });
    
    const totalPopulation = populationCenters.reduce((sum, center) => sum + center.population, 0);
    return totalPopulation > 0 ? accessibilityScore / totalPopulation : 0;
  }

  // Vehicle Routing Problem (VRP) Solver for waste collection
  solveVRP(vehicles, wastePoints, depot) {
    const routes = [];
    
    vehicles.forEach((vehicle, vehicleIndex) => {
      const route = {
        vehicleId: vehicle.id,
        waypoints: [depot], // Start at depot
        totalDistance: 0,
        totalTime: 0,
        currentLoad: 0
      };
      
      const unvisitedPoints = [...wastePoints];
      let currentLocation = depot;
      
      while (unvisitedPoints.length > 0 && route.currentLoad < vehicle.capacity) {
        // Find nearest unvisited point
        let nearestPoint = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;
        
        unvisitedPoints.forEach((point, index) => {
          const dist = distance(
            [currentLocation.lon, currentLocation.lat],
            [point.lon, point.lat],
            { units: 'kilometers' }
          );
          
          if (dist < nearestDistance && route.currentLoad + point.wasteAmount <= vehicle.capacity) {
            nearestDistance = dist;
            nearestPoint = point;
            nearestIndex = index;
          }
        });
        
        if (nearestPoint) {
          // Add point to route
          route.waypoints.push(nearestPoint);
          route.totalDistance += nearestDistance;
          route.totalTime += nearestDistance / vehicle.averageSpeed + 0.25; // 15 min collection time
          route.currentLoad += nearestPoint.wasteAmount;
          
          currentLocation = nearestPoint;
          unvisitedPoints.splice(nearestIndex, 1);
        } else {
          break; // No more points can be added
        }
      }
      
      // Return to depot
      const returnDistance = distance(
        [currentLocation.lon, currentLocation.lat],
        [depot.lon, depot.lat],
        { units: 'kilometers' }
      );
      
      route.waypoints.push(depot);
      route.totalDistance += returnDistance;
      route.totalTime += returnDistance / vehicle.averageSpeed;
      
      routes.push(route);
    });
    
    return routes;
  }

  // Multi-objective optimization for healthcare facility placement
  optimizeHealthcareFacilities(demographics, healthcareNeeds, environmentalFactors, constraints) {
    // Use NSGA-II (Non-dominated Sorting Genetic Algorithm II) approach
    const solutions = [];
    
    // Generate initial population
    for (let i = 0; i < 100; i++) {
      const solution = this.generateHealthcareSolution(constraints);
      const objectives = this.evaluateHealthcareObjectives(
        solution, 
        demographics, 
        healthcareNeeds, 
        environmentalFactors
      );
      
      solutions.push({
        facilities: solution,
        objectives: objectives,
        dominationCount: 0,
        dominatedSolutions: [],
        rank: 0,
        crowdingDistance: 0
      });
    }
    
    // Non-dominated sorting
    const fronts = this.nonDominatedSort(solutions);
    
    // Crowding distance assignment
    fronts.forEach(front => {
      this.assignCrowdingDistance(front);
    });
    
    return fronts[0]; // Return Pareto front
  }

  generateHealthcareSolution(constraints) {
    const numFacilities = constraints.maxFacilities || 3;
    const facilities = [];
    
    for (let i = 0; i < numFacilities; i++) {
      facilities.push({
        lat: constraints.bounds.south + Math.random() * (constraints.bounds.north - constraints.bounds.south),
        lon: constraints.bounds.west + Math.random() * (constraints.bounds.east - constraints.bounds.west),
        type: constraints.facilityTypes[Math.floor(Math.random() * constraints.facilityTypes.length)],
        capacity: constraints.minCapacity + Math.random() * (constraints.maxCapacity - constraints.minCapacity),
        services: this.randomlySelectServices(constraints.availableServices)
      });
    }
    
    return facilities;
  }

  evaluateHealthcareObjectives(facilities, demographics, healthcareNeeds, environmentalFactors) {
    return {
      accessibility: this.calculateHealthcareAccessibility(facilities, demographics),
      coverage: this.calculateHealthcareCoverage(facilities, healthcareNeeds),
      resilience: this.calculateClimateResilience(facilities, environmentalFactors),
      cost: this.calculateHealthcareCost(facilities),
      equity: this.calculateHealthcareEquity(facilities, demographics)
    };
  }

  calculateHealthcareAccessibility(facilities, demographics) {
    let totalAccessScore = 0;
    let totalPopulation = 0;
    
    demographics.forEach(area => {
      totalPopulation += area.population.total;
      
      let minTravelTime = Infinity;
      facilities.forEach(facility => {
        const dist = distance(
          [area.location.coordinates[0], area.location.coordinates[1]],
          [facility.lon, facility.lat],
          { units: 'kilometers' }
        );
        
        const travelTime = dist / 30; // Assume 30 km/h in urban areas
        minTravelTime = Math.min(minTravelTime, travelTime * 60); // Convert to minutes
      });
      
      // Score based on WHO recommended 30-minute access
      const accessScore = Math.max(0, 1 - minTravelTime / 30);
      totalAccessScore += accessScore * area.population.total;
    });
    
    return totalPopulation > 0 ? totalAccessScore / totalPopulation : 0;
  }

  calculateHealthcareCoverage(facilities, healthcareNeeds) {
    let totalCapacity = 0;
    let totalNeed = 0;
    
    facilities.forEach(facility => {
      totalCapacity += facility.capacity;
    });
    
    healthcareNeeds.forEach(need => {
      totalNeed += need.requiredCapacity;
    });
    
    return totalNeed > 0 ? Math.min(1, totalCapacity / totalNeed) : 1;
  }

  calculateClimateResilience(facilities, environmentalFactors) {
    let resilienceScore = 0;
    
    facilities.forEach(facility => {
      let facilityScore = 1.0;
      
      // Check flood risk
      const floodRisk = this.getEnvironmentalRiskAtLocation(
        facility, 
        environmentalFactors.floodRisk
      );
      facilityScore -= floodRisk * 0.3;
      
      // Check heat stress
      const heatStress = this.getEnvironmentalRiskAtLocation(
        facility, 
        environmentalFactors.heatStress
      );
      facilityScore -= heatStress * 0.2;
      
      // Check air quality
      const airQuality = this.getEnvironmentalRiskAtLocation(
        facility, 
        environmentalFactors.airQuality
      );
      facilityScore -= (1 - airQuality) * 0.2;
      
      resilienceScore += Math.max(0, facilityScore);
    });
    
    return facilities.length > 0 ? resilienceScore / facilities.length : 0;
  }

  calculateHealthcareCost(facilities) {
    let totalCost = 0;
    
    facilities.forEach(facility => {
      const baseCost = 5000000; // Base healthcare facility cost
      const capacityCost = facility.capacity * 1000;
      const serviceCost = facility.services.length * 500000;
      
      totalCost += baseCost + capacityCost + serviceCost;
    });
    
    // Return normalized cost (lower cost = higher score)
    return 1 / (1 + totalCost / 10000000);
  }

  calculateHealthcareEquity(facilities, demographics) {
    // Calculate equity based on access to vulnerable populations
    let equityScore = 0;
    let vulnerablePopulation = 0;
    
    demographics.forEach(area => {
      const vulnerable = area.population.ageStructure.under5 + 
                        area.population.ageStructure.over65 +
                        area.socioeconomic.povertyRate * area.population.total;
      
      vulnerablePopulation += vulnerable;
      
      let minDistance = Infinity;
      facilities.forEach(facility => {
        const dist = distance(
          [area.location.coordinates[0], area.location.coordinates[1]],
          [facility.lon, facility.lat],
          { units: 'kilometers' }
        );
        minDistance = Math.min(minDistance, dist);
      });
      
      // Better access for vulnerable populations = higher equity
      const accessScore = Math.max(0, 1 - minDistance / 20);
      equityScore += accessScore * vulnerable;
    });
    
    return vulnerablePopulation > 0 ? equityScore / vulnerablePopulation : 0;
  }

  // Helper methods
  nonDominatedSort(solutions) {
    const fronts = [[]];
    
    // For each solution
    solutions.forEach((p, i) => {
      p.dominationCount = 0;
      p.dominatedSolutions = [];
      
      // Compare with every other solution
      solutions.forEach((q, j) => {
        if (i !== j) {
          if (this.dominates(p.objectives, q.objectives)) {
            p.dominatedSolutions.push(j);
          } else if (this.dominates(q.objectives, p.objectives)) {
            p.dominationCount++;
          }
        }
      });
      
      if (p.dominationCount === 0) {
        p.rank = 0;
        fronts[0].push(i);
      }
    });
    
    let frontIndex = 0;
    while (fronts[frontIndex].length > 0) {
      const nextFront = [];
      
      fronts[frontIndex].forEach(pIndex => {
        const p = solutions[pIndex];
        p.dominatedSolutions.forEach(qIndex => {
          const q = solutions[qIndex];
          q.dominationCount--;
          
          if (q.dominationCount === 0) {
            q.rank = frontIndex + 1;
            nextFront.push(qIndex);
          }
        });
      });
      
      frontIndex++;
      fronts.push(nextFront);
    }
    
    return fronts.slice(0, -1).map(front => front.map(index => solutions[index]));
  }

  dominates(obj1, obj2) {
    // For healthcare objectives, higher is better for all except cost
    let atLeastOneBetter = false;
    
    // Check each objective (accessibility, coverage, resilience, equity - higher is better; cost - lower is better)
    if (obj1.accessibility < obj2.accessibility || 
        obj1.coverage < obj2.coverage ||
        obj1.resilience < obj2.resilience ||
        obj1.equity < obj2.equity ||
        obj1.cost < obj2.cost) {
      return false;
    }
    
    if (obj1.accessibility > obj2.accessibility || 
        obj1.coverage > obj2.coverage ||
        obj1.resilience > obj2.resilience ||
        obj1.equity > obj2.equity ||
        obj1.cost > obj2.cost) {
      atLeastOneBetter = true;
    }
    
    return atLeastOneBetter;
  }

  assignCrowdingDistance(front) {
    const numObjectives = 5; // accessibility, coverage, resilience, cost, equity
    
    front.forEach(solution => {
      solution.crowdingDistance = 0;
    });
    
    for (let obj = 0; obj < numObjectives; obj++) {
      front.sort((a, b) => {
        const objectives = ['accessibility', 'coverage', 'resilience', 'cost', 'equity'];
        return a.objectives[objectives[obj]] - b.objectives[objectives[obj]];
      });
      
      if (front.length > 2) {
        front[0].crowdingDistance = Infinity;
        front[front.length - 1].crowdingDistance = Infinity;
        
        const objectiveRange = front[front.length - 1].objectives[['accessibility', 'coverage', 'resilience', 'cost', 'equity'][obj]] -
                              front[0].objectives[['accessibility', 'coverage', 'resilience', 'cost', 'equity'][obj]];
        
        if (objectiveRange > 0) {
          for (let i = 1; i < front.length - 1; i++) {
            const distance = (front[i + 1].objectives[['accessibility', 'coverage', 'resilience', 'cost', 'equity'][obj]] -
                            front[i - 1].objectives[['accessibility', 'coverage', 'resilience', 'cost', 'equity'][obj]]) / objectiveRange;
            front[i].crowdingDistance += distance;
          }
        }
      }
    }
  }

  randomlySelectServices(availableServices) {
    const numServices = Math.floor(Math.random() * 3) + 1; // 1-3 services
    const selected = [];
    const shuffled = [...availableServices].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < numServices && i < shuffled.length; i++) {
      selected.push(shuffled[i]);
    }
    
    return selected;
  }

  getEnvironmentalRiskAtLocation(facility, riskData) {
    // Simplified risk calculation - in production, this would interpolate from grid data
    return Math.random() * 0.5; // 0-0.5 risk level
  }
}

export default new OptimizationService();
