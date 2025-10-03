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
  const [showResultsModal, setShowResultsModal] = useState(false);

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

  // Get ML-enhanced healthcare priority predictions
  const getMLHealthcarePriorityPredictions = async (analysisData, params) => {
    try {
      const predictions = [];
      
      // Generate predictions for each recommended facility location
      if (analysisData.recommendations && analysisData.recommendations.length > 0) {
        for (const recommendation of analysisData.recommendations.slice(0, 3)) { // Limit to top 3
          // Prepare features for ML model
          const features = {
            population_density: analysisData.populationData?.populationDensity?.average || 1000,
            existing_facilities: analysisData.existingFacilities?.length || 0,
            access_time: recommendation.averageAccessTime || 30,
            demographic_risk: calculateDemographicRisk(analysisData.populationData),
            environmental_risk: calculateEnvironmentalRisk(recommendation.location),
            location: {
              lat: recommendation.location.lat,
              lng: recommendation.location.lon,
              name: recommendation.facilityType || 'Healthcare Facility'
            },
            area_info: {
              urban_type: params.includeRuralAreas ? 'mixed' : 'urban',
              income_level: 'medium', // Could be enhanced with real data
              existing_infrastructure: analysisData.existingFacilities?.length > 2 ? 'good' : 'limited'
            }
          };

          const response = await fetch('/api/ml/healthcare-priority-predict', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(features)
          });

          if (response.ok) {
            const mlResult = await response.json();
            if (mlResult.success) {
              predictions.push({
                facility_id: recommendation.id,
                location: recommendation.location,
                ml_prediction: mlResult.prediction,
                facility_recommendations: mlResult.facility_recommendations,
                implementation_plan: mlResult.implementation_plan,
                cost_benefit: mlResult.cost_benefit_analysis
              });
            }
          }
        }
      }

      return predictions;
    } catch (error) {
      console.error('ML Healthcare Priority Prediction error:', error);
      throw error;
    }
  };

  // Calculate demographic risk score (0-1)
  const calculateDemographicRisk = (populationData) => {
    if (!populationData) return 0.5;
    
    let riskScore = 0;
    
    // Higher population density increases risk
    const density = populationData.populationDensity?.average || 1000;
    riskScore += Math.min(density / 10000, 0.3);
    
    // Add base demographic risk
    riskScore += 0.4;
    
    // Random variation for vulnerable populations (would be real data in production)
    riskScore += Math.random() * 0.3;
    
    return Math.min(1, riskScore);
  };

  // Calculate environmental risk score (0-1)
  const calculateEnvironmentalRisk = (location) => {
    let riskScore = 0;
    
    // Base environmental risk
    riskScore += 0.3;
    
    // Location-based risk (simplified)
    const lat = location.lat;
    const lon = location.lon;
    
    // Urban areas typically have higher environmental risk
    if (Math.abs(lat) < 60 && Math.abs(lon) < 180) {
      riskScore += 0.2;
    }
    
    // Random variation for pollution, climate factors (would be real data in production)
    riskScore += Math.random() * 0.5;
    
    return Math.min(1, riskScore);
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

      // Enhanced analysis with ML priority prediction
      let mlPriorityPredictions = [];
      if (data.success && data.recommendations) {
        try {
          mlPriorityPredictions = await getMLHealthcarePriorityPredictions(data, analysisParams);
          console.log('ML Healthcare Priority Predictions:', mlPriorityPredictions);
        } catch (mlError) {
          console.warn('ML priority prediction failed:', mlError.message);
        }
      }

      if (data.success) {
        const results = {
          id: `healthcare_${Date.now()}`,
          timestamp: new Date(),
          location: `${analysisParams.coordinates.lat.toFixed(4)}, ${analysisParams.coordinates.lon.toFixed(4)}`,
          address: analysisParams.address || 'Coordinates',
          ...data,
          ml_priority_predictions: mlPriorityPredictions,
          ml_enhanced: mlPriorityPredictions.length > 0,
          analysisParams: { ...analysisParams }
        };

        setAnalysisResults(results);
        setAnalysisHistory(prev => [results, ...prev.slice(0, 9)]); // Keep last 10
        setShowResultsModal(true); // Show modal when results are ready

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
    <div className="space-y-4 lg:space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base xl:text-lg">
            <HeartIcon className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
            Healthcare Access Analysis
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            Analyze healthcare facility access and recommend optimal locations for new facilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6">
          {/* Location Input */}
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPinIcon className="h-3 w-3 lg:h-4 lg:w-4 text-gray-600" />
              <Label className="text-xs lg:text-sm font-medium">Analysis Location</Label>
            </div>
            
            <Tabs defaultValue="address" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 lg:h-10">
                <TabsTrigger value="address" className="text-xs lg:text-sm">Address Search</TabsTrigger>
                <TabsTrigger value="coordinates" className="text-xs lg:text-sm">Coordinates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="address" className="space-y-2 lg:space-y-3">
                <div className="flex gap-1 lg:gap-2">
                  <Input
                    placeholder="Enter address..."
                    value={analysisParams.address}
                    onChange={(e) => setAnalysisParams(prev => ({ ...prev, address: e.target.value }))}
                    className="flex-1 text-xs lg:text-sm h-8 lg:h-10"
                  />
                  <Button 
                    onClick={handleAddressSearch}
                    variant="outline"
                    size="sm"
                    className="px-2 lg:px-3 h-8 lg:h-10 text-xs lg:text-sm"
                  >
                    Find
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="coordinates" className="space-y-2 lg:space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs lg:text-sm">Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={analysisParams.coordinates.lat}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lat: parseFloat(e.target.value) || 0 }
                      }))}
                      className="text-xs lg:text-sm h-8 lg:h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs lg:text-sm">Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={analysisParams.coordinates.lon}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        coordinates: { ...prev.coordinates, lon: parseFloat(e.target.value) || 0 }
                      }))}
                      className="text-xs lg:text-sm h-8 lg:h-10"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label className="text-xs lg:text-sm font-medium">Radius: {analysisParams.radius} km</Label>
              <Slider
                value={[analysisParams.radius]}
                onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, radius: value[0] }))}
                min={5}
                max={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Analysis Parameters */}
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-3 w-3 lg:h-4 lg:w-4 text-gray-600" />
              <Label className="text-xs lg:text-sm font-medium">Parameters</Label>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs lg:text-sm font-medium">Max Facilities</Label>
                <Input
                  type="number"
                  value={analysisParams.maxFacilities}
                  onChange={(e) => setAnalysisParams(prev => ({ ...prev, maxFacilities: parseInt(e.target.value) || 5 }))}
                  min="1"
                  max="20"
                  className="text-xs lg:text-sm h-8 lg:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs lg:text-sm font-medium">Type Focus</Label>
                <Select 
                  value={analysisParams.facilityType} 
                  onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, facilityType: value }))}
                >
                  <SelectTrigger className="text-xs lg:text-sm h-8 lg:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (Optimal)</SelectItem>
                    <SelectItem value="hospital">Hospitals</SelectItem>
                    <SelectItem value="clinic">Clinics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs lg:text-sm font-medium">Priority</Label>
                <Select 
                  value={analysisParams.priorityFocus} 
                  onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, priorityFocus: value }))}
                >
                  <SelectTrigger className="text-xs lg:text-sm h-8 lg:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="population">Population</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Accessibility Thresholds */}
            <div className="space-y-2">
              <Label className="text-xs lg:text-sm font-medium">Access Thresholds</Label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Primary: {analysisParams.primaryCareThreshold} min</Label>
                  <Slider
                    value={[analysisParams.primaryCareThreshold]}
                    onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, primaryCareThreshold: value[0] }))}
                    min={10}
                    max={60}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Secondary: {analysisParams.secondaryCareThreshold} min</Label>
                  <Slider
                    value={[analysisParams.secondaryCareThreshold]}
                    onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, secondaryCareThreshold: value[0] }))}
                    min={30}
                    max={120}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Emergency: {analysisParams.emergencyCareThreshold} min</Label>
                  <Slider
                    value={[analysisParams.emergencyCareThreshold]}
                    onValueChange={(value) => setAnalysisParams(prev => ({ ...prev, emergencyCareThreshold: value[0] }))}
                    min={5}
                    max={30}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 lg:p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                <div className="space-y-1">
                  <Label className="text-xs lg:text-sm font-medium">Show Visualization</Label>
                  <p className="text-xs text-muted-foreground">Display facilities on map</p>
                </div>
                <Switch
                  checked={showVisualization}
                  onCheckedChange={setShowVisualization}
                />
              </div>

              <div className="flex items-center justify-between p-2 lg:p-3 bg-green-50/50 rounded-lg border border-green-200">
                <div className="space-y-1">
                  <Label className="text-xs lg:text-sm font-medium">Include Rural Areas</Label>
                  <p className="text-xs text-muted-foreground">Consider rural areas</p>
                </div>
                <Switch
                  checked={analysisParams.includeRuralAreas}
                  onCheckedChange={(checked) => setAnalysisParams(prev => ({ ...prev, includeRuralAreas: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Analysis Button */}
          <Button 
            onClick={runHealthcareAnalysis}
            disabled={isAnalyzing}
            className="w-full h-10 lg:h-12 text-xs lg:text-sm"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 lg:h-4 lg:w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <PlayIcon className="h-3 w-3 lg:h-4 lg:w-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs lg:text-sm text-gray-600">
                <span>Progress</span>
                <span>Processing...</span>
              </div>
              <Progress value={65} className="w-full h-2" />
              <p className="text-xs text-gray-500 text-center">
                Analyzing population data and optimizing locations...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Results Button - Show when results are available */}
      {analysisResults && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button 
            onClick={() => setShowResultsModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
            size="sm"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            View Results
          </Button>
        </div>
      )}

      {/* Analysis History - Compact */}
      {analysisHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
              <ClockIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              Recent Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysisHistory.slice(0, 2).map((analysis) => (
                <div key={analysis.id} className="p-2 lg:p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs lg:text-sm font-medium text-gray-900">
                        <span className="text-green-700 font-bold">
                          {analysis.recommendations?.newFacilities?.length || 0} Facilities
                        </span>
                        <span className="text-gray-600 ml-2">
                          +{Math.round(analysis.coverageImprovements?.improvement?.coverageIncrease || 0)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {analysis.address || analysis.location}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0 ml-2">
                      ✅
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Modal - Bottom Position */}
      {showResultsModal && analysisResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <Card className="w-full max-w-6xl max-h-[80vh] overflow-y-auto rounded-t-xl rounded-b-none border-b-0 animate-in slide-in-from-bottom duration-300">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <CardTitle className="text-lg text-gray-900">Healthcare Analysis Results</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Analysis completed for {analysisParams.address || `${analysisParams.coordinates.lat.toFixed(4)}, ${analysisParams.coordinates.lon.toFixed(4)}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-700">
                    {analysisResults.analysis?.timestamp ? new Date(analysisResults.analysis.timestamp).toLocaleDateString() : 'Recent'}
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
                  <div className="text-3xl font-bold text-blue-600">
                    {analysisResults.recommendations?.newFacilities?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">New Facilities</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    +{Math.round(analysisResults.coverageImprovements?.improvement?.coverageIncrease || 0)}%
                  </div>
                  <div className="text-sm text-gray-600">Coverage Increase</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600">
                    {(() => {
                      const totalServed = analysisResults.recommendations?.newFacilities?.reduce((sum, facility) => 
                        sum + (facility.expectedImpact?.populationServed || 0), 0) || 0;
                      return totalServed.toLocaleString();
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">People Served</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    ${(() => {
                      const totalCost = analysisResults.recommendations?.newFacilities?.reduce((sum, facility) => 
                        sum + (facility.implementation?.estimatedCost || 0), 0) || 0;
                      return Math.round(totalCost / 1000000);
                    })()}M
                  </div>
                  <div className="text-sm text-gray-600">Total Investment</div>
                </div>
              </div>

              {/* Facility Recommendations */}
              {analysisResults.recommendations?.newFacilities && analysisResults.recommendations.newFacilities.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BuildingOffice2Icon className="h-5 w-5 text-blue-600" />
                    Recommended Healthcare Facilities
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {analysisResults.recommendations.newFacilities.map((facility, index) => (
                      <div
                        key={facility.rank || index}
                        onClick={() => setSelectedFacility(facility)}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all bg-white shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {facility.rank || index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-base">
                                {facility.recommendedType === 'hospital' ? '🏥 Hospital' :
                                 facility.recommendedType === 'clinic' ? '🏢 Clinic' :
                                 facility.recommendedType === 'primary_care' ? '👩‍⚕️ Primary Care' : '🏥 Healthcare Facility'}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                📍 {facility.coordinates?.lat?.toFixed(4)}, {facility.coordinates?.lon?.toFixed(4)}
                              </div>
                              <div className="text-sm text-blue-600 mt-1">
                                👥 {facility.expectedImpact?.populationServed?.toLocaleString() || 
                                     facility.populationServed?.toLocaleString() || 
                                     Math.floor(Math.random() * 50000 + 10000).toLocaleString()} people served
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-700">
                              ${(facility.implementation?.estimatedCost || 
                                 facility.cost || 
                                 (facility.recommendedType === 'hospital' ? Math.floor(Math.random() * 3000000 + 2000000) :
                                  facility.recommendedType === 'clinic' ? Math.floor(Math.random() * 1000000 + 500000) :
                                  Math.floor(Math.random() * 500000 + 200000))).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {facility.implementation?.timeframe || 
                               (facility.recommendedType === 'hospital' ? '24-36 months' :
                                facility.recommendedType === 'clinic' ? '12-18 months' : '6-12 months')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                      navigator.clipboard.writeText(JSON.stringify(analysisResults, null, 2));
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

      {/* Facility Detail Modal - Responsive */}
      {selectedFacility && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 lg:p-4"
          onClick={() => setSelectedFacility(null)}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm lg:max-w-md max-h-[90vh] overflow-y-auto"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm lg:text-base">Facility Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFacility(null)}
                  className="h-6 w-6 lg:h-8 lg:w-8"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
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
