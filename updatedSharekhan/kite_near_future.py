#!/usr/bin/env python3
"""
Kite Near Future Data Fetcher - Zerodha Version
Shows near expiry futures contracts similar to TradeTiger's Near Future Screen

Adapted for Zerodha Kite API instrument format
"""

from KiteApi.kiteConnect import KiteConnect
import json
import pandas as pd
from datetime import datetime, timedelta
import time
import os

class KiteNearFutureFetcher:
    def __init__(self, api_key, access_token):
        self.api_key = api_key
        self.access_token = access_token
        self.kite = KiteConnect(api_key=api_key, access_token=access_token)
        
        # Data storage
        self.futures_data = {}
        self.near_expiry_contracts = []
        self.live_data = {}
        
        print(f"🔑 Initialized Kite API with key: {api_key[:10]}...")
        print(f"🎫 Access token: {access_token[:20]}...")
    
    def get_all_futures_by_category(self, exchange="NFO"):
        """
        Get all futures contracts categorized by expiry periods for NSE F&O
        
        Kite instrument format:
        - instrument_token, exchange_token, tradingsymbol, name, last_price, expiry, strike, tick_size, lot_size, instrument_type, segment, exchange
        """
        try:
            print(f"🔍 Fetching futures contracts from exchange: {exchange}")
            instruments_data = self.kite.instruments(exchange)
            
            if not instruments_data or 'data' not in instruments_data:
                print("❌ No instruments data available")
                return {"current": [], "near": [], "far": []}
            
            instruments = instruments_data['data']
            print(f"📊 Processing {len(instruments)} instruments...")
            
            current_date = datetime.now()
            
            # Define expiry categories (Kite uses YYYY-MM-DD format)
            categorized_contracts = {
                "current": [],
                "near": [], 
                "far": []
            }
            
            for instrument in instruments:
                try:
                    # Get instrument details
                    trading_symbol = instrument.get('tradingsymbol', '').upper()
                    name = instrument.get('name', '').upper()
                    instrument_type = instrument.get('instrument_type', '').upper()
                    expiry_str = instrument.get('expiry', '')
                    lot_size = instrument.get('lot_size', 1)
                    instrument_token = instrument.get('instrument_token', '')
                    
                    # Filter for stock futures (FUT) contracts only
                    if (instrument_type == 'FUT' and  # Stock Futures in Kite
                        expiry_str and expiry_str != '0' and expiry_str.lower() != 'none' and
                        instrument_token):
                        
                        try:
                            # Parse expiry date (Kite format: YYYY-MM-DD)
                            expiry_dt = datetime.strptime(expiry_str, '%Y-%m-%d')
                            days_diff = (expiry_dt - current_date).days
                            
                            # Categorize by days to expiry
                            if days_diff <= 30:  # Current month (within 30 days)
                                category = "current"
                            elif days_diff <= 60:  # Near future (31-60 days)
                                category = "near"
                            elif days_diff <= 90:  # Far future (61-90 days)
                                category = "far"
                            else:
                                continue  # Skip contracts too far out
                            
                            categorized_contracts[category].append({
                                'symbol': trading_symbol,
                                'name': name,
                                'instrument_token': instrument_token,
                                'expiry': expiry_str,
                                'expiry_formatted': expiry_dt.strftime('%d/%m/%Y'),
                                'days_to_expiry': days_diff,
                                'lot_size': int(lot_size) if lot_size else 1,
                                'instrument_type': instrument_type,
                                'tick_size': float(instrument.get('tick_size', 0.05)),
                                'category': category,
                                'exchange': exchange
                            })
                            
                        except Exception as date_error:
                            continue
                            
                except Exception as e:
                    continue
            
            # Sort each category by symbol name
            for category in categorized_contracts:
                categorized_contracts[category].sort(key=lambda x: x['symbol'])
            
            # Print summary
            total_contracts = sum(len(contracts) for contracts in categorized_contracts.values())
            print(f"✅ Found {total_contracts} futures contracts across all categories")
            
            print("\n📅 Contract Summary by Category:")
            for category, contracts in categorized_contracts.items():
                if contracts:
                    category_name = category.upper().replace("_", " ")
                    print(f"   {category_name}: {len(contracts)} contracts")
                    # Show sample expiry dates
                    sample_expiries = list(set([c['expiry_formatted'] for c in contracts[:5]]))
                    print(f"     Sample expiries: {', '.join(sample_expiries[:3])}")
                else:
                    print(f"   {category.upper()}: No contracts found")
            
            return categorized_contracts
            
        except Exception as e:
            print(f"❌ Error fetching futures contracts: {e}")
            import traceback
            traceback.print_exc()
            return {"current": [], "near": [], "far": []}
    
    def get_live_quotes(self, contracts, max_contracts=50, use_ltp_only=False):
        """
        Get live quotes for contracts (Kite has rate limits, so batch in smaller groups)
        
        Args:
            contracts: List of contracts to fetch quotes for
            max_contracts: Maximum number of contracts to fetch
            use_ltp_only: If True, use LTP endpoint (basic subscription), else use full quote (requires market data subscription)
        """
        if not contracts:
            print("❌ No contracts to get quotes for")
            return {}
        
        # Limit contracts due to API rate limits
        selected_contracts = contracts[:max_contracts]
        endpoint_type = "LTP" if use_ltp_only else "full quotes"
        print(f"📊 Getting {endpoint_type} for {len(selected_contracts)} contracts...")
        
        live_data = {}
        
        try:
            # Prepare instrument identifiers for quotes
            # Kite uses exchange:tradingsymbol format
            instruments = []
            for contract in selected_contracts:
                instrument_id = f"{contract['exchange']}:{contract['symbol']}"
                instruments.append(instrument_id)
            
            # Get quotes in batches (Kite allows up to 500 instruments per call)
            batch_size = 50
            for i in range(0, len(instruments), batch_size):
                batch = instruments[i:i + batch_size]
                
                try:
                    # Try LTP first if use_ltp_only, otherwise try full quote
                    if use_ltp_only:
                        quotes_response = self.kite.ltp(batch)
                    else:
                        quotes_response = self.kite.quote(batch)
                    
                    if quotes_response and 'data' in quotes_response:
                        for instrument_id, quote_data in quotes_response['data'].items():
                            # Find matching contract
                            symbol = instrument_id.split(':')[-1]
                            matching_contract = next((c for c in selected_contracts if c['symbol'] == symbol), None)
                            
                            if matching_contract:
                                if use_ltp_only:
                                    # LTP endpoint returns just {"last_price": value}
                                    live_data[matching_contract['instrument_token']] = {
                                        'symbol': symbol,
                                        'ltp': quote_data.get('last_price', 0),
                                        'open': 0,
                                        'high': 0,
                                        'low': 0,
                                        'close': 0,
                                        'volume': 0,
                                        'change': 0,
                                        'change_percent': 0,
                                        'bid': 0,
                                        'ask': 0,
                                        'timestamp': datetime.now().strftime('%H:%M:%S')
                                    }
                                else:
                                    # Full quote endpoint
                                    live_data[matching_contract['instrument_token']] = {
                                        'symbol': symbol,
                                        'ltp': quote_data.get('last_price', 0),
                                        'open': quote_data.get('ohlc', {}).get('open', 0),
                                        'high': quote_data.get('ohlc', {}).get('high', 0),
                                        'low': quote_data.get('ohlc', {}).get('low', 0),
                                        'close': quote_data.get('ohlc', {}).get('close', 0),
                                        'volume': quote_data.get('volume', 0),
                                        'change': quote_data.get('net_change', 0),
                                        'change_percent': quote_data.get('change', 0),
                                        'bid': quote_data.get('depth', {}).get('buy', [{}])[0].get('price', 0),
                                        'ask': quote_data.get('depth', {}).get('sell', [{}])[0].get('price', 0),
                                        'timestamp': datetime.now().strftime('%H:%M:%S')
                                    }
                    
                    # Small delay to avoid rate limiting
                    time.sleep(0.1)
                    
                except Exception as e:
                    print(f"⚠️ Error getting quotes for batch: {e}")
                    continue
            
            print(f"✅ Retrieved live data for {len(live_data)} contracts")
            return live_data
            
        except Exception as e:
            print(f"❌ Error getting live quotes: {e}")
            return {}
    
    def display_near_future_data(self, categorized_contracts, live_data=None):
        """Display near future data in table format"""
        
        print("\n" + "="*120)
        print(f"🔥 KITE NEAR FUTURE - {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
        print("="*120)
        
        for category, contracts in categorized_contracts.items():
            if not contracts:
                continue
                
            category_name = category.upper().replace("_", " ")
            print(f"\n📅 {category_name} CATEGORY ({len(contracts)} contracts)")
            print("-" * 120)
            print(f"{'Symbol':<20} {'Price':<10} {'Change%':<10} {'Bid':<10} {'Ask':<10} {'Volume':<10} {'Lot':<8} {'Expiry':<12} {'Days':<5}")
            print("-" * 120)
            
            displayed = 0
            for contract in contracts:
                if displayed >= 50:  # Limit display per category
                    print(f"... and {len(contracts) - displayed} more contracts")
                    break
                
                symbol = contract['symbol'][:20]
                lot_size = contract['lot_size']
                expiry = contract['expiry_formatted']
                days = contract['days_to_expiry']
                
                # Get live data if available
                token = contract['instrument_token']
                live = live_data.get(token, {}) if live_data else {}
                
                price = live.get('ltp', 0)
                change_pct = live.get('change_percent', 0)
                bid = live.get('bid', 0)
                ask = live.get('ask', 0)
                volume = live.get('volume', 0)
                
                # Color coding for change percentage
                if change_pct > 0:
                    change_color = f"+{change_pct:.2f}%" 
                elif change_pct < 0:
                    change_color = f"{change_pct:.2f}%"
                else:
                    change_color = "0.00%"
                
                print(f"{symbol:<20} {price:<10.2f} {change_color:<10} {bid:<10.2f} {ask:<10.2f} {volume:<10} {lot_size:<8} {expiry:<12} {days:<5}")
                displayed += 1
    
    def start_near_future_analysis(self, get_live_data=True):
        """
        Main function to start Near Future analysis
        """
        print("🚀 Starting Kite Near Future Analysis")
        print("📅 Fetching Current, Near, and Far future contracts from NSE F&O")
        print("="*70)
        
        # Test connection first
        if not self.kite.test_connection():
            print("❌ Failed to connect to Kite API. Please check your credentials.")
            return
        
        # Step 1: Get all categorized futures contracts
        categorized_contracts = self.get_all_futures_by_category()
        
        total_contracts = sum(len(contracts) for contracts in categorized_contracts.values())
        
        if total_contracts == 0:
            print("❌ No futures contracts found!")
            return
        
        # Step 2: Get live data if requested
        live_data = {}
        if get_live_data:
            print(f"\n📊 Fetching live market data...")
            print(f"💡 Note: If you get permission errors, your API subscription may not include market data access")
            
            # Try full quotes first, fallback to LTP if permission denied
            use_ltp = False
            
            # Get live data for current month contracts first (most important)
            if categorized_contracts['current']:
                current_data = self.get_live_quotes(categorized_contracts['current'][:50], use_ltp_only=use_ltp)
                if not current_data:
                    # If failed, try LTP endpoint
                    print("⚠️ Full quote access failed. Trying LTP endpoint instead...")
                    use_ltp = True
                    current_data = self.get_live_quotes(categorized_contracts['current'][:50], use_ltp_only=use_ltp)
                live_data.update(current_data)
            
            # Add near future contracts
            if categorized_contracts['near']:
                live_data.update(self.get_live_quotes(categorized_contracts['near'][:30], use_ltp_only=use_ltp))
        
        # Step 3: Display results
        self.display_near_future_data(categorized_contracts, live_data)
        
        # Step 4: Offer options
        print(f"\n🎯 Analysis Complete!")
        print(f"📊 Total contracts found: {total_contracts}")
        print(f"📈 Live data for: {len(live_data)} contracts")
        
        return {
            "categorized_contracts": categorized_contracts,
            "live_data": live_data,
            "summary": {
                "current": len(categorized_contracts['current']),
                "near": len(categorized_contracts['near']),
                "far": len(categorized_contracts['far']),
                "total": total_contracts,
                "live_data_count": len(live_data)
            }
        }

def main():
    """Main function"""
    print("🔍 Kite Near Future Data Fetcher - Zerodha Version")
    print("=" * 60)
    
    # Try to load from config first
    try:
        from kite_config import API_KEY, ACCESS_TOKEN
        
        if API_KEY == "your_api_key_here" or not API_KEY:
            print("⚠️ Please update kite_config.py with your API key")
            api_key = input("Enter your Kite API Key: ").strip()
        else:
            api_key = API_KEY
            print(f"✅ Loaded API key from config")
        
        if not ACCESS_TOKEN:
            print("⚠️ No access token in kite_config.py")
            print("💡 Run 'python KiteApi/get_token.py' first to get your access token")
            access_token = input("Enter your Kite Access Token: ").strip()
        else:
            access_token = ACCESS_TOKEN
            print(f"✅ Loaded access token from config")
            
    except ImportError:
        print("⚠️ kite_config.py not found")
        api_key = input("Enter your Kite API Key: ").strip()
        access_token = input("Enter your Kite Access Token: ").strip()
    
    # Validate credentials
    if not api_key or not access_token:
        print("❌ Both API Key and Access Token are required!")
        return
    
    if access_token in ["YOUR_ACCESS_TOKEN", "your_access_token_here"]:
        print("❌ Please provide a valid access token!")
        print("💡 Run KiteApi/get_token.py first to get a real access token")
        return
    
    print(f"🔑 Using API Key: {api_key[:10]}...")
    print(f"🎫 Using Access Token: {access_token[:20]}...")
    
    # Initialize and start
    near_future = KiteNearFutureFetcher(api_key, access_token)
    
    # Start analysis
    try:
        # Ask user if they want live data
        print("\n⚠️ Note: Live market data requires a paid Kite Connect subscription with market data access.")
        print("   If you don't have this, the script will show contract details without live prices.")
        
        user_choice = input("\nDo you want to attempt fetching live data? (y/n) [default: n]: ").strip().lower()
        get_live = user_choice == 'y'
        
        result = near_future.start_near_future_analysis(get_live_data=get_live)
        
        if result:
            print("\n" + "="*60)
            print("🎉 Analysis completed successfully!")
            print("💡 You can now run 'python kite_website.py' for the web interface")
            
    except KeyboardInterrupt:
        print("\n⏹️ Analysis stopped by user")
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()