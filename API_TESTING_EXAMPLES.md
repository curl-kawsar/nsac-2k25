# City-Level AQI API - Testing Examples

## API Endpoint
`GET /api/airquality`

## Required Parameters
- `date`: Date in YYYY-MM-DD format
- `city`: City name (required unless bbox is provided)
- `bbox`: Bounding box in format `minLon,minLat,maxLon,maxLat` (optional)

## Example Requests

### 1. Basic City Request
```bash
GET /api/airquality?city=Dhaka&date=2025-01-02
```

### 2. City with Specific Date
```bash
GET /api/airquality?city=New York&date=2024-12-15
```

### 3. Using Bounding Box (Skip Geocoding)
```bash
GET /api/airquality?bbox=90.3563,23.7461,90.4563,23.8461&date=2025-01-02
```

### 4. International Cities
```bash
GET /api/airquality?city=Beijing&date=2025-01-02
GET /api/airquality?city=London&date=2025-01-02
GET /api/airquality?city=Mumbai&date=2025-01-02
```

## Expected Response Format

```json
{
  "city": "Dhaka",
  "date": "2025-01-02",
  "bbox": "90.3563,23.7461,90.4563,23.8461",
  "metrics": {
    "pm25": 45.3,
    "o3": 19.8,
    "no2": 16.2
  },
  "aqi": 85,
  "driver": "PM2.5",
  "category": "Moderate",
  "meta": {
    "source": "NASA Harmony",
    "collection": "C1276812863-GES_DISC",
    "vars": ["PM25_RH35_GCC", "O3", "NO2"],
    "cached": false,
    "timestamp": "2025-01-02T10:30:00.000Z"
  }
}
```

## Error Responses

### 400 - Bad Request
```json
{
  "error": "Missing required parameter: date (format: YYYY-MM-DD)"
}
```

### 400 - Location Not Found
```json
{
  "error": "Location not found",
  "message": "City \"InvalidCity\" not found",
  "suggestion": "Please check the city name or provide a valid bbox parameter"
}
```

### 501 - Data Not Available
```json
{
  "error": "Data Not Available",
  "message": "No air quality data available for the specified date and location",
  "suggestion": "Try a different date or location. NASA data may not be available for all regions and dates."
}
```

### 502 - NASA API Error
```json
{
  "error": "NASA API Error",
  "message": "Unable to retrieve air quality data from NASA services",
  "details": "Request timeout",
  "suggestion": "Please try again later or contact support if the issue persists"
}
```

## Features Implemented

✅ **City Geocoding**: Converts city names to bounding boxes using OSM Nominatim
✅ **Caching**: In-memory cache for city geocoding results
✅ **NASA Integration**: Uses CMR Search API and Harmony API
✅ **Multiple Collections**: Supports GEOS-CF and MERRA-2 data
✅ **AQI Calculation**: US EPA standard with breakpoint tables
✅ **Pollutant Processing**: 
  - PM2.5: 24-hour mean
  - O3: 8-hour rolling max (simplified to daily max)
  - NO2: 1-hour maximum
✅ **Unit Conversion**: Converts ppb to µg/m³ where needed
✅ **Error Handling**: Comprehensive error responses
✅ **Response Caching**: 1-hour revalidation period
✅ **Fallback Data**: Simulated data when NASA APIs are unavailable

## NASA Data Sources

1. **GEOS-CF** (Primary): GEOS Composition Forecast
   - Variables: PM25_RH35_GCC, O3, NO2
   - Collection ID: C1276812863-GES_DISC

2. **MERRA-2** (Fallback): Modern-Era Retrospective Analysis
   - Variables: DUSMASS25, O3, NO2
   - Collection ID: C1276812900-GES_DISC

## AQI Calculation Method

Uses US EPA AQI breakpoint tables for:
- **PM2.5**: 0-500 scale with 7 breakpoints
- **O3**: 0-300 scale with 5 breakpoints  
- **NO2**: 0-500 scale with 7 breakpoints

Final AQI = Maximum of all pollutant sub-indices
Driver = Pollutant with highest sub-index

## Testing the API

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Test with curl:
   ```bash
   curl "http://localhost:3000/api/airquality?city=Dhaka&date=2025-01-02"
   ```

3. Or use a browser/Postman:
   ```
   http://localhost:3000/api/airquality?city=London&date=2025-01-02
   ```

## Environment Variables Required

```env
NASA_EARTHDATA_TOKEN=your_earthdata_token_here
```

The API will fall back to simulated data if NASA services are unavailable, ensuring it always returns meaningful results for testing and development.
