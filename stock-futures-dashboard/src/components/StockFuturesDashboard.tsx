"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { MarketData } from '@/app/api/market/route';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';

type ExpiryType = 'near' | 'far';

interface TableRow extends MarketData {
  y: number; // Lot × Current%
  x: number; // Lot × Future%  
  profit: number; // Y - X
  futureReturn: number; // Selected expiry return
}

export default function StockFuturesDashboard() {
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryType>('near');
  const [threshold, setThreshold] = useState<number>(-1000);
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  // Always use Sharekhan-backed live endpoint
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastQualifyingSymbolsRef = useRef<string[]>([]);

  // Fetch market data with 30s polling
  const { data: marketData = [], isLoading, error } = useQuery({
    queryKey: ['market-data', 'live-sharekhan'],
    queryFn: async (): Promise<MarketData[]> => {
      const endpoint = '/api/market/live';
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch market data from ${endpoint}`);
      }
      return response.json();
    },
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: true,
  });

  // Process and calculate table rows
  const processedRows = useMemo((): TableRow[] => {
    if (!marketData.length) return [];

    return marketData.map(stock => {
      const lotSize = stock.lotSize; // Lot size comes directly from API
      const y = lotSize * (stock.returns.current / 100); // Current position value
      const futureReturn = stock.returns[selectedExpiry];
      const x = lotSize * (futureReturn / 100); // Future position value
      const profit = x - y; // Profit = Future - Current (positive when future > current)

      return {
        ...stock,
        lotSize,
        y,
        x,
        profit,
        futureReturn,
      };
    });
  }, [marketData, selectedExpiry]);

  // Sort by selected expiry return DESC, then filter by threshold
  const filteredAndSortedRows = useMemo(() => {
    return processedRows
      .sort((a, b) => b.futureReturn - a.futureReturn) // Sort DESC by selected future return
      .filter(row => row.futureReturn >= threshold); // Filter by threshold
  }, [processedRows, threshold]);

  // Search functionality
  const searchFilteredRows = useMemo(() => {
    if (!searchSymbol.trim()) return filteredAndSortedRows;
    return filteredAndSortedRows.filter(row =>
      row.symbol.toLowerCase().includes(searchSymbol.toLowerCase())
    );
  }, [filteredAndSortedRows, searchSymbol]);

  // Handle toast notifications for qualifying stocks
  const showQualifyingToast = useCallback(() => {
    const qualifyingStocks = filteredAndSortedRows
      .map(row => ({ symbol: row.symbol, return: row.futureReturn }))
      .sort((a, b) => b.return - a.return);

    if (qualifyingStocks.length > 0) {
      const currentSymbols = qualifyingStocks.map(s => s.symbol);
      const lastSymbols = lastQualifyingSymbolsRef.current;

      // Only show toast if data has changed
      if (JSON.stringify(currentSymbols) !== JSON.stringify(lastSymbols)) {
        const message = qualifyingStocks
          .map(stock => `${stock.symbol} (${stock.return.toFixed(2)}%)`)
          .join(', ');

        toast({
          title: `≥${threshold}% movers:`,
          description: message,
          duration: 5000,
        });

        lastQualifyingSymbolsRef.current = currentSymbols;
      }
    }
  }, [filteredAndSortedRows, threshold, toast]);

  // Show toast when data changes (on refetch)
  useEffect(() => {
    if (filteredAndSortedRows.length > 0) {
      const timer = setTimeout(showQualifyingToast, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredAndSortedRows, showQualifyingToast]);


  // Handle Roll Expiry functionality
  const handleRollExpiry = () => {
    queryClient.setQueryData(['market-data', 'live-sharekhan'], (oldData: MarketData[] | undefined) => {
      if (!oldData) return oldData;

      return oldData.map(stock => ({
        ...stock,
        returns: {
          current: stock.returns.near, // Near → Current
          near: stock.returns.far, // Far → Near
          far: stock.returns.far * 1.01, // Far = previous Far × 1.01 (+1%)
        }
      }));
    });

    toast({
      title: "Expiry Rolled",
      description: "Near→Current, Far→Near, Far increased by 1%",
      duration: 3000,
    });
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600">Error loading market data</div>
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
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span>Auto-Refresh</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Expiry Compare Toggle */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="expiry-toggle" className="text-sm font-medium">
                Expiry Compare:
              </Label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={selectedExpiry === 'near' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedExpiry('near')}
                  className="px-3 py-1 text-xs"
                  aria-label="Select near expiry"
                >
                  Near
                </Button>
                <Button
                  variant={selectedExpiry === 'far' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedExpiry('far')}
                  className="px-3 py-1 text-xs"
                  aria-label="Select far expiry"
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
                  placeholder="SYMBOL"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  className="pl-9 h-8 w-32 text-sm"
                  aria-label="Search by symbol"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Roll Expiry Button */}
            <Button
              onClick={handleRollExpiry}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              aria-label="Roll expiry forward"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Roll Expiry
            </Button>

            {/* Top Movers Button */}
            <Button
              onClick={() => setThreshold(3.0)}
              variant="outline"
              size="sm" 
              className="h-8 text-xs"
              aria-label="Show top movers above 3%"
            >
              Top Movers ≥3%
            </Button>
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
                  <TableHead className="w-24 font-semibold text-gray-900 sticky left-0 bg-gray-50 border-r">
                    SYMBOL
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold text-gray-900">
                    CURRENT%
                  </TableHead>
                  <TableHead className={`w-24 text-center font-semibold ${
                    selectedExpiry === 'near' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}>
                    NEAR%
                  </TableHead>
                  <TableHead className={`w-24 text-center font-semibold ${
                    selectedExpiry === 'far' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}>
                    FAR%
                  </TableHead>
                  <TableHead className="w-28 text-center font-semibold text-gray-900">
                    LOT SIZE
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold text-gray-900">
                    Y (Lot×Curr%)
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold text-gray-900">
                    X (Lot×Fut%)
                  </TableHead>
                  <TableHead className="w-24 text-center font-semibold text-gray-900">
                    PROFIT
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Loading market data...
                    </TableCell>
                  </TableRow>
                ) : searchFilteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No stocks meet the criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  searchFilteredRows.map((row, index) => (
                    <TableRow
                      key={row.symbol}
                      className={`h-11 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/50 transition-colors`}
                    >
                      <TableCell className="font-medium text-gray-900 sticky left-0 bg-inherit border-r">
                        {row.symbol}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {row.returns.current.toFixed(2)}%
                      </TableCell>
                      <TableCell className={`text-center text-sm ${
                        selectedExpiry === 'near' ? 'bg-blue-50/50' : ''
                      }`}>
                        {row.returns.near.toFixed(2)}%
                      </TableCell>
                      <TableCell className={`text-center text-sm ${
                        selectedExpiry === 'far' ? 'bg-blue-50/50' : ''
                      }`}>
                        {row.returns.far.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {row.lotSize.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {row.y.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {row.x.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <span className={`font-bold ${
                          row.profit > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {row.profit > 0 ? '+' : ''}{row.profit.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}
