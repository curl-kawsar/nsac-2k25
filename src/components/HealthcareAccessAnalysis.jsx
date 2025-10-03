import React, { useState, useEffect } from 'react';
import { 
  HeartIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export default function HealthcareAccessAnalysis({ location, onAnalysisUpdate }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showVisualization, setShowVisualization] = useState(false);

  // Analysis parameters
  const [analysisParams, setAnalysisParams] = useState({
    // Location settings
    address: '',
    coordinates: { lat: location?.lat || 40.7128, lon: location?.lon || -74.0060 },
    radius: 15, // km
    
    // Analysis options
    maxFacilities: 5,
    facilityType: 'mixed', // hospital, clinic, mixed
    priorityFocus: 'population', // population, accessibility, equity
    analysisDepth: 'standard', // basic, standard, comprehensive
    
    // Accessibility thresholds
    primaryCareThreshold: 30, // minutes
    secondaryCareThreshold: 60, // minutes
    emergencyCareThreshold: 15, // minutes
    
    // Population filters
    minPopulationDensity: 500, // people per km²
    includeRuralAreas: true,
    
    // Facility preferences
    includeExistingOptimization: false,
    considerLandCosts: true
  });

  // Initialize with location if provided
  useEffect(() => {
    if (location?.lat && location?.lon) {
      setAnalysisParams(prev => ({
        ...prev,
        coordinates: { lat: location.lat, lon: location.lon }
      }));
    }
  }, [location]);

  // Geocoding function for address search
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Handle address search
  const handleAddressSearch = async () => {
    if (!analysisParams.address.trim()) return;
    
    const geocoded = await geocodeAddress(analysisParams.address);
    if (geocoded) {
      setAnalysisParams(prev => ({
        ...prev,
        coordinates: { lat: geocoded.lat, lon: geocoded.lon }
      }));
    }
  };

  // Run healthcare access analysis
  const runHealthcareAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const requestBody = {
        coordinates: {
          lat: analysisParams.coordinates.lat,
          lon: analysisParams.coordinates.lon,
          radius: analysisParams.radius
        },
        options: {
          maxFacilities: analysisParams.maxFacilities,
          facilityType: analysisParams.facilityType,
          priorityFocus: analysisParams.priorityFocus,
          analysisDepth: analysisParams.analysisDepth,
          includeExistingOptimization: analysisParams.includeExistingOptimization,
          accessibilityThresholds: {
            primary: analysisParams.primaryCareThreshold,
            secondary: analysisParams.secondaryCareThreshold,
            emergency: analysisParams.emergencyCareThreshold
          },
          populationFilters: {
            minDensity: analysisParams.minPopulationDensity,
            includeRural: analysisParams.includeRuralAreas
          }
        }
      };

      console.log('Starting healthcare access analysis...', requestBody);

      const response = await fetch('/api/healthcare/analyze-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        const results = {
          id: `healthcare_${Date.now()}`,
          timestamp: new Date(),
          location: `${analysisParams.coordinates.lat.toFixed(4)}, ${analysisParams.coordinates.lon.toFixed(4)}`,
          address: analysisParams.address || 'Coordinates',
          ...data,
          analysisParams: { ...analysisParams }
        };

        setAnalysisResults(results);
        setAnalysisHistory(prev => [results, ...prev.slice(0, 9)]); // Keep last 10

        // Notify parent component
        if (onAnalysisUpdate) {
          onAnalysisUpdate({
            action: 'healthcare_analysis_results',
            location: analysisParams.coordinates,
            results: results,
            workflow: 'healthcare'
          });
        }

        console.log('Healthcare analysis completed successfully');
      } else {
        throw new Error(data.message || 'Analysis failed');
      }

    } catch (error) {
      console.error('Healthcare analysis error:', error);
      // Show error state but don't break the UI
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper functions for UI
  const getFacilityTypeColor = (type) => {
    const colors = {
      hospital: 'text-red-700 bg-red-50 border-red-200',
      clinic: 'text-blue-700 bg-blue-50 border-blue-200',
      pharmacy: 'text-green-700 bg-green-50 border-green-200',
      emergency: 'text-orange-700 bg-orange-50 border-orange-200',
      specialty: 'text-purple-700 bg-purple-50 border-purple-200'
    };
    return colors[type] || 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const getCoverageColor = (percentage) => {
    if (percentage >= 80) return 'text-green-700';
    if (percentage >= 60) return 'text-yellow-700';
    return 'text-red-700';
  };

  const getAccessibilityStatus = (minutes, threshold) => {
    if (minutes <= threshold * 0.5) return { status: 'excellent', color: 'text-green-700' };
    if (minutes <= threshold) return { status: 'good', color: 'text-yellow-700' };
    return { status: 'poor', color: 'text-red-700' };
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            Healthcare Access Analysis
          </CardTitle>
          <CardDescription className="text-sm">
            Analyze healthcare facility access and recommend optimal locations for new facilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPinIcon className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium">Analysis Location</Label>
            </div>
            
            <Tabs defaultValue="address" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="address" className="text-sm">Address Search</TabsTrigger>
                <TabsTrigger value="coordinates" className="text-sm">Coordinates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="address" className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter address or location name..."
                    value={analysisParams.address}
                    onChange={(e) => setAnalysisParams(prev => ({ ...prev, address: e.target.value }))}
                    className="flex-1 text-sm"
                  />
                  <Button 
                    onClick={handleAddressSearch}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    Search
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="coordinates" className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={analysisParams.coordinates.lat}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lat: parseFloat(e.target.value) || 0 }
                      }))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={analysisParams.coordinates.lon}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lon: parseFloat(e.target.value) || 0 }
                      }))}
                      className="text-sm"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Analysis Radius: {analysisParams.radius} km</Label>
              <Slider
                value={[analysisParams.radius]}
                onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, radius: value[0] }))}
                min={5}
                max={50}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          <Separator />

          {/* Analysis Parameters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium">Analysis Parameters</Label>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Max New Facilities</Label>
                <Input
                  type="number"
                  value={analysisParams.maxFacilities}
                  onChange={(e) => setAnalysisParams(prev => ({ ...prev, maxFacilities: parseInt(e.target.value) || 5 }))}
                  min="1"
                  max="20"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Facility Type Focus</Label>
                <Select 
                  value={analysisParams.facilityType} 
                  onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, facilityType: value }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (Optimal)</SelectItem>
                    <SelectItem value="hospital">Hospitals</SelectItem>
                    <SelectItem value="clinic">Clinics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label className="text-sm font-medium">Priority Focus</Label>
                <Select 
                  value={analysisParams.priorityFocus} 
                  onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, priorityFocus: value }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="population">Population Coverage</SelectItem>
                    <SelectItem value="accessibility">Travel Time</SelectItem>
                    <SelectItem value="equity">Health Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Accessibility Thresholds */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Accessibility Thresholds (minutes)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Primary Care: {analysisParams.primaryCareThreshold} min</Label>
                  <Slider
                    value={[analysisParams.primaryCareThreshold]}
                    onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, primaryCareThreshold: value[0] }))}
                    min={10}
                    max={60}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Secondary Care: {analysisParams.secondaryCareThreshold} min</Label>
                  <Slider
                    value={[analysisParams.secondaryCareThreshold]}
                    onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, secondaryCareThreshold: value[0] }))}
                    min={30}
                    max={120}
                    step={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Emergency Care: {analysisParams.emergencyCareThreshold} min</Label>
                  <Slider
                    value={[analysisParams.emergencyCareThreshold]}
                    onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, emergencyCareThreshold: value[0] }))}
                    min={5}
                    max={30}
                    step={5}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-200">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Show Facility Visualization</Label>
                <p className="text-xs text-muted-foreground">Display facilities and coverage areas on map</p>
              </div>
              <Switch
                checked={showVisualization}
                onCheckedChange={setShowVisualization}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-200">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Include Rural Areas</Label>
                <p className="text-xs text-muted-foreground">Consider low-density rural areas in analysis</p>
              </div>
              <Switch
                checked={analysisParams.includeRuralAreas}
                onCheckedChange={(checked) => setAnalysisParams(prev => ({ ...prev, includeRuralAreas: checked }))}
              />
            </div>
          </div>

          {/* Analysis Button */}
          <Button 
            onClick={runHealthcareAnalysis}
            disabled={isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Healthcare Access...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Run Healthcare Analysis
              </>
            )}
          </Button>

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Analysis Progress</span>
                <span>Processing...</span>
              </div>
              <Progress value={65} className="w-full" />
              <p className="text-xs text-gray-500 text-center">
                Analyzing population data, existing facilities, and optimizing new locations...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                Healthcare Access Analysis Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                  {analysisResults.analysis?.timestamp ? new Date(analysisResults.analysis.timestamp).toLocaleString() : 'Recent'}
                </Badge>
                {analysisResults.meta?.dataQuality && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 text-xs">
                    {Math.round(analysisResults.meta.dataQuality.analysisConfidence || 85)}% Confidence
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Results Summary - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                  {analysisResults.recommendations?.newFacilities?.length || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mb-2">Recommended Facilities</div>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {analysisResults.analysisParams?.facilityType || 'Mixed'} Type
                </Badge>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="text-xl sm:text-2xl font-bold text-green-600 mb-2">
                  {Math.round(analysisResults.coverageImprovements?.improvement?.additionalPopulationCovered || 0).toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Additional People Served</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">
                  +{Math.round(analysisResults.coverageImprovements?.improvement?.coverageIncrease || 0)}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Coverage Improvement</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="text-lg sm:text-xl font-bold text-orange-600 mb-2">
                  {analysisResults.existingFacilities?.total || 0}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Existing Facilities</div>
              </div>
            </div>

            {/* Facility Recommendations */}
            {analysisResults.recommendations?.newFacilities && analysisResults.recommendations.newFacilities.length > 0 && (
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900 text-sm sm:text-base">Recommended New Facilities</h5>
                <div className="space-y-3">
                  {analysisResults.recommendations.newFacilities.map((facility, index) => (
                    <div
                      key={facility.rank || index}
                      onClick={() => setSelectedFacility(facility)}
                      className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all hover:shadow-md bg-gradient-to-r from-gray-50 to-gray-100"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-start sm:items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {facility.rank || index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm sm:text-base">
                              {facility.recommendedType === 'hospital' ? '🏥 Hospital' :
                               facility.recommendedType === 'clinic' ? '🏢 Clinic' :
                               facility.recommendedType === 'primary_care' ? '👩‍⚕️ Primary Care' : '🏥 Healthcare Facility'}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 font-mono">
                              {facility.coordinates?.lat?.toFixed(4)}, {facility.coordinates?.lon?.toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Expected to serve {facility.expectedImpact?.populationServed?.toLocaleString() || 'N/A'} people
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex sm:flex-col items-start sm:items-end space-x-4 sm:space-x-0">
                          <div className="text-sm font-semibold text-green-700">
                            Priority: {Math.round(facility.expectedImpact?.priorityScore || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost: ${(facility.implementation?.estimatedCost || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coverage Analysis */}
            {analysisResults.coverageImprovements && (
              <div className="mt-6 space-y-4">
                <h5 className="font-medium text-gray-900 text-sm sm:text-base">Coverage Analysis</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Current Coverage</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(analysisResults.coverageImprovements.before?.coveragePercentage || 0)}%
                    </div>
                    <div className="text-xs text-gray-600">
                      {analysisResults.coverageImprovements.before?.facilitiesCount || 0} facilities serving{' '}
                      {(analysisResults.coverageImprovements.before?.populationCovered || 0).toLocaleString()} people
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-700 mb-2">Projected Coverage</div>
                    <div className="text-2xl font-bold text-green-800">
                      {Math.round(analysisResults.coverageImprovements.after?.coveragePercentage || 0)}%
                    </div>
                    <div className="text-xs text-green-600">
                      {analysisResults.coverageImprovements.after?.facilitiesCount || 0} facilities serving{' '}
                      {(analysisResults.coverageImprovements.after?.populationCovered || 0).toLocaleString()} people
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Sources */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <strong className="text-blue-800">Data Sources:</strong>
                  <p className="text-blue-700 mt-1">
                    Population: {analysisResults.population?.source || 'NASA SEDAC GPW v4'} • 
                    Urban Activity: {analysisResults.urbanActivity?.source || 'NASA VIIRS Black Marble'} • 
                    Facilities: OpenStreetMap + Healthsites.io • 
                    Optimization: {analysisResults.recommendations?.algorithm || 'MCLP Algorithm'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis History */}
      {analysisHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Analysis History
            </CardTitle>
            <CardDescription className="text-sm">
              Previous healthcare access analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisHistory.map((analysis) => (
                <div key={analysis.id} className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                        <span className="text-green-700 font-bold">
                          {analysis.recommendations?.newFacilities?.length || 0} Facilities Recommended
                        </span>
                        <span className="text-gray-600 ml-2">
                          - {Math.round(analysis.coverageImprovements?.improvement?.coverageIncrease || 0)}% Coverage Increase
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                        <div className="flex items-start space-x-1">
                          <span>📍</span>
                          <span className="truncate">{analysis.address || analysis.location}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                          <span className="flex items-center space-x-1">
                            <span>🏥</span>
                            <span className="text-xs">{analysis.analysisParams?.facilityType || 'Mixed'} • {analysis.analysisParams?.radius || 15}km radius</span>
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-xs">{analysis.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex sm:flex-col items-start sm:items-end space-x-4 sm:space-x-0 space-y-0 sm:space-y-1">
                      <div className="text-sm font-semibold text-blue-600">
                        {(analysis.coverageImprovements?.improvement?.additionalPopulationCovered || 0).toLocaleString()} People
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        ✅ Analysis Complete
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facility Detail Modal */}
      {selectedFacility && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setSelectedFacility(null)}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Recommended Healthcare Facility</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFacility(null)}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Facility Type and Rank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center sm:text-left p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <Label className="text-xs sm:text-sm font-medium text-gray-600">Rank</Label>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                    #{selectedFacility.rank || 1}
                  </div>
                </div>
                <div className="text-center sm:text-left p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <Label className="text-xs sm:text-sm font-medium text-gray-600">Type</Label>
                  <div className="text-lg sm:text-xl font-bold text-blue-600 mt-1 capitalize">
                    {selectedFacility.recommendedType?.replace('_', ' ') || 'Healthcare'}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs sm:text-sm font-medium text-gray-600">Recommended Location</Label>
                <div className="text-sm sm:text-base text-gray-900 font-mono mt-1">
                  {selectedFacility.coordinates?.lat?.toFixed(6)}, {selectedFacility.coordinates?.lon?.toFixed(6)}
                </div>
              </div>

              {/* Expected Impact */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">Expected Impact</Label>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">Population Served:</span>
                    <span className="font-bold text-blue-800">
                      {(selectedFacility.expectedImpact?.populationServed || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Additional Coverage:</span>
                    <span className="font-bold text-green-800">
                      {Math.round(selectedFacility.expectedImpact?.additionalCoverage || 0).toLocaleString()} people
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-800">Priority Score:</span>
                    <span className="font-bold text-purple-800">
                      {Math.round(selectedFacility.expectedImpact?.priorityScore || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Implementation Details */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-3 block">Implementation Details</Label>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-orange-800">Estimated Cost:</span>
                    <span className="font-bold text-orange-800">
                      ${(selectedFacility.implementation?.estimatedCost || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-yellow-800">Timeframe:</span>
                    <span className="font-bold text-yellow-800">
                      {selectedFacility.implementation?.timeframe || '12-18 months'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">Land Suitability:</span>
                    <span className={`font-bold ${selectedFacility.implementation?.landSuitability?.suitable ? 'text-green-800' : 'text-red-800'}`}>
                      {selectedFacility.implementation?.landSuitability?.suitable ? 'Suitable' : 'Needs Assessment'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendation Note */}
              <div className="p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong className="text-blue-800">Recommendation:</strong>
                    <p className="text-blue-700 mt-1">
                      This location was selected based on population density, accessibility gaps, and optimization algorithms. 
                      Further site assessment and community consultation are recommended before implementation.
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
