import OpenAI from 'openai';

/**
 * AI Urban Expert Service for Waste Management Solutions
 * Provides intelligent recommendations for detected waste spots and illegal dumps
 */
class WasteManagementAI {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.expertPersona = `You are Dr. Elena Rodriguez, a leading Urban Environmental Expert with 15+ years of experience in waste management, urban planning, and environmental sustainability. You specialize in:

- Illegal dump site remediation and prevention
- Waste management system optimization
- Environmental impact assessment
- Community engagement strategies
- Regulatory compliance and enforcement
- Sustainable urban development

Your responses should be:
- Professional yet accessible
- Practical and actionable
- Based on real-world urban planning principles
- Considerate of environmental, social, and economic factors
- Include specific timelines and cost estimates when possible`;
  }

  /**
   * Get AI recommendations for detected waste spots
   * @param {Array} wasteSpots - Array of detected waste/thermal spots
   * @param {Object} locationInfo - Information about the location
   * @param {Object} options - Additional options for recommendations
   * @returns {Promise<Object>} AI recommendations and solutions
   */
  async getWasteManagementRecommendations(wasteSpots, locationInfo, options = {}) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return this.getFallbackRecommendations(wasteSpots, locationInfo);
      }

      // Prepare context for AI
      const context = this.prepareAnalysisContext(wasteSpots, locationInfo, options);
      
      const prompt = `${this.expertPersona}

WASTE MANAGEMENT ANALYSIS REQUEST:

Location: ${locationInfo.city || 'Unknown'} (${locationInfo.lat?.toFixed(4)}, ${locationInfo.lon?.toFixed(4)})
Analysis Date: ${new Date().toLocaleDateString()}
Detected Issues: ${wasteSpots.length} potential waste/thermal anomalies

DETECTED SPOTS SUMMARY:
${wasteSpots.slice(0, 5).map((spot, index) => `
${index + 1}. Location: ${spot.location.lat.toFixed(4)}, ${spot.location.lng.toFixed(4)}
   - Temperature: ${spot.temperature}°C
   - Confidence: ${(spot.confidence * 100).toFixed(1)}%
   - Type: ${spot.type || 'Thermal Anomaly'}
   - Severity: ${this.assessSeverity(spot)}
   - Population nearby: ~${spot.nearbyPopulation || 'Unknown'}
`).join('')}

${wasteSpots.length > 5 ? `... and ${wasteSpots.length - 5} more spots` : ''}

AREA CHARACTERISTICS:
- Urban Type: ${context.urbanType}
- Population Density: ${context.populationDensity}
- Infrastructure Level: ${context.infrastructureLevel}
- Environmental Sensitivity: ${context.environmentalSensitivity}

Please provide comprehensive recommendations in the following JSON format:

{
  "overall_assessment": {
    "severity_level": "Low/Medium/High/Critical",
    "primary_concerns": ["concern1", "concern2"],
    "environmental_risk": "assessment",
    "public_health_risk": "assessment"
  },
  "immediate_actions": [
    {
      "action": "specific action",
      "priority": "High/Medium/Low",
      "timeframe": "immediate/1-7 days/1-4 weeks",
      "responsible_party": "who should do this",
      "estimated_cost": "cost range",
      "description": "detailed explanation"
    }
  ],
  "short_term_solutions": [
    {
      "solution": "solution name",
      "description": "detailed description",
      "implementation_time": "timeframe",
      "cost_estimate": "cost range",
      "expected_impact": "impact description",
      "requirements": ["requirement1", "requirement2"]
    }
  ],
  "long_term_strategies": [
    {
      "strategy": "strategy name",
      "description": "comprehensive description",
      "timeline": "implementation timeline",
      "investment_required": "investment range",
      "sustainability_impact": "environmental benefits",
      "community_benefits": "social benefits"
    }
  ],
  "prevention_measures": [
    {
      "measure": "prevention strategy",
      "description": "how to implement",
      "effectiveness": "High/Medium/Low",
      "cost_benefit_ratio": "assessment"
    }
  ],
  "monitoring_plan": {
    "frequency": "monitoring schedule",
    "key_indicators": ["indicator1", "indicator2"],
    "technology_recommendations": ["tech1", "tech2"],
    "reporting_schedule": "reporting frequency"
  },
  "stakeholder_engagement": {
    "community_involvement": "community engagement strategy",
    "government_coordination": "government collaboration approach",
    "private_sector_partnerships": "private sector opportunities"
  },
  "regulatory_compliance": {
    "applicable_regulations": ["regulation1", "regulation2"],
    "compliance_steps": ["step1", "step2"],
    "potential_violations": ["violation1", "violation2"]
  },
  "success_metrics": [
    {
      "metric": "measurable outcome",
      "target": "specific target",
      "measurement_method": "how to measure"
    }
  ]
}

Provide practical, evidence-based recommendations that consider local context, budget constraints, and community needs.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert urban environmental consultant providing waste management solutions. Always respond with valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const aiResponse = response.choices[0].message.content;
      
      // Clean and parse AI response
      const cleanedResponse = this.cleanAIResponse(aiResponse);
      const recommendations = JSON.parse(cleanedResponse);

      return {
        success: true,
        recommendations,
        expert_info: {
          name: "Dr. Elena Rodriguez",
          title: "Urban Environmental Expert",
          specialization: "Waste Management & Urban Planning",
          confidence: 0.85
        },
        analysis_metadata: {
          spots_analyzed: wasteSpots.length,
          location: locationInfo,
          analysis_date: new Date().toISOString(),
          ai_model: "gpt-3.5-turbo",
          context_factors: context
        }
      };

    } catch (error) {
      console.error('AI Waste Management Recommendations error:', error);
      return this.getFallbackRecommendations(wasteSpots, locationInfo);
    }
  }

  /**
   * Prepare analysis context from available data
   */
  prepareAnalysisContext(wasteSpots, locationInfo, options) {
    // Determine urban characteristics based on location and spot patterns
    const avgTemperature = wasteSpots.reduce((sum, spot) => sum + spot.temperature, 0) / wasteSpots.length;
    const highTempSpots = wasteSpots.filter(spot => spot.temperature > 40).length;
    const spotDensity = wasteSpots.length / (options.searchRadius || 10); // spots per km²

    return {
      urbanType: this.determineUrbanType(locationInfo, spotDensity),
      populationDensity: this.estimatePopulationDensity(locationInfo, spotDensity),
      infrastructureLevel: this.assessInfrastructureLevel(spotDensity, highTempSpots),
      environmentalSensitivity: this.assessEnvironmentalSensitivity(avgTemperature, wasteSpots.length),
      wasteIntensity: highTempSpots > wasteSpots.length * 0.3 ? 'High' : 'Moderate',
      geographicContext: this.getGeographicContext(locationInfo)
    };
  }

  /**
   * Assess severity of individual waste spot
   */
  assessSeverity(spot) {
    const temp = spot.temperature;
    const confidence = spot.confidence;
    
    if (temp > 50 && confidence > 0.8) return 'Critical';
    if (temp > 40 && confidence > 0.7) return 'High';
    if (temp > 35 && confidence > 0.6) return 'Medium';
    return 'Low';
  }

  /**
   * Determine urban type based on location and patterns
   */
  determineUrbanType(locationInfo, spotDensity) {
    if (spotDensity > 5) return 'Dense Urban';
    if (spotDensity > 2) return 'Urban';
    if (spotDensity > 0.5) return 'Suburban';
    return 'Rural/Peri-urban';
  }

  /**
   * Estimate population density category
   */
  estimatePopulationDensity(locationInfo, spotDensity) {
    // Simple heuristic based on spot density and location
    if (spotDensity > 3) return 'High (>5000/km²)';
    if (spotDensity > 1) return 'Medium (1000-5000/km²)';
    return 'Low (<1000/km²)';
  }

  /**
   * Assess infrastructure level
   */
  assessInfrastructureLevel(spotDensity, highTempSpots) {
    const wasteRatio = highTempSpots / Math.max(spotDensity * 10, 1);
    
    if (wasteRatio > 0.5) return 'Poor - Inadequate waste management';
    if (wasteRatio > 0.2) return 'Moderate - Some infrastructure gaps';
    return 'Good - Generally adequate infrastructure';
  }

  /**
   * Assess environmental sensitivity
   */
  assessEnvironmentalSensitivity(avgTemp, spotCount) {
    if (avgTemp > 45 && spotCount > 10) return 'High - Significant environmental impact';
    if (avgTemp > 40 || spotCount > 5) return 'Medium - Moderate environmental concern';
    return 'Low - Limited environmental impact';
  }

  /**
   * Get geographic context
   */
  getGeographicContext(locationInfo) {
    const lat = locationInfo.lat;
    const lon = locationInfo.lon;
    
    // Simple geographic classification
    if (Math.abs(lat) < 23.5) return 'Tropical';
    if (Math.abs(lat) < 35) return 'Subtropical';
    if (Math.abs(lat) < 50) return 'Temperate';
    return 'Cold Climate';
  }

  /**
   * Clean AI response to ensure valid JSON
   */
  cleanAIResponse(response) {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any text before the first {
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart > 0) {
      cleaned = cleaned.substring(jsonStart);
    }
    
    // Remove any text after the last }
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonEnd > 0) {
      cleaned = cleaned.substring(0, jsonEnd + 1);
    }
    
    return cleaned;
  }

  /**
   * Fallback recommendations when AI is not available
   */
  getFallbackRecommendations(wasteSpots, locationInfo) {
    const severity = wasteSpots.length > 10 ? 'High' : wasteSpots.length > 5 ? 'Medium' : 'Low';
    const highTempSpots = wasteSpots.filter(spot => spot.temperature > 40).length;
    
    return {
      success: true,
      recommendations: {
        overall_assessment: {
          severity_level: severity,
          primary_concerns: [
            "Illegal waste dumping detected",
            "Potential environmental contamination",
            "Public health risks"
          ],
          environmental_risk: `${highTempSpots} high-temperature spots indicate active waste burning or decomposition`,
          public_health_risk: "Moderate to high risk depending on proximity to residential areas"
        },
        immediate_actions: [
          {
            action: "Site inspection and verification",
            priority: "High",
            timeframe: "1-3 days",
            responsible_party: "Municipal waste management authority",
            estimated_cost: "$500-$2,000",
            description: "Conduct on-ground verification of detected thermal anomalies to confirm waste dumping"
          },
          {
            action: "Secure and contain identified sites",
            priority: "High",
            timeframe: "immediate",
            responsible_party: "Local authorities",
            estimated_cost: "$1,000-$5,000",
            description: "Install barriers and warning signs to prevent further dumping and public access"
          }
        ],
        short_term_solutions: [
          {
            solution: "Waste removal and site cleanup",
            description: "Systematic removal of illegally dumped waste and site remediation",
            implementation_time: "2-4 weeks",
            cost_estimate: "$10,000-$50,000",
            expected_impact: "Immediate environmental and health risk reduction",
            requirements: ["Waste removal equipment", "Proper disposal facilities", "Safety equipment"]
          }
        ],
        long_term_strategies: [
          {
            strategy: "Enhanced waste collection system",
            description: "Improve regular waste collection coverage and frequency in affected areas",
            timeline: "3-6 months",
            investment_required: "$50,000-$200,000",
            sustainability_impact: "Significant reduction in illegal dumping",
            community_benefits: "Improved public health and environmental quality"
          }
        ],
        prevention_measures: [
          {
            measure: "Surveillance and monitoring",
            description: "Install cameras and regular patrols in hotspot areas",
            effectiveness: "High",
            cost_benefit_ratio: "Excellent - prevention is more cost-effective than cleanup"
          }
        ],
        monitoring_plan: {
          frequency: "Weekly satellite monitoring, monthly ground inspections",
          key_indicators: ["New thermal anomalies", "Waste accumulation", "Community complaints"],
          technology_recommendations: ["Thermal imaging", "Drone surveillance", "IoT sensors"],
          reporting_schedule: "Monthly progress reports"
        }
      },
      expert_info: {
        name: "CityWISE AI System",
        title: "Automated Urban Analysis",
        specialization: "Waste Management Pattern Recognition",
        confidence: 0.75
      },
      analysis_metadata: {
        spots_analyzed: wasteSpots.length,
        location: locationInfo,
        analysis_date: new Date().toISOString(),
        ai_model: "rule_based_fallback",
        note: "Fallback recommendations - consider upgrading to AI-powered analysis"
      }
    };
  }

  /**
   * Generate priority-based action plan
   */
  generateActionPlan(recommendations) {
    const allActions = [
      ...recommendations.immediate_actions.map(action => ({...action, category: 'immediate'})),
      ...recommendations.short_term_solutions.map(solution => ({...solution, category: 'short_term'})),
      ...recommendations.long_term_strategies.map(strategy => ({...strategy, category: 'long_term'}))
    ];

    // Sort by priority and timeframe
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    
    return allActions.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      return bPriority - aPriority;
    });
  }

  /**
   * Calculate implementation costs
   */
  calculateTotalCosts(recommendations) {
    const extractCost = (costString) => {
      if (!costString) return 0;
      const matches = costString.match(/\$?([\d,]+)/g);
      if (matches) {
        return parseInt(matches[0].replace(/[$,]/g, ''));
      }
      return 0;
    };

    const immediateCosts = recommendations.immediate_actions.reduce((sum, action) => 
      sum + extractCost(action.estimated_cost), 0);
    
    const shortTermCosts = recommendations.short_term_solutions.reduce((sum, solution) => 
      sum + extractCost(solution.cost_estimate), 0);
    
    const longTermCosts = recommendations.long_term_strategies.reduce((sum, strategy) => 
      sum + extractCost(strategy.investment_required), 0);

    return {
      immediate: immediateCosts,
      short_term: shortTermCosts,
      long_term: longTermCosts,
      total: immediateCosts + shortTermCosts + longTermCosts
    };
  }
}

// Export singleton instance
const wasteManagementAI = new WasteManagementAI();
export default wasteManagementAI;
