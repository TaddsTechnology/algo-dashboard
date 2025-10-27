#!/usr/bin/env python3
"""
Startup script for Hugging Face Spaces deployment
"""
import os
import sys
from kite_config import API_KEY, ACCESS_TOKEN

def prepare_environment():
    """Prepare environment variables for Hugging Face Spaces"""
    print("🚀 Preparing environment for Hugging Face Spaces...")
    
    # Check if we're running on Hugging Face Spaces
    if os.environ.get("HF_HOME"):
        print("🔧 Running on Hugging Face Spaces")
        
        # Override credentials from environment variables if available
        hf_api_key = os.environ.get("KITE_API_KEY")
        hf_access_token = os.environ.get("KITE_ACCESS_TOKEN")
        
        if hf_api_key:
            os.environ["KITE_API_KEY"] = hf_api_key
            print("✅ Using KITE_API_KEY from environment")
        else:
            # Use the one from kite_config.py
            os.environ["KITE_API_KEY"] = API_KEY
            print("✅ Using KITE_API_KEY from kite_config.py")
            
        if hf_access_token:
            os.environ["KITE_ACCESS_TOKEN"] = hf_access_token
            print("✅ Using KITE_ACCESS_TOKEN from environment")
        else:
            # Use the one from kite_config.py
            os.environ["KITE_ACCESS_TOKEN"] = ACCESS_TOKEN
            print("✅ Using KITE_ACCESS_TOKEN from kite_config.py")
    else:
        print("🔧 Running locally")
        # Set environment variables from config files
        os.environ["KITE_API_KEY"] = API_KEY
        os.environ["KITE_ACCESS_TOKEN"] = ACCESS_TOKEN

if __name__ == "__main__":
    prepare_environment()
    
    # Import and run the main app
    from app import app
    import uvicorn
    
    port = int(os.environ.get("PORT", 7860))
    print(f"📡 Starting server on port {port}")
    
    uvicorn.run(app, host="0.0.0.0", port=port)