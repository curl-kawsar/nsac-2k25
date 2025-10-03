import { NextResponse } from 'next/server';
import healthcareFacilityAnalysis from '@/services/healthcareFacilityAnalysis';

/**
 * Healthcare Facility Access Analysis API
 * 
 * Analyzes healthcare facility access for a given city and recommends optimal locations
 * for new healthcare facilities using open data sources:
 * - NASA SEDAC GPW v4 for population data
 * - NASA VIIRS Black Marble for urban activity
 * - OpenStreetMap Overpass API for existing facilities
 * - Healthsites.io for additional facility data
 * - Travel time analysis for accessibility
 * - MCLP optimization for facility placement
 */

export async function POST(request) {
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Configuration Error',
        message: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is required for AI-enhanced recommendations'
      }, { status: 500 });
    }

    const body = await request.json();
    const { 
      city, 
      bbox, 
      coordinates,
      options = {} 
    } = body;

    // Validate required parameters
    if (!city && !bbox && !coordinates) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'Please provide either city name, bounding box, or coordinates',
        required: {
          city: 'string (e.g., "New York")',
          bbox: 'object with minLat, minLon, maxLat, maxLon',
          coordinates: 'object with lat, lon, radius (km)'
        }
      }, { status: 400 });
    }

    // Convert coordinates to bbox if provided
    let analysisBox = bbox;
    if (coordinates && !bbox) {
      const { lat, lon, radius = 10 } = coordinates;
      const radiusDeg = radius / 111; // Rough conversion km to degrees
      analysisBox = {
        minLat: lat - radiusDeg,
        minLon: lon - radiusDeg,
        maxLat: lat + radiusDeg,
        maxLon: lon + radiusDeg
      };
    }

    // If only city name provided, create a default bbox (this would normally use geocoding)
    if (city && !analysisBox) {
      // For demo purposes, using a default bbox around a major city
      // In production, this would use a geocoding service
      analysisBox = {
        minLat: 40.7000,
        minLon: -74.0200,
        maxLat: 40.8000,
        maxLon: -73.9000
      };
    }

    console.log(`Starting healthcare facility analysis for ${city || 'specified area'}`);
    console.log('Analysis bounding box:', analysisBox);

    // Set analysis options
    const analysisOptions = {
      maxFacilities: options.maxFacilities || 5,
      facilityType: options.facilityType || 'mixed', // hospital, clinic, mixed
      priorityFocus: options.priorityFocus || 'population', // population, accessibility, equity
      analysisDepth: options.analysisDepth || 'standard', // basic, standard, comprehensive
      includeExistingOptimization: options.includeExistingOptimization || false
    };

    // Run the comprehensive healthcare facility analysis
    const analysisResults = await healthcareFacilityAnalysis.analyzeCity(
      city || 'Analysis Area',
      analysisBox,
      analysisOptions
    );

    // Prepare the response
    const response = {
      success: true,
      analysis: {
        id: analysisResults.analysisId,
        city: analysisResults.city,
        bbox: analysisResults.bbox,
        timestamp: analysisResults.timestamp,
        options: analysisOptions
      },
      
      // Population and Urban Analysis
      population: {
        total: analysisResults.pipeline.populationData?.totalPopulation || 0,
        density: analysisResults.pipeline.populationData?.populationDensity || {},
        hotspots: analysisResults.pipeline.populationData?.hotspots || [],
        source: analysisResults.pipeline.populationData?.source || 'Unknown'
      },

      // Urban Activity
      urbanActivity: {
        nightlightIntensity: analysisResults.pipeline.urbanActivity?.nightlightIntensity || 0,
        urbanExtents: analysisResults.pipeline.urbanActivity?.urbanExtents || {},
        centers: analysisResults.pipeline.urbanActivity?.urbanCenters || [],
        source: analysisResults.pipeline.urbanActivity?.source || 'Unknown'
      },

      // Existing Healthcare Infrastructure
      existingFacilities: {
        total: analysisResults.pipeline.existingFacilities?.total || 0,
        facilities: analysisResults.pipeline.existingFacilities?.facilities || [],
        byType: analysisResults.pipeline.existingFacilities?.byType || {},
        coverage: analysisResults.pipeline.existingFacilities?.coverage || {}
      },

      // Accessibility Analysis
      accessibility: {
        coverage: analysisResults.pipeline.accessibility?.coverage || {},
        gaps: analysisResults.pipeline.accessibility?.gaps || [],
        thresholds: {
          primary: '30 minutes',
          secondary: '60 minutes', 
          emergency: '15 minutes'
        }
      },

      // Underserved Areas
      underservedAreas: {
        total: analysisResults.pipeline.underservedAreas?.total || 0,
        totalPopulation: analysisResults.pipeline.underservedAreas?.totalUnderservedPopulation || 0,
        clusters: analysisResults.pipeline.underservedAreas?.clusters || [],
        priority: analysisResults.pipeline.underservedAreas?.areas?.slice(0, 10) || []
      },

      // Optimization Results
      recommendations: {
        newFacilities: analysisResults.recommendations || [],
        algorithm: analysisResults.pipeline.optimization?.algorithm || 'MCLP',
        metrics: analysisResults.pipeline.optimization?.optimizationMetrics || {}
      },

      // Coverage Improvements
      coverageImprovements: analysisResults.pipeline.coverageAnalysis || {},

      // Geospatial Data
      geojson: analysisResults.geojson,

      // Analysis Summary
      summary: analysisResults.summary,

      // Metadata
      meta: {
        analysisTime: new Date().toISOString(),
        dataQuality: analysisResults.summary?.dataQuality || {},
        methodology: {
          populationData: 'NASA SEDAC GPW v4 / WorldPop',
          urbanActivity: 'NASA VIIRS Black Marble nightlights',
          existingFacilities: 'OpenStreetMap + Healthsites.io',
          accessibility: 'Travel time analysis with network/friction maps',
          optimization: 'Maximal Covering Location Problem (MCLP)',
          landSuitability: 'MODIS Land Cover + SRTM elevation'
        },
        openDataSources: [
          'NASA Earthdata/SEDAC',
          'NASA Black Marble',
          'MODIS Land Cover',
          'SRTM Digital Elevation',
          'OpenStreetMap Overpass API',
          'Healthsites.io',
          'Global friction/travel-time datasets'
        ]
      }
    };

    // Add performance metrics
    response.performance = {
      analysisCompleted: true,
      processingTimeMs: Date.now() - new Date(analysisResults.timestamp).getTime(),
      dataSourcesQueried: 6,
      facilitiesAnalyzed: response.existingFacilities.total,
      candidateSitesEvaluated: analysisResults.pipeline.candidateSites?.total || 0,
      recommendationsGenerated: response.recommendations.newFacilities.length
    };

    console.log(`Healthcare analysis completed successfully for ${city || 'specified area'}`);
    console.log(`Generated ${response.recommendations.newFacilities.length} facility recommendations`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Healthcare access analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Healthcare Analysis Error',
      message: 'Unable to complete healthcare facility analysis',
      details: error.message,
      suggestion: 'Please check your input parameters and try again. Ensure the area is not too large for analysis.',
      fallback: {
        available: true,
        description: 'Basic analysis with simulated data is available as fallback'
      }
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const radius = parseFloat(searchParams.get('radius')) || 10;

    if (!city && (!lat || !lon)) {
      return NextResponse.json({
        error: 'Missing parameters',
        message: 'Please provide either city name or lat/lon coordinates',
        examples: {
          byCity: '/api/healthcare/analyze-access?city=New York&maxFacilities=3',
          byCoordinates: '/api/healthcare/analyze-access?lat=40.7128&lon=-74.0060&radius=15'
        }
      }, { status: 400 });
    }

    // Convert GET parameters to POST body format
    const analysisRequest = {
      city,
      coordinates: lat && lon ? { lat, lon, radius } : null,
      options: {
        maxFacilities: parseInt(searchParams.get('maxFacilities')) || 5,
        facilityType: searchParams.get('facilityType') || 'mixed',
        priorityFocus: searchParams.get('priorityFocus') || 'population'
      }
    };

    // Create a mock request object for the POST handler
    const mockRequest = {
      json: async () => analysisRequest
    };

    // Call the POST handler
    return await POST(mockRequest);

  } catch (error) {
    console.error('Healthcare GET analysis error:', error);
    
    return NextResponse.json({
      error: 'Healthcare Analysis Error',
      message: 'Unable to process GET request for healthcare analysis',
      details: error.message
    }, { status: 500 });
  }
}

// Export revalidation time for caching
export const revalidate = 1800; // 30 minutes