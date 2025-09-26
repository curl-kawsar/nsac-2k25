'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  CloudIcon,
  ChartBarIcon,
  BellIcon,
  GlobeAltIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import DashboardMap from '@/components/DashboardMap';
import MetricsCard from '@/components/MetricsCard';
import AlertsPanel from '@/components/AlertsPanel';
import WorkflowPanel from '@/components/WorkflowPanel';

export default function CityWISEDashboard() {
  const [activeWorkflow, setActiveWorkflow] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
              >
                <CpuChipIcon className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  CityWISE
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  City Wellbeing Insights for Sustainable Expansion
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>System Operational</span>
              </div>
              
              <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <BellIcon className="w-6 h-6" />
                {dashboardData.alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {dashboardData.alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {workflows.map((workflow) => {
              const Icon = workflow.icon;
              return (
                <button
                  key={workflow.id}
                  onClick={() => setActiveWorkflow(workflow.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                    activeWorkflow === workflow.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{workflow.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel - Metrics & Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Key Metrics */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Key Metrics
              </h2>
              
              <MetricsCard
                title="Waste Management"
                icon={MapPinIcon}
                color="green"
                metrics={[
                  { label: 'Illegal Dumps', value: dashboardData.metrics.wasteManagement.illegalDumps },
                  { label: 'Efficiency', value: `${dashboardData.metrics.wasteManagement.efficiency}%` },
                  { label: 'Routes Optimized', value: dashboardData.metrics.wasteManagement.routesOptimized }
                ]}
              />
              
              <MetricsCard
                title="Air Quality"
                icon={CloudIcon}
                color="purple"
                metrics={[
                  { label: 'Average AQI', value: dashboardData.metrics.airQuality.averageAQI },
                  { label: 'Exceedance Days', value: dashboardData.metrics.airQuality.exceedanceDays },
                  { label: 'Predicted Improvement', value: `${dashboardData.metrics.airQuality.predictedImprovement}%` }
                ]}
              />
              
              <MetricsCard
                title="Healthcare Access"
                icon={HeartIcon}
                color="red"
                metrics={[
                  { label: 'Access Coverage', value: `${dashboardData.metrics.healthcare.accessCoverage}%` },
                  { label: 'Healthcare Deserts', value: dashboardData.metrics.healthcare.healthcareDeserts },
                  { label: 'Emergency Capacity', value: `${dashboardData.metrics.healthcare.emergencyCapacity}%` }
                ]}
              />
            </div>

            {/* Alerts Panel */}
            <AlertsPanel alerts={dashboardData.alerts} />
          </div>

          {/* Center Panel - Map */}
          <div className="lg:col-span-2">
            <DashboardMap
              activeWorkflow={activeWorkflow}
              alerts={dashboardData.alerts}
              onLocationSelect={(coords) => console.log('Location selected:', coords)}
            />
          </div>

          {/* Right Panel - Workflow Details */}
          <div className="lg:col-span-1">
            <WorkflowPanel
              activeWorkflow={activeWorkflow}
              workflowData={workflows.find(w => w.id === activeWorkflow)}
              onAnalyze={(params) => console.log('Analyze:', params)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
            <div>
              © 2024 CityWISE Platform - NASA Earth Observation Data Integration
            </div>
            <div className="flex space-x-4">
              <span>NASA API: {dashboardData.systemStatus.nasaApiStatus}</span>
              <span>ML Models: {dashboardData.systemStatus.mlModelsStatus}</span>
              <span>Database: {dashboardData.systemStatus.databaseStatus}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
