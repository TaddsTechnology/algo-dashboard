## Kite Connect Python – Quick Start

This repo helps you authenticate with Zerodha Kite, obtain an access token, and call market data APIs. It also includes a WebSocket example for live data streaming.

### 1) Setup

- Windows PowerShell:
```powershell
cd C:\Users\Admin\Desktop\shareconnectpython-main
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

- Verify your credentials in `kite_config.py`:
```python
API_KEY = "kixivzzxm7rgxqv2"
API_SECRET = "clt2qus10wnoes6wm5nq0sl2n1977egv"
USER_ID = "your_zerodha_user_id"
PASSWORD = "your_password"
PIN = "your_pin"
```
Note: You can get your API credentials from https://kite.trade/connect/app

### 2) Get an access token (browser-assisted flow)
Each session, do this to log in and generate a fresh token:
```powershell
python .\KiteApi\convert_token.py
```
- The script will show you a login URL. Open it in your browser and log in with your Zerodha credentials.
- After redirect, copy the `request_token` from the browser URL and paste it back into the script when asked.
- The script will generate your `access_token` and confirm “SUCCESS! Access Token Generated”.

Troubleshooting:
- If the page says “The requested URL was rejected…”, retry in a new browser/Incognito, disable VPN/proxy/ad-block, or change network.

### 3) Call market data (REST)
Use the token immediately after login. Example quick test in Python REPL:
```python
from KiteApi.kiteConnect import KiteConnect

api_key = "kixivzzxm7rgxqv2"
access_token = "<PASTE_ACCESS_TOKEN_FROM_STEP_2>"

kite = KiteConnect(api_key=api_key, access_token=access_token)
print(kite.test_connection())

# Examples (replace params with real ones)
print(kite.instruments("NFO"))
print(kite.quote(["NFO:NIFTY23JAN23000CE"]))
```

Token expiry:
- If you see `{ "status": 403, "message": "Token is Expired" }`, repeat Step 2 to get a new access token.

### 4) WebSocket (live streaming)
Run the example and follow any prompts to supply your token if required:
```powershell
python .\realtime_websocket_stream.py
```
Note: Streaming requires market hours and valid subscriptions.

### 5) Sample script safety
The scripts include live order methods:
- Order placement methods will send real orders if you set a valid token and realistic parameters.
- For market data only, use read-only calls such as `instruments` and `quote`.

### 6) Tests
A basic test harness is available:
```powershell
python .\test_kite_fs.py
```
- It validates connection and demonstrates API calls. Update it to use your fresh access token if you modify it for live calls.

### 7) Notes on TOTP
- Zerodha uses TOTP for two-factor authentication.
- You'll need to enter the 6-digit code from your authenticator app during the login process.

### 8) Common issues
- URL rejected by WAF: Try a different network/browser/incognito, clear cookies.
- Token expired: Get a new token via Step 2.

### 9) What to run (summary)
- Authenticate and get token: `python .\KiteApi\convert_token.py`
- Fetch REST data (your script or REPL) using the printed access token
- WebSocket streaming: `python .\realtime_websocket_stream.py`
- Optional tests: `python .\test_kite_fs.py`

---
Optionally, you can modify the scripts to paste `request_token` and run only read-only data calls by default.


