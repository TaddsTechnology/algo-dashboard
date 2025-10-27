#!/usr/bin/env python3
"""
Kite Near Future Data Fetcher - LIVE CONTINUOUS VERSION
Continuously fetches and displays live market data with auto-refresh
"""

from KiteApi.kiteConnect import KiteConnect
import json
import pandas as pd
from datetime import datetime, timedelta
import time
import os
import sys

class KiteNearFutureLive:
    def __init__(self, api_key, access_token):
        self.api_key = api_key
        self.access_token = access_token
        self.kite = KiteConnect(api_key=api_key, access_token=access_token)
        
        # Data storage
        self.futures_data = {}
        self.categorized_contracts = {}
        self.live_data = {}
        self.previous_prices = {}  # Track previous prices for change detection
        
        print(f"🔑 Initialized Kite API with key: {api_key[:10]}...")
        print(f"🎫 Access token: {access_token[:20]}...")
    
    def clear_screen(self):
        """Clear terminal screen"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def get_all_futures_by_category(self, exchange="NFO"):
        """Get all futures contracts categorized by expiry periods"""
        try:
            if self.categorized_contracts:
                # Return cached data
                return self.categorized_contracts
            
            print(f"🔍 Fetching futures contracts from exchange: {exchange}")
            instruments_data = self.kite.instruments(exchange)
            
            if not instruments_data or 'data' not in instruments_data:
                print("❌ No instruments data available")
                return {"current": [], "near": [], "far": []}
            
            instruments = instruments_data['data']
            print(f"📊 Processing {len(instruments)} instruments...")
            
            current_date = datetime.now()
            
            categorized_contracts = {
                "current": [],
                "near": [], 
                "far": []
            }
            
            for instrument in instruments:
                try:
                    trading_symbol = instrument.get('tradingsymbol', '').upper()
                    name = instrument.get('name', '').upper()
                    instrument_type = instrument.get('instrument_type', '').upper()
                    expiry_str = instrument.get('expiry', '')
                    lot_size = instrument.get('lot_size', 1)
                    instrument_token = instrument.get('instrument_token', '')
                    
                    if (instrument_type == 'FUT' and 
                        expiry_str and expiry_str != '0' and expiry_str.lower() != 'none' and
                        instrument_token):
                        
                        try:
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
                            
                        except Exception:
                            continue
                            
                except Exception:
                    continue
            
            # Sort by symbol
            for category in categorized_contracts:
                categorized_contracts[category].sort(key=lambda x: x['symbol'])
            
            total = sum(len(contracts) for contracts in categorized_contracts.values())
            print(f"✅ Found {total} futures contracts")
            
            self.categorized_contracts = categorized_contracts
            return categorized_contracts
            
        except Exception as e:
            print(f"❌ Error fetching futures contracts: {e}")
            return {"current": [], "near": [], "far": []}
    
    def get_live_quotes(self, contracts, use_ltp_only=False):
        """Get live quotes for contracts"""
        if not contracts:
            return {}
        
        live_data = {}
        
        try:
            instruments = []
            for contract in contracts:
                instrument_id = f"{contract['exchange']}:{contract['symbol']}"
                instruments.append(instrument_id)
            
            # Get quotes in batches
            batch_size = 50
            for i in range(0, len(instruments), batch_size):
                batch = instruments[i:i + batch_size]
                
                try:
                    if use_ltp_only:
                        quotes_response = self.kite.ltp(batch)
                    else:
                        quotes_response = self.kite.quote(batch)
                    
                    if quotes_response and 'data' in quotes_response:
                        for instrument_id, quote_data in quotes_response['data'].items():
                            symbol = instrument_id.split(':')[-1]
                            matching_contract = next((c for c in contracts if c['symbol'] == symbol), None)
                            
                            if matching_contract:
                                token = matching_contract['instrument_token']
                                
                                if use_ltp_only:
                                    ltp = quote_data.get('last_price', 0)
                                    live_data[token] = {
                                        'symbol': symbol,
                                        'ltp': ltp,
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
                                    ltp = quote_data.get('last_price', 0)
                                    ohlc = quote_data.get('ohlc', {})
                                    prev_close = ohlc.get('close', 0)
                                    
                                    # Calculate change
                                    if prev_close > 0:
                                        change = ltp - prev_close
                                        change_percent = (change / prev_close) * 100
                                    else:
                                        change = 0
                                        change_percent = 0
                                    
                                    live_data[token] = {
                                        'symbol': symbol,
                                        'ltp': ltp,
                                        'open': ohlc.get('open', 0),
                                        'high': ohlc.get('high', 0),
                                        'low': ohlc.get('low', 0),
                                        'close': prev_close,
                                        'volume': quote_data.get('volume', 0),
                                        'change': change,
                                        'change_percent': change_percent,
                                        'bid': quote_data.get('depth', {}).get('buy', [{}])[0].get('price', 0),
                                        'ask': quote_data.get('depth', {}).get('sell', [{}])[0].get('price', 0),
                                        'timestamp': datetime.now().strftime('%H:%M:%S')
                                    }
                    
                    time.sleep(0.1)
                    
                except Exception as e:
                    continue
            
            return live_data
            
        except Exception as e:
            print(f"❌ Error getting live quotes: {e}")
            return {}
    
    def display_live_data(self, categorized_contracts, live_data, refresh_count, refresh_interval):
        """Display live data in table format"""
        
        self.clear_screen()
        
        print("=" * 140)
        print(f"🔥 KITE NEAR FUTURE - LIVE MODE - {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
        print(f"🔄 Refresh #{refresh_count} | ⏱️ Auto-refresh every {refresh_interval} seconds | Press Ctrl+C to stop")
        print("=" * 140)
        
        for category in ['current', 'near', 'far']:
            contracts = categorized_contracts.get(category, [])
            if not contracts:
                continue
            
            # Display ALL contracts (no limit)
            # contracts = contracts[:display_limit]  # REMOVED LIMIT
                
            category_name = category.upper()
            print(f"\n📅 {category_name} CATEGORY ({len(contracts)} contracts shown)")
            print("-" * 140)
            print(f"{'Symbol':<22} {'LTP':<10} {'Change':<10} {'Change%':<10} {'Bid':<10} {'Ask':<10} {'Volume':<12} {'Lot':<8} {'Expiry':<12} {'Time':<10}")
            print("-" * 140)
            
            displayed = 0
            for contract in contracts:
                symbol = contract['symbol'][:20]
                lot_size = contract['lot_size']
                expiry = contract['expiry_formatted']
                
                # Get live data
                token = contract['instrument_token']
                live = live_data.get(token, {})
                
                ltp = live.get('ltp', 0)
                change = live.get('change', 0)
                change_pct = live.get('change_percent', 0)
                bid = live.get('bid', 0)
                ask = live.get('ask', 0)
                volume = live.get('volume', 0)
                timestamp = live.get('timestamp', '')
                
                # Color indicators
                if change_pct > 0:
                    change_str = f"▲ {change:.2f}"
                    pct_str = f"▲ {change_pct:.2f}%"
                elif change_pct < 0:
                    change_str = f"▼ {change:.2f}"
                    pct_str = f"▼ {change_pct:.2f}%"
                else:
                    change_str = f"  {change:.2f}"
                    pct_str = f"  {change_pct:.2f}%"
                
                print(f"{symbol:<22} {ltp:<10.2f} {change_str:<10} {pct_str:<10} {bid:<10.2f} {ask:<10.2f} {volume:<12} {lot_size:<8} {expiry:<12} {timestamp:<10}")
                displayed += 1
        
        print("\n" + "=" * 140)
        print(f"📊 Live contracts tracked: {len(live_data)} | 💡 Press Ctrl+C to stop live updates")
        print("=" * 140)
    
    def start_live_monitoring(self, refresh_interval=5, max_contracts=100):
        """
        Start continuous live monitoring
        
        Args:
            refresh_interval: Seconds between refreshes
            max_contracts: Maximum contracts to track
        """
        print("🚀 Starting Kite Near Future LIVE Monitoring")
        print("=" * 70)
        
        # Test connection
        if not self.kite.test_connection():
            print("❌ Failed to connect to Kite API")
            return
        
        # Get contracts (one-time fetch)
        print("\n📥 Loading futures contracts...")
        categorized_contracts = self.get_all_futures_by_category()
        
        total_contracts = sum(len(contracts) for contracts in categorized_contracts.values())
        if total_contracts == 0:
            print("❌ No futures contracts found!")
            return
        
        print(f"✅ Loaded {total_contracts} contracts")
        
        # Determine if we should use LTP only
        use_ltp = False
        print("\n🧪 Testing market data access...")
        test_contracts = categorized_contracts['current'][:5] if categorized_contracts['current'] else []
        test_data = self.get_live_quotes(test_contracts, use_ltp_only=False)
        
        if not test_data:
            print("⚠️ Full quote access failed. Using LTP endpoint...")
            use_ltp = True
        else:
            print("✅ Full quote access available!")
        
        # Prepare contracts to monitor - GET ALL CONTRACTS
        contracts_to_monitor = []
        contracts_to_monitor.extend(categorized_contracts['current'])  # All current
        contracts_to_monitor.extend(categorized_contracts['near'])     # All near
        contracts_to_monitor.extend(categorized_contracts['far'])      # All far
        
        print(f"\n🎯 Monitoring ALL {len(contracts_to_monitor)} contracts")
        print(f"⏱️ Refresh interval: {refresh_interval} seconds")
        print("⚠️ Note: Fetching ALL contracts may take longer per refresh")
        print("🔄 Starting live updates in 3 seconds...")
        time.sleep(3)
        
        # Start continuous monitoring
        refresh_count = 0
        
        try:
            while True:
                refresh_count += 1
                
                # Fetch live data for ALL contracts
                live_data = self.get_live_quotes(contracts_to_monitor, use_ltp_only=use_ltp)
                
                # Display
                self.display_live_data(categorized_contracts, live_data, refresh_count, refresh_interval)
                
                # Wait for next refresh
                time.sleep(refresh_interval)
                
        except KeyboardInterrupt:
            print("\n\n⏹️ Live monitoring stopped by user")
            print("👋 Goodbye!")
        except Exception as e:
            print(f"\n❌ Error during live monitoring: {e}")
            import traceback
            traceback.print_exc()


def main():
    """Main function"""
    print("🔍 Kite Near Future - LIVE CONTINUOUS MODE")
    print("=" * 60)
    
    # Load credentials
    try:
        from kite_config import API_KEY, ACCESS_TOKEN
        
        if not API_KEY or API_KEY == "your_api_key_here":
            print("❌ Please update kite_config.py with your API key")
            return
        
        if not ACCESS_TOKEN:
            print("❌ Please update kite_config.py with your access token")
            return
        
        print(f"✅ API Key: {API_KEY[:10]}...")
        print(f"✅ Access Token: {ACCESS_TOKEN[:20]}...")
        
    except ImportError:
        print("❌ kite_config.py not found")
        return
    
    # Get user preferences
    print("\n⚙️ Configuration:")
    refresh_input = input("Refresh interval in seconds [default: 5]: ").strip()
    refresh_interval = int(refresh_input) if refresh_input.isdigit() else 5
    
    # Initialize and start
    live_monitor = KiteNearFutureLive(API_KEY, ACCESS_TOKEN)
    
    try:
        live_monitor.start_live_monitoring(refresh_interval=refresh_interval)
    except KeyboardInterrupt:
        print("\n⏹️ Stopped by user")


if __name__ == "__main__":
    main()
