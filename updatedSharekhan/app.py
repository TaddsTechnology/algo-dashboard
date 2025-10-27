#!/usr/bin/env python3
"""
Kite Near Future FastAPI Server
REST API for fetching live futures data from Zerodha Kite
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio
import os

from KiteApi.kiteConnect import KiteConnect

# Initialize FastAPI app
app = FastAPI(
    title="Kite Near Future API",
    description="Real-time futures data from Zerodha Kite Connect",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
kite_client = None
cached_contracts = {}
cached_live_data = {}
last_update_time = None

# Configuration
API_KEY = os.getenv("KITE_API_KEY", "")
ACCESS_TOKEN = os.getenv("KITE_ACCESS_TOKEN", "")


class KiteConfig(BaseModel):
    api_key: str
    access_token: str


class ContractFilter(BaseModel):
    category: Optional[str] = None  # current, near, far
    symbol: Optional[str] = None
    limit: Optional[int] = 100


def get_kite_client():
    """Get or initialize Kite client"""
    global kite_client
    
    if not kite_client:
        if not API_KEY or not ACCESS_TOKEN:
            raise HTTPException(status_code=401, detail="Kite credentials not configured")
        
        kite_client = KiteConnect(api_key=API_KEY, access_token=ACCESS_TOKEN)
    
    return kite_client


def categorize_contracts(instruments, exchange="NFO"):
    """Categorize futures contracts by expiry"""
    current_date = datetime.now()
    
    categorized = {
        "current": [],
        "near": [],
        "far": []
    }
    
    for instrument in instruments:
        try:
            trading_symbol = instrument.get('tradingsymbol', '').upper()
            instrument_type = instrument.get('instrument_type', '').upper()
            expiry_str = instrument.get('expiry', '')
            
            if (instrument_type == 'FUT' and 
                expiry_str and expiry_str != '0' and expiry_str.lower() != 'none'):
                
                expiry_dt = datetime.strptime(expiry_str, '%Y-%m-%d')
                days_diff = (expiry_dt - current_date).days
                
                if days_diff <= 30:
                    category = "current"
                elif days_diff <= 60:
                    category = "near"
                elif days_diff <= 90:
                    category = "far"
                else:
                    continue
                
                categorized[category].append({
                    'symbol': trading_symbol,
                    'name': instrument.get('name', '').upper(),
                    'instrument_token': instrument.get('instrument_token', ''),
                    'expiry': expiry_str,
                    'expiry_formatted': expiry_dt.strftime('%d/%m/%Y'),
                    'days_to_expiry': days_diff,
                    'lot_size': int(instrument.get('lot_size', 1)),
                    'tick_size': float(instrument.get('tick_size', 0.05)),
                    'category': category,
                    'exchange': exchange
                })
                
        except Exception:
            continue
    
    # Sort by symbol
    for category in categorized:
        categorized[category].sort(key=lambda x: x['symbol'])
    
    return categorized


def fetch_live_quotes(kite, contracts, use_ltp_only=False):
    """Fetch live quotes for contracts"""
    if not contracts:
        return {}
    
    live_data = {}
    
    try:
        instruments = [f"{c['exchange']}:{c['symbol']}" for c in contracts]
        
        # Batch processing
        batch_size = 500
        for i in range(0, len(instruments), batch_size):
            batch = instruments[i:i + batch_size]
            
            try:
                if use_ltp_only:
                    response = kite.ltp(batch)
                else:
                    response = kite.quote(batch)
                
                if response and 'data' in response:
                    for instrument_id, quote_data in response['data'].items():
                        symbol = instrument_id.split(':')[-1]
                        matching = next((c for c in contracts if c['symbol'] == symbol), None)
                        
                        if matching:
                            token = matching['instrument_token']
                            
                            if use_ltp_only:
                                ltp = quote_data.get('last_price', 0)
                                live_data[str(token)] = {
                                    'symbol': symbol,
                                    'ltp': ltp,
                                    'change': 0,
                                    'change_percent': 0,
                                    'volume': 0,
                                    'timestamp': datetime.now().isoformat()
                                }
                            else:
                                ltp = quote_data.get('last_price', 0)
                                ohlc = quote_data.get('ohlc', {})
                                prev_close = ohlc.get('close', 0)
                                
                                change = ltp - prev_close if prev_close > 0 else 0
                                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                                
                                live_data[str(token)] = {
                                    'symbol': symbol,
                                    'ltp': ltp,
                                    'open': ohlc.get('open', 0),
                                    'high': ohlc.get('high', 0),
                                    'low': ohlc.get('low', 0),
                                    'close': prev_close,
                                    'change': change,
                                    'change_percent': change_percent,
                                    'volume': quote_data.get('volume', 0),
                                    'bid': quote_data.get('depth', {}).get('buy', [{}])[0].get('price', 0),
                                    'ask': quote_data.get('depth', {}).get('sell', [{}])[0].get('price', 0),
                                    'timestamp': datetime.now().isoformat()
                                }
            except Exception:
                continue
    
    except Exception as e:
        print(f"Error fetching quotes: {e}")
    
    return live_data


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "Kite Near Future API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "contracts": "/api/contracts",
            "live": "/api/live",
            "contract_detail": "/api/contract/{symbol}",
            "stats": "/api/stats"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global kite_client, last_update_time
    
    try:
        kite = get_kite_client()
        profile = kite.profile()
        
        return {
            "status": "healthy",
            "kite_connected": True,
            "user": profile.get('data', {}).get('user_name', 'Unknown') if profile else 'Unknown',
            "last_update": last_update_time.isoformat() if last_update_time else None,
            "cached_contracts": len(cached_contracts.get('current', [])) + len(cached_contracts.get('near', [])) + len(cached_contracts.get('far', []))
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@app.post("/api/config")
async def update_config(config: KiteConfig):
    """Update Kite API credentials"""
    global API_KEY, ACCESS_TOKEN, kite_client
    
    API_KEY = config.api_key
    ACCESS_TOKEN = config.access_token
    kite_client = None  # Reset client
    
    return {"status": "success", "message": "Configuration updated"}


@app.get("/api/contracts")
async def get_contracts(
    category: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get futures contracts"""
    global cached_contracts, last_update_time
    
    try:
        # Fetch contracts if not cached
        if not cached_contracts:
            kite = get_kite_client()
            instruments_data = kite.instruments("NFO")
            
            if not instruments_data or 'data' not in instruments_data:
                raise HTTPException(status_code=500, detail="Failed to fetch instruments")
            
            cached_contracts = categorize_contracts(instruments_data['data'])
            last_update_time = datetime.now()
        
        # Filter by category
        if category:
            if category not in ['current', 'near', 'far']:
                raise HTTPException(status_code=400, detail="Invalid category")
            
            contracts = cached_contracts.get(category, [])
        else:
            contracts = {
                "current": cached_contracts.get('current', []),
                "near": cached_contracts.get('near', []),
                "far": cached_contracts.get('far', [])
            }
        
        # Apply limit
        if limit and isinstance(contracts, list):
            contracts = contracts[:limit]
        elif limit and isinstance(contracts, dict):
            for cat in contracts:
                contracts[cat] = contracts[cat][:limit]
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "data": contracts
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/live")
async def get_live_data(
    category: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get live market data for futures contracts"""
    global cached_contracts, cached_live_data, last_update_time
    
    try:
        # Ensure contracts are loaded
        if not cached_contracts:
            await get_contracts()
        
        kite = get_kite_client()
        
        # Determine which contracts to fetch
        if category:
            if category not in ['current', 'near', 'far']:
                raise HTTPException(status_code=400, detail="Invalid category")
            contracts_to_fetch = cached_contracts.get(category, [])
        else:
            contracts_to_fetch = []
            contracts_to_fetch.extend(cached_contracts.get('current', []))
            contracts_to_fetch.extend(cached_contracts.get('near', []))
            contracts_to_fetch.extend(cached_contracts.get('far', []))
        
        # Apply limit
        if limit:
            contracts_to_fetch = contracts_to_fetch[:limit]
        
        # Fetch live quotes
        use_ltp = False  # Try full quotes first
        live_data = fetch_live_quotes(kite, contracts_to_fetch, use_ltp_only=use_ltp)
        
        # If no data, try LTP endpoint
        if not live_data:
            live_data = fetch_live_quotes(kite, contracts_to_fetch, use_ltp_only=True)
        
        cached_live_data = live_data
        last_update_time = datetime.now()
        
        return {
            "status": "success",
            "timestamp": last_update_time.isoformat(),
            "count": len(live_data),
            "data": live_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/contract/{symbol}")
async def get_contract_detail(symbol: str):
    """Get detailed information for a specific contract"""
    global cached_contracts, cached_live_data
    
    try:
        symbol = symbol.upper()
        
        # Search in cached contracts
        contract = None
        for category in ['current', 'near', 'far']:
            for c in cached_contracts.get(category, []):
                if c['symbol'] == symbol:
                    contract = c
                    break
            if contract:
                break
        
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        # Get live data if available
        token = str(contract['instrument_token'])
        live_data = cached_live_data.get(token, {})
        
        return {
            "status": "success",
            "data": {
                **contract,
                "live": live_data
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats():
    """Get statistics about contracts and live data"""
    global cached_contracts, cached_live_data, last_update_time
    
    return {
        "status": "success",
        "timestamp": datetime.now().isoformat(),
        "stats": {
            "total_contracts": {
                "current": len(cached_contracts.get('current', [])),
                "near": len(cached_contracts.get('near', [])),
                "far": len(cached_contracts.get('far', [])),
                "total": sum(len(cached_contracts.get(cat, [])) for cat in ['current', 'near', 'far'])
            },
            "live_data_count": len(cached_live_data),
            "last_update": last_update_time.isoformat() if last_update_time else None
        }
    }


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    print("🚀 Kite Near Future API starting...")
    print(f"📡 API Key: {'Configured' if API_KEY else 'Not configured'}")
    print(f"🎫 Access Token: {'Configured' if ACCESS_TOKEN else 'Not configured'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 Kite Near Future API shutting down...")


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Load from environment or config
    if not API_KEY or not ACCESS_TOKEN:
        try:
            from kite_config import API_KEY as CONFIG_KEY, ACCESS_TOKEN as CONFIG_TOKEN
            # Override with environment variables if available
            API_KEY = os.environ.get("KITE_API_KEY", CONFIG_KEY)
            ACCESS_TOKEN = os.environ.get("KITE_ACCESS_TOKEN", CONFIG_TOKEN)
        except ImportError:
            print("⚠️ No credentials found. Configure via environment or POST /api/config")
    
    # Use PORT environment variable for Hugging Face Spaces
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
