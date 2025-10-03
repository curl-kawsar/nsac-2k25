'use client';

import { useState, useEffect } from 'react';
import {
  FireIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  Squares2X2Icon,
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
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
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ThermalSpotDetection({ location, onDetectionUpdate }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [isGettingAIAdvice, setIsGettingAIAdvice] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [locationInput, setLocationInput] = useState({
    lat: location?.lat || 40.7128,
    lng: location?.lon || -74.0060,
    address: ''
  });
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [locationCache, setLocationCache] = useState(() => {
    // Load cached locations from localStorage
    try {
      const cached = localStorage.getItem('thermalDetection_locationCache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [recentSearches, setRecentSearches] = useState(() => {
    // Load recent searches from localStorage
    try {
      const recent = localStorage.getItem('thermalDetection_recentSearches');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  });
  const [filters, setFilters] = useState({
    minTemperature: 35,
    minConfidence: 0.6,
    showFireRelated: true,
    showThermalOnly: true,
    timeRange: '7d',
    radius: 10
  });

  // Simulate real-time detection
  useEffect(() => {
    const interval = setInterval(() => {
      if (detectionResults && detectionResults.dumps?.length > 0) {
        // Update temperatures with small variations
        setDetectionResults(prev => ({
          ...prev,
          dumps: prev.dumps.map(dump => ({
            ...dump,
            temperature: dump.temperature + (Math.random() - 0.5) * 2,
            lastUpdate: new Date()
          }))
        }));
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [detectionResults]);

  // Save cache to localStorage
  const saveToCache = (address, result) => {
    try {
      const newCache = { ...locationCache, [address.toLowerCase()]: result };
      setLocationCache(newCache);
      localStorage.setItem('thermalDetection_locationCache', JSON.stringify(newCache));
    } catch (error) {
      console.warn('Could not save to cache:', error);
    }
  };

  // Save recent searches
  const saveRecentSearch = (address) => {
    try {
      const newRecent = [address, ...recentSearches.filter(s => s !== address)].slice(0, 10);
      setRecentSearches(newRecent);
      localStorage.setItem('thermalDetection_recentSearches', JSON.stringify(newRecent));
    } catch (error) {
      console.warn('Could not save recent search:', error);
    }
  };

  // Enhanced geocoding function with caching
  const geocodeAddress = async (address) => {
    if (!address.trim()) return null;

    const addressKey = address.toLowerCase().trim();
    
    // Check cache first
    if (locationCache[addressKey]) {
      console.log('Using cached location for:', address);
      const cached = locationCache[addressKey];
      setLocationInput(prev => ({
        ...prev,
        lat: cached.lat,
        lng: cached.lng,
        address: cached.formatted_address
      }));
      return { lat: cached.lat, lng: cached.lng };
    }

    try {
      console.log('Geocoding address:', address);
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyD4FZThhkEqmJ4wulBCQATOO3BWFuPXO5A`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        
        const locationData = {
          lat: lat,
          lng: lng,
          formatted_address: result.formatted_address
        };
        
        // Save to cache
        saveToCache(addressKey, locationData);
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

  // Get AI recommendations for detected waste spots
  const getAIRecommendations = async (detectedSpots) => {
    if (!detectedSpots || detectedSpots.length === 0) {
      alert('No waste spots detected to analyze. Please run thermal detection first.');
      return;
    }

    setIsGettingAIAdvice(true);
    
    try {
      console.log('Getting AI recommendations for waste spots...');
      
      // Prepare waste spots data for AI analysis
      const wasteSpots = detectedSpots.map(spot => ({
        location: {
          lat: spot.location.lat,
          lng: spot.location.lng
        },
        temperature: spot.temperature,
        confidence: spot.confidence,
        type: spot.type || 'thermal_anomaly',
        nearbyPopulation: spot.nearbyPopulation || Math.floor(Math.random() * 10000) + 1000,
        detectionTime: spot.detectionTime || new Date().toISOString()
      }));

      const requestBody = {
        waste_spots: wasteSpots,
        location_info: {
          city: locationInput.address || 'Unknown Location',
          lat: locationInput.lat,
          lon: locationInput.lng,
          country: 'Unknown'
        },
        analysis_options: {
          focus_area: 'comprehensive',
          budget_constraint: 'medium',
          urgency_level: detectedSpots.length > 10 ? 'high' : 'medium',
          searchRadius: filters.radius
        },
        request_metadata: {
          detection_filters: filters,
          total_spots: detectedSpots.length,
          high_temp_spots: detectedSpots.filter(s => s.temperature > 45).length
        }
      };

      console.log('AI Analysis Request:', requestBody);

      const response = await fetch('/api/waste-management/ai-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const aiData = await response.json();
      console.log('AI Recommendations received:', aiData);

      if (aiData.success) {
        setAiRecommendations(aiData);
        setShowAIRecommendations(true);
        
        // Add AI analysis to history
        const aiHistoryEntry = {
          id: Date.now() + '_ai',
          type: 'ai_analysis',
          expert: aiData.expert_analysis.expert_info.name,
          severity: aiData.ai_recommendations.overall_assessment.severity_level,
          spots_analyzed: wasteSpots.length,
          location: `${locationInput.lat.toFixed(4)}, ${locationInput.lng.toFixed(4)}`,
          address: locationInput.address,
          timestamp: new Date(),
          recommendations_count: aiData.action_plan.prioritized_actions.length,
          total_cost: aiData.cost_analysis.breakdown.total
        };

        setDetectionHistory(prev => [aiHistoryEntry, ...prev.slice(0, 9)]);
        
        console.log(`AI Analysis completed: ${aiData.ai_recommendations.overall_assessment.severity_level} severity`);
      } else {
        throw new Error(aiData.message || 'AI analysis failed');
      }

    } catch (error) {
      console.error('AI recommendations error:', error);
      alert(`Failed to get AI recommendations: ${error.message}`);
    } finally {
      setIsGettingAIAdvice(false);
    }
  };

  const runThermalDetection = async () => {
    setIsDetecting(true);
    
    try {
      console.log('Running thermal spot detection for illegal dumps...');
      
      // Call the real NASA API endpoint
      const response = await fetch('/api/waste-management/detect-dumps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: locationInput.lat,
          lon: locationInput.lng,
          radius: filters.radius,
          thermalThreshold: filters.minTemperature,
          confidenceThreshold: filters.minConfidence
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Thermal detection results:', data);

      // Process and filter results
      const filteredDumps = data.dumps?.filter(dump => {
        if (dump.temperature < filters.minTemperature) return false;
        if (dump.confidence < filters.minConfidence) return false;
        if (!filters.showFireRelated && dump.type === 'fire_related') return false;
        if (!filters.showThermalOnly && dump.type !== 'fire_related') return false;
        return true;
      }) || [];

      const results = {
        ...data,
        dumps: filteredDumps,
        detectionTime: new Date(),
        filters: { ...filters }
      };

      setDetectionResults(results);
      
      // Add to history
      setDetectionHistory(prev => [
        {
          id: Date.now(),
          timestamp: new Date(),
          location: `${locationInput.lat.toFixed(4)}, ${locationInput.lng.toFixed(4)}`,
          address: locationInput.address || 'Coordinates only',
          detectedCount: filteredDumps.length,
          avgTemperature: filteredDumps.length > 0 
            ? (filteredDumps.reduce((sum, d) => sum + d.temperature, 0) / filteredDumps.length).toFixed(1)
            : 0,
          apiStatus: data.apiStatus || 'unknown'
        },
        ...prev.slice(0, 9) // Keep last 10 detections
      ]);

      // Notify parent component
      onDetectionUpdate && onDetectionUpdate(results);
      
    } catch (error) {
      console.error('Thermal detection error:', error);
      setDetectionResults({
        success: false,
        error: error.message,
        dumps: [],
        detectionTime: new Date()
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const getThermalSeverity = (temperature) => {
    if (temperature >= 50) return { level: 'critical', color: 'red', label: 'Critical' };
    if (temperature >= 40) return { level: 'high', color: 'orange', label: 'High' };
    if (temperature >= 35) return { level: 'medium', color: 'yellow', label: 'Medium' };
    return { level: 'low', color: 'green', label: 'Low' };
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Detection Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FireIcon className="h-5 w-5 text-red-500" />
                Thermal Spot Detection
              </CardTitle>
              <CardDescription>
                Detect illegal waste dumps using NASA thermal satellite data
              </CardDescription>
            </div>
            <Badge variant={isDetecting ? "secondary" : "outline"} className="gap-2">
              <div className={`h-2 w-2 rounded-full ${isDetecting ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
              {isDetecting ? 'Detecting...' : 'Ready'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

        {/* Location Input Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
            <MapPinIcon className="h-4 w-4 mr-2" />
            Detection Location
          </h4>
          
          {/* Address Search */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Address or Place
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    value={locationInput.address}
                    onChange={(e) => setLocationInput(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., New York City, Central Park, etc."
                    className="flex-1"
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
                    className="gap-2"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    Find
                  </Button>
                </div>
                
                {/* Recent Searches Quick Access */}
                {recentSearches.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Recent:</span>
                    {recentSearches.slice(0, 3).map((search, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLocationInput(prev => ({ ...prev, address: search }));
                          geocodeAddress(search);
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        {search.length > 20 ? search.substring(0, 20) + '...' : search}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-sm">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  value={locationInput.lat}
                  onChange={(e) => setLocationInput(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                  step="0.00001"
                  min="-90"
                  max="90"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-sm">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  value={locationInput.lng}
                  onChange={(e) => setLocationInput(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                  step="0.00001"
                  min="-180"
                  max="180"
                />
              </div>
            </div>

            {/* Search Radius */}
            <div className="space-y-2">
              <Label className="text-sm">Search Radius: {filters.radius} km</Label>
              <Slider
                value={[filters.radius]}
                onValueChange={(value) => setFilters(prev => ({ ...prev, radius: value[0] }))}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        </div>

          {/* Filters */}
          <div className="space-y-4 p-4 bg-gray-50/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium">Detection Filters</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-temp" className="text-sm">Min Temperature (°C)</Label>
                <Input
                  id="min-temp"
                  type="number"
                  value={filters.minTemperature}
                  onChange={(e) => setFilters(prev => ({ ...prev, minTemperature: parseFloat(e.target.value) }))}
                  min="25"
                  max="60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-confidence" className="text-sm">Min Confidence</Label>
                <Input
                  id="min-confidence"
                  type="number"
                  value={filters.minConfidence}
                  onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Heat Map Toggle */}
          <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-200">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Heat Map Visualization</Label>
              <p className="text-xs text-muted-foreground">Show thermal intensity as heat map overlay</p>
            </div>
            <Switch
              checked={showHeatMap}
              onCheckedChange={setShowHeatMap}
            />
          </div>

          {/* Detection Button */}
          <Button
            onClick={runThermalDetection}
            disabled={isDetecting}
            className="w-full gap-2"
            size="lg"
          >
            {isDetecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Detecting Thermal Spots...
              </>
            ) : (
              <>
                <FireIcon className="h-4 w-4" />
                Run Thermal Detection
              </>
            )}
          </Button>

          {/* AI Recommendations Button */}
          {detectionResults && detectionResults.dumps && detectionResults.dumps.length > 0 && (
            <Button
              onClick={() => getAIRecommendations(detectionResults.dumps)}
              disabled={isGettingAIAdvice}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="lg"
            >
              {isGettingAIAdvice ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Getting AI Expert Advice...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Get AI Expert Recommendations
                </>
              )}
            </Button>
          )}

          {/* Current Location Info */}
          <Alert className="bg-green-50 border-green-200">
            <MapPinIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium text-green-800">
                  Target: {locationInput.lat.toFixed(4)}, {locationInput.lng.toFixed(4)}
                </div>
                {locationInput.address && (
                  <div className="text-sm text-green-700">
                    📍 {locationInput.address}
                  </div>
                )}
                <div className="text-sm text-green-700">
                  🔍 Radius: {filters.radius}km | 🌡️ Min: {filters.minTemperature}°C | 📊 Confidence: {(filters.minConfidence * 100).toFixed(0)}%
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Detection Results */}
      {detectionResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  Detection Results
                </CardTitle>
                <CardDescription>
                  {formatTimestamp(detectionResults.detectionTime)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {detectionResults.apiStatus && (
                  <Badge variant={detectionResults.apiStatus === 'NASA_API_ACTIVE' ? 'default' : 'secondary'}>
                    {detectionResults.apiStatus === 'NASA_API_ACTIVE' ? 'Live NASA Data' : 'Fallback Data'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {detectionResults.dumps?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500">Thermal Spots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {detectionResults.dumps?.filter(d => d.temperature >= 40).length || 0}
                  </div>
                  <div className="text-sm text-gray-500">High Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {detectionResults.dumps?.length > 0 
                      ? (detectionResults.dumps.reduce((sum, d) => sum + d.confidence, 0) / detectionResults.dumps.length * 100).toFixed(0)
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-500">Avg Confidence</div>
                </div>
              </div>

              {/* Detected Anomalies List */}
              {detectionResults.dumps && detectionResults.dumps.length > 0 ? (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900 dark:text-white">Detected Thermal Anomalies</h5>
                  {detectionResults.dumps.map((dump, index) => {
                    const severity = getThermalSeverity(dump.temperature);
                    return (
                      <div
                        key={dump.id || index}
                        onClick={() => setSelectedAnomaly(dump)}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-3 w-3 rounded-full ${{
                              red: 'bg-red-500',
                              orange: 'bg-orange-500',
                              yellow: 'bg-yellow-500',
                              green: 'bg-green-500'
                            }[severity.color]}`}></div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {dump.temperature.toFixed(1)}°C - {severity.label} Risk
                              </div>
                              <div className="text-sm text-gray-500">
                                {dump.location.lat.toFixed(4)}, {dump.location.lng.toFixed(4)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getConfidenceColor(dump.confidence)}`}>
                              {(dump.confidence * 100).toFixed(0)}% confidence
                            </div>
                            <div className="text-xs text-gray-500">
                              {dump.source}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No thermal anomalies detected</p>
                  <p className="text-sm text-gray-400">Area appears clean</p>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Detection History */}
      {detectionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Detection History
            </CardTitle>
            <CardDescription>
              Previous thermal detection results
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="space-y-2">
            {detectionHistory.map((detection) => (
              <div key={detection.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {detection.detectedCount} spots detected
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>📍 {detection.address}</div>
                    <div>📐 {detection.location} • {detection.timestamp.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Avg: {detection.avgTemperature}°C
                  </div>
                  <div className={`text-xs ${
                    detection.apiStatus === 'NASA_API_ACTIVE' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {detection.apiStatus === 'NASA_API_ACTIVE' ? 'NASA Live' : 'Fallback'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations Modal */}
      {showAIRecommendations && aiRecommendations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <CardTitle className="text-lg text-gray-900">AI Urban Expert Recommendations</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Expert analysis by {aiRecommendations.expert_analysis.expert_info.name}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-100 text-purple-700">
                    🎓 {aiRecommendations.expert_analysis.expert_info.title}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAIRecommendations(false)}
                    className="h-8 w-8"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Overall Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                  <div className={`text-2xl font-bold mb-2 ${
                    aiRecommendations.ai_recommendations.overall_assessment.severity_level === 'Critical' ? 'text-red-600' :
                    aiRecommendations.ai_recommendations.overall_assessment.severity_level === 'High' ? 'text-orange-600' :
                    aiRecommendations.ai_recommendations.overall_assessment.severity_level === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {aiRecommendations.ai_recommendations.overall_assessment.severity_level}
                  </div>
                  <div className="text-sm text-gray-600">Severity Level</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {aiRecommendations.action_plan.prioritized_actions.length}
                  </div>
                  <div className="text-sm text-gray-600">Action Items</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    ${(aiRecommendations.cost_analysis.breakdown.total / 1000).toFixed(0)}K
                  </div>
                  <div className="text-sm text-gray-600">Est. Total Cost</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {aiRecommendations.expert_analysis.analysis_summary.total_spots_analyzed}
                  </div>
                  <div className="text-sm text-gray-600">Spots Analyzed</div>
                </div>
              </div>

              {/* Primary Concerns */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                  Primary Concerns
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiRecommendations.ai_recommendations.overall_assessment.primary_concerns.map((concern, index) => (
                    <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="text-sm font-medium text-orange-800">{concern}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immediate Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-red-600" />
                  Immediate Actions Required
                </h3>
                <div className="space-y-3">
                  {aiRecommendations.ai_recommendations.immediate_actions.map((action, index) => (
                    <div key={index} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-red-800 mb-1">{action.action}</div>
                          <div className="text-sm text-red-700 mb-2">{action.description}</div>
                          <div className="flex items-center gap-4 text-xs text-red-600">
                            <span>⏱️ {action.timeframe}</span>
                            <span>👤 {action.responsible_party}</span>
                            <span>💰 {action.estimated_cost}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`ml-2 ${
                          action.priority === 'High' ? 'bg-red-100 text-red-700' :
                          action.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {action.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Short-term Solutions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Cog6ToothIcon className="h-5 w-5 text-blue-600" />
                  Short-term Solutions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiRecommendations.ai_recommendations.short_term_solutions.map((solution, index) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="font-medium text-blue-800 mb-2">{solution.solution}</div>
                      <div className="text-sm text-blue-700 mb-3">{solution.description}</div>
                      <div className="space-y-1 text-xs text-blue-600">
                        <div>⏱️ Timeline: {solution.implementation_time}</div>
                        <div>💰 Cost: {solution.cost_estimate}</div>
                        <div>📈 Impact: {solution.expected_impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Long-term Strategies */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-green-600" />
                  Long-term Strategies
                </h3>
                <div className="space-y-3">
                  {aiRecommendations.ai_recommendations.long_term_strategies.map((strategy, index) => (
                    <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium text-green-800 mb-2">{strategy.strategy}</div>
                      <div className="text-sm text-green-700 mb-3">{strategy.description}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-green-600">
                        <div>⏱️ Timeline: {strategy.timeline}</div>
                        <div>💰 Investment: {strategy.investment_required}</div>
                        <div>🌱 Sustainability: {strategy.sustainability_impact}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Cost Breakdown & ROI
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">Investment Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Immediate Actions</span>
                        <span className="font-medium">${aiRecommendations.cost_analysis.breakdown.immediate.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Short-term Solutions</span>
                        <span className="font-medium">${aiRecommendations.cost_analysis.breakdown.short_term.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Long-term Strategies</span>
                        <span className="font-medium">${aiRecommendations.cost_analysis.breakdown.long_term.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-green-100 rounded border-t-2 border-green-300">
                        <span className="font-medium">Total Investment</span>
                        <span className="font-bold text-green-700">${aiRecommendations.cost_analysis.breakdown.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">ROI Projections</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm">Annual Savings</span>
                        <span className="font-medium">${aiRecommendations.cost_analysis.roi_projections.annual_savings.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm">Health Benefits</span>
                        <span className="font-medium">${aiRecommendations.cost_analysis.roi_projections.health_benefits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm">Payback Period</span>
                        <span className="font-medium">{aiRecommendations.cost_analysis.roi_projections.payback_period}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-blue-100 rounded border-t-2 border-blue-300">
                        <span className="font-medium">5-Year Net Benefit</span>
                        <span className="font-bold text-blue-700">${aiRecommendations.cost_analysis.roi_projections.net_benefit_5_years.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert Signature */}
              <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-purple-800">{aiRecommendations.expert_analysis.expert_info.name}</div>
                      <div className="text-sm text-purple-600">{aiRecommendations.expert_analysis.expert_info.title}</div>
                      <div className="text-xs text-purple-500">{aiRecommendations.expert_analysis.expert_info.specialization}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Analysis Confidence</div>
                    <div className="text-lg font-bold text-purple-600">{(aiRecommendations.expert_analysis.expert_info.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Anomaly Detail Modal */}
      {selectedAnomaly && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnomaly(null)}
          >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Thermal Anomaly Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAnomaly(null)}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</label>
                      <div className="text-lg font-bold text-red-600">
                        {selectedAnomaly.temperature.toFixed(1)}°C
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confidence</label>
                      <div className={`text-lg font-bold ${getConfidenceColor(selectedAnomaly.confidence)}`}>
                        {(selectedAnomaly.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                    <div className="text-gray-900 dark:text-white">
                      {selectedAnomaly.location.lat.toFixed(6)}, {selectedAnomaly.location.lng.toFixed(6)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Detection Source</label>
                    <div className="text-gray-900 dark:text-white">
                      {selectedAnomaly.source}
                    </div>
                  </div>

                  {selectedAnomaly.metadata && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Info</label>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {selectedAnomaly.metadata.brightness && (
                          <div>Brightness: {selectedAnomaly.metadata.brightness.toFixed(1)}K</div>
                        )}
                        {selectedAnomaly.metadata.satellite && (
                          <div>Satellite: {selectedAnomaly.metadata.satellite}</div>
                        )}
                        {selectedAnomaly.populationDensity && (
                          <div>Population Exposure: {selectedAnomaly.populationDensity} people/km²</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`p-3 rounded-lg ${
                    getThermalSeverity(selectedAnomaly.temperature).level === 'critical' 
                      ? 'bg-red-50 border border-red-200' 
                      : getThermalSeverity(selectedAnomaly.temperature).level === 'high'
                      ? 'bg-orange-50 border border-orange-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2 mt-0.5" />
                      <div className="text-sm">
                        <strong>Risk Assessment:</strong> This thermal anomaly indicates potential illegal dumping activity. 
                        Immediate investigation is recommended for temperatures above 40°C.
                      </div>
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