# 🌐 Near Future Website Setup Guide

This guide will help you set up a web application that automatically manages Kite API tokens and displays near future contracts like TradeTiger.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Your Credentials
Make sure your `config.py` has all required credentials:
```python
# config.py
API_KEY = "your_kite_api_key"
API_SECRET = "your_kite_secret_key" 
USER_ID = "your_zerodha_user_id"
PASSWORD = "your_zerodha_password"
PIN = "your_totp_pin"  # From your authenticator app
```

### 3. Start the Website
```bash
python website_app.py
```

### 4. Open Your Browser
Go to: **http://localhost:5000**

## 🔑 Token Management

### ✅ **Automatic Token Refresh**
- **No Manual Input Required!** 
- Tokens refresh automatically when they expire
- Token status displayed on the website dashboard
- Stored securely in `token_config.json`

### 📊 **Website Features**
- **Real-time Near Future Data** (209+ contracts)
- **Auto-refresh every 60 seconds** (optional)
- **Mobile-responsive design**
- **Token status monitoring**
- **TradeTiger-style interface**

### 🔄 **How Token Auto-Refresh Works**

1. **First Time Setup:**
   - Website checks if valid token exists
   - If not, automatically logs in using your credentials
   - Saves token to `token_config.json`

2. **Ongoing Operation:**
   - Website monitors token expiry time
   - 5 minutes before expiry, automatically refreshes
   - No interruption to your users!

3. **Manual Override:**
   - Click "🔑 Check Token" to see status
   - Force refresh if needed via API endpoint

## 📁 **File Structure**
```
├── website_app.py          # Main Flask application
├── token_manager.py        # Automatic token management
├── kite_near_future.py    # Core Near Future logic
├── config.py              # Your credentials
├── token_config.json      # Auto-generated token storage
└── requirements.txt       # Dependencies
```

## 🌐 **API Endpoints**

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/` | GET | Main website interface |
| `/api/near-future` | GET | Get near future contracts data |
| `/api/token-status` | GET | Check current token status |
| `/api/refresh-token` | POST | Manually refresh token |

## 💡 **Usage Examples**

### **For Your Website Visitors:**
```javascript
// Fetch near future data
fetch('/api/near-future')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Found ${data.count} contracts`);
      // data.data contains the contracts array
    }
  });
```

### **Token Status Check:**
```javascript
// Check token status
fetch('/api/token-status')
  .then(response => response.json())
  .then(status => {
    console.log(`Token status: ${status.status}`);
    console.log(`Expires at: ${status.expires_at}`);
    console.log(`Time remaining: ${status.time_remaining} minutes`);
  });
```

## 🔧 **Customization Options**

### **Change Refresh Intervals:**
```python
# In website_app.py, modify:
autoRefreshInterval = setInterval(loadData, 30000); // Every 30 seconds
```

### **Modify Token Refresh Buffer:**
```python
# In token_manager.py, modify:
def is_token_valid(self, buffer_minutes=10):  # 10 minutes buffer instead of 5
```

### **Customize Contract Limit:**
```python
# In token_manager.py, modify:
for contract in contracts[:500]:  # Show 500 instead of 240
```

## ⚠️  **Important Notes**

### **Security:**
- Keep your `config.py` file secure (don't commit to public repos)
- The website stores tokens in `token_config.json` - keep this secure too
- Consider using environment variables for production

### **Token Lifetime:**
- Kite tokens typically expire after a few hours
- The system automatically refreshes tokens before expiry
- If automatic refresh fails, manual login may be required

### **Rate Limits:**
- Be mindful of API rate limits
- Don't refresh data too frequently (recommended: 60+ seconds)

## 🚨 **Troubleshooting**

### **Token Refresh Fails:**
1. Check your credentials in `config.py`
2. Ensure TOTP secret is correct
3. Verify 2FA app is synchronized
4. Check network connectivity

### **No Contracts Found:**
1. Verify you're using the correct exchange (`NF`)
2. Check if contracts exist for current expiry dates
3. Review API response for errors

### **Website Won't Start:**
1. Install all dependencies: `pip install -r requirements.txt`
2. Check Python version (3.8+ recommended)
3. Verify Flask installation: `python -c "import flask"`

## 🎉 **Success!**

Once setup, your website will:
- ✅ **Automatically manage tokens** (no manual input needed!)
- ✅ **Display 200+ near future contracts** 
- ✅ **Update in real-time** like TradeTiger
- ✅ **Work 24/7** without intervention
- ✅ **Handle token expiry** gracefully

Your users can simply visit the website and see the Near Future data without any authentication hassles! 🚀
