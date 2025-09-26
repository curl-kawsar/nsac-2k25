'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  MapIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

export default function WorkflowPanel({ activeWorkflow, workflowData, onAnalyze }) {
  const [analysisParams, setAnalysisParams] = useState({
    lat: 40.7128,
    lon: -74.0060,
    radius: 10
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const workflowConfigs = {
    overview: {
      title: 'System Overview',
      actions: [
        { id: 'refresh', label: 'Refresh Data', icon: PlayIcon },
        { id: 'settings', label: 'System Settings', icon: Cog6ToothIcon },
        { id: 'reports', label: 'Generate Report', icon: ChartBarIcon }
      ],
      parameters: []
    },
    waste: {
      title: 'Waste Management Analysis',
      actions: [
        { id: 'detect_dumps', label: 'Detect Illegal Dumps', icon: PlayIcon },
        { id: 'optimize_facilities', label: 'Optimize Facilities', icon: Cog6ToothIcon },
        { id: 'optimize_routes', label: 'Optimize Routes', icon: MapIcon }
      ],
      parameters: [
        { id: 'thermal_threshold', label: 'Thermal Threshold (°C)', type: 'number', value: 35, min: 25, max: 50 },
        { id: 'confidence_threshold', label: 'Confidence Threshold', type: 'number', value: 0.7, min: 0, max: 1, step: 0.1 },
        { id: 'max_facilities', label: 'Max New Facilities', type: 'number', value: 5, min: 1, max: 10 }
      ]
    },
    healthcare: {
      title: 'Healthcare Access Analysis',
      actions: [
        { id: 'analyze_access', label: 'Analyze Access', icon: PlayIcon },
        { id: 'optimize_placement', label: 'Optimize Placement', icon: Cog6ToothIcon },
        { id: 'emergency_prep', label: 'Emergency Planning', icon: ClockIcon }
      ],
      parameters: [
        { id: 'population_threshold', label: 'Population Threshold', type: 'number', value: 10000, min: 1000, max: 50000 },
        { id: 'access_time_threshold', label: 'Access Time (min)', type: 'number', value: 30, min: 15, max: 60 },
        { id: 'vulnerability_weight', label: 'Vulnerability Weight', type: 'number', value: 0.3, min: 0, max: 1, step: 0.1 }
      ]
    },
    airquality: {
      title: 'Air Quality Monitoring',
      actions: [
        { id: 'monitor_current', label: 'Monitor Current', icon: PlayIcon },
        { id: 'run_predictions', label: 'Run Predictions', icon: CpuChipIcon },
        { id: 'source_attribution', label: 'Source Attribution', icon: ChartBarIcon }
      ],
      parameters: [
        { id: 'aqi_threshold', label: 'AQI Alert Threshold', type: 'number', value: 150, min: 50, max: 300 },
        { id: 'prediction_hours', label: 'Prediction Hours', type: 'number', value: 24, min: 6, max: 72 },
        { id: 'ml_confidence', label: 'ML Confidence', type: 'number', value: 0.8, min: 0.5, max: 1, step: 0.1 }
      ]
    }
  };

  const currentConfig = workflowConfigs[activeWorkflow] || workflowConfigs.overview;

  const handleParameterChange = (parameterId, value) => {
    setAnalysisParams(prev => ({
      ...prev,
      [parameterId]: value
    }));
  };

  const handleAction = async (actionId) => {
    setIsAnalyzing(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const payload = {
        workflow: activeWorkflow,
        action: actionId,
        parameters: analysisParams,
        location: { lat: analysisParams.lat, lon: analysisParams.lon },
        radius: analysisParams.radius
      };
      
      onAnalyze && onAnalyze(payload);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-3">
          {workflowData?.icon && (
            <div className={`w-8 h-8 ${workflowData.color} rounded-lg flex items-center justify-center`}>
              <workflowData.icon className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentConfig.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {workflowData?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Location Parameters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Analysis Location
        </h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                Latitude
              </label>
              <input
                type="number"
                value={analysisParams.lat}
                onChange={(e) => handleParameterChange('lat', parseFloat(e.target.value))}
                step="0.0001"
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                Longitude
              </label>
              <input
                type="number"
                value={analysisParams.lon}
                onChange={(e) => handleParameterChange('lon', parseFloat(e.target.value))}
                step="0.0001"
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
              Radius (km)
            </label>
            <input
              type="number"
              value={analysisParams.radius}
              onChange={(e) => handleParameterChange('radius', parseFloat(e.target.value))}
              min="1"
              max="50"
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Workflow Parameters */}
      {currentConfig.parameters.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Analysis Parameters
          </h4>
          <div className="space-y-3">
            {currentConfig.parameters.map((param) => (
              <div key={param.id}>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                  {param.label}
                </label>
                <input
                  type={param.type}
                  value={analysisParams[param.id] || param.value}
                  onChange={(e) => handleParameterChange(param.id, 
                    param.type === 'number' ? parseFloat(e.target.value) : e.target.value
                  )}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Available Actions
        </h4>
        <div className="space-y-2">
          {currentConfig.actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAction(action.id)}
                disabled={isAnalyzing}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm text-left rounded-lg border transition-colors ${
                  isAnalyzing
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {isAnalyzing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
                  />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span>{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
            <span>{isAnalyzing ? 'Analyzing...' : 'Ready'}</span>
          </div>
          <span>NASA APIs Active</span>
        </div>
      </div>
    </div>
  );
}
