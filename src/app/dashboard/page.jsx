'use client';

import { useState, useEffect } from 'react';
import {
  MapPinIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  CloudIcon,
  ChartBarIcon,
  BellIcon,
  GlobeAltIcon,
  CpuChipIcon,
  FireIcon,
  BuildingOfficeIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import LeafletMap from '@/components/LeafletMap';
import MetricsCard from '@/components/MetricsCard';
import AlertsPanel from '@/components/AlertsPanel';
import WorkflowPanel from '@/components/WorkflowPanel';

export default function CityWISEDashboard() {
  const [activeWorkflow, setActiveWorkflow] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [thermalDetectionResults, setThermalDetectionResults] = useState(null);
  const [airQualityResults, setAirQualityResults] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    alerts: [],
    metrics: {},
    systemStatus: {}
  });

  useEffect(() => {
    // Initialize dashboard
    const initializeDashboard = async () => {
      try {
        // Simulate loading dashboard data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setDashboardData({
          alerts: [
            {
              id: 1,
              type: 'waste_management',
              severity: 'critical',
              title: 'Illegal Dump Detected',
              message: 'Thermal anomaly detected at 42.3°C',
              timestamp: new Date(),
              location: [40.7128, -74.0060]
            },
            {
              id: 2,
              type: 'air_quality',
              severity: 'warning',
              title: 'AQI Exceeds 150',
              message: 'PM2.5 levels unhealthy for sensitive groups',
              timestamp: new Date(Date.now() - 30 * 60 * 1000),
              location: [40.7580, -73.9855]
            },
            {
              id: 3,
              type: 'healthcare',
              severity: 'info',
              title: 'Healthcare Desert Identified',
              message: '15,000 residents with >30min access time',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              location: [40.6892, -74.0445]
            }
          ],
          metrics: {
            wasteManagement: {
              illegalDumps: 23,
              facilitiesOptimized: 5,
              routesOptimized: 12,
              efficiency: 87
            },
            airQuality: {
              averageAQI: 95,
              exceedanceDays: 8,
              predictedImprovement: 15,
              sourcesAttributed: 156
            },
            healthcare: {
              accessCoverage: 78,
              healthcareDeserts: 6,
              emergencyCapacity: 92,
              riskScore: 34
            }
          },
          systemStatus: {
            nasaApiStatus: 'operational',
            mlModelsStatus: 'operational',
            databaseStatus: 'operational',
            lastUpdate: new Date()
          }
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  const workflows = [
    {
      id: 'overview',
      name: 'Overview',
      icon: GlobeAltIcon,
      color: 'bg-blue-500',
      description: 'System overview and key metrics'
    },
    {
      id: 'waste',
      name: 'Waste Management',
      icon: MapPinIcon,
      color: 'bg-green-500',
      description: 'Illegal dump detection and facility optimization'
    },
    {
      id: 'healthcare',
      name: 'Healthcare Access',
      icon: HeartIcon,
      color: 'bg-red-500',
      description: 'Access analysis and facility placement'
    },
    {
      id: 'airquality',
      name: 'Air Quality',
      icon: CloudIcon,
      color: 'bg-purple-500',
      description: 'Monitoring, predictions, and alerts'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header with Shadcn UI */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <CpuChipIcon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">CityWISE</h1>
                  <p className="text-xs text-muted-foreground">Urban Intelligence Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                System Active
              </Badge>
              <Button variant="ghost" size="icon" className="relative">
                <BellIcon className="h-5 w-5" />
                {dashboardData.alerts.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    {dashboardData.alerts.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Navigation with Tabs */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeWorkflow} onValueChange={setActiveWorkflow} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:inline-flex h-12">
              {workflows.map((workflow) => {
                const Icon = workflow.icon;
                return (
                  <TabsTrigger
                    key={workflow.id}
                    value={workflow.id}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{workflow.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Modern Metrics Cards */}
          <div className="lg:col-span-1 space-y-4">
            {/* Waste Management Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrashIcon className="h-4 w-4 text-green-600" />
                  Waste Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Illegal Dumps</span>
                  <Badge variant="secondary">{dashboardData.metrics.wasteManagement.illegalDumps}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Efficiency</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {dashboardData.metrics.wasteManagement.efficiency}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Routes Optimized</span>
                  <Badge variant="secondary">{dashboardData.metrics.wasteManagement.routesOptimized}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Air Quality Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CloudIcon className="h-4 w-4 text-purple-600" />
                  Air Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average AQI</span>
                  <Badge variant="secondary">{dashboardData.metrics.airQuality.averageAQI}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Exceedance Days</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    {dashboardData.metrics.airQuality.exceedanceDays}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Improvement</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    +{dashboardData.metrics.airQuality.predictedImprovement}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Healthcare Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartIcon className="h-4 w-4 text-red-600" />
                  Healthcare Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Coverage</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {dashboardData.metrics.healthcare.accessCoverage}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Health Deserts</span>
                  <Badge variant="secondary">{dashboardData.metrics.healthcare.healthcareDeserts}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Emergency Cap.</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {dashboardData.metrics.healthcare.emergencyCapacity}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* System Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CpuChipIcon className="h-4 w-4 text-blue-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">NASA API</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Thermal Detection</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Ready
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Map Services</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Online
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Thermal Detection Results */}
            {thermalDetectionResults && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FireIcon className="h-4 w-4 text-orange-600" />
                    Latest Detection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Thermal Spots</span>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {thermalDetectionResults.detectedDumps}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Search Area</span>
                    <Badge variant="secondary">
                      {thermalDetectionResults.searchArea?.radius || 50}km
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Complete
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Air Quality Results */}
            {airQualityResults && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CloudIcon className="h-4 w-4 text-blue-600" />
                    Latest Air Quality
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">AQI</span>
                    <Badge variant="outline" className={`${
                      airQualityResults.aqi <= 50 ? 'bg-green-50 text-green-700 border-green-200' :
                      airQualityResults.aqi <= 100 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      airQualityResults.aqi <= 150 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {airQualityResults.aqi}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge variant="secondary">
                      {airQualityResults.category}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Driver</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {airQualityResults.driver}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Location</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {airQualityResults.city}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Panel - Interactive Map */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  Interactive Map
                </CardTitle>
                <CardDescription>
                  Real-time thermal detection and urban analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] lg:h-[700px] rounded-lg overflow-hidden">
                  <LeafletMap
                    activeWorkflow={activeWorkflow}
                    alerts={dashboardData.alerts}
                    thermalDetectionResults={thermalDetectionResults}
                    airQualityResults={airQualityResults}
                    onLocationSelect={(coords) => console.log('Location selected:', coords)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Workflow Controls */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5" />
                  Workflow Controls
                </CardTitle>
                <CardDescription>
                  {workflows.find(w => w.id === activeWorkflow)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <WorkflowPanel
                  activeWorkflow={activeWorkflow}
                  workflowData={workflows.find(w => w.id === activeWorkflow)}
                  onAnalyze={(params) => {
                    console.log('Analyze:', params);
                    // Handle thermal detection results
                    if (params.action === 'thermal_detection_results') {
                      setThermalDetectionResults(params.results);
                    }
                    // Handle air quality detection results
                    if (params.action === 'air_quality_results') {
                      setAirQualityResults(params.results);
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">CityWISE Platform</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs text-muted-foreground">NASA Earth Observation Integration</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                NASA API: {dashboardData.systemStatus.nasaApiStatus}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                ML Models: {dashboardData.systemStatus.mlModelsStatus}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Database: {dashboardData.systemStatus.databaseStatus}
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              © 2024 CityWISE Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
