'use client';

import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export default function AlertsPanel({ alerts }) {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return ExclamationTriangleIcon;
      case 'warning':
        return ExclamationCircleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getSeverityColors = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          icon: 'text-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          icon: 'text-gray-500'
        };
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'waste_management':
        return 'Waste';
      case 'air_quality':
        return 'Air Quality';
      case 'healthcare':
        return 'Healthcare';
      default:
        return 'System';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Alerts
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {alerts.length} total
            </span>
            {alerts.some(alert => alert.severity === 'critical') && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-6 text-center">
            <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No active alerts
            </p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const Icon = getSeverityIcon(alert.severity);
            const colors = getSeverityColors(alert.severity);
            
            return (
              <div
                key={alert.id}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:${colors.bg} transition-colors`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Alert Icon */}
                    <div className={`flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>

                    {/* Alert Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
                            {getTypeLabel(alert.type)}
                          </span>
                          <span className={`text-xs font-medium ${colors.text}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {alert.title}
                      </h4>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {alert.message}
                      </p>

                      {/* Alert Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {alert.location && (
                          <button className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
                            View on map
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Mark all as read
            </button>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              View all alerts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
