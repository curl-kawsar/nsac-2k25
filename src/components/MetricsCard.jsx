'use client';


export default function MetricsCard({ title, icon: Icon, color, metrics }) {
  const colorClasses = {
    green: {
      bg: 'bg-green-500',
      text: 'text-green-600',
      light: 'bg-green-50 dark:bg-green-900',
      border: 'border-green-200 dark:border-green-700'
    },
    purple: {
      bg: 'bg-purple-500',
      text: 'text-purple-600',
      light: 'bg-purple-50 dark:bg-purple-900',
      border: 'border-purple-200 dark:border-purple-700'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-600',
      light: 'bg-red-50 dark:bg-red-900',
      border: 'border-red-200 dark:border-red-700'
    },
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      light: 'bg-blue-50 dark:bg-blue-900',
      border: 'border-blue-200 dark:border-blue-700'
    }
  };

  const colorClass = colorClasses[color] || colorClasses.blue;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border ${colorClass.border} transition-transform hover:scale-105`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className={`w-8 h-8 ${colorClass.bg} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="flex justify-between items-center transition-opacity duration-200"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {metric.label}
            </span>
            <span className={`text-sm font-semibold ${colorClass.text} dark:text-white`}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      {/* Trend Indicator */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>Real-time data</span>
          </div>
          <span className="ml-auto">
            Updated {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
