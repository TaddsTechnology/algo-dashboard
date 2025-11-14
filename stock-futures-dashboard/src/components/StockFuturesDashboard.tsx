"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, TrendingUp } from 'lucide-react';
import { setCachedData } from './QueryProvider';

type ExpiryType = 'current' | 'near' | 'far';

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

type LiveItem = { 
  symbol: string; 
  ask?: number; 
  ltp?: number; 
  volume?: number; 
  change?: number; 
  change_pct?: number; 
  contract_info?: { lot_size?: number } 
};

interface ExtendedMarketData extends MarketData {
  category?: string;
  volume?: number;
  ask?: number;
  change?: number;
}

interface TableRow extends ExtendedMarketData {
  y: number; // Lot × Current%
  x: number; // Lot × Future%  
  profit: number; // Y - X
  futureReturn: number; // Selected expiry return
  currentAsk?: number;
  futureAsk?: number;
  currentSymbol?: string;
  nearSymbol?: string;
  farSymbol?: string;
  selectedAsk?: number;
}



// Current NSE F&O lot sizes (updated from Kite script Dec 2025 data)
const LOT_SIZE_MAP: Record<string, number> = {
  // Index Futures
  'BANKNIFTY': 35,
  'NIFTY': 75,
  'FINNIFTY': 65,
  'MIDCPNIFTY': 140,
  'NIFTYNXT50': 25,
  
  // Individual Stock Futures - Exact from Kite API
  '360ONE': 500,
  'ABB': 125,
  'ABCAPITAL': 3100,
  'ADANIENSOL': 675,
  'ADANIENT': 300,
  'ADANIGREEN': 600,
  'ADANIPORTS': 475,
  'ALKEM': 125,
  'AMBER': 100,
  'AMBUJACEM': 1050,
  'ANGELONE': 250,
  'APLAPOLLO': 350,
  'APOLLOHOSP': 125,
  'ASHOKLEY': 5000,
  'ASIANPAINT': 250,
  'ASTRAL': 425,
  'AUBANK': 1000,
  'AUROPHARMA': 550,
  'AXISBANK': 625,
  'BAJAJ-AUTO': 75,
  'BAJAJFINSV': 250,
  'BAJFINANCE': 750,
  'BANDHANBNK': 3600,
  'BANKBARODA': 2925,
  'BANKINDIA': 5200,
  'BDL': 325,
  'BEL': 1425,
  'BHARATFORG': 500,
  'BHARTIARTL': 475,
  'BHEL': 2625,
  'BIOCON': 2500,
  'BLUESTARCO': 325,
  'BOSCHLTD': 25,
  'BPCL': 1975,
  'BRITANNIA': 125,
  'BSE': 375,
  'CAMS': 150,
  'CANBK': 6750,
  'CDSL': 475,
  'CGPOWER': 850,
  'CHOLAFIN': 625,
  'CIPLA': 375,
  'COALINDIA': 1350,
  'COFORGE': 375,
  'COLPAL': 225,
  'CONCOR': 1250,
  'CROMPTON': 1800,
  'CUMMINSIND': 200,
  'CYIENT': 425,
  'DABUR': 1250,
  'DALBHARAT': 325,
  'DELHIVERY': 2075,
  'DIVISLAB': 100,
  'DIXON': 50,
  'DLF': 825,
  'DMART': 150,
  'DRREDDY': 625,
  'EICHERMOT': 175,
  'ETERNAL': 2425,
  'EXIDEIND': 1800,
  'FEDERALBNK': 5000,
  'FORTIS': 775,
  'GAIL': 3150,
  'GLENMARK': 375,
  'GMRAIRPORT': 6975,
  'GODREJCP': 500,
  'GODREJPROP': 275,
  'GRASIM': 250,
  'HAL': 150,
  'HAVELLS': 500,
  'HCLTECH': 350,
  'HDFCAMC': 150,
  'HDFCBANK': 550,
  'HDFCLIFE': 1100,
  'HEROMOTOCO': 150,
  'HFCL': 6450,
  'HINDALCO': 700,
  'HINDPETRO': 2025,
  'HINDUNILVR': 300,
  'HINDZINC': 1225,
  'HUDCO': 2775,
  'ICICIBANK': 700,
  'ICICIGI': 325,
  'ICICIPRULI': 925,
  'IDEA': 71475,
  'IDFCFIRSTB': 9275,
  'IEX': 3750,
  'IIFL': 1650,
  'INDHOTEL': 1000,
  'INDIANB': 1000,
  'INDIGO': 150,
  'INDUSINDBK': 700,
  'INDUSTOWER': 1700,
  'INFY': 400,
  'INOXWIND': 3272,
  'IOC': 4875,
  'IRCTC': 875,
  'IREDA': 3450,
  'IRFC': 4250,
  'ITC': 1600,
  'JINDALSTEL': 625,
  'JIOFIN': 2350,
  'JSWENERGY': 1000,
  'JSWSTEEL': 675,
  'JUBLFOOD': 1250,
  'KALYANKJIL': 1175,
  'KAYNES': 100,
  'KEI': 175,
  'KFINTECH': 450,
  'KOTAKBANK': 400,
  'KPITTECH': 400,
  'LAURUSLABS': 850,
  'LICHSGFIN': 1000,
  'LICI': 700,
  'LODHA': 450,
  'LT': 175,
  'LTF': 4462,
  'LTIM': 150,
  'LUPIN': 425,
  'M&M': 200,
  'MANAPPURAM': 3000,
  'MANKIND': 225,
  'MARICO': 1200,
  'MARUTI': 50,
  'MAXHEALTH': 525,
  'MAZDOCK': 175,
  'MCX': 125,
  'MFSL': 400,
  'MOTHERSON': 6150,
  'MPHASIS': 275,
  'MUTHOOTFIN': 275,
  'NATIONALUM': 3750,
  'NAUKRI': 375,
  'NBCC': 6500,
  'NCC': 2700,
  'NESTLEIND': 500,
  'NHPC': 6400,
  'NMDC': 6750,
  'NTPC': 1500,
  'NUVAMA': 75,
  'NYKAA': 3125,
  'OBEROIRLTY': 350,
  'OFSS': 75,
  'OIL': 1400,
  'ONGC': 2250,
  'PAGEIND': 15,
  'PATANJALI': 900,
  'PAYTM': 725,
  'PERSISTENT': 100,
  'PETRONET': 1800,
  'PFC': 1300,
  'PGEL': 700,
  'PHOENIXLTD': 350,
  'PIDILITIND': 500,
  'PIIND': 175,
  'PNB': 8000,
  'PNBHOUSING': 650,
  'POLICYBZR': 350,
  'POLYCAB': 125,
  'POWERGRID': 1900,
  'POWERINDIA': 50,
  'PPLPHARMA': 2500,
  'PRESTIGE': 450,
  'RBLBANK': 3175,
  'RECLTD': 1275,
  'RELIANCE': 500,
  'RVNL': 1375,
  'SAIL': 4700,
  'SAMMAANCAP': 4300,
  'SBICARD': 800,
  'SBILIFE': 375,
  'SBIN': 750,
  'SHREECEM': 25,
  'SHRIRAMFIN': 825,
  'SIEMENS': 125,
  'SOLARINDS': 75,
  'SONACOMS': 1050,
  'SRF': 200,
  'SUNPHARMA': 350,
  'SUPREMEIND': 175,
  'SUZLON': 8000,
  'SYNGENE': 1000,
  'TATACONSUM': 550,
  'TATAELXSI': 100,
  'TATAPOWER': 1450,
  'TATASTEEL': 5500,
  'TATATECH': 800,
  'TCS': 175,
  'TECHM': 600,
  'TIINDIA': 200,
  'TITAGARH': 725,
  'TITAN': 175,
  'TMPV': 800,
  'TORNTPHARM': 250,
  'TORNTPOWER': 375,
  'TRENT': 100,
  'TVSMOTOR': 175,
  'ULTRACEMCO': 50,
  'UNIONBANK': 4425,
  'UNITDSPR': 400,
  'UNOMINDA': 550,
  'UPL': 1355,
  'VBL': 1025,
  'VEDL': 1150,
  'VOLTAS': 375,
  'WIPRO': 3000,
  'YESBANK': 31100,
  'ZYDUSLIFE': 900,
};

// Helper function to categorize expiry type from symbol
function getExpiryCategory(symbol: string): 'current' | 'near' | 'far' | 'unknown' {
  // Extract month and determine expiry category
  // Current/Near-term: November contracts
  if (symbol.includes('NOV')) return 'current';
  // Near/Next: December contracts
  if (symbol.includes('DEC')) return 'near';
  // Far: January contracts
  if (symbol.includes('JAN')) return 'far';
  
  return 'unknown';
}

// Helper function to get lot size from symbol
function getLotSize(symbol: string): number {
  // Extract base symbol (remove expiry suffixes like 25NOVFUT, 25OCTFUT, etc.)
  let baseSymbol = symbol.replace(/\d{2}[A-Z]{3}FUT$/, '').replace(/FUT$/, '');
  
  // Handle common symbol variations
  if (baseSymbol.includes('-')) {
    baseSymbol = baseSymbol.replace('-', '_'); // BAJAJ-AUTO -> BAJAJ_AUTO
  }
  
  const lotSize = LOT_SIZE_MAP[baseSymbol];
  
  // Debug: log missing mappings (remove in production)
  if (!lotSize) {
    console.warn(`Missing lot size mapping for: ${baseSymbol} (from ${symbol})`);
  }
  
  return lotSize || 100; // Default to 100 if not found
}

export default function StockFuturesDashboard() {
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryType>('near'); // Default to near for better profits
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [showOnlyProfitable, setShowOnlyProfitable] = useState<boolean>(true); // Filter profitable trades
  const [sortBy, setSortBy] = useState<'profit' | 'change' | 'symbol'>('profit');
  const [currentTime, setCurrentTime] = useState<string>('');
  const { toast } = useToast();
  const lastQualifyingSymbolsRef = useRef<string[]>([]);

  // Live data from SSE stream
  type ExtendedRow = TableRow; // alias for clarity
  const [liveData, setLiveData] = useState<ExtendedRow[]>([]);
  const liveMapRef = useRef<Record<string, ExtendedRow>>({});

  // Fetch both current month and selected futures expiry data
  const { data: marketData = [], isLoading, error, isFetching } = useQuery<ExtendedMarketData[], Error>({
    queryKey: ['market-data', selectedExpiry],
    queryFn: async (): Promise<ExtendedMarketData[]> => {
      try {
        // Always fetch LIVE DATA as baseline (common for all comparisons)
        const liveDataResponse = await fetch('https://taddsteam-algo.hf.space/api/live-data', {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });

        if (!liveDataResponse.ok) throw new Error('Failed to fetch live data');
        const liveDataResult = await liveDataResponse.json();
        
        // Fetch selected futures expiry data
        const endpointMap = {
          current: 'https://taddsteam-algo.hf.space/api/near-futures',   // Near button → near-futures
          near: 'https://taddsteam-algo.hf.space/api/next-futures',      // Next button → next-futures
          far: 'https://taddsteam-algo.hf.space/api/far-futures',        // Far button → far-futures
        };
        
        const selectedEndpoint = endpointMap[selectedExpiry];
        const selectedResponse = await fetch(selectedEndpoint, {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });

        if (!selectedResponse.ok) throw new Error('Failed to fetch selected expiry data');
        const selectedResult = await selectedResponse.json();
        
        if (!liveDataResult.data || !selectedResult.data) {
          console.warn('No data in API response');
          return [];
        }
        
        console.log(`Live data count: ${Object.keys(liveDataResult.data).length}`);
        console.log(`Selected expiry (${selectedExpiry}) data count: ${Object.keys(selectedResult.data).length}`);

      // Build a map of base symbols from live data
      const getBaseSymbol = (symbol: string) => symbol.replace(/\d{2}[A-Z]{3}FUT$/, '').replace('FUT', '');
      const liveDataMap: Record<string, LiveItem> = {};
      
      Object.values(liveDataResult.data as Record<string, unknown>).forEach((raw: unknown) => {
        const item = raw as LiveItem;
        const baseSymbol = getBaseSymbol(item.symbol);
        liveDataMap[baseSymbol] = item;
      });
      
      console.log(`Live data base symbols: ${Object.keys(liveDataMap).length}`);
      console.log(`Sample base symbols:`, Object.keys(liveDataMap).slice(0, 5));

      // Match selected futures with live data and calculate differences
      const results = Object.values(selectedResult.data as Record<string, unknown>)
        .map((raw: unknown) => {
          const item = raw as LiveItem & { contract_info?: { lot_size?: number } };
          const baseSymbol = getBaseSymbol(item.symbol);
          const liveSpotItem = liveDataMap[baseSymbol];
          
          if (!liveSpotItem) {
            console.warn(`No live spot data for ${baseSymbol} (${item.symbol})`);
            return null; // Skip if no matching live spot data
          }
          
          // Use ASK if available (market open), fallback to LTP (market closed)
          // Live data: prefer ask, fallback to ltp
          const liveSpotAsk = liveSpotItem.ask && liveSpotItem.ask > 0 ? liveSpotItem.ask : liveSpotItem.ltp;
          // Futures: prefer ask, fallback to ltp
          const futuresAsk = item.ask && item.ask > 0 ? item.ask : item.ltp;
          const lotSize = item.contract_info?.lot_size || getLotSize(item.symbol);
          
          // Skip if either price is 0 or missing
          if (!liveSpotAsk || !futuresAsk || liveSpotAsk === 0 || futuresAsk === 0) {
            console.warn(`Missing or zero price for ${baseSymbol}: live=${liveSpotAsk}, futures=${futuresAsk}`);
            return null;
          }
          
          // Calculate: (Futures ASK - Live Spot ASK) / Live Spot ASK × 100
          const priceDiff = futuresAsk - liveSpotAsk;
          const changePercent = liveSpotAsk > 0 ? (priceDiff / liveSpotAsk) * 100 : 0; // Percentage
          
          return {
            symbol: item.symbol,
            lotSize,
            volume: item.volume || 0,
            ask: futuresAsk,
            change: priceDiff,
            returns: {
              current: Number(changePercent.toFixed(2)), // Store percentage
              near: 0,
              far: 0,
            },
            lastUpdated: new Date().toISOString(),
            category: selectedExpiry,
            currentAsk: liveSpotAsk,
            selectedAsk: futuresAsk,
          } as ExtendedRow;
        })
        .filter(item => item !== null) as ExtendedMarketData[];
      
        console.log(`✅ Fetched ${results.length} contracts for ${selectedExpiry} expiry`);
        if (results.length === 0) {
          console.warn(`⚠️ No contracts after filtering for ${selectedExpiry}!`);
          console.log('First selected contract:', Object.values(selectedResult.data)[0]);
          console.log('First live contract:', Object.values(liveDataResult.data)[0]);
        } else {
          // Log first few results to see profit values
          console.log('Sample profits:', results.slice(0, 5).map(r => `${r.symbol}: ${r.returns.current}%`));
          const profitable = results.filter(r => r.returns.current > 0).length;
          console.log(`Profitable contracts (>0%): ${profitable} out of ${results.length}`);
        }
        return results;
      } catch (error) {
        console.error('Error fetching market data:', error);
        return []; // Always return empty array on error
      }
    },
    staleTime: 1000, // Cache data for 1 second before considering stale
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchInterval: false, // Using SSE for real-time updates
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Show cached data immediately while fetching fresh data
    placeholderData: (previousData) => previousData,
  });


  // Process and calculate table rows for selected expiry
  const processedRows = useMemo((): TableRow[] => {
    // Use live data from SSE if available, otherwise fall back to fetched marketData
    const dataSource = liveData.length > 0 ? liveData : marketData;
    
    console.log(`📊 Data source status: liveData=${liveData.length}, marketData=${marketData.length}`);
    
    if (!dataSource.length) {
      console.log('⚠️ No data available');
      return [];
    }
    console.log(`Processing ${dataSource.length} items (source: ${liveData.length > 0 ? 'SSE' : 'API'})`);

    // Filter SSE data by selected expiry category
    const filteredData = liveData.length > 0 
      ? (dataSource as ExtendedRow[]).filter((stock) => stock.category === selectedExpiry)
      : (dataSource as ExtendedRow[]);
    
    console.log(`After expiry filter (${selectedExpiry}): ${filteredData.length} items`);
    if (liveData.length > 0 && filteredData.length === 0) {
      console.warn(`⚠️ No data after category filter! Available categories:`, 
        Array.from(new Set((dataSource as ExtendedRow[]).map(s => s.category))));
    }

    return filteredData.map(stock => {
      const lotSize = stock.lotSize;
      // Extract current price (live spot price)
      const currentAsk = stock.currentAsk ?? stock.ask ?? 0;
      
      // Debug first item
      if (filteredData.indexOf(stock) === 0) {
        console.log('First stock data:', {
          symbol: stock.symbol,
          currentAsk,
          nearAsk: (stock as unknown as { nearAsk?: number }).nearAsk,
          farAsk: (stock as unknown as { farAsk?: number }).farAsk,
          returns: stock.returns,
          category: stock.category,
        });
      }
      
      // Get the selected expiry price based on user selection
      let selectedAsk = currentAsk;
      let changePercent = 0;
      
      // Check if data has pre-calculated returns (from API) or needs calculation (from SSE)
      if (stock.returns && typeof stock.returns === 'object') {
        // API data with pre-calculated returns
        // Note: API fetches specific expiry data, so returns.current has the profit for that expiry
        selectedAsk = stock.ask || currentAsk;
        changePercent = stock.returns.current || 0;
      } else {
        // SSE data - calculate returns on the fly
        if (selectedExpiry === 'current') {
          selectedAsk = (stock as unknown as { nearAsk?: number }).nearAsk ?? currentAsk;
        } else if (selectedExpiry === 'near') {
          selectedAsk = (stock as unknown as { nearAsk?: number }).nearAsk ?? currentAsk;
        } else if (selectedExpiry === 'far') {
          selectedAsk = (stock as unknown as { farAsk?: number }).farAsk ?? currentAsk;
        }
        
        // Calculate percentage change: (selectedAsk - currentAsk) / currentAsk * 100
        if (currentAsk > 0 && selectedAsk !== currentAsk) {
          changePercent = ((selectedAsk - currentAsk) / currentAsk) * 100;
        }
      }
      
      // Profit percentage
      const profit = changePercent;
      
      // Y = Lot Size × Change% (profit amount in rupees)
      const y = Number((lotSize * (changePercent / 100)).toFixed(2));

      const row = {
        ...stock,
        lotSize,
        y,
        x: y,
        profit: Number(profit.toFixed(2)),
        futureReturn: changePercent,
        futureAsk: selectedAsk,
        currentAsk,
        // Keep original category from stock data, don't overwrite
        category: stock.category || selectedExpiry,
      } as TableRow & { futureAsk: number; currentAsk: number };
      
      // Debug: log first few rows with their profit values
      if (filteredData.indexOf(stock) < 3) {
        console.log(`Row ${filteredData.indexOf(stock)}: ${row.symbol} profit=${row.profit} (type: ${typeof row.profit})`);
      }
      
      return row;
    });
  }, [liveData, marketData, selectedExpiry]);

  // Filter and sort with smart pinning for high-profit stocks
  const filteredAndSortedRows = useMemo(() => {
    let filtered = processedRows;
    
    console.log(`📊 ProcessedRows: ${processedRows.length}`);
    if (processedRows.length > 0) {
      console.log(`Sample row:`, processedRows[0]);
      console.log(`Profit range: ${Math.min(...processedRows.map(r => r.profit))} to ${Math.max(...processedRows.map(r => r.profit))}`);
      // Debug: Show top 10 by profit to see if high-profit stocks exist
      const top10 = [...processedRows].sort((a, b) => b.profit - a.profit).slice(0, 10);
      console.log(`Top 10 stocks by profit:`, top10.map(r => `${r.symbol} (${r.category}): ${r.profit}%`));
    }
    
    // Filter profitable trades only if enabled
    if (showOnlyProfitable) {
      filtered = filtered.filter(row => row.profit > 0);
      console.log(`💰 After profitable filter: ${filtered.length} (showOnlyProfitable: ${showOnlyProfitable})`);
    }
    
    // Sort based on selected criteria
    const sorted = filtered.sort((a, b) => {
      if (sortBy === 'profit') return b.profit - a.profit;
      if (sortBy === 'change') return b.futureReturn - a.futureReturn;
      return a.symbol.localeCompare(b.symbol);
    });
    
    console.log(`📋 Final filtered rows: ${sorted.length}`);
    return sorted;
  }, [processedRows, showOnlyProfitable, sortBy]);

  // Search functionality
  const searchFilteredRows = useMemo(() => {
    if (!searchSymbol.trim()) return filteredAndSortedRows;
    return filteredAndSortedRows.filter(row =>
      row.symbol.toLowerCase().includes(searchSymbol.toLowerCase())
    );
  }, [filteredAndSortedRows, searchSymbol]);

  // Handle toast notifications with dynamic thresholds based on expiry
  const showQualifyingToast = useCallback(() => {
    // Determine profit threshold based on selected expiry (in percentage)
    const thresholdMap = {
      current: 1.0, // Near: ≥1%
      near: 2.0,    // Next: ≥2%
      far: 3.0,     // Far: ≥3%
    };
    
    const profitThreshold = thresholdMap[selectedExpiry];
    
    // Filter stocks based on the threshold for selected expiry
    const qualifyingStocks = processedRows
      .filter(row => row.profit >= profitThreshold)
      .map(row => ({ symbol: row.symbol, profit: row.profit, futureReturn: row.futureReturn, category: row.category }))
      .sort((a, b) => b.profit - a.profit); // Sort by profit DESC
    
    // Debug: log qualifying stocks
    if (qualifyingStocks.length > 0) {
      console.log(`🚨 Toast qualifying stocks (≥${profitThreshold}%):`, qualifyingStocks.slice(0, 5).map(s => `${s.symbol} (${s.category}): ${s.profit}%`));
    }

    if (qualifyingStocks.length > 0) {
      const currentData = qualifyingStocks.map(s => `${s.symbol}:${s.profit}`);
      const lastData = lastQualifyingSymbolsRef.current;

      // Always show toast on data change (continuous updates)
      if (JSON.stringify(currentData) !== JSON.stringify(lastData)) {
        const message = qualifyingStocks
          .slice(0, 8) // Show max 8 stocks to avoid very long toasts
          .map(stock => `${stock.symbol} (+${stock.profit.toFixed(2)}%)`)
          .join(', ');

        const moreCount = qualifyingStocks.length > 8 ? qualifyingStocks.length - 8 : 0;
        const finalMessage = moreCount > 0 ? `${message} and ${moreCount} more` : message;
        
        // Dynamic title based on expiry type
        const expiryLabel = selectedExpiry === 'current' ? 'NEAR' : selectedExpiry === 'near' ? 'NEXT' : 'FAR';

        toast({
          title: `🚀 ${expiryLabel} PROFIT ALERT ≥${profitThreshold}%: ${qualifyingStocks.length} STOCKS!`,
          description: finalMessage,
          duration: 6000,
          className: 'border-2 border-green-500 bg-green-50 text-green-900 shadow-2xl',
          style: {
            fontSize: '16px',
            fontWeight: 'bold',
          },
        });

        lastQualifyingSymbolsRef.current = currentData;
      }
    } else {
      // Clear the ref when no qualifying stocks
      if (lastQualifyingSymbolsRef.current.length > 0) {
        lastQualifyingSymbolsRef.current = [];
      }
    }
  }, [processedRows, toast, selectedExpiry]);

  // Show toast when data changes (continuous updates every 30s)
  useEffect(() => {
    if (processedRows.length > 0) {
      // Immediate toast check
      showQualifyingToast();
      
      // Set up interval for continuous updates every 30 seconds
      const interval = setInterval(showQualifyingToast, 30000);
      return () => clearInterval(interval);
    }
  }, [processedRows, showQualifyingToast]);

  // Update time on client-side only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    };
    
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Save data to cache when it updates
  useEffect(() => {
    if (marketData && marketData.length > 0) {
      setCachedData(marketData);
    }
  }, [marketData]);

  // SSE stream for real-time updates
  useEffect(() => {
    console.log('🔌 Initializing SSE connection...');
    const source = new EventSource('https://taddsteam-algo.hf.space/api/stream');

    source.addEventListener('open', () => {
      console.log('✅ SSE connection established');
    });

    const handleMessage = (e: MessageEvent) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`📨 SSE message received at ${timestamp}`);
      try {
        const payload = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
        console.log('Raw SSE payload keys:', Object.keys(payload));
        // Normalize shape: { data: { current, near, far } } or { current, near, far }
        const root = payload?.data && (payload.data.current || payload.data.near || payload.data.far)
          ? payload.data
          : payload;

        const currentData = root.current ? { data: root.current } : undefined;
        const nearData = root.near ? { data: root.near } : undefined;
        const nextData = root.next ? { data: root.next } : undefined; // next is same as near
        const farData = root.far ? { data: root.far } : undefined;

        if (!currentData && !nearData && !nextData && !farData) return; // Unknown shape

        type PriceEntry = {
          spot?: number;           // Spot price (from 'current' bucket without FUT)
          nearFut?: number;        // NOV futures
          nextFut?: number;        // DEC futures  
          farFut?: number;         // JAN futures
          lotSize?: number;
          nearFutSymbol?: string;
          nextFutSymbol?: string;
          farFutSymbol?: string;
          dailyChange?: number;
          dailyChangePct?: number;
          volume?: number;
        };
        const priceMap: Record<string, PriceEntry> = {};

        const getBaseSymbol = (symbol: string) => symbol.replace(/\d{2}[A-Z]{3}FUT$/, '');

        const ingest = (bucket?: unknown) => {
          if (!bucket || typeof bucket !== 'object' || !('data' in bucket)) return;
          const dataObj = (bucket as { data: Record<string, unknown> }).data;
          const items = Object.values(dataObj) as unknown[];
          console.log(`Ingesting ${items.length} items, first symbol:`, (items[0] as { symbol?: string } | undefined)?.symbol);
          items.forEach((raw: unknown) => {
            const item = raw as LiveItem;
            const baseSymbol = getBaseSymbol(item.symbol);
            if (!priceMap[baseSymbol]) priceMap[baseSymbol] = {};
            const expCat = getExpiryCategory(item.symbol);
            if (priceMap[baseSymbol] && Object.keys(priceMap).length < 3) {
              console.log(`Symbol: ${item.symbol}, expiry category: ${expCat}`);
            }
            // Map SSE data: spot prices vs futures
            if (expCat === 'unknown') {
              // Spot price (no FUT suffix)
              const spotPrice = item.ask || item.ltp;
              priceMap[baseSymbol].spot = spotPrice;
              if (Object.keys(priceMap).length < 3) {
                console.log(`Stored spot for ${baseSymbol}: ${spotPrice}`);
              }
            } else if (expCat === 'current') {
              // NOV futures → 'current' category (Near button)
              priceMap[baseSymbol].nearFut = item.ask;
              priceMap[baseSymbol].nearFutSymbol = item.symbol;
            } else if (expCat === 'near') {
              // DEC futures → 'near' category (Next button)
              priceMap[baseSymbol].nextFut = item.ask;
              priceMap[baseSymbol].nextFutSymbol = item.symbol;
            } else if (expCat === 'far') {
              // JAN futures → 'far' category (Far button)
              priceMap[baseSymbol].farFut = item.ask;
              priceMap[baseSymbol].farFutSymbol = item.symbol;
            }
            const lot = item.contract_info?.lot_size || getLotSize(item.symbol);
            priceMap[baseSymbol].lotSize = priceMap[baseSymbol].lotSize || lot;
            priceMap[baseSymbol].dailyChange = item.change || priceMap[baseSymbol].dailyChange || 0;
            priceMap[baseSymbol].dailyChangePct = item.change_pct || priceMap[baseSymbol].dailyChangePct || 0;
            priceMap[baseSymbol].volume = item.volume || priceMap[baseSymbol].volume || 0;
          });
        };

        ingest(currentData);
        ingest(nearData);
        ingest(nextData);
        ingest(farData);

        console.log(`PriceMap entries: ${Object.keys(priceMap).length}`);
        if (Object.keys(priceMap).length > 0) {
          const sample = Object.entries(priceMap)[0];
          console.log(`Sample priceMap entry:`, sample);
          const entriesWithSpot = Object.entries(priceMap).filter((entry) => entry[1].spot).length;
          const entriesWithNearFut = Object.entries(priceMap).filter((entry) => entry[1].nearFut).length;
          console.log(`Entries with spot: ${entriesWithSpot}, with nearFut: ${entriesWithNearFut}`);
        }

        // Create contract-specific entries instead of base symbol entries
        const extended: ExtendedRow[] = [];
        
        Object.values(priceMap).forEach((prices: PriceEntry) => {
          const spotPrice = prices.spot || 0;
          const lotSize = prices.lotSize || 100;
          
          if (!spotPrice) return; // Skip if no spot price
          
          // Add NOV futures contract if available (Near button)
          if (prices.nearFutSymbol && prices.nearFut) {
            const changePercent = ((prices.nearFut - spotPrice) / spotPrice) * 100;
            const profitPercent = Number(changePercent.toFixed(2));
            extended.push({
              symbol: prices.nearFutSymbol,
              lotSize,
              volume: prices.volume || 0,
              ask: prices.nearFut,
              change: prices.nearFut - spotPrice,
              returns: {
                current: profitPercent,
                near: 0,
                far: 0
              },
              lastUpdated: new Date().toISOString(),
              category: 'current',
              currentAsk: spotPrice,
              selectedAsk: prices.nearFut,
              y: Number((lotSize * (profitPercent / 100)).toFixed(2)),
              x: 0,
              profit: profitPercent,  // FIX: profit is percentage, not rupees
              futureReturn: profitPercent,
            });
          }
          
          // Add DEC futures contract if available (Next button)
          if (prices.nextFutSymbol && prices.nextFut) {
            const changePercent = ((prices.nextFut - spotPrice) / spotPrice) * 100;
            const profitPercent = Number(changePercent.toFixed(2));
            extended.push({
              symbol: prices.nextFutSymbol,
              lotSize,
              volume: prices.volume || 0,
              ask: prices.nextFut,
              change: prices.nextFut - spotPrice,
              returns: {
                current: profitPercent,
                near: 0,
                far: 0
              },
              lastUpdated: new Date().toISOString(),
              category: 'near',
              currentAsk: spotPrice,
              selectedAsk: prices.nextFut,
              y: Number((lotSize * (profitPercent / 100)).toFixed(2)),
              x: 0,
              profit: profitPercent,  // FIX: profit is percentage, not rupees
              futureReturn: profitPercent,
            });
          }
          
          // Add JAN futures contract if available (Far button)
          if (prices.farFutSymbol && prices.farFut) {
            const changePercent = ((prices.farFut - spotPrice) / spotPrice) * 100;
            const profitPercent = Number(changePercent.toFixed(2));
            extended.push({
              symbol: prices.farFutSymbol,
              lotSize,
              volume: prices.volume || 0,
              ask: prices.farFut,
              change: prices.farFut - spotPrice,
              returns: {
                current: profitPercent,
                near: 0,
                far: 0
              },
              lastUpdated: new Date().toISOString(),
              category: 'far',
              currentAsk: spotPrice,
              selectedAsk: prices.farFut,
              y: Number((lotSize * (profitPercent / 100)).toFixed(2)),
              x: 0,
              profit: profitPercent,  // FIX: profit is percentage, not rupees
              futureReturn: profitPercent,
            });
          }
        });

        if (extended.length) {
          console.log(`📡 SSE Update: ${extended.length} contracts received`);
          console.log(`Sample SSE contracts:`, extended.slice(0, 3).map(c => ({
            symbol: c.symbol,
            category: c.category,
            profit: c.returns.current
          })));
          const map = liveMapRef.current;
          for (const row of extended) {
            const sym = row.symbol;
            map[sym] = { ...(map[sym] || {}), ...row };
          }
          const merged = Object.values(map);
          console.log(`📊 SSE merged data: ${merged.length} total contracts`);
          const currentCount = (merged as ExtendedRow[]).filter((m) => m.category === 'current').length;
          const nearCount = (merged as ExtendedRow[]).filter((m) => m.category === 'near').length;
          const farCount = (merged as ExtendedRow[]).filter((m) => m.category === 'far').length;
          console.log(`Categories: ${currentCount} current (Near button), ${nearCount} near (Next button), ${farCount} far (Far button)`);
          setLiveData(merged as ExtendedRow[]);
          setCachedData(merged);
        } else {
          console.warn('⚠️ No extended data created from SSE');
        }
      } catch (err) {
        console.error('❌ SSE parsing error:', err);
      }
    };

    source.addEventListener('message', handleMessage);
    source.addEventListener('error', () => {
      console.error('❌ SSE connection error');
      // keep connection; EventSource auto-reconnects
    });

    return () => {
      source.removeEventListener('message', handleMessage);
      try { source.close(); } catch {}
    };
  }, []);


  // No manual refetch needed - using SSE for real-time updates



  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600">Error loading market data: {error.message}</div>
        <div className="text-sm text-gray-500 mt-2">Trying to connect to algo backend at https://taddsteam-algo.hf.space</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Futures Watch</h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span>Live Data</span>
              <div className={`w-2 h-2 rounded-full ${
                isFetching ? 'bg-yellow-500 animate-ping' : 'bg-green-500'
              }`} />
            </div>
            {isFetching && (
              <span className="text-xs text-yellow-600 font-medium animate-pulse">
                Updating...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Statistics Dashboard */}
      <div className="bg-blue-50 border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Total Contracts</div>
            <div className="text-2xl font-bold text-gray-900">{searchFilteredRows.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Profitable</div>
            <div className="text-2xl font-bold text-green-600">
              {processedRows.filter(r => r.profit > 0).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">High Profit (≥3%)</div>
            <div className="text-2xl font-bold text-green-600">
              {processedRows.filter(r => r.profit >= 3).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Best Profit</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.max(...processedRows.map(r => r.profit), 0).toFixed(2)}%
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 font-medium">Last Update</div>
            <div className="text-sm font-semibold text-gray-700" suppressHydrationWarning>
              {currentTime || '--:--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Expiry Selection Toggle */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="expiry-toggle" className="text-sm font-medium">
                Show Contracts:
              </Label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={selectedExpiry === 'current' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedExpiry('current')}
                  className="px-3 py-1 text-xs"
                  aria-label="Show near month expiry contracts"
                >
                  Near
                </Button>
                <Button
                  variant={selectedExpiry === 'near' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedExpiry('near')}
                  className="px-3 py-1 text-xs"
                  aria-label="Show next month expiry contracts"
                >
                  Next
                </Button>
                <Button
                  variant={selectedExpiry === 'far' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedExpiry('far')}
                  className="px-3 py-1 text-xs"
                  aria-label="Show far month expiry contracts"
                >
                  Far
                </Button>
              </div>
            </div>

            {/* Search Input */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search symbol..."
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  className="pl-9 h-8 w-40 text-sm"
                  aria-label="Search by symbol"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Profit Filter Toggle */}
            <Button
              variant={showOnlyProfitable ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyProfitable(!showOnlyProfitable)}
              className="h-8 text-xs"
            >
              {showOnlyProfitable ? '✓ Profitable Only' : 'Show All'}
            </Button>
            
            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'profit' | 'change' | 'symbol')}
              className="h-8 px-3 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="profit">Sort: Profit</option>
              <option value="symbol">Sort: Symbol</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow>
                  <TableHead className="w-32 font-semibold text-gray-900 sticky left-0 bg-gray-50 border-r">
                    SYMBOL
                  </TableHead>
                  <TableHead className="w-20 text-center font-semibold text-gray-900">
                    CATEGORY
                  </TableHead>
                  <TableHead className="w-20 text-center font-semibold text-gray-900">
                    ASK
                  </TableHead>
                  <TableHead className="w-20 text-center font-semibold text-gray-900">
                    CHANGE
                  </TableHead>
                  <TableHead className="w-20 text-center font-semibold text-gray-900">
                    CHANGE%
                  </TableHead>
                  <TableHead className="w-20 text-center font-semibold text-gray-900">
                    LOT SIZE
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold text-gray-900">
                    {selectedExpiry === 'current' ? 'NEAR' : selectedExpiry === 'near' ? 'NEXT' : 'FAR'} FUTURE
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold text-gray-900">
                    PROFIT (%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Loading live market data...
                    </TableCell>
                  </TableRow>
                ) : searchFilteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No contracts found
                    </TableCell>
                  </TableRow>
                ) : (
                  searchFilteredRows.map((row, index) => {
                    const isHighProfit = row.profit >= 3;
                    return (
                    <TableRow
                      key={row.symbol}
                      className={`h-11 ${isHighProfit ? 'bg-green-50 border-l-4 border-green-500' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                    >
                      <TableCell className="font-medium text-gray-900 sticky left-0 bg-inherit border-r">
                        <div className="text-sm font-bold">{row.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {selectedExpiry === 'current' ? row.currentSymbol : 
                           selectedExpiry === 'near' ? row.nearSymbol : 
                           row.farSymbol}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          (row as ExtendedMarketData).category === 'current' ? 'bg-blue-100 text-blue-800' :
                          (row as ExtendedMarketData).category === 'near' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {(row as ExtendedMarketData).category === 'current' ? 'NEAR' :
                           (row as ExtendedMarketData).category === 'near' ? 'NEXT' : 'FAR'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {(row.currentAsk ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-center text-sm font-medium ${
                        ((row.futureAsk ?? 0) - (row.currentAsk ?? 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {((row.futureAsk ?? 0) - (row.currentAsk ?? 0)) >= 0 ? '▲' : '▼'} {Math.abs((row.futureAsk ?? 0) - (row.currentAsk ?? 0)).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-center text-sm font-medium ${
                        row.futureReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {row.futureReturn >= 0 ? '▲' : '▼'} {Math.abs(row.futureReturn).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {row.lotSize.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        ₹{(row.futureAsk ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className={`font-bold text-base ${
                          row.profit >= 3 ? 'text-green-600' : 
                          row.profit > 0 ? 'text-green-600' : 
                          row.profit < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {row.profit > 0 ? '+' : ''}{row.profit.toFixed(2)}%
                        </div>
                        {row.profit >= 3 && (
                          <div className="text-xs text-green-600 font-semibold mt-1">★ High Profit</div>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}