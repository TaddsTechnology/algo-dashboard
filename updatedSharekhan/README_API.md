# Kite Near Future API

Real-time futures data API from Zerodha Kite Connect. Perfect for building trading dashboards and analytics tools.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export KITE_API_KEY="your_api_key"
export KITE_ACCESS_TOKEN="your_access_token"

# Run the server
python app.py
```

Server will start at `http://0.0.0.0:7860`

### Hugging Face Deployment

1. Create a new Space on Hugging Face
2. Select "Docker" as the SDK
3. Upload these files:
   - `app.py`
   - `requirements.txt`
   - `KiteApi/` folder
   - `kite_config.py` (optional)

4. Set secrets in Space settings:
   - `KITE_API_KEY`: Your Kite API key
   - `KITE_ACCESS_TOKEN`: Your Kite access token

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server health and connection status.

### Get All Contracts
```
GET /api/contracts?category=current&limit=100
```
**Parameters:**
- `category` (optional): Filter by category (`current`, `near`, `far`)
- `limit` (optional): Limit number of results

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-10-27T09:51:54",
  "data": {
    "current": [...],
    "near": [...],
    "far": [...]
  }
}
```

### Get Live Data
```
GET /api/live?category=current&limit=50
```
Fetches live market data for futures contracts.

**Parameters:**
- `category` (optional): Filter by category
- `limit` (optional): Limit number of contracts

**Response:**
```json
{
  "status": "success",
  "timestamp": "2025-10-27T09:51:54",
  "count": 50,
  "data": {
    "token123": {
      "symbol": "NIFTY25OCTFUT",
      "ltp": 19450.50,
      "change": 125.30,
      "change_percent": 0.65,
      "volume": 125000,
      "bid": 19449.00,
      "ask": 19451.00,
      "timestamp": "2025-10-27T09:51:54"
    }
  }
}
```

### Get Contract Detail
```
GET /api/contract/NIFTY25OCTFUT
```
Get detailed information for a specific contract.

### Get Statistics
```
GET /api/stats
```
Get overall statistics about cached contracts and live data.

### Update Configuration
```
POST /api/config
Content-Type: application/json

{
  "api_key": "your_api_key",
  "access_token": "your_access_token"
}
```
Update API credentials dynamically.

## 🔧 Configuration

### Environment Variables

- `KITE_API_KEY`: Your Kite Connect API key
- `KITE_ACCESS_TOKEN`: Your Kite Connect access token

### Using Config File

Alternatively, create `kite_config.py`:

```python
API_KEY = "your_api_key"
ACCESS_TOKEN = "your_access_token"
```

## 🌐 Frontend Integration

### JavaScript Example

```javascript
// Fetch all contracts
const contracts = await fetch('http://localhost:7860/api/contracts')
  .then(res => res.json());

// Fetch live data
const liveData = await fetch('http://localhost:7860/api/live?category=current&limit=50')
  .then(res => res.json());

// Auto-refresh every 5 seconds
setInterval(async () => {
  const data = await fetch('http://localhost:7860/api/live')
    .then(res => res.json());
  
  updateUI(data);
}, 5000);
```

### React Example

```jsx
import { useEffect, useState } from 'react';

function FuturesData() {
  const [liveData, setLiveData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('http://localhost:7860/api/live');
      const data = await response.json();
      setLiveData(data.data);
    };

    // Initial fetch
    fetchData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {Object.entries(liveData).map(([token, contract]) => (
        <div key={token}>
          <h3>{contract.symbol}</h3>
          <p>LTP: {contract.ltp}</p>
          <p>Change: {contract.change} ({contract.change_percent}%)</p>
        </div>
      ))}
    </div>
  );
}
```

## 📊 Features

- ✅ Real-time futures data from Zerodha Kite
- ✅ Categorized by expiry (current, near, far)
- ✅ Live price updates with change %
- ✅ Bid/ask prices and volume
- ✅ CORS enabled for frontend integration
- ✅ Automatic fallback to LTP endpoint
- ✅ Caching for better performance
- ✅ Ready for Hugging Face deployment

## 🛡️ Error Handling

All endpoints return proper HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (missing credentials)
- `404`: Not found
- `500`: Server error
- `503`: Service unavailable (Kite API connection failed)

## 📝 Notes

- Access tokens expire daily and need to be refreshed
- Rate limits apply based on your Kite Connect subscription
- Some endpoints require market data subscription
- The API automatically tries LTP endpoint if full quotes fail

## 🔗 Resources

- [Zerodha Kite Connect Documentation](https://kite.trade/docs/connect/v3/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Hugging Face Spaces](https://huggingface.co/spaces)
