# CityWISE - City Wellbeing Insights for Sustainable Expansion

A comprehensive Next.js platform integrating NASA Earth observation data with AI analytics and interactive mapping dashboards for solving urban sustainability challenges.

## 🌍 Platform Overview

CityWISE provides real-time insights and optimization solutions for three critical urban challenges:

### 1. 🗂️ Waste Management Workflow
- **Thermal Anomaly Detection**: Uses Landsat 8/9 TIRS data to detect illegal dump sites (>35°C)
- **Population Correlation**: Overlays SEDAC population density data for impact assessment
- **Environmental Monitoring**: Integrates MODIS AOD and GRACE groundwater data
- **Facility Optimization**: Genetic Algorithm for optimal waste facility placement
- **Route Optimization**: Vehicle Routing Problem (VRP) solver for collection routes

**Deliverables:**
- ✅ Illegal Dump Alert System with GPS coordinates
- ✅ Facility placement recommendations with multi-objective optimization
- ✅ Route optimization dashboard with efficiency metrics
- ✅ Environmental contamination risk reports

### 2. 🏥 Healthcare Access Workflow
- **Demographic Analysis**: SEDAC socioeconomic & demographic datasets integration
- **Environmental Health Risks**: OMI NO₂/SO₂ data for respiratory risk assessment
- **Heat Stress Mapping**: ECOSTRESS LST for climate vulnerability
- **Flood Risk Assessment**: GPM precipitation data for emergency planning
- **Water Security Analysis**: GRACE water security data
- **Healthcare Desert Identification**: Areas with >10,000 people / >30 min access
- **Multi-objective Facility Optimization**: Considering accessibility, climate resilience, and vulnerable populations

**Deliverables:**
- ✅ Healthcare access maps with demographic overlays
- ✅ Facility placement optimization reports
- ✅ Emergency preparedness assessment plans
- ✅ Vulnerable population health risk profiles

### 3. 🌬️ Air Quality Workflow
- **Multi-source Data Fusion**: OMI NO₂, MODIS AOD, SEDAC PM2.5, FIRMS fire data
- **Machine Learning Predictions**: City-wide PM2.5 concentration estimation
- **Air Quality Index Calculation**: Real-time AQI with WHO threshold monitoring
- **Source Attribution**: Traffic vs. industry vs. biomass burning analysis
- **Real-time Alerts**: Automated notifications when WHO thresholds exceeded

**Deliverables:**
- ✅ City-wide air quality maps with real-time data
- ✅ Pollution source attribution reports
- ✅ Health risk assessments with population impact
- ✅ Policy intervention simulation tools
- ✅ Real-time early warning alert system

## 🚀 Technology Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Heroicons** - Icon library
- **Google Maps 3D** - Photorealistic 3D mapping with custom markers and models

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **MongoDB with Mongoose** - NoSQL database with ODM
- **NASA APIs Integration** - Earth observation data access
- **Machine Learning** - ML-Matrix for predictive modeling
- **Optimization Algorithms** - Genetic algorithms and VRP solvers

### External APIs & Data Sources
- **NASA EARTHDATA APIs** - Satellite data access
- **Landsat 8/9 TIRS** - Thermal infrared imagery
- **MODIS** - Aerosol Optical Depth data
- **OMI** - NO₂ and SO₂ atmospheric data
- **SEDAC** - Population and socioeconomic data
- **ECOSTRESS** - Land Surface Temperature
- **GPM** - Precipitation data
- **GRACE** - Groundwater data
- **FIRMS** - Fire data for biomass burning

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # API endpoints
│   │   ├── waste-management/   # Waste workflow APIs
│   │   ├── healthcare/         # Healthcare workflow APIs
│   │   └── air-quality/        # Air quality monitoring APIs
│   ├── globals.css            # Global styles
│   ├── layout.jsx             # Root layout with notifications
│   └── page.jsx               # Main dashboard
├── components/                # Reusable UI components
│   ├── DashboardMap.jsx       # Interactive map component
│   ├── MetricsCard.jsx        # Metrics display cards
│   ├── AlertsPanel.jsx        # Real-time alerts panel
│   └── WorkflowPanel.jsx      # Workflow control panel
├── lib/
│   └── database.js            # MongoDB connection
├── models/                    # Database schemas
│   ├── WasteManagement.js     # Waste-related data models
│   ├── Healthcare.js          # Healthcare data models
│   ├── AirQuality.js          # Air quality data models
│   └── User.js                # User and alert models
└── services/                  # Core business logic
    ├── nasaApi.js             # NASA API integration
    ├── optimizationService.js # Genetic algorithms & VRP
    └── mlService.js           # Machine learning models
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB instance (local or cloud)
- NASA EARTHDATA account (for production API keys)

### 1. Install Dependencies
```bash
npm install
```

### 2. Google Maps API Setup
For the 3D mapping features, you'll need a Google Maps API key:

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs**:
   - Enable "Maps JavaScript API"
   - Enable "Maps 3D API (Preview)"

3. **Create API Key**:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the key to your domain for security

4. **Create Map ID**:
   - Go to [Map Management](https://console.cloud.google.com/google/maps-apis/studio/maps)
   - Create a new Map ID with 3D enabled
   - Note the Map ID for configuration

### 3. Environment Setup
Create a `.env.local` file in your project root:

```env
# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Optional - for production
MONGODB_URI=mongodb://localhost:27017/citywise
NASA_API_KEY=your_nasa_api_key
EARTHDATA_USERNAME=your_username
EARTHDATA_PASSWORD=your_password
```

**Note**: The platform works with demo data if no API keys are provided, but 3D mapping requires a valid Google Maps API key.

### 4. Run Development Server
```bash
npm run dev
```

Access the platform at `http://localhost:3000`

## 🎯 Key Features

### Interactive Dashboard
- **Multi-workflow Navigation**: Switch between waste, healthcare, and air quality analyses
- **Real-time Metrics**: Live updates from NASA APIs and ML models
- **Alert System**: Immediate notifications for critical issues
- **3D Photorealistic Mapping**: Immersive Google Maps 3D visualization with custom camera controls

### 🌍 3D Mapping Capabilities
Based on [Google Maps Platform 3D documentation](https://developers.google.com/maps/documentation/javascript/3d/overview), CityWISE features:

#### Advanced 3D Visualization
- **Photorealistic 3D Rendering**: High-fidelity urban visualization
- **Custom 3D Markers**: NASA data points with altitude-aware positioning
- **3D Building Models**: Waste facilities, hospitals, and infrastructure
- **Dynamic Camera Controls**: Default, overhead, street, and bird's eye views
- **Workflow-Specific Layers**: Contextual data overlays for each analysis type

#### 3D Features by Workflow
- **Waste Management**: 3D facility models, thermal anomaly columns, route polylines
- **Healthcare Access**: Hospital buildings, clinic markers, healthcare desert polygons  
- **Air Quality**: AQI measurement columns, pollution source markers, dispersion zones
- **Overview Mode**: Combined visualization of all urban systems

#### Interactive 3D Elements
- **Click-to-Analyze**: Select any location for detailed analysis
- **Animated Transitions**: Smooth camera movements between viewpoints
- **Real-time Updates**: Live NASA data integration with 3D visualization
- **Performance Optimized**: Efficient rendering for complex urban datasets

### Advanced Analytics
- **Genetic Algorithm Optimization**: Multi-objective facility placement
- **Machine Learning Predictions**: PM2.5 concentration forecasting  
- **Source Attribution**: Pollution source identification
- **Risk Assessment**: Environmental health impact scoring

### Real-time Monitoring
- **Thermal Anomaly Detection**: Automated illegal dump identification
- **Air Quality Alerts**: WHO threshold exceedance notifications
- **Healthcare Desert Identification**: Underserved population detection
- **Emergency Preparedness**: Climate resilience assessment

## 📊 API Endpoints

### Waste Management
- `POST /api/waste-management/detect-dumps` - Detect thermal anomalies
- `POST /api/waste-management/optimize-facilities` - Optimize facility placement  
- `POST /api/waste-management/optimize-routes` - VRP route optimization

### Healthcare Access
- `POST /api/healthcare/analyze-access` - Comprehensive access analysis
- `GET /api/healthcare/analyze-access` - Retrieve access data

### Air Quality
- `POST /api/air-quality/monitor` - Real-time air quality monitoring
- `GET /api/air-quality/monitor` - Historical air quality data

## 🧠 Machine Learning Models

### PM2.5 Prediction Model
- **Features**: AOD, NO₂, SO₂, meteorology, land use, demographics
- **Algorithm**: Linear regression with feature normalization
- **Accuracy**: Validated against ground station data
- **Update Frequency**: Real-time with satellite data refresh

### Air Quality Index Calculation
- **Standards**: US EPA AQI with WHO guidelines integration
- **Multi-pollutant**: PM2.5, PM10, NO₂, SO₂, CO, O₃
- **Health Messages**: Automated recommendations by category

### Source Attribution Algorithm
- **Traffic Attribution**: NO₂/PM ratio analysis with road density
- **Industrial Sources**: SO₂ levels and industrial land use correlation
- **Biomass Burning**: FIRMS fire data integration with PM/CO ratios
- **Meteorological Factors**: Wind speed and atmospheric stability

## 🔬 Optimization Algorithms

### Genetic Algorithm for Facility Placement
- **Population Size**: 50 solutions
- **Generations**: 100 iterations
- **Mutation Rate**: 30%
- **Crossover Rate**: 70%
- **Fitness Factors**: Population coverage, cost efficiency, environmental impact, accessibility

### Vehicle Routing Problem (VRP) Solver
- **Algorithm**: Nearest neighbor with capacity constraints
- **Constraints**: Vehicle capacity, time windows, fuel efficiency
- **Optimization Goals**: Minimize distance, time, and operational cost

## 🌐 NASA Data Integration

### Real-time Data Streams
- **Landsat 8/9**: Thermal infrared for illegal dump detection
- **MODIS**: Aerosol optical depth for air quality
- **OMI**: NO₂ and SO₂ atmospheric measurements
- **ECOSTRESS**: Land surface temperature for heat stress
- **GPM**: Precipitation for flood risk assessment
- **GRACE**: Groundwater monitoring for water security
- **FIRMS**: Active fire detection for biomass burning

### Data Processing Pipeline
1. **API Integration**: Automated NASA EARTHDATA queries
2. **Quality Control**: Data validation and filtering
3. **Spatial Processing**: Geographic coordinate alignment
4. **Temporal Fusion**: Multi-source data synchronization
5. **Machine Learning**: Predictive model input preparation
6. **Alert Generation**: Threshold-based notification system

## 📈 System Performance

### Scalability Features
- **Database Indexing**: Geospatial 2dsphere indexes for location queries
- **API Rate Limiting**: Prevents NASA API quota exhaustion
- **Caching Strategy**: Optimized data refresh intervals
- **Async Processing**: Non-blocking analysis workflows
- **Real-time Updates**: WebSocket integration ready

### Monitoring & Alerts
- **System Health**: NASA API, ML models, database status monitoring
- **Performance Metrics**: Response times, success rates, data freshness
- **Alert Escalation**: Severity-based notification routing
- **Audit Trail**: Complete analysis history and decision logging

## 🔮 Future Enhancements

### Planned Features
- **Advanced ML Models**: Deep learning for pollution prediction
- **Satellite Imagery Analysis**: Computer vision for urban change detection
- **IoT Integration**: Ground sensor data fusion
- **Mobile Applications**: Field data collection and alerts
- **Policy Simulation**: Economic impact modeling
- **International Expansion**: Multi-city deployment framework

### Research Opportunities
- **Climate Change Adaptation**: Long-term urban resilience planning
- **Social Equity Analysis**: Environmental justice mapping
- **Economic Optimization**: Cost-benefit analysis integration
- **Behavioral Modeling**: Citizen response prediction
- **Interdisciplinary Collaboration**: Urban planning, public health, environmental science

## 🏆 Impact & Benefits

### For City Planners
- **Data-driven Decisions**: Evidence-based urban development
- **Resource Optimization**: Efficient infrastructure investment
- **Risk Assessment**: Proactive hazard identification
- **Stakeholder Engagement**: Transparent public information

### For Public Health
- **Disease Prevention**: Environmental health risk reduction
- **Emergency Preparedness**: Climate-resilient healthcare systems
- **Health Equity**: Vulnerable population protection
- **Policy Advocacy**: Science-based health interventions

### For Environmental Management
- **Pollution Control**: Source identification and mitigation
- **Waste Reduction**: Optimized collection and processing
- **Climate Monitoring**: Long-term environmental tracking
- **Sustainability Metrics**: Progress measurement and reporting

## 📝 License

This project is part of the NASA Space Apps Challenge 2024. Built for urban sustainability and public good.

## 🤝 Contributing

CityWISE is designed for collaborative urban sustainability research. The platform provides a foundation for integrating multiple NASA Earth observation datasets with AI analytics for solving real-world urban challenges.

---

**CityWISE** - Transforming cities through Earth observation data, artificial intelligence, and sustainable urban planning. 🌍🏙️🚀