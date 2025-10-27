# Kite Near Future API for Hugging Face Spaces

This is a FastAPI application that provides real-time futures market data from Zerodha Kite Connect, deployed on Hugging Face Spaces.

## Features

- REST API for fetching live futures data from Zerodha Kite
- Categorizes futures into current, near, and far expiry periods
- Real-time market data streaming
- Health checks and statistics endpoints
- CORS enabled for frontend integration

## API Endpoints

- `GET /` - API root with endpoint information
- `GET /health` - Health check endpoint
- `GET /api/contracts` - Get futures contracts (with optional category and limit filters)
- `GET /api/live` - Get live market data for futures contracts
- `GET /api/contract/{symbol}` - Get detailed information for a specific contract
- `GET /api/stats` - Get statistics about contracts and live data
- `POST /api/config` - Update Kite API credentials

## Deployment on Hugging Face Spaces

### Prerequisites

1. A Hugging Face account
2. Zerodha Kite Connect API credentials (API Key and Access Token)

### Steps to Deploy

1. Fork this repository or create a new Space on Hugging Face
2. Add your Zerodha Kite credentials as Secrets in your Space:
   - `KITE_API_KEY` - Your Kite Connect App API Key
   - `KITE_ACCESS_TOKEN` - Your Kite Connect Access Token
3. The application will automatically start and be available at your Space's URL

### Configuration

You can configure the application using environment variables:

- `KITE_API_KEY` - Zerodha Kite API Key
- `KITE_ACCESS_TOKEN` - Zerodha Kite Access Token
- `PORT` - Port to run the application on (default: 7860)

### Getting Credentials

1. Visit [Kite Connect Console](https://kite.trade/console/apps) to get your API Key
2. Use the `convert_token.py` script to generate an Access Token:
   ```bash
   python KiteApi/convert_token.py
   ```
3. Add these credentials as Secrets in your Hugging Face Space

## Local Development

To run locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export KITE_API_KEY=your_api_key
export KITE_ACCESS_TOKEN=your_access_token

# Run the application
python app.py
```

## API Usage Examples

### Get all contracts
```bash
curl https://your-space-url.hf.space/api/contracts
```

### Get current month contracts
```bash
curl https://your-space-url.hf.space/api/contracts?category=current
```

### Get live data
```bash
curl https://your-space-url.hf.space/api/live
```

### Update credentials (if needed)
```bash
curl -X POST https://your-space-url.hf.space/api/config \
  -H "Content-Type: application/json" \
  -d '{"api_key": "your_api_key", "access_token": "your_access_token"}'
```

## Notes

- Access tokens expire daily and need to be refreshed
- Market data requires a paid Kite Connect subscription
- The application caches contract data to reduce API calls