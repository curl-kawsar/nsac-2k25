import { NextResponse } from 'next/server';
import nasaApi from '@/services/nasaApi';

// Mock data for illegal dumps (simulated detections)
const mockDumps = [
  {
    id: 'dump_001',
    location: { lat: 40.7589, lng: -73.9851 },
    temperature: 45.2,
    confidence: 0.89,
    populationDensity: 1200,
    environmentalRisk: 'high',
    status: 'detected',
    detectionDate: new Date('2024-10-01'),
    source: 'Landsat-8 TIRS'
  },
  {
    id: 'dump_002',
    location: { lat: 40.7505, lng: -73.9934 },
    temperature: 38.5,
    confidence: 0.76,
    populationDensity: 890,
    environmentalRisk: 'medium',
    status: 'verified',
    detectionDate: new Date('2024-09-28'),
    source: 'Landsat-9 TIRS'
  },
  {
    id: 'dump_003',
    location: { lat: 40.7614, lng: -73.9776 },
    temperature: 52.1,
    confidence: 0.94,
    populationDensity: 1450,
    environmentalRisk: 'critical',
    status: 'cleanup_scheduled',
    detectionDate: new Date('2024-10-02'),
    source: 'Landsat-8 TIRS'
  }
];

export async function POST(request) {
  try {
    const { lat, lon, radius = 5 } = await request.json();
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    console.log(`Detecting illegal dumps using NASA data for location: ${lat}, ${lon}`);

    try {
      // Use real NASA data for thermal anomaly detection
      const anomalies = await nasaApi.detectThermalAnomalies(lat, lon, radius);
      const populationData = await nasaApi.getSEDACPopulation(lat, lon);
      
      // Process detected anomalies into dump data
      const detectedDumps = anomalies.map((anomaly, index) => ({
        id: `dump_nasa_${Date.now()}_${index}`,
        location: { lat: anomaly.location[1], lng: anomaly.location[0] },
        temperature: anomaly.temperature,
        confidence: anomaly.confidence,
        populationDensity: populationData.density,
        environmentalRisk: assessEnvironmentalRisk(
          anomaly.temperature,
          populationData.density,
          anomaly.confidence
        ),
        status: 'detected',
        detectionDate: anomaly.detectionDate,
        source: anomaly.source,
        metadata: anomaly.metadata || {},
        dataSource: 'NASA_REAL'
      }));

      console.log(`NASA API detected ${detectedDumps.length} thermal anomalies`);

      return NextResponse.json({
        success: true,
        detectedDumps: detectedDumps.length,
        dumps: detectedDumps,
        searchArea: { lat, lon, radius },
        populationData: {
          density: populationData.density,
          source: populationData.source,
          confidence: populationData.metadata?.confidence
        },
        apiStatus: 'NASA_API_ACTIVE'
      });

    } catch (nasaError) {
      console.error('NASA API error, using fallback data:', nasaError.message);
      
      // Fallback to mock data if NASA API fails
      const nearbyMockDumps = mockDumps.filter(dump => {
        const distance = calculateDistance(lat, lon, dump.location.lat, dump.location.lng);
        return distance <= radius;
      });

      return NextResponse.json({
        success: true,
        detectedDumps: nearbyMockDumps.length,
        dumps: nearbyMockDumps,
        searchArea: { lat, lon, radius },
        apiStatus: 'FALLBACK_DATA',
        warning: 'NASA API unavailable, using simulated data'
      });
    }

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

    // Filter mock dumps based on location and radius
    let filteredDumps = mockDumps.filter(dump => {
      const distance = calculateDistance(lat, lon, dump.location.lat, dump.location.lng);
      return distance <= radius;
    });

    // Filter by status if provided
    if (status) {
      filteredDumps = filteredDumps.filter(dump => dump.status === status);
    }

    // Sort by detection date (newest first)
    filteredDumps.sort((a, b) => new Date(b.detectionDate) - new Date(a.detectionDate));

    return NextResponse.json({
      success: true,
      dumps: filteredDumps.slice(0, 100), // Limit to 100 results
      count: filteredDumps.length
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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}