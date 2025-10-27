#!/usr/bin/env python3
"""Test script to fetch F&S (Futures & Options) instruments from Zerodha Kite API"""

import sys
from KiteApi.kiteConnect import KiteConnect
from kite_config import API_KEY, API_SECRET, ACCESS_TOKEN

def test_fs_fetch():
    print("=" * 60)
    print("Testing Zerodha Kite API - F&S Instruments Fetch")
    print("=" * 60)
    
    # Initialize KiteConnect
    print(f"\n📡 Initializing Kite API...")
    print(f"API Key: {API_KEY[:10]}...")
    
    kite = KiteConnect(api_key=API_KEY)
    
    # Check if we have access token
    if not ACCESS_TOKEN:
        print("\n⚠️  No access token found!")
        print("\nTo generate access token:")
        print("1. Visit: https://kite.zerodha.com/connect/login?api_key=" + API_KEY)
        print("2. Login and authorize")
        print("3. Copy the request_token from redirect URL")
        print("4. Use it to generate access_token via API")
        print("\nAlternatively, use Kite Connect dashboard to generate token manually.")
        return False
    
    kite.set_access_token(ACCESS_TOKEN)
    
    # Test connection
    print("\n🔍 Testing connection...")
    if not kite.test_connection():
        print("\n❌ Connection test failed. Check your credentials.")
        return False
    
    # Fetch NFO instruments (Futures & Options)
    print("\n📊 Fetching NFO (F&O) instruments...")
    nfo_instruments = kite.instruments("NFO")
    
    if nfo_instruments and "data" in nfo_instruments:
        instruments = nfo_instruments["data"]
        print(f"✅ Found {len(instruments)} NFO instruments")
        
        # Filter futures
        futures = [i for i in instruments if i.get("instrument_type") == "FUT"]
        options = [i for i in instruments if i.get("instrument_type") in ["CE", "PE"]]
        
        print(f"\n📈 Futures: {len(futures)}")
        print(f"📉 Options: {len(options)}")
        
        # Show sample futures
        if futures:
            print("\n🔍 Sample Futures:")
            for fut in futures[:5]:
                print(f"  • {fut.get('tradingsymbol')} - Expiry: {fut.get('expiry')}")
        
        # Show sample options
        if options:
            print("\n🔍 Sample Options:")
            for opt in options[:5]:
                print(f"  • {opt.get('tradingsymbol')} - Strike: {opt.get('strike')} - Expiry: {opt.get('expiry')}")
        
        return True
    else:
        print("❌ Failed to fetch instruments")
        return False

if __name__ == "__main__":
    try:
        success = test_fs_fetch()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
