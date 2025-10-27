# 🚀 Zerodha Kite Near Future System - Setup Guide

This is a **Zerodha Kite version** of your Near Future stock futures tracking system, similar to TradeTiger's Near Future screen.

## 📋 Requirements

### Zerodha Kite Connect Subscription
You **MUST** have the **Connect** plan (₹2000/month) because:
- ✅ Historical data APIs - needed for futures analysis
- ✅ Live market quotes via API - essential for real-time data
- ✅ WebSocket support - for live streaming

The Personal (free) plan **won't work** as it lacks historical data and live market feeds.

### Create Kite Connect App
1. Go to https://developers.kite.trade/
2. Login with your Zerodha credentials
3. Click "Create New App"
4. Fill details:
   - **App Name**: "Near Future Tracker" (or any name)
   - **Redirect URL**: `http://localhost:3000` (or your preferred URL)
   - **App Type**: Connect
5. Note down your **API Key** and **API Secret**

## 🔧 Installation

### 1. Install Dependencies
```powershell
pip install requests pandas
```

### 2. Configure Credentials
Edit `kite_config.py` with your details:
```python
API_KEY = "your_kite_api_key"        # From developers.kite.trade
API_SECRET = "your_kite_api_secret"  # From developers.kite.trade
ACCESS_TOKEN = ""                    # Leave empty initially
```

### 3. Get Access Token
Run the token generator:
```powershell
python KiteApi/get_token.py
```

**This will:**
1. Open your browser for Zerodha login
2. Ask you to complete login + 2FA
3. Ask you to copy the request_token from redirect URL
4. Generate and save your access token

**Example process:**
```
🔑 Kite Access Token Generator
✅ Using API Key from config: abc123def4...
🌐 Opening login page in your browser...

📋 MANUAL STEPS:
1. Complete login in the opened browser window
2. After successful login, you'll be redirected to a URL like:
   http://localhost:3000/?request_token=ABC123&action=login&status=success
3. Copy the 'request_token' value from the URL

🔤 Paste the request_token from the redirect URL: ABC123XYZ

✅ Access Token Generated Successfully!
🎫 Access Token: your_long_access_token_here
```

## 🚀 Usage

### Method 1: Command Line Analysis
```powershell
python kite_near_future.py
```

**What it does:**
- Connects to Zerodha Kite API
- Scans all NSE F&O futures contracts
- Categories by expiry: Current (≤30 days), Near (31-60 days), Far (61-90 days)
- Gets live market data for top contracts
- Displays professional table with prices, changes, bid/ask

### Method 2: Web Interface (Coming Soon)
```powershell
python kite_website.py  # Will be created next
```

## 📊 What You'll See

```
🔥 KITE NEAR FUTURE - 15-10-2024 14:35:22
════════════════════════════════════════════════════════════════════════════════

📅 CURRENT CATEGORY (145 contracts)
────────────────────────────────────────────────────────────────────────────────
Symbol               Price      Change%    Bid        Ask        Volume     Lot      Expiry      Days
────────────────────────────────────────────────────────────────────────────────
RELIANCE25OCTFUT     2,485.50   +1.25%     2,485.00   2,486.00   125,000    250      31/10/2024  16  
TCS25OCTFUT          4,125.75   -0.85%     4,125.00   4,126.50   89,500     100      31/10/2024  16  
HDFCBANK25OCTFUT     1,685.25   +0.45%     1,685.00   1,685.50   156,000    550      31/10/2024  16  
...
```

## 🔍 Key Features

### ✅ What Works
- **Real-time data**: Live prices, bid/ask, volume, changes
- **Smart categorization**: Automatic expiry-based grouping  
- **Professional display**: TradeTiger-style tables
- **Rate limit handling**: Batched API calls to avoid limits
- **Error handling**: Graceful failure with detailed messages

### ⚠️ Limitations
- **Market hours**: Live data only during trading hours (9:15 AM - 3:30 PM)
- **Rate limits**: Kite has API call limits, so we batch requests
- **Connect subscription**: Requires paid plan for full functionality
- **Token expiry**: Access tokens expire daily, need regeneration

## 🛠️ Troubleshooting

### ❌ "Failed to connect to Kite API"
**Solution:** 
1. Check your API credentials in `kite_config.py`
2. Regenerate access token: `python KiteApi/get_token.py`
3. Ensure you have Connect subscription active

### ❌ "No futures contracts found"
**Solution:**
1. Run during market hours (9:15 AM - 3:30 PM)
2. Check if NSE F&O data is available
3. Try running: `python kite_near_future.py` with debug output

### ❌ "Request limit exceeded"
**Solution:**
1. Wait a few minutes for rate limit reset
2. The system automatically handles batching
3. Reduce `max_contracts` in the code if needed

### ❌ "Invalid access token"
**Solution:**
1. Tokens expire daily
2. Run: `python KiteApi/get_token.py` to get fresh token
3. Update `kite_config.py` with new token

## 📈 Data Details

### Exchanges Covered
- **NFO**: NSE Futures & Options (primary)
- **BFO**: BSE Futures & Options (optional)

### Contract Types
- **FUT**: Stock Futures (e.g., RELIANCE25OCTFUT)
- **Index Futures**: NIFTY, BANKNIFTY (if requested)

### Data Fields
- **Symbol**: Trading symbol (e.g., TCS25OCTFUT)
- **Price**: Last traded price
- **Change%**: Percentage change from previous close
- **Bid/Ask**: Best bid and ask prices
- **Volume**: Total traded volume
- **Lot Size**: Contract lot size
- **Expiry**: Contract expiry date
- **Days**: Days remaining to expiry

## 🔄 Daily Workflow

### Every Trading Day:
1. **Generate new token** (tokens expire daily):
   ```powershell
   python KiteApi/get_token.py
   ```

2. **Run analysis**:
   ```powershell
   python kite_near_future.py
   ```

3. **Monitor results** and identify trading opportunities

### Optional: Automate Token Generation
You can modify the code to auto-generate tokens, but manual is more secure for trading systems.

## 🎯 Next Steps

1. **Test the system**: Run `python kite_near_future.py`
2. **Customize filters**: Modify contract selection criteria
3. **Add alerts**: Set up notifications for specific conditions
4. **Web interface**: Use the web version for better visualization
5. **Export data**: Save results to Excel/CSV for further analysis

## 🚨 Important Notes

### Security
- **Never share** your API keys or access tokens
- **Use environment variables** for production deployments
- **Regenerate tokens** regularly for security

### Trading
- This is a **data analysis tool**, not trading software
- **Test thoroughly** before using for actual trading
- **Understand risks** of futures trading
- **Paper trade first** to validate strategies

### Support
- **Zerodha Support**: For API/subscription issues
- **Kite Connect Docs**: https://kite.trade/docs/connect/v3/
- **Your modifications**: Customize as needed for your strategy

---

## 🎉 You're Ready!

Your Kite Near Future system is now set up. Run the analysis and start tracking those near-expiry futures contracts like a pro! 📈