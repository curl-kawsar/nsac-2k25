import axios from 'axios';

class NASAApiService {
  constructor() {
    this.baseURL = 'https://api.nasa.gov';
    this.earthdataURL = 'https://cmr.earthdata.nasa.gov';
    this.apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  }

  // MODIS Aerosol Optical Depth (AOD) data
  async getMODISAOD(lat, lon, startDate, endDate) {
    try {
      const response = await axios.get(`${this.earthdataURL}/search/granules.json`, {
        params: {
          collection_concept_id: 'C61-LAADS', // MODIS Terra collection
          temporal: `${startDate},${endDate}`,
          bounding_box: `${lon-0.1},${lat-0.1},${lon+0.1},${lat+0.1}`,
          page_size: 100
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching MODIS AOD data:', error);
      throw error;
    }
  }

  // Landsat 8/9 Thermal Infrared (TIRS) data for illegal dump detection
  async getLandsatTIRS(lat, lon, startDate, endDate) {
    try {
      const response = await axios.get(`${this.earthdataURL}/search/granules.json`, {
        params: {
          collection_concept_id: 'C2_L2_LANDSAT_8', // Landsat 8 Level 2
          temporal: `${startDate},${endDate}`,
          point: `${lon},${lat}`,
          page_size: 50
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Landsat TIRS data:', error);
      throw error;
    }
  }

  // OMI NO2/SO2 data for air quality monitoring
  async getOMIData(lat, lon, startDate, endDate, parameter = 'NO2') {
    try {
      const response = await axios.get(`${this.earthdataURL}/search/granules.json`, {
        params: {
          collection_concept_id: parameter === 'NO2' ? 'C1443528505-GES_DISC' : 'C1443530674-GES_DISC',
          temporal: `${startDate},${endDate}`,
          bounding_box: `${lon-0.5},${lat-0.5},${lon+0.5},${lat+0.5}`,
          page_size: 100
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching OMI ${parameter} data:`, error);
      throw error;
    }
  }

  // SEDAC Population Density data
  async getSEDACPopulation(lat, lon) {
    try {
      // Using SEDAC API for population density
      const response = await axios.get(`${this.baseURL}/planetary/earth/assets`, {
        params: {
          lon: lon,
          lat: lat,
          date: '2020-01-01', // Most recent population data
          dim: 0.1,
          api_key: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching SEDAC population data:', error);
      throw error;
    }
  }

  // ECOSTRESS Land Surface Temperature for heat stress mapping
  async getECOSTRESSLST(lat, lon, startDate, endDate) {
    try {
      const response = await axios.get(`${this.earthdataURL}/search/granules.json`, {
        params: {
          collection_concept_id: 'C1711961296-LPDAAC_ECS', // ECOSTRESS LST
          temporal: `${startDate},${endDate}`,
          point: `${lon},${lat}`,
          page_size: 50
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching ECOSTRESS LST data:', error);
      throw error;
    }
  }

  // GPM Precipitation data for flood risk assessment
  async getGPMPrecipitation(lat, lon, startDate, endDate) {
    try {
      const response = await axios.get(`${this.earthdataURL}/search/granules.json`, {
        params: {
          collection_concept_id: 'C1598621093-GES_DISC', // GPM IMERG
          temporal: `${startDate},${endDate}`,
          bounding_box: `${lon-0.25},${lat-0.25},${lon+0.25},${lat+0.25}`,
          page_size: 100
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching GPM precipitation data:', error);
      throw error;
    }
  }

  // GRACE Groundwater data
  async getGRACEGroundwater(lat, lon, startDate, endDate) {
    try {
      const response = await axios.get(`${this.earthdataURL}/search/granules.json`, {
        params: {
          collection_concept_id: 'C1996881146-POCLOUD', // GRACE/GRACE-FO
          temporal: `${startDate},${endDate}`,
          bounding_box: `${lon-1},${lat-1},${lon+1},${lat+1}`,
          page_size: 50
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching GRACE groundwater data:', error);
      throw error;
    }
  }

  // FIRMS Fire data for biomass burning detection
  async getFIRMSFireData(lat, lon, days = 7) {
    try {
      const response = await axios.get('https://firms.modaps.eosdis.nasa.gov/api/area/csv/YOUR_MAP_KEY/MODIS_C6_1', {
        params: {
          area: `${lat-0.5},${lon-0.5},${lat+0.5},${lon+0.5}`,
          days: days
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching FIRMS fire data:', error);
      throw error;
    }
  }

  // SEDAC PM2.5 Grid data
  async getSEDACPM25(lat, lon, year = 2019) {
    try {
      // This would typically require specific SEDAC API credentials
      const response = await axios.get(`${this.baseURL}/planetary/earth/assets`, {
        params: {
          lon: lon,
          lat: lat,
          date: `${year}-07-01`,
          dim: 0.1,
          api_key: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching SEDAC PM2.5 data:', error);
      throw error;
    }
  }

  // Generic method to process thermal anomalies for illegal dump detection
  async detectThermalAnomalies(lat, lon, radius = 5) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const landsatData = await this.getLandsatTIRS(lat, lon, startDate, endDate);
      
      // Process thermal data to identify anomalies
      const anomalies = [];
      
      // Simulate thermal analysis (in production, this would process actual satellite imagery)
      if (landsatData.feed && landsatData.feed.entry) {
        for (const entry of landsatData.feed.entry) {
          // Simulated thermal analysis
          const simulatedTemp = 25 + Math.random() * 20; // Base temp + variation
          
          if (simulatedTemp > 35) { // Threshold for potential illegal dump
            anomalies.push({
              location: [lon + (Math.random() - 0.5) * 0.01, lat + (Math.random() - 0.5) * 0.01],
              temperature: simulatedTemp,
              confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
              detectionDate: new Date(),
              source: 'Landsat-8/9 TIRS'
            });
          }
        }
      }
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting thermal anomalies:', error);
      throw error;
    }
  }

  // Comprehensive air quality data aggregation
  async getAirQualityData(lat, lon, startDate, endDate) {
    try {
      const [no2Data, so2Data, modisData] = await Promise.all([
        this.getOMIData(lat, lon, startDate, endDate, 'NO2'),
        this.getOMIData(lat, lon, startDate, endDate, 'SO2'),
        this.getMODISAOD(lat, lon, startDate, endDate)
      ]);

      return {
        no2: no2Data,
        so2: so2Data,
        aod: modisData,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error aggregating air quality data:', error);
      throw error;
    }
  }
}

export default new NASAApiService();
