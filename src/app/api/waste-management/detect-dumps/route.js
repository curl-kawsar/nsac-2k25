import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { IllegalDump, EnvironmentalData } from '@/models/WasteManagement';
import { Alert } from '@/models/User';
import nasaApi from '@/services/nasaApi';

export async function POST(request) {
  try {
    await connectDB();
    
    const { lat, lon, radius = 5 } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Detect thermal anomalies using NASA Landsat data
    const anomalies = await nasaApi.detectThermalAnomalies(lat, lon, radius);
    
    // Get population density data for correlation
    const populationData = await nasaApi.getSEDACPopulation(lat, lon);
    
    // Process and save detected dumps
    const detectedDumps = [];
    
    for (const anomaly of anomalies) {
      // Check if this location was already detected recently
      const existingDump = await IllegalDump.findOne({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: anomaly.location
            },
            $maxDistance: 100 // 100 meters
          }
        },
        detectionDate: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      });

      if (!existingDump) {
        // Determine environmental risk level
        const environmentalRisk = this.assessEnvironmentalRisk(
          anomaly.temperature,
          populationData.density,
          anomaly.confidence
        );

        const newDump = new IllegalDump({
          location: {
            type: 'Point',
            coordinates: anomaly.location
          },
          temperature: anomaly.temperature,
          confidence: anomaly.confidence,
          populationDensity: populationData.density,
          environmentalRisk: environmentalRisk,
          status: 'detected'
        });

        await newDump.save();
        detectedDumps.push(newDump);

        // Create alert if high risk
        if (environmentalRisk === 'high' || environmentalRisk === 'critical') {
          const alert = new Alert({
            title: `Illegal Dump Detected - ${environmentalRisk.toUpperCase()} Risk`,
            message: `Thermal anomaly detected at ${anomaly.temperature.toFixed(1)}°C. Population density: ${populationData.density} people/km²`,
            type: 'waste_management',
            severity: environmentalRisk === 'critical' ? 'critical' : 'warning',
            location: {
              type: 'Point',
              coordinates: anomaly.location
            },
            data: {
              temperature: anomaly.temperature,
              confidence: anomaly.confidence,
              populationDensity: populationData.density,
              dumpId: newDump._id
            },
            source: {
              system: 'thermal_detection',
              dataSource: 'Landsat-8/9 TIRS',
              confidence: anomaly.confidence
            }
          });

          await alert.save();
        }
      }
    }

    return NextResponse.json({
      success: true,
      detectedDumps: detectedDumps.length,
      dumps: detectedDumps,
      searchArea: { lat, lon, radius }
    });

  } catch (error) {
    console.error('Error detecting illegal dumps:', error);
    return NextResponse.json(
      { error: 'Failed to detect illegal dumps' },
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
    const status = searchParams.get('status');
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Build query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    };

    if (status) {
      query.status = status;
    }

    const dumps = await IllegalDump.find(query)
      .sort({ detectionDate: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      dumps: dumps,
      count: dumps.length
    });

  } catch (error) {
    console.error('Error fetching illegal dumps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch illegal dumps' },
      { status: 500 }
    );
  }
}

function assessEnvironmentalRisk(temperature, populationDensity, confidence) {
  let riskScore = 0;
  
  // Temperature factor
  if (temperature > 45) riskScore += 3;
  else if (temperature > 40) riskScore += 2;
  else if (temperature > 35) riskScore += 1;
  
  // Population density factor
  if (populationDensity > 1000) riskScore += 2;
  else if (populationDensity > 500) riskScore += 1;
  
  // Confidence factor
  if (confidence > 0.8) riskScore += 1;
  
  if (riskScore >= 5) return 'critical';
  if (riskScore >= 3) return 'high';
  if (riskScore >= 2) return 'medium';
  return 'low';
}
