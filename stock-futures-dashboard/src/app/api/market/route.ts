import { NextResponse } from 'next/server';

export interface MarketData {
  symbol: string;
  lotSize: number;
  returns: {
    current: number;
    near: number;
    far: number;
  };
  lastUpdated: string;
}

// Removed mock dataset: use only Sharekhan-powered endpoints
const mockMarketData: MarketData[] = [];

// Add some randomization to simulate live market data
function addRandomVariation(value: number): number {
  const variation = (Math.random() - 0.5) * 0.1; // ±0.05% variation
  return Math.max(0, value + variation);
}

export async function GET() {
  const currentTimestamp = new Date().toISOString();
  
  // No mock; delegate to live route to ensure single source of truth
  const { GET: getLive } = await import('./live/route');
  return getLive();
}
