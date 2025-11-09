import { NextResponse } from 'next/server';

// Hugging Face Space URL - Updated to your new space
const HUGGING_FACE_API_URL = 'https://taddsteam-market-data-api.hf.space';

interface MarketData {
  symbol: string;
  lotSize: number;
  returns: {
    current: number;
    near: number;
    far: number;
  };
  lastUpdated: string;
}

interface HuggingFaceItem {
  symbol: string;
  ask: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  change_percent: number;
  volume: number;
  bid: number;
  timestamp: string;
}


// Helper function to extract lot size from symbol
function getLotSizeFromSymbol(symbol: string): number {
  // Common lot sizes for NSE futures
  const lotSizes: Record<string, number> = {
    'NIFTY': 25, 'BANKNIFTY': 15, 'FINNIFTY': 40, 'MIDCPNIFTY': 75,
    'RELIANCE': 250, 'TCS': 150, 'INFY': 300, 'HDFCBANK': 550,
    'ICICIBANK': 1375, 'SBIN': 1500, 'ITC': 3200, 'BHARTIARTL': 1800,
    'HINDUNILVR': 300, 'ASIANPAINT': 400, 'LT': 225, 'AXISBANK': 1200,
    'MARUTI': 100, 'TATAMOTORS': 1800, 'HCLTECH': 700, 'WIPRO': 3000
  };
  
  // Extract base symbol (remove expiry suffix like 25OCTFUT, 25NOVFUT, etc.)
  const baseSymbol = symbol.replace(/\d{2}[A-Z]{3,6}FUT$/, '');
  return lotSizes[baseSymbol] || 100; // Default to 100 if not found
}

// Helper function to categorize expiry type from symbol
function getExpiryCategory(symbol: string): 'current' | 'near' | 'far' | 'unknown' {
  // Extract month and determine expiry category
  if (symbol.includes('25NOV') || symbol.includes('24NOV')) return 'current';
  if (symbol.includes('30DEC') || symbol.includes('25DEC')) return 'near';
  if (symbol.includes('27JAN') || symbol.includes('28JAN')) return 'far';
  
  return 'unknown';
}

export async function GET() {
  try {
    // Fetch from Hugging Face backend using the new endpoint
    const hfResponse = await fetch(`${HUGGING_FACE_API_URL}/api/market-data`, {
      next: { revalidate: 30 }, // Revalidate every 30 seconds
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face API error: ${hfResponse.status}`);
    }

    const hfData = await hfResponse.json();
    
    // Transform Hugging Face data to match our MarketData format
    // Note: Your new API doesn't have a status field, so we'll check if data exists
    if (hfData.data) {
      // Group data by base symbol (without expiry)
      const groupedData: Record<string, { current?: HuggingFaceItem; near?: HuggingFaceItem; far?: HuggingFaceItem }> = {};
      
      // Categorize contracts by expiry
      Object.values(hfData.data).forEach((item) => {
        // Type assertion since we know the structure
        const typedItem = item as HuggingFaceItem;
        const baseSymbol = typedItem.symbol.replace(/\d{2}[A-Z]{3,6}FUT$/, '');
        const category = getExpiryCategory(typedItem.symbol);
        
        if (category !== 'unknown') {
          if (!groupedData[baseSymbol]) {
            groupedData[baseSymbol] = {};
          }
          groupedData[baseSymbol][category] = typedItem;
        }
      });
      
      // Create MarketData array
      const marketData: MarketData[] = Object.entries(groupedData)
        .filter((entry) => entry[1].current) // Only include if current month data exists
        .map(([baseSymbol, contracts]) => {
          const currentData = contracts.current!;
          const nearData = contracts.near;
          const farData = contracts.far;
          
          return {
            symbol: baseSymbol,
            lotSize: getLotSizeFromSymbol(baseSymbol),
            returns: {
              current: Number(currentData.change_percent.toFixed(2)),
              near: nearData ? Number(nearData.change_percent.toFixed(2)) : Number((currentData.change_percent * 1.2).toFixed(2)),
              far: farData ? Number(farData.change_percent.toFixed(2)) : Number((currentData.change_percent * 1.5).toFixed(2)),
            },
            lastUpdated: currentData.timestamp,
          };
        });

      return NextResponse.json(marketData);
    } else {
      // If no data, return empty array
      return NextResponse.json([]);
    }
  } catch (error: unknown) {
    console.error('Hugging Face API failed:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Hugging Face API', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}