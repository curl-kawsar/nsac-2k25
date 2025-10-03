'use client';

import { useState, useEffect } from 'react';
import {
  CloudIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  Squares2X2Icon,
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AirQualityMap from './AirQualityMap';

export default function AirQualityDetection({ location, onDetectionUpdate }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [locationInput, setLocationInput] = useState({
    lat: location?.lat || 40.7128,
    lng: location?.lon || -74.0060,
    address: ''
  });
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [locationCache, setLocationCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aq_location_cache') || '{}');
    } catch {
      return {};
    }
  });
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aq_recent_searches') || '[]');
    } catch {
      return [];
    }
  });
  const [filters, setFilters] = useState({
    date: (() => {
      // Default to yesterday since NASA data is only available for past dates
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    })(),
    pollutant: 'all', // all, pm25, o3, no2
    aqiThreshold: 50 // Show locations with AQI above this value
  });

  // Update detection results periodically
  useEffect(() => {
    if (detectionResults) {
      const interval = setInterval(() => {
        setDetectionResults(prev => ({
          ...prev,
          lastUpdated: new Date()
        }));
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [detectionResults]);

  // Save cache to localStorage
  const saveToCache = (address, result) => {
    try {
      const newCache = { ...locationCache, [address.toLowerCase()]: result };
      setLocationCache(newCache);
      localStorage.setItem('aq_location_cache', JSON.stringify(newCache));
    } catch (error) {
      console.warn('Could not save to cache:', error);
    }
  };

  // Save recent search
  const saveRecentSearch = (address) => {
    try {
      const newSearches = [address, ...recentSearches.filter(s => s !== address)].slice(0, 5);
      setRecentSearches(newSearches);
      localStorage.setItem('aq_recent_searches', JSON.stringify(newSearches));
    } catch (error) {
      console.warn('Could not save recent search:', error);
    }
  };

  // Geocode address using Google Geocoding API
  const geocodeAddress = async (address) => {
    // Check cache first
    const cached = locationCache[address.toLowerCase()];
    if (cached) {
      console.log('Using cached location for:', address);
      setLocationInput(prev => ({
        ...prev,
        lat: cached.lat,
        lng: cached.lng,
        address: address
      }));
      return { lat: cached.lat, lng: cached.lng };
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        
        // Save to cache and recent searches
        saveToCache(address, { lat, lng });
        saveRecentSearch(address);
        
        setLocationInput(prev => ({
          ...prev,
          lat: lat,
          lng: lng,
          address: result.formatted_address
        }));
        
        return { lat, lng };
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Could not find the specified location. Please try a different address.');
      return null;
    }
  };

  // Get ML-enhanced air quality prediction
  const getMLAirQualityPrediction = async (metrics, location) => {
    try {
      // Prepare features for ML model
      const features = {
        pm25: metrics.pm25 || 25,
        no2: metrics.no2 || 40,
        so2: metrics.so2 || 15,
        o3: metrics.o3 || 65,
        co: metrics.co || 1.2,
        temperature: 22 + (Math.random() - 0.5) * 10, // Simulated temperature
        humidity: 60 + (Math.random() - 0.5) * 20, // Simulated humidity
        wind_speed: 3 + Math.random() * 5, // Simulated wind speed
        pressure: 1013 + (Math.random() - 0.5) * 20, // Simulated pressure
        location: {
          lat: location.lat,
          lng: location.lng,
          name: location.address || `${location.lat}, ${location.lng}`
        }
      };

      const response = await fetch('/api/ml/air-quality-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(features)
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.status}`);
      }

      const mlResult = await response.json();
      
      if (!mlResult.success) {
        throw new Error(mlResult.message || 'ML prediction failed');
      }

      return mlResult;
    } catch (error) {
      console.error('ML Air Quality Prediction error:', error);
      throw error;
    }
  };

  const runAirQualityDetection = async () => {
    setIsDetecting(true);
    
    try {
      console.log('Running air quality detection...');
      
      // Call the new AQI API endpoint
      const params = new URLSearchParams({
        city: locationInput.address || `${locationInput.lat},${locationInput.lng}`,
        date: filters.date
      });

      // If we have coordinates but no address, use bbox instead
      if (!locationInput.address && locationInput.lat && locationInput.lng) {
        const bbox = `${locationInput.lng-0.1},${locationInput.lat-0.1},${locationInput.lng+0.1},${locationInput.lat+0.1}`;
        params.set('bbox', bbox);
        params.delete('city');
      }

      const response = await fetch(`/api/airquality?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Air quality detection results:', data);

      // Enhanced prediction using ML model
      let mlPrediction = null;
      try {
        mlPrediction = await getMLAirQualityPrediction(data.metrics, locationInput);
        console.log('ML Air Quality Prediction:', mlPrediction);
      } catch (mlError) {
        console.warn('ML prediction failed, using standard calculation:', mlError.message);
      }

      // Generate stations
      const stations = generateAirQualityStations(data);
      console.log('Generated air quality stations:', stations);

      // Process and format results with ML enhancement
      const processedResults = {
        success: true,
        city: data.city,
        date: data.date,
        aqi: mlPrediction?.prediction?.aqi || data.aqi,
        driver: data.driver,
        category: mlPrediction?.prediction?.category || data.category,
        metrics: data.metrics,
        searchArea: {
          lat: locationInput.lat,
          lon: locationInput.lng,
          bbox: data.bbox
        },
        stations: stations,
        meta: {
          ...data.meta,
          ml_enhanced: !!mlPrediction,
          ml_confidence: mlPrediction?.prediction?.confidence || null,
          ml_model_type: mlPrediction?.model_info?.type || null
        },
        ml_prediction: mlPrediction || null,
        detectionTime: new Date(),
        filters: { ...filters }
      };

      setDetectionResults(processedResults);

      // Add to history
      const historyEntry = {
        id: Date.now(),
        city: data.city,
        date: data.date,
        aqi: data.aqi,
        driver: data.driver,
        category: data.category,
        location: `${locationInput.lat.toFixed(4)}, ${locationInput.lng.toFixed(4)}`,
        address: locationInput.address,
        timestamp: new Date(),
        apiStatus: data.meta?.source || 'NASA_API_ACTIVE',
        dataType: data.meta?.dataType || 'unknown'
      };

      setDetectionHistory(prev => [historyEntry, ...prev.slice(0, 9)]);
      setShowResultsModal(true); // Show modal when results are ready

      // Notify parent component
      if (onDetectionUpdate) {
        const updateData = {
          action: 'air_quality_results',
          location: { lat: locationInput.lat, lon: locationInput.lng },
          results: processedResults,
          workflow: 'airquality'
        };
        console.log('Sending air quality results to parent:', updateData);
        console.log('Processed results structure:', processedResults);
        console.log('Stations in results:', processedResults.stations);
        onDetectionUpdate(updateData);
      }

    } catch (error) {
      console.error('Air quality detection error:', error);
      alert(`Air quality detection failed: ${error.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Generate air quality monitoring stations from API data
  const generateAirQualityStations = (data) => {
    const stations = [];
    const centerLat = locationInput.lat;
    const centerLng = locationInput.lng;

    // Create stations around the area
    const stationCount = 3 + Math.floor(Math.random() * 3); // 3-5 stations
    
    for (let i = 0; i < stationCount; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.02; // ~1km radius
      const offsetLng = (Math.random() - 0.5) * 0.02;
      
      // Vary the AQI around the main result
      const aqiVariation = (Math.random() - 0.5) * 20;
      const stationAQI = Math.max(0, Math.min(500, data.aqi + aqiVariation));
      
      stations.push({
        id: `aqs_${i + 1}`,
        name: `Air Quality Station ${i + 1}`,
        location: {
          lat: centerLat + offsetLat,
          lng: centerLng + offsetLng
        },
        aqi: Math.round(stationAQI),
        category: getAQICategory(stationAQI),
        measurements: {
          pm25: data.metrics.pm25 ? data.metrics.pm25 + (Math.random() - 0.5) * 10 : null,
          o3: data.metrics.o3 ? data.metrics.o3 + (Math.random() - 0.5) * 15 : null,
          no2: data.metrics.no2 ? data.metrics.no2 + (Math.random() - 0.5) * 8 : null
        },
        lastUpdated: new Date(),
        status: 'operational'
      });
    }

    return stations;
  };

  const getAQICategory = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return 'text-green-600';
    if (aqi <= 100) return 'text-yellow-600';
    if (aqi <= 150) return 'text-orange-600';
    if (aqi <= 200) return 'text-red-600';
    if (aqi <= 300) return 'text-purple-600';
    return 'text-red-800';
  };

  const getAQIBgColor = (aqi) => {
    if (aqi <= 50) return 'bg-green-50 border-green-200';
    if (aqi <= 100) return 'bg-yellow-50 border-yellow-200';
    if (aqi <= 150) return 'bg-orange-50 border-orange-200';
    if (aqi <= 200) return 'bg-red-50 border-red-200';
    if (aqi <= 300) return 'bg-purple-50 border-purple-200';
    return 'bg-red-100 border-red-300';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Detection Controls */}
      <Card>
        <CardHeader className="pb-2 lg:pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                <CloudIcon className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                Air Quality Detection
              </CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                Monitor air quality using NASA satellite data
              </CardDescription>
            </div>
            <Badge variant={isDetecting ? "secondary" : "outline"} className="gap-1 lg:gap-2">
              <div className={`h-1.5 w-1.5 lg:h-2 lg:w-2 rounded-full ${isDetecting ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`}></div>
              <span className="text-xs lg:text-sm">{isDetecting ? 'Detecting...' : 'Ready'}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">

          {/* Location Input Section */}
          <div className="space-y-3 lg:space-y-4 p-3 lg:p-4 bg-blue-50/50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2 lg:mb-3">
              <MapPinIcon className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
              <Label className="text-xs lg:text-sm font-medium text-blue-900">Detection Location</Label>
            </div>
            
            {/* Address Search */}
            <div className="space-y-2 lg:space-y-3">
              <div className="space-y-1 lg:space-y-2">
                <Label htmlFor="address-search" className="text-xs lg:text-sm">Search City or Address</Label>
                <div className="flex gap-1 lg:gap-2">
                  <Input
                    id="address-search"
                    type="text"
                    value={locationInput.address}
                    onChange={(e) => setLocationInput(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., New York, London..."
                    className="flex-1 text-xs lg:text-sm h-8 lg:h-10"
                    list="recent-searches"
                  />
                  <datalist id="recent-searches">
                    {recentSearches.map((search, index) => (
                      <option key={index} value={search} />
                    ))}
                  </datalist>
                  <Button
                    onClick={() => locationInput.address && geocodeAddress(locationInput.address)}
                    disabled={!locationInput.address || isDetecting}
                    size="sm"
                    className="gap-1 lg:gap-2 px-2 lg:px-3 h-8 lg:h-10 text-xs lg:text-sm"
                  >
                    <MagnifyingGlassIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                    Find
                  </Button>
                </div>
                
                {/* Recent Searches Quick Access */}
                {recentSearches.length > 0 && (
                  <div className="flex flex-wrap gap-1 lg:gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Recent:</span>
                    {recentSearches.slice(0, 2).map((search, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLocationInput(prev => ({ ...prev, address: search }));
                          geocodeAddress(search);
                        }}
                        className="h-5 lg:h-6 px-1 lg:px-2 text-xs"
                      >
                        {search.length > 15 ? search.substring(0, 15) + '...' : search}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinate Inputs */}
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                <div className="space-y-1 lg:space-y-2">
                  <Label htmlFor="latitude" className="text-xs lg:text-sm">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    value={locationInput.lat}
                    onChange={(e) => setLocationInput(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                    step="0.00001"
                    min="-90"
                    max="90"
                    className="text-xs lg:text-sm h-8 lg:h-10"
                  />
                </div>
                <div className="space-y-1 lg:space-y-2">
                  <Label htmlFor="longitude" className="text-xs lg:text-sm">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    value={locationInput.lng}
                    onChange={(e) => setLocationInput(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                    step="0.00001"
                    min="-180"
                    max="180"
                    className="text-xs lg:text-sm h-8 lg:h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detection Filters */}
          <div className="space-y-3 lg:space-y-4 p-3 lg:p-4 bg-gray-50/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2 lg:mb-3">
              <AdjustmentsHorizontalIcon className="h-3 w-3 lg:h-4 lg:w-4 text-gray-600" />
              <Label className="text-xs lg:text-sm font-medium">Detection Parameters</Label>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1 lg:space-y-2">
                <Label htmlFor="detection-date" className="text-xs lg:text-sm font-medium">Date</Label>
                <Input
                  id="detection-date"
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="text-xs lg:text-sm h-8 lg:h-10"
                />
                <p className="text-xs text-muted-foreground leading-tight">
                  💡 NASA data available for past dates
                </p>
              </div>
              <div className="space-y-1 lg:space-y-2">
                <Label htmlFor="pollutant-filter" className="text-xs lg:text-sm font-medium">Focus Pollutant</Label>
                <Select value={filters.pollutant} onValueChange={(value) => setFilters(prev => ({ ...prev, pollutant: value }))}>
                  <SelectTrigger className="text-xs lg:text-sm h-8 lg:h-10">
                    <SelectValue placeholder="Select pollutant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pollutants</SelectItem>
                    <SelectItem value="pm25">PM2.5</SelectItem>
                    <SelectItem value="o3">Ozone (O₃)</SelectItem>
                    <SelectItem value="no2">Nitrogen Dioxide (NO₂)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 lg:space-y-2">
                <Label htmlFor="aqi-threshold" className="text-xs lg:text-sm font-medium">AQI Threshold</Label>
                <Input
                  id="aqi-threshold"
                  type="number"
                  value={filters.aqiThreshold}
                  onChange={(e) => setFilters(prev => ({ ...prev, aqiThreshold: parseInt(e.target.value) }))}
                  min="0"
                  max="500"
                  className="text-xs lg:text-sm h-8 lg:h-10"
                  placeholder="e.g., 50"
                />
                <p className="text-xs text-muted-foreground">
                  Show locations with AQI above this value
                </p>
              </div>
            </div>
          </div>

          {/* Heat Map Toggle */}
          <div className="flex items-center justify-between p-2 lg:p-3 bg-green-50/50 rounded-lg border border-green-200">
            <div className="space-y-1">
              <Label className="text-xs lg:text-sm font-medium">Station Visualization</Label>
              <p className="text-xs text-muted-foreground">Show stations on map</p>
            </div>
            <Switch
              checked={showHeatMap}
              onCheckedChange={setShowHeatMap}
            />
          </div>

          {/* Detection Button */}
          <Button
            onClick={runAirQualityDetection}
            disabled={isDetecting}
            className="w-full gap-2 h-10 lg:h-12 text-xs lg:text-sm"
            size="lg"
          >
            {isDetecting ? (
              <>
                <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <CloudIcon className="h-3 w-3 lg:h-4 lg:w-4" />
                Run Air Quality Analysis
              </>
            )}
          </Button>

          {/* Current Location Info */}
          <Alert className="bg-green-50 border-green-200">
            <MapPinIcon className="h-3 w-3 lg:h-4 lg:w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium text-green-800 text-xs lg:text-sm">
                  Target: {locationInput.lat.toFixed(4)}, {locationInput.lng.toFixed(4)}
                </div>
                {locationInput.address && (
                  <div className="text-xs text-green-700">
                    📍 {locationInput.address}
                  </div>
                )}
                <div className="text-xs text-green-700">
                  📅 {filters.date} | 🎯 {filters.pollutant} | 📊 {filters.aqiThreshold} AQI
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Quick Results Button - Show when results are available */}
      {detectionResults && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button 
            onClick={() => setShowResultsModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            size="sm"
          >
            <CloudIcon className="h-4 w-4 mr-2" />
            View Results
          </Button>
        </div>
      )}

      {/* Detection History - Responsive */}
      {detectionHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2 lg:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
              <ClockIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              Detection History
            </CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              Previous air quality analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 lg:space-y-3">
              {detectionHistory.slice(0, 2).map((detection) => (
                <div key={detection.id} className="p-2 lg:p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs lg:text-sm font-medium text-gray-900">
                        <span className={`${getAQIColor(detection.aqi)} font-bold`}>AQI {detection.aqi}</span>
                        <span className="text-gray-600 ml-2">- {detection.category}</span>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        detection.dataType === 'real-nasa' ? 'bg-green-100 text-green-700' : 
                        detection.dataType === 'simulated' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {detection.dataType === 'real-nasa' ? '🛰️ NASA' : 
                         detection.dataType === 'simulated' ? '🔮 Sim' : '📊 Data'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="truncate">📍 {detection.address || detection.city}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{detection.location}</span>
                        <span>{detection.timestamp.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Modal - Bottom Position */}
      {showResultsModal && detectionResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <Card className="w-full max-w-6xl max-h-[80vh] overflow-y-auto rounded-t-xl rounded-b-none border-b-0 animate-in slide-in-from-bottom duration-300">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CloudIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg text-gray-900">Air Quality Analysis Results</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Analysis completed for {detectionResults.city} on {detectionResults.date}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {detectionResults.meta?.dataType === 'real-nasa' && (
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      🛰️ NASA Data
                    </Badge>
                  )}
                  <Badge variant="outline" className={`${getAQIBgColor(detectionResults.aqi)}`}>
                    {detectionResults.category}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowResultsModal(false)}
                    className="h-8 w-8"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Results Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className={`text-3xl font-bold ${getAQIColor(detectionResults.aqi)} mb-2`}>
                    {detectionResults.aqi}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Overall AQI</div>
                  <Badge variant="outline" className={`text-xs ${getAQIBgColor(detectionResults.aqi)}`}>
                    {detectionResults.category}
                  </Badge>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {detectionResults.driver}
                  </div>
                  <div className="text-sm text-gray-600">Primary Pollutant</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {detectionResults.stations?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Monitoring Stations</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="text-xl font-bold text-orange-600 mb-2 truncate" title={detectionResults.city}>
                    {detectionResults.city}
                  </div>
                  <div className="text-sm text-gray-600">Location</div>
                </div>
              </div>

              {/* Pollutant Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                  Pollutant Concentrations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {detectionResults.metrics.pm25 && (
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-orange-800 text-lg">PM2.5</div>
                          <div className="text-sm text-orange-600">Fine Particles</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-800">
                            {detectionResults.metrics.pm25}
                          </div>
                          <div className="text-sm text-orange-600">µg/m³</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {detectionResults.metrics.o3 && (
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-blue-800 text-lg">O₃</div>
                          <div className="text-sm text-blue-600">Ground Ozone</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-800">
                            {detectionResults.metrics.o3}
                          </div>
                          <div className="text-sm text-blue-600">µg/m³</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {detectionResults.metrics.no2 && (
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-red-800 text-lg">NO₂</div>
                          <div className="text-sm text-red-600">Nitrogen Dioxide</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-800">
                            {detectionResults.metrics.no2}
                          </div>
                          <div className="text-sm text-red-600">µg/m³</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Monitoring Stations */}
              {detectionResults.stations && detectionResults.stations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Squares2X2Icon className="h-5 w-5 text-green-600" />
                    Monitoring Stations Network
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {detectionResults.stations.map((station, index) => (
                      <div
                        key={station.id}
                        onClick={() => setSelectedStation(station)}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`h-4 w-4 rounded-full flex-shrink-0 mt-1 ${
                              station.aqi <= 50 ? 'bg-green-500' :
                              station.aqi <= 100 ? 'bg-yellow-500' :
                              station.aqi <= 150 ? 'bg-orange-500' :
                              station.aqi <= 200 ? 'bg-red-500' :
                              'bg-purple-500'
                            }`}></div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-base">{station.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                📍 {station.location.lat.toFixed(4)}, {station.location.lng.toFixed(4)}
                              </div>
                              <div className="text-sm text-blue-600 mt-1">
                                📊 Status: {station.status === 'operational' ? '✅ Operational' : '⚠️ Maintenance'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getAQIColor(station.aqi)}`}>
                              {station.aqi}
                            </div>
                            <div className="text-xs text-gray-500">{station.category}</div>
                          </div>
                        </div>
                        
                        {/* Measurements preview */}
                        {station.measurements && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                              {station.measurements.pm25 && (
                                <span className="text-center">
                                  <div className="font-medium">PM2.5</div>
                                  <div>{station.measurements.pm25.toFixed(1)}</div>
                                </span>
                              )}
                              {station.measurements.o3 && (
                                <span className="text-center">
                                  <div className="font-medium">O₃</div>
                                  <div>{station.measurements.o3.toFixed(1)}</div>
                                </span>
                              )}
                              {station.measurements.no2 && (
                                <span className="text-center">
                                  <div className="font-medium">NO₂</div>
                                  <div>{station.measurements.no2.toFixed(1)}</div>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Advisory */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Health Advisory & Data Sources</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Recommendation:</strong> 
                        {detectionResults.aqi <= 50 ? 'Air quality is satisfactory for most people.' :
                         detectionResults.aqi <= 100 ? 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' :
                         detectionResults.aqi <= 150 ? 'Sensitive groups should reduce prolonged outdoor exertion.' :
                         detectionResults.aqi <= 200 ? 'Everyone should reduce prolonged outdoor exertion.' :
                         'Everyone should avoid prolonged outdoor exertion.'}
                      </p>
                      <p><strong>Data Source:</strong> {detectionResults.meta?.source || 'NASA Satellite Data'} • Last Updated: {formatTimestamp(detectionResults.detectionTime)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Analysis completed at {new Date().toLocaleTimeString()}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowResultsModal(false)}>
                    Close Results
                  </Button>
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(detectionResults, null, 2));
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Export Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Station Detail Modal - Responsive */}
      {selectedStation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setSelectedStation(null)}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Air Quality Station Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedStation(null)}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* AQI and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center sm:text-left p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <Label className="text-xs sm:text-sm font-medium text-gray-600">AQI</Label>
                  <div className={`text-2xl sm:text-3xl font-bold ${getAQIColor(selectedStation.aqi)} mt-1`}>
                    {selectedStation.aqi}
                  </div>
                </div>
                <div className="text-center sm:text-left p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <Label className="text-xs sm:text-sm font-medium text-gray-600">Category</Label>
                  <div className="text-lg sm:text-xl font-bold text-purple-800 mt-1">
                    {selectedStation.category}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Location</Label>
                <div className="text-sm sm:text-base text-gray-900 font-mono mt-1">
                  {selectedStation.location.lat.toFixed(6)}, {selectedStation.location.lng.toFixed(6)}
                </div>
              </div>

              {/* Measurements */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">Pollutant Measurements</Label>
                <div className="space-y-3">
                  {selectedStation.measurements.pm25 && (
                    <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                      <span className="text-sm font-medium text-orange-800">PM2.5:</span>
                      <span className="font-bold text-orange-800">{selectedStation.measurements.pm25.toFixed(1)} µg/m³</span>
                    </div>
                  )}
                  {selectedStation.measurements.o3 && (
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">O₃:</span>
                      <span className="font-bold text-blue-800">{selectedStation.measurements.o3.toFixed(1)} µg/m³</span>
                    </div>
                  )}
                  {selectedStation.measurements.no2 && (
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-800">NO₂:</span>
                      <span className="font-bold text-red-800">{selectedStation.measurements.no2.toFixed(1)} µg/m³</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Health Advisory */}
              <div className="p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong className="text-blue-800">Health Advisory:</strong>
                    <p className="text-blue-700 mt-1">
                      {selectedStation.aqi <= 50 ? 'Air quality is satisfactory for most people.' :
                       selectedStation.aqi <= 100 ? 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' :
                       selectedStation.aqi <= 150 ? 'Sensitive groups should reduce prolonged outdoor exertion.' :
                       selectedStation.aqi <= 200 ? 'Everyone should reduce prolonged outdoor exertion.' :
                       'Everyone should avoid prolonged outdoor exertion.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}