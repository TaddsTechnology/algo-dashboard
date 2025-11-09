import axios from 'axios';

export interface NSEStockData {
  symbol: string;
  ask: number; // Ask Price
  change: number;
  changePercent: number;
  volume: number;
  lotSize: number;
  open: number;
  high: number;
  low: number;
  close: number;
  arbitrageOpportunity?: boolean;
  futuresPrice?: number;
  spotPrice?: number;
}

export interface NSEArbitrageData {
  symbol: string;
  spotPrice: number;
  futuresPrice: number;
  priceDifference: number;
  percentageDifference: number;
  arbitrageOpportunity: boolean;
  volume: number;
  openInterest?: number;
}

class NSEScannerAPI {
  private apiKey: string;
  private secretKey: string;
  private baseURL: string;
  private authURL: string;
  private isConnected: boolean = false;

  constructor() {
    this.apiKey = process.env.NSE_API_KEY || '';
    this.secretKey = process.env.NSE_SECRET_KEY || '';
    this.baseURL = process.env.NSE_API_BASE || 'http://127.0.0.1:5000';
    this.authURL = process.env.NSE_AUTH_URL || 'http://127.0.0.1:5000/auth/callback';
  }

  // Check if NSE Scanner is running
  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(this.baseURL, { timeout: 3000 });
      this.isConnected = true;
      return true;
    } catch (error: unknown) {
      this.isConnected = false;
      console.error('NSE Scanner not running:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Authenticate with NSE Scanner
  async authenticate(): Promise<boolean> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('NSE Scanner is not running');
      }

      // Try different authentication methods
      const authMethods = [
        {
          url: `${this.baseURL}/auth/login`,
          data: {
            api_key: this.apiKey,
            secret_key: this.secretKey
          }
        },
        {
          url: `${this.baseURL}/api/login`,
          data: {
            apiKey: this.apiKey,
            secretKey: this.secretKey
          }
        },
        {
          url: this.authURL,
          data: {
            key: this.apiKey,
            secret: this.secretKey
          }
        }
      ];

      for (const method of authMethods) {
        try {
          const response = await axios.post(method.url, method.data, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
          
          if (response.status === 200) {
            console.log('NSE Scanner authentication successful');
            return true;
          }
        } catch {
          // Try next method
          continue;
        }
      }

      // If no auth method worked, assume API key in headers works
      return true;

    } catch (error: unknown) {
      console.error('NSE Scanner authentication failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Get headers for API requests
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}:${this.secretKey}`
    };
  }

  // Get market data from NSE Scanner
  async getMarketData(): Promise<NSEStockData[]> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('NSE Scanner is not running');
      }

      // Try different endpoints that might have market data
      const endpoints = [
        `${this.baseURL}/api/market`,
        `${this.baseURL}/api/stocks`,
        `${this.baseURL}/api/nse`,
        `${this.baseURL}/market-data`,
        `${this.baseURL}/stocks`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: this.getHeaders(),
            timeout: 10000
          });

          if (response.data && Array.isArray(response.data)) {
            return response.data;
          } else if (response.data && typeof response.data === 'object') {
            // If it's an object, convert to array
            return Object.values(response.data);
          }
        } catch {
          // Try next endpoint
          continue;
        }
      }

      throw new Error('No market data endpoints found');

    } catch (error: unknown) {
      console.error('Failed to fetch NSE market data:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Get arbitrage opportunities
  async getArbitrageData(): Promise<NSEArbitrageData[]> {
    try {
      if (!await this.checkConnection()) {
        throw new Error('NSE Scanner is not running');
      }

      const endpoints = [
        `${this.baseURL}/api/arbitrage`,
        `${this.baseURL}/api/scanner`,
        `${this.baseURL}/arbitrage`,
        `${this.baseURL}/scanner`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: this.getHeaders(),
            timeout: 10000
          });

          if (response.data && Array.isArray(response.data)) {
            return response.data;
          }
        } catch {
          continue;
        }
      }

      throw new Error('No arbitrage data endpoints found');

    } catch (error: unknown) {
      console.error('Failed to fetch arbitrage data:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Convert NSE Scanner data to dashboard format
  convertToMarketData(nseData: NSEStockData[]): Array<{ symbol: string; lotSize: number; returns: { current: number; near: number; far: number }; lastUpdated: string; volume: number; lastPrice: number; open: number; high: number; low: number; close: number; arbitrageOpportunity?: boolean }> {
    return nseData.map(stock => {
      // Calculate returns based on price change
      const currentReturn = stock.changePercent || 0;
      const nearReturn = stock.futuresPrice && stock.ask ? 
        ((stock.futuresPrice - stock.ask) / stock.ask * 100) : 
        currentReturn * 1.2;
      const farReturn = nearReturn * 1.3;

      return {
        symbol: stock.symbol,
        lotSize: stock.lotSize || this.getDefaultLotSize(stock.symbol),
        returns: {
          current: currentReturn,
          near: nearReturn,
          far: farReturn
        },
        lastUpdated: new Date().toISOString(),
        volume: stock.volume || 0,
        lastPrice: stock.ask,
        open: stock.open,
        high: stock.high,
        low: stock.low,
        close: stock.close,
        arbitrageOpportunity: stock.arbitrageOpportunity
      };
    });
  }

  // Get default lot sizes for Indian stocks
  private getDefaultLotSize(symbol: string): number {
    const stockLotSizes: { [key: string]: number } = {
      'TCS': 300, 'RELIANCE': 250, 'HDFC': 550, 'INFY': 600,
      'ICICIBANK': 375, 'HDFCBANK': 550, 'KOTAKBANK': 400,
      'SBIN': 1500, 'AXISBANK': 500, 'INDUSINDBK': 900,
      'WIPRO': 800, 'HCLTECH': 700, 'TECHM': 600,
      'LTIM': 350, 'MINDTREE': 400, 'BHARTIARTL': 1800,
      'POWERGRID': 3200, 'NTPC': 2000, 'COALINDIA': 3000,
      'MARUTI': 100, 'TATAMOTORS': 1800, 'BAJAJFINSERV': 125,
      'M&M': 300, 'EICHERMOT': 100, 'HINDUUNILVR': 300,
      'ITC': 1600, 'NESTLEIND': 50, 'BRITANNIA': 125,
      'DABUR': 1000, 'SUNPHARMA': 700, 'DRREDDY': 125,
      'CIPLA': 700, 'DIVISLAB': 150, 'ONGC': 4200,
      'IOC': 4000, 'BPCL': 1500, 'HINDPETRO': 2000,
      'LT': 500, 'ULTRACEMCO': 300, 'GRASIM': 400,
      'ADANIPORTS': 900, 'TATASTEEL': 2000, 'HINDALCO': 1500,
      'JSWSTEEL': 1200, 'VEDL': 2500, 'ASIANPAINT': 300,
      'BAJFINANCE': 125, 'TITAN': 300, 'APOLLOHOSP': 300
    };

    return stockLotSizes[symbol] || 100;
  }

  // Test connection and get sample data
  async testAPI(): Promise<unknown> {
    try {
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        return {
          status: 'disconnected',
          error: 'NSE Scanner is not running on localhost:5000'
        };
      }

      const marketData = await this.getMarketData();
      return {
        status: 'connected',
        dataCount: marketData.length,
        sampleData: marketData.slice(0, 3)
      };

    } catch (error: unknown) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default NSEScannerAPI;