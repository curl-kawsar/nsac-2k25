import { NextResponse } from 'next/server';
import mlModelService from '@/services/mlModelService';

/**
 * Healthcare Facility Priority Prediction API using Trained ML Model
 * 
 * Uses the trained healthcare_priority_model.h5 and healthcare_scaler.pkl
 * to predict priority scores for healthcare facility placement.
 * 
 * Features required:
 * - population_density: Population density (people/km²)
 * - existing_facilities: Number of existing healthcare facilities in area
 * - access_time: Average access time to nearest facility (minutes)
 * - demographic_risk: Demographic risk score (0-1) based on age, income, etc.
 * - environmental_risk: Environmental risk score (0-1) based on pollution, climate
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      population_density,
      existing_facilities,
      access_time,
      demographic_risk,
      environmental_risk,
      location,
      area_info = {},
      metadata = {}
    } = body;

    // Validate required parameters
    const requiredParams = ['population_density', 'existing_facilities', 'access_time', 'demographic_risk', 'environmental_risk'];
    const missingParams = requiredParams.filter(param => body[param] === undefined || body[param] === null);

    if (missingParams.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
        message: `The following parameters are required: ${missingParams.join(', ')}`,
        required_parameters: {
          population_density: 'Population density in people/km²',
          existing_facilities: 'Number of existing healthcare facilities in the area',
          access_time: 'Average access time to nearest facility in minutes',
          demographic_risk: 'Demographic risk score (0-1) based on vulnerable populations',
          environmental_risk: 'Environmental risk score (0-1) based on pollution and climate factors'
        },
        example: {
          population_density: 2500,
          existing_facilities: 3,
          access_time: 25,
          demographic_risk: 0.65,
          environmental_risk: 0.45
        }
      }, { status: 400 });
    }

    // Validate parameter ranges
    const validationErrors = [];
    
    if (population_density < 0 || population_density > 50000) {
      validationErrors.push('population_density must be between 0 and 50,000 people/km²');
    }
    if (existing_facilities < 0 || existing_facilities > 100) {
      validationErrors.push('existing_facilities must be between 0 and 100');
    }
    if (access_time < 0 || access_time > 180) {
      validationErrors.push('access_time must be between 0 and 180 minutes');
    }
    if (demographic_risk < 0 || demographic_risk > 1) {
      validationErrors.push('demographic_risk must be between 0 and 1');
    }
    if (environmental_risk < 0 || environmental_risk > 1) {
      validationErrors.push('environmental_risk must be between 0 and 1');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Parameter validation failed',
        validation_errors: validationErrors
      }, { status: 400 });
    }

    console.log('Healthcare Priority ML Prediction Request:', {
      population_density, existing_facilities, access_time, demographic_risk, environmental_risk,
      location: location || 'Not specified'
    });

    // Prepare features for model
    const features = {
      population_density: parseFloat(population_density),
      existing_facilities: parseInt(existing_facilities),
      access_time: parseFloat(access_time),
      demographic_risk: parseFloat(demographic_risk),
      environmental_risk: parseFloat(environmental_risk)
    };

    // Get prediction from ML model
    const predictionResult = await mlModelService.predictHealthcarePriority(features);

    if (!predictionResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Model prediction failed',
        message: predictionResult.error || 'Unknown error occurred during prediction',
        fallback_available: true
      }, { status: 500 });
    }

    // Enhanced response with facility recommendations
    const facilityRecommendations = generateFacilityRecommendations(
      predictionResult.prediction.priority_score,
      features
    );

    const implementationPlan = generateImplementationPlan(
      predictionResult.prediction.priority_level,
      features,
      area_info
    );

    const response = {
      success: true,
      prediction: predictionResult.prediction,
      model_info: {
        type: predictionResult.model,
        timestamp: predictionResult.timestamp,
        confidence: predictionResult.prediction.confidence
      },
      input_features: features,
      location: location || null,
      facility_recommendations: facilityRecommendations,
      implementation_plan: implementationPlan,
      risk_analysis: analyzeHealthcareRisks(features),
      cost_benefit_analysis: generateCostBenefitAnalysis(features, predictionResult.prediction.priority_score),
      metadata: {
        ...metadata,
        api_version: '1.0',
        processing_time: new Date().toISOString()
      }
    };

    console.log(`Healthcare Priority Prediction completed: ${predictionResult.prediction.priority_level} priority (${predictionResult.prediction.priority_score})`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Healthcare Priority ML Prediction API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process healthcare priority prediction request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get model information and health check
    const modelInfo = mlModelService.getModelInfo();
    const healthCheck = await mlModelService.healthCheck();

    return NextResponse.json({
      service: 'Healthcare Priority ML Prediction API',
      version: '1.0',
      model_info: modelInfo,
      health_check: healthCheck,
      endpoints: {
        predict: {
          method: 'POST',
          description: 'Predict healthcare facility priority using trained ML model',
          required_parameters: [
            'population_density', 'existing_facilities', 'access_time', 
            'demographic_risk', 'environmental_risk'
          ]
        }
      },
      example_request: {
        population_density: 2500,
        existing_facilities: 3,
        access_time: 25,
        demographic_risk: 0.65,
        environmental_risk: 0.45,
        location: {
          lat: 40.7128,
          lng: -74.0060,
          name: "New York City",
          area_km2: 25
        },
        area_info: {
          urban_type: "metropolitan",
          income_level: "medium",
          existing_infrastructure: "moderate"
        }
      }
    });

  } catch (error) {
    console.error('Healthcare Priority ML API info error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get API information',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Generate facility recommendations based on priority score and features
 */
function generateFacilityRecommendations(priorityScore, features) {
  const { population_density, existing_facilities, access_time, demographic_risk, environmental_risk } = features;
  
  const recommendations = {
    primary_recommendation: '',
    facility_types: [],
    capacity_estimate: 0,
    service_radius: 0,
    staffing_requirements: {},
    equipment_priorities: []
  };

  if (priorityScore >= 0.8) {
    // Critical priority
    recommendations.primary_recommendation = 'Immediate establishment of comprehensive healthcare facility required';
    recommendations.facility_types = ['Emergency Care Center', 'Primary Care Clinic', 'Specialist Services'];
    recommendations.capacity_estimate = Math.ceil(population_density * 0.05); // 5% of population capacity
    recommendations.service_radius = 5; // 5km radius
    recommendations.staffing_requirements = {
      doctors: Math.ceil(population_density / 2000),
      nurses: Math.ceil(population_density / 1000),
      support_staff: Math.ceil(population_density / 1500)
    };
    recommendations.equipment_priorities = [
      'Emergency medical equipment',
      'Diagnostic imaging',
      'Laboratory facilities',
      'Ambulance services'
    ];
  } else if (priorityScore >= 0.6) {
    // High priority
    recommendations.primary_recommendation = 'Establish primary care facility with emergency capabilities';
    recommendations.facility_types = ['Primary Care Clinic', 'Urgent Care Center'];
    recommendations.capacity_estimate = Math.ceil(population_density * 0.03);
    recommendations.service_radius = 7;
    recommendations.staffing_requirements = {
      doctors: Math.ceil(population_density / 3000),
      nurses: Math.ceil(population_density / 1500),
      support_staff: Math.ceil(population_density / 2000)
    };
    recommendations.equipment_priorities = [
      'Basic diagnostic equipment',
      'Emergency supplies',
      'Telemedicine capabilities'
    ];
  } else if (priorityScore >= 0.4) {
    // Medium priority
    recommendations.primary_recommendation = 'Expand existing services or establish satellite clinic';
    recommendations.facility_types = ['Community Health Center', 'Mobile Health Unit'];
    recommendations.capacity_estimate = Math.ceil(population_density * 0.02);
    recommendations.service_radius = 10;
    recommendations.staffing_requirements = {
      doctors: Math.ceil(population_density / 4000),
      nurses: Math.ceil(population_density / 2000),
      support_staff: Math.ceil(population_density / 3000)
    };
    recommendations.equipment_priorities = [
      'Preventive care equipment',
      'Health screening tools',
      'Basic treatment supplies'
    ];
  } else {
    // Low priority
    recommendations.primary_recommendation = 'Monitor healthcare needs and consider mobile services';
    recommendations.facility_types = ['Mobile Health Unit', 'Telemedicine Hub'];
    recommendations.capacity_estimate = Math.ceil(population_density * 0.01);
    recommendations.service_radius = 15;
    recommendations.staffing_requirements = {
      doctors: Math.ceil(population_density / 5000),
      nurses: Math.ceil(population_density / 3000),
      support_staff: Math.ceil(population_density / 4000)
    };
    recommendations.equipment_priorities = [
      'Mobile diagnostic equipment',
      'Telemedicine technology',
      'Health education materials'
    ];
  }

  return recommendations;
}

/**
 * Generate implementation plan based on priority level
 */
function generateImplementationPlan(priorityLevel, features, areaInfo) {
  const plan = {
    timeline: {},
    phases: [],
    budget_estimate: {},
    key_milestones: [],
    risk_mitigation: []
  };

  switch (priorityLevel) {
    case 'Critical':
      plan.timeline = {
        immediate: '0-3 months',
        short_term: '3-12 months',
        long_term: '1-3 years'
      };
      plan.phases = [
        {
          phase: 1,
          duration: '3 months',
          activities: ['Site selection', 'Emergency permits', 'Temporary facility setup'],
          deliverables: ['Operational emergency clinic']
        },
        {
          phase: 2,
          duration: '9 months',
          activities: ['Permanent facility construction', 'Staff recruitment', 'Equipment procurement'],
          deliverables: ['Full-service healthcare facility']
        },
        {
          phase: 3,
          duration: '2 years',
          activities: ['Service expansion', 'Specialist recruitment', 'Community programs'],
          deliverables: ['Comprehensive healthcare services']
        }
      ];
      plan.budget_estimate = {
        immediate: '$500,000 - $1,000,000',
        total: '$5,000,000 - $15,000,000',
        annual_operating: '$2,000,000 - $5,000,000'
      };
      break;

    case 'High':
      plan.timeline = {
        planning: '3-6 months',
        implementation: '6-18 months',
        full_operation: '18-24 months'
      };
      plan.phases = [
        {
          phase: 1,
          duration: '6 months',
          activities: ['Feasibility study', 'Community consultation', 'Funding acquisition'],
          deliverables: ['Approved project plan']
        },
        {
          phase: 2,
          duration: '12 months',
          activities: ['Facility construction', 'Staff hiring', 'Equipment installation'],
          deliverables: ['Operational healthcare facility']
        }
      ];
      plan.budget_estimate = {
        planning: '$100,000 - $250,000',
        total: '$2,000,000 - $8,000,000',
        annual_operating: '$1,000,000 - $3,000,000'
      };
      break;

    case 'Medium':
      plan.timeline = {
        assessment: '6-12 months',
        implementation: '12-24 months',
        evaluation: '24-36 months'
      };
      plan.phases = [
        {
          phase: 1,
          duration: '12 months',
          activities: ['Detailed needs assessment', 'Partnership development', 'Resource planning'],
          deliverables: ['Implementation strategy']
        },
        {
          phase: 2,
          duration: '12 months',
          activities: ['Service expansion', 'Mobile unit deployment', 'Staff training'],
          deliverables: ['Enhanced healthcare access']
        }
      ];
      plan.budget_estimate = {
        assessment: '$50,000 - $100,000',
        total: '$500,000 - $2,000,000',
        annual_operating: '$300,000 - $800,000'
      };
      break;

    default: // Low
      plan.timeline = {
        monitoring: '12-24 months',
        intervention: 'As needed',
        review: 'Annual'
      };
      plan.phases = [
        {
          phase: 1,
          duration: '24 months',
          activities: ['Health needs monitoring', 'Mobile service trials', 'Partnership building'],
          deliverables: ['Healthcare access baseline']
        }
      ];
      plan.budget_estimate = {
        monitoring: '$25,000 - $50,000',
        total: '$100,000 - $500,000',
        annual_operating: '$50,000 - $200,000'
      };
      break;
  }

  return plan;
}

/**
 * Analyze healthcare risks based on input features
 */
function analyzeHealthcareRisks(features) {
  const { population_density, existing_facilities, access_time, demographic_risk, environmental_risk } = features;
  
  const risks = {
    access_risk: {
      level: access_time > 30 ? 'High' : access_time > 15 ? 'Medium' : 'Low',
      score: Math.min(1, access_time / 60),
      description: `Average ${access_time} minutes to reach healthcare facility`
    },
    capacity_risk: {
      level: existing_facilities < 2 ? 'High' : existing_facilities < 5 ? 'Medium' : 'Low',
      score: Math.max(0, (5 - existing_facilities) / 5),
      description: `Only ${existing_facilities} existing facilities for population density of ${population_density}/km²`
    },
    demographic_risk: {
      level: demographic_risk > 0.7 ? 'High' : demographic_risk > 0.4 ? 'Medium' : 'Low',
      score: demographic_risk,
      description: 'Risk based on vulnerable population demographics'
    },
    environmental_risk: {
      level: environmental_risk > 0.7 ? 'High' : environmental_risk > 0.4 ? 'Medium' : 'Low',
      score: environmental_risk,
      description: 'Risk from environmental health factors'
    }
  };

  // Calculate overall risk
  const overallRisk = (risks.access_risk.score + risks.capacity_risk.score + 
                      risks.demographic_risk.score + risks.environmental_risk.score) / 4;

  return {
    individual_risks: risks,
    overall_risk: {
      score: Math.round(overallRisk * 100) / 100,
      level: overallRisk > 0.7 ? 'High' : overallRisk > 0.4 ? 'Medium' : 'Low',
      primary_concern: Object.entries(risks).reduce((max, [key, risk]) => 
        risk.score > max.score ? { factor: key, score: risk.score } : max, 
        { factor: 'access_risk', score: 0 }).factor
    }
  };
}

/**
 * Generate cost-benefit analysis
 */
function generateCostBenefitAnalysis(features, priorityScore) {
  const { population_density, existing_facilities, access_time } = features;
  
  // Estimate population served
  const populationServed = Math.ceil(population_density * 25); // Assume 25 km² service area
  
  // Calculate potential health outcomes improvement
  const healthImprovementScore = priorityScore * 0.8; // 80% of priority translates to health improvement
  
  // Estimate costs (simplified)
  const estimatedCosts = {
    initial_investment: priorityScore >= 0.8 ? 10000000 : priorityScore >= 0.6 ? 5000000 : 2000000,
    annual_operating: priorityScore >= 0.8 ? 3000000 : priorityScore >= 0.6 ? 1500000 : 800000,
    cost_per_person_served: 0
  };
  
  estimatedCosts.cost_per_person_served = Math.round(estimatedCosts.annual_operating / populationServed);

  // Estimate benefits
  const estimatedBenefits = {
    lives_potentially_saved: Math.ceil(populationServed * healthImprovementScore * 0.001),
    reduced_emergency_visits: Math.ceil(populationServed * healthImprovementScore * 0.05),
    improved_health_outcomes: Math.ceil(populationServed * healthImprovementScore * 0.2),
    economic_value_annual: Math.ceil(populationServed * healthImprovementScore * 500) // $500 per person health value
  };

  // Calculate ROI
  const roi = {
    payback_period_years: Math.ceil(estimatedCosts.initial_investment / estimatedBenefits.economic_value_annual),
    benefit_cost_ratio: Math.round((estimatedBenefits.economic_value_annual / estimatedCosts.annual_operating) * 100) / 100,
    net_present_value_10_years: (estimatedBenefits.economic_value_annual * 10) - estimatedCosts.initial_investment - (estimatedCosts.annual_operating * 10)
  };

  return {
    population_impact: {
      population_served: populationServed,
      health_improvement_potential: Math.round(healthImprovementScore * 100) + '%'
    },
    costs: estimatedCosts,
    benefits: estimatedBenefits,
    return_on_investment: roi,
    recommendation: roi.benefit_cost_ratio > 1.5 ? 'Highly recommended investment' : 
                   roi.benefit_cost_ratio > 1.0 ? 'Recommended investment' : 
                   'Consider alternative approaches'
  };
}
